/**
 * Main Leave Service Coordinator
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4, §5, §6, §8, §9, §10, §11
 */

const db = require('../../../config/db/kepegawaian');
const coreDb = require('../../../config/db/core');
const holidayService = require('./holidayService');
const leaveTypeService = require('./leaveTypeService');
const leaveLedgerService = require('./leaveLedgerService');
const leaveApprovalService = require('./leaveApprovalService');
const { computeDuration, computeEndDate } = require('./durationCalculator');
const { todayWIB, dateRange } = require('./dateHelper');
const { resolveActor, isUnitInScope } = require('../common/actorHelper');
const { saveLeaveAttachment } = require('./attachmentHelper');

class LeaveService {
  /**
   * Helper to resolve actor context from JWT user
   * SPEC §9.1
   */
  async resolveActor(user) {
    return resolveActor(user, db);
  }

  /**
   * Adapter to build dayFacts map for duration calculator using calendar & holiday service
   */
  async buildDayFacts(employeeId, schoolUnitId, startDate, endDate, workScheduleId = null) {
    const holidaysMap = await holidayService.getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, startDate, endDate, workScheduleId);
    const dates = dateRange(startDate, endDate);

    // Fetch custom schedule assignment if any
    const customAssignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: 1 })
      .first();

    const facts = {};
    for (const d of dates) {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      const isSun = dow === 0;
      const isSat = dow === 6;

      let scheduleState = (isSun || isSat) ? 'NONWORKDAY' : 'WORKDAY';

      if (customAssignment) {
        if (customAssignment.assignment_type === 'flexible') {
          scheduleState = 'FLEXIBLE';
        } else if (customAssignment.custom_day_schedules) {
          let cds = customAssignment.custom_day_schedules;
          if (typeof cds === 'string') {
            try { cds = JSON.parse(cds); } catch (e) { cds = null; }
          }
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dow];
          if (cds && cds[dayName]) {
            scheduleState = cds[dayName].is_off ? 'NONWORKDAY' : 'WORKDAY';
          }
        }
      }

      facts[d] = {
        scheduleState,
        offHolidays: holidaysMap[d] || []
      };
    }

    return facts;
  }

  /**
   * Preview a leave request before submitting
   */
  async previewLeaveRequest(data, actor) {
    const {
      employee_id,
      leave_type,
      start_date,
      end_date,
      start_portion = 'full',
      end_portion = 'full'
    } = data;

    const targetEmployeeId = employee_id || actor.employeeId;
    if (!targetEmployeeId) {
      const err = new Error('Pegawai tidak ditemukan');
      err.code = 'ACTOR_NOT_EMPLOYEE';
      err.statusCode = 403;
      throw err;
    }

    const employee = await db('employees').where({ id: targetEmployeeId }).first();
    if (!employee) {
      const err = new Error('Data pegawai tidak ditemukan');
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const typeRecord = await leaveTypeService.getLeaveType(leave_type);
    if (!typeRecord) {
      const err = new Error(`Jenis cuti '${leave_type}' tidak ditemukan`);
      err.code = 'TYPE_NOT_FOUND';
      err.statusCode = 422;
      throw err;
    }

    const dayFacts = await this.buildDayFacts(employee.id, employee.school_unit_id, start_date, end_date);
    const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);

    const durationRes = computeDuration({
      startDate: start_date,
      endDate: end_date,
      startPortion: start_portion,
      endPortion: end_portion,
      countMode: typeRecord.count_mode || 'work_days',
      dayFacts,
      flexibleDayRule: settings.flexible_employee_day_rule || 'mon_fri',
      holidayInsideCalendarCounted: settings.holiday_inside_calendar_leave_counted !== undefined ? settings.holiday_inside_calendar_leave_counted : true
    });

    // Check balance impact if deducts_balance
    let balanceInfo = null;
    if (typeRecord.deducts_balance) {
      const bal = await leaveLedgerService.getEmployeeBalance(employee.id);
      balanceInfo = {
        availableBefore: bal ? bal.available : 0,
        required: durationRes.total,
        availableAfter: bal ? Math.max(0, bal.available - durationRes.total) : 0,
        isSufficient: bal ? bal.available >= durationRes.total : false
      };
    }

    return {
      leave_type: typeRecord.code,
      leave_type_name: typeRecord.name,
      count_mode: typeRecord.count_mode,
      duration_days: durationRes.total,
      breakdown: durationRes.breakdown,
      byPeriod: durationRes.byPeriod,
      warnings: durationRes.warnings,
      balance_impact: balanceInfo
    };
  }

  /**
   * Submit a new leave request (SPEC §4.4, §5.5, §6)
   */
  async createLeaveRequest(data, actor) {
    const {
      employee_id,
      leave_type,
      start_date,
      end_date,
      start_portion = 'full',
      end_portion = 'full',
      reason = null,
      attachment_url = null,
      attachment_name = null,
      bypass_approval = false,
      bypass_reason = null
    } = data;

    const isHr = actor.permissions.includes('kepegawaian.leave_requests.manage') || actor.permissions.includes('kepegawaian.leave_requests.override');
    const isOverride = actor.permissions.includes('kepegawaian.leave_requests.override');

    let targetEmployeeId = actor.employeeId;
    let submittedOnBehalf = false;

    if (employee_id && isHr) {
      targetEmployeeId = Number(employee_id);
      submittedOnBehalf = targetEmployeeId !== actor.employeeId;
    }

    if (!targetEmployeeId) {
      const err = new Error('Akun Anda tidak terikat dengan profil pegawai');
      err.code = 'ACTOR_NOT_EMPLOYEE';
      err.statusCode = 403;
      throw err;
    }

    const employee = await db('employees').where({ id: targetEmployeeId }).first();
    if (!employee || employee.account_status !== 'active') {
      const err = new Error('Pegawai tidak aktif atau tidak ditemukan');
      err.code = 'EMPLOYEE_INACTIVE';
      err.statusCode = 422;
      throw err;
    }

    if (submittedOnBehalf && !isUnitInScope(actor.unitScope, employee.school_unit_id)) {
      const err = new Error('Pegawai yang diajukan berada di luar cakupan satuan pendidikan Anda');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    // Process attachment if provided
    let finalAttachmentUrl = attachment_url || null;
    let finalAttachmentName = attachment_name || null;
    let finalMimeType = null;
    let finalSizeBytes = null;

    let attachmentPayload = null;
    if (data.attachment && typeof data.attachment === 'object') {
      attachmentPayload = data.attachment;
    } else if (data.attachment || data.attachment_base64 || data.attachment_data) {
      attachmentPayload = {
        data: data.attachment || data.attachment_base64 || data.attachment_data,
        name: data.attachment_name || 'lampiran.pdf'
      };
    }

    if (attachmentPayload) {
      const saved = saveLeaveAttachment(attachmentPayload, employee.id);
      if (saved) {
        finalAttachmentUrl = saved.attachment_url;
        finalAttachmentName = saved.attachment_name;
        finalMimeType = saved.attachment_mime_type;
        finalSizeBytes = saved.attachment_size_bytes;
      }
    }

    // Lookup leave type
    const typeRecord = await leaveTypeService.getLeaveType(leave_type);
    if (!typeRecord) {
      const err = new Error(`Jenis cuti '${leave_type}' tidak valid`);
      err.code = 'TYPE_NOT_FOUND';
      err.statusCode = 422;
      throw err;
    }

    // Check eligibility
    if (typeRecord.eligible_employment_statuses && typeRecord.eligible_employment_statuses.length > 0) {
      const empStatusUpper = (employee.employment_status || '').toUpperCase();
      const match = typeRecord.eligible_employment_statuses.some(s => s.toUpperCase() === empStatusUpper);
      if (!match) {
        const err = new Error(`Jenis cuti '${typeRecord.name}' tidak dapat diambil oleh status kepegawaian ${employee.employment_status}`);
        err.code = 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE';
        err.statusCode = 422;
        throw err;
      }
    }

    // Calculate duration
    const dayFacts = await this.buildDayFacts(employee.id, employee.school_unit_id, start_date, end_date);
    const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);

    const durationRes = computeDuration({
      startDate: start_date,
      endDate: end_date,
      startPortion: start_portion,
      endPortion: end_portion,
      countMode: typeRecord.count_mode || 'work_days',
      dayFacts,
      flexibleDayRule: settings.flexible_employee_day_rule || 'mon_fri',
      holidayInsideCalendarCounted: settings.holiday_inside_calendar_leave_counted !== undefined ? settings.holiday_inside_calendar_leave_counted : true
    });

    const durationDays = durationRes.total;

    // Check overlap with existing approved/pending leave requests
    const overlap = await db('employee_leave_requests')
      .where({ employee_id: employee.id })
      .whereIn('status', ['pending', 'approved', 'revision_requested'])
      .where(builder => {
        builder.whereBetween('start_date', [start_date, end_date])
          .orWhereBetween('end_date', [start_date, end_date])
          .orWhere(sub => {
            sub.where('start_date', '<=', start_date)
              .andWhere('end_date', '>=', end_date);
          });
      })
      .first();

    if (overlap) {
      const err = new Error(`Pengajuan tumpang tindih dengan cuti/izin yang sudah ada (${overlap.start_date} s/d ${overlap.end_date})`);
      err.code = overlap.status === 'approved' ? 'OVERLAP_APPROVED' : 'OVERLAP_PENDING';
      err.statusCode = 409;
      throw err;
    }

    // Transaction to insert request, ledger entry, and approval steps
    const shouldBypass = bypass_approval && isOverride;
    const initialStatus = shouldBypass ? 'approved' : 'pending';

    const insertResult = await db.transaction(async (trx) => {
      const [insertId] = await trx('employee_leave_requests').insert({
        school_unit_id: employee.school_unit_id,
        employee_id: employee.id,
        leave_type: typeRecord.code,
        leave_type_id: typeRecord.id,
        start_date,
        end_date,
        duration_days: durationDays,
        count_mode: typeRecord.count_mode,
        day_breakdown: JSON.stringify(durationRes.breakdown),
        start_portion,
        end_portion,
        reason,
        attachment_url: finalAttachmentUrl,
        attachment_name: finalAttachmentName,
        status: initialStatus,
        version: 1,
        submitted_by_user_id: actor.userId,
        submitted_on_behalf: submittedOnBehalf ? 1 : 0,
        bypass_approval: shouldBypass ? 1 : 0,
        bypass_reason: shouldBypass ? bypass_reason : null,
        approved_by: shouldBypass ? actor.userId : null,
        approved_at: shouldBypass ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Reserve balance if leave type deducts balance
      if (typeRecord.deducts_balance) {
        await leaveLedgerService.reserveBalance({
          employeeId: employee.id,
          days: durationDays,
          leaveRequestId: insertId,
          version: 1,
          reason: `Pengajuan ${typeRecord.name} (${start_date} - ${end_date})`,
          actor
        }, trx);

        if (shouldBypass) {
          await leaveLedgerService.commitBalance({
            employeeId: employee.id,
            days: durationDays,
            leaveRequestId: insertId,
            version: 1,
            reason: `Bypass persetujuan oleh HR (${bypass_reason || '-'})`,
            actor
          }, trx);
        }
      }

      // Build approval steps
      if (!shouldBypass) {
        const activeStepNo = await leaveApprovalService.buildSteps({
          entityType: 'leave',
          entityId: insertId,
          requestVersion: 1,
          profileId: typeRecord.approval_profile_id || 3,
          employeeId: employee.id,
          schoolUnitId: employee.school_unit_id,
          durationDays
        }, trx);

        await trx('employee_leave_requests')
          .where({ id: insertId })
          .update({ current_step_no: activeStepNo });
      }

      // Audit log
      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: insertId,
          action: shouldBypass ? 'create_and_bypass' : 'submit',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ leave_type: typeRecord.code, start_date, end_date, durationDays, status: initialStatus }),
          created_at: new Date()
        });
      }

      return insertId;
    });

    return this.getLeaveRequestById(insertResult, actor);
  }

  /**
   * Get list of leave requests with scoping, filters, and pagination
   */
  async getLeaveRequests(query = {}, actor = null) {
    let q = db('employee_leave_requests as elr')
      .join('employees as e', 'elr.employee_id', 'e.id')
      .leftJoin('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .select(
        'elr.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        'jp.name as position_name',
        db.raw('COALESCE(lt.name, elr.leave_type) as leave_type_name'),
        'lt.category as leave_category',
        'lt.color as leave_type_color'
      );

    const isHr = actor && (actor.permissions.includes('kepegawaian.leave_requests.manage') || actor.permissions.includes('kepegawaian.leave_requests.read') || actor.permissions.includes('kepegawaian.leave_requests.override'));

    if (!isHr) {
      if (!actor || !actor.employeeId) {
        return { data: [], total: 0, page: 1, perPage: 25 };
      }
      q = q.where('elr.employee_id', actor.employeeId);
    } else {
      if (actor.unitScope && actor.unitScope.length > 0) {
        q = q.whereIn('e.school_unit_id', actor.unitScope);
      }
      if (query.school_unit_id) {
        q = q.where('e.school_unit_id', query.school_unit_id);
      }
      if (query.employee_id) {
        q = q.where('elr.employee_id', query.employee_id);
      }
    }

    if (query.status) {
      if (Array.isArray(query.status)) q = q.whereIn('elr.status', query.status);
      else q = q.where('elr.status', query.status);
    }

    if (query.leave_type) {
      q = q.where('elr.leave_type', query.leave_type);
    }

    if (query.category) {
      q = q.where('lt.category', query.category);
    }

    if (query.date_from && query.date_to) {
      q = q.where(b => {
        b.whereBetween('elr.start_date', [query.date_from, query.date_to])
          .orWhereBetween('elr.end_date', [query.date_from, query.date_to])
          .orWhere(sub => {
            sub.where('elr.start_date', '<=', query.date_from)
              .andWhere('elr.end_date', '>=', query.date_to);
          });
      });
    }

    if (query.q) {
      q = q.where(b => {
        b.where('e.full_name', 'like', `%${query.q}%`)
          .orWhere('elr.reason', 'like', `%${query.q}%`);
      });
    }

    const page = parseInt(query.page, 10) || 1;
    const perPage = parseInt(query.per_page, 10) || 25;
    const offset = (page - 1) * perPage;

    const countQ = q.clone().clearSelect().count('elr.id as total').first();
    const countRes = await countQ;
    const total = countRes ? countRes.total : 0;

    const rows = await q.orderBy('elr.created_at', 'desc').limit(perPage).offset(offset);

    return {
      data: rows.map(r => {
        const item = { ...r };
        const hasAttachment = Boolean(item.attachment_url || item.attachment_name);
        delete item.attachment_url; // Don't expose raw URL in list (SPEC §9.2)
        return {
          ...item,
          has_attachment: hasAttachment,
          duration_days: parseFloat(item.duration_days) || 0,
          day_breakdown: typeof item.day_breakdown === 'string' ? JSON.parse(item.day_breakdown) : item.day_breakdown
        };
      }),
      total,
      page,
      perPage
    };
  }

  /**
   * Get single leave request by ID with approval steps & colleague overlaps
   */
  async getLeaveRequestById(id, actor = null) {
    const row = await db('employee_leave_requests as elr')
      .join('employees as e', 'elr.employee_id', 'e.id')
      .leftJoin('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where('elr.id', id)
      .select(
        'elr.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        'jp.name as position_name',
        db.raw('COALESCE(lt.name, elr.leave_type) as leave_type_name'),
        'lt.category as leave_category',
        'lt.color as leave_type_color'
      )
      .first();

    if (!row) return null;

    // Fetch approval steps for the current version
    const steps = await db('approval_steps as aps')
      .leftJoin('employees as e', 'aps.assigned_employee_id', 'e.id')
      .leftJoin('employees as act', 'aps.acted_by_employee_id', 'act.id')
      .where({
        'aps.entity_type': 'leave',
        'aps.entity_id': id,
        'aps.request_version': row.version
      })
      .select(
        'aps.*',
        'e.full_name as assigned_employee_name',
        'act.full_name as acted_by_employee_name'
      )
      .orderBy('aps.step_no', 'asc');

    // Colleague overlap check (who else is on leave in same school unit on these dates)
    const overlaps = await db('employee_leave_requests as elr2')
      .join('employees as e2', 'elr2.employee_id', 'e2.id')
      .where('elr2.school_unit_id', row.school_unit_id)
      .where('elr2.status', 'approved')
      .where('elr2.id', '!=', row.id)
      .where(b => {
        b.whereBetween('elr2.start_date', [row.start_date, row.end_date])
          .orWhereBetween('elr2.end_date', [row.start_date, row.end_date])
          .orWhere(sub => {
            sub.where('elr2.start_date', '<=', row.start_date)
              .andWhere('elr2.end_date', '>=', row.end_date);
          });
      })
      .select('e2.full_name as colleague_name', 'elr2.start_date', 'elr2.end_date', 'elr2.leave_type');

    return {
      ...row,
      duration_days: parseFloat(row.duration_days) || 0,
      day_breakdown: typeof row.day_breakdown === 'string' ? JSON.parse(row.day_breakdown) : row.day_breakdown,
      approval_steps: steps,
      overlapping_colleagues: overlaps
    };
  }

  /**
   * Approve leave request step (or full approval)
   */
  async approveLeaveRequest(id, actor, comment = null, bypass = false) {
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Pengajuan dengan status ${request.status} tidak dapat disetujui`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const isOverride = actor.permissions.includes('kepegawaian.leave_requests.override');
    const isHr = actor.permissions.includes('kepegawaian.leave_requests.manage');

    await db.transaction(async (trx) => {
      const steps = request.approval_steps || [];
      const currentStep = steps.find(s => s.step_no === request.current_step_no && s.status === 'pending');

      if (bypass && isOverride) {
        // Mark all remaining pending steps as bypassed
        for (const s of steps) {
          if (s.status === 'pending') {
            await trx('approval_steps').where({ id: s.id }).update({
              status: 'bypassed',
              acted_by_user_id: actor.userId,
              acted_by_employee_id: actor.employeeId || null,
              acted_at: new Date(),
              comment: comment || 'Bypassed by HRD override',
              updated_at: new Date()
            });
          }
        }

        // Finalize request
        await trx('employee_leave_requests').where({ id }).update({
          status: 'approved',
          approved_by: actor.userId,
          approved_at: new Date(),
          updated_at: new Date()
        });

        // Commit balance if applicable
        const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);
        if (typeRecord && typeRecord.deducts_balance) {
          await leaveLedgerService.commitBalance({
            employeeId: request.employee_id,
            days: request.duration_days,
            leaveRequestId: id,
            version: request.version,
            reason: `Persetujuan bypass cuti (${comment || '-'})`,
            actor
          }, trx);
        }
      } else {
        if (!currentStep) {
          const err = new Error('Langkah persetujuan aktif tidak ditemukan');
          err.statusCode = 409;
          throw err;
        }

        // Verify actor permission on this step
        const canAct = await leaveApprovalService.canActorActOnStep(currentStep, actor, request.school_unit_id);
        if (!canAct) {
          const err = new Error('Anda tidak memiliki wewenang untuk menyetujui langkah ini');
          err.statusCode = 403;
          throw err;
        }

        // Mark current step approved
        await trx('approval_steps').where({ id: currentStep.id }).update({
          status: 'approved',
          acted_by_user_id: actor.userId,
          acted_by_employee_id: actor.employeeId || null,
          acted_at: new Date(),
          comment,
          updated_at: new Date()
        });

        // Find next pending step
        const nextStep = steps.find(s => s.step_no > currentStep.step_no && s.status === 'pending');
        if (nextStep) {
          await trx('employee_leave_requests').where({ id }).update({
            current_step_no: nextStep.step_no,
            updated_at: new Date()
          });
        } else {
          // Final step approved -> Mark request approved!
          await trx('employee_leave_requests').where({ id }).update({
            status: 'approved',
            approved_by: actor.userId,
            approved_at: new Date(),
            updated_at: new Date()
          });

          const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);
          if (typeRecord && typeRecord.deducts_balance) {
            await leaveLedgerService.commitBalance({
              employeeId: request.employee_id,
              days: request.duration_days,
              leaveRequestId: id,
              version: request.version,
              reason: `Persetujuan akhir cuti (${comment || '-'})`,
              actor
            }, trx);
          }
        }
      }

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'approve',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: comment,
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(id, actor, rejectionReason) {
    if (!rejectionReason || !rejectionReason.trim()) {
      const err = new Error('Alasan penolakan wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      // Mark current step rejected
      const steps = request.approval_steps || [];
      const currentStep = steps.find(s => s.step_no === request.current_step_no);
      if (currentStep) {
        await trx('approval_steps').where({ id: currentStep.id }).update({
          status: 'rejected',
          acted_by_user_id: actor.userId,
          acted_by_employee_id: actor.employeeId || null,
          acted_at: new Date(),
          comment: rejectionReason,
          updated_at: new Date()
        });
      }

      await trx('employee_leave_requests').where({ id }).update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        updated_at: new Date()
      });

      // Release reserved balance
      const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);
      if (typeRecord && typeRecord.deducts_balance) {
        await leaveLedgerService.releaseBalance({
          employeeId: request.employee_id,
          days: request.duration_days,
          leaveRequestId: id,
          version: request.version,
          reason: `Penolakan cuti: ${rejectionReason}`,
          actor
        }, trx);
      }

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'reject',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: rejectionReason,
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Request Revision (SPEC §6.4)
   */
  async requestRevision(id, actor, comment) {
    if (!comment || !comment.trim()) {
      const err = new Error('Catatan revisi wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('employee_leave_requests').where({ id }).update({
        status: 'revision_requested',
        rejection_reason: comment,
        updated_at: new Date()
      });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'request_revision',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: comment,
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Cancel Leave Request (SPEC §2 #23, §5.5)
   */
  async cancelLeaveRequest(id, actor, cancelReason = 'Dibatalkan oleh pemohon') {
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const isOwner = actor.employeeId && actor.employeeId === request.employee_id;
    const isOverride = actor.permissions.includes('kepegawaian.leave_requests.override');

    if (!isOwner && !isOverride) {
      const err = new Error('Anda tidak berhak membatalkan pengajuan ini');
      err.statusCode = 403;
      throw err;
    }

    const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);

    await db.transaction(async (trx) => {
      if (request.status === 'pending' || request.status === 'revision_requested') {
        // Release reserved balance
        if (typeRecord && typeRecord.deducts_balance) {
          await leaveLedgerService.releaseBalance({
            employeeId: request.employee_id,
            days: request.duration_days,
            leaveRequestId: id,
            version: request.version,
            reason: `Pembatalan pengajuan: ${cancelReason}`,
            actor
          }, trx);
        }
      } else if (request.status === 'approved') {
        // Refund committed balance
        if (typeRecord && typeRecord.deducts_balance) {
          await leaveLedgerService.refundBalance({
            employeeId: request.employee_id,
            days: request.duration_days,
            leaveRequestId: id,
            reason: `Pembatalan cuti disetujui: ${cancelReason}`,
            actor
          }, trx);
        }
      }

      await trx('employee_leave_requests').where({ id }).update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by_user_id: actor.userId,
        cancel_reason: cancelReason,
        updated_at: new Date()
      });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'cancel',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: cancelReason,
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Calendar matrix for monthly team view (SPEC §11.2)
   */
  async getCalendarMatrix({ month, schoolUnitId, category = null, includeOvertime = true }, actor) {
    if (!month) month = todayWIB().slice(0, 7); // 'YYYY-MM'

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const employees = await db('employees as e')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where(b => {
        if (schoolUnitId) b.where('e.school_unit_id', schoolUnitId);
      })
      .andWhere('e.account_status', 'active')
      .select('e.id', 'e.full_name', 'e.employee_number', 'e.school_unit_id', 'jp.name as position_name')
      .orderBy('e.full_name', 'asc');

    const leaveRequests = await db('employee_leave_requests as elr')
      .join('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .where('elr.status', 'approved')
      .where(b => {
        b.whereBetween('elr.start_date', [startDate, endDate])
          .orWhereBetween('elr.end_date', [startDate, endDate])
          .orWhere(sub => {
            sub.where('elr.start_date', '<=', startDate)
              .andWhere('elr.end_date', '>=', endDate);
          });
      })
      .select('elr.*', 'lt.name as leave_type_name', 'lt.color as leave_type_color', 'lt.category as leave_category');

    const holidays = await holidayService.getHolidays({
      schoolUnitId,
      dateFrom: startDate,
      dateTo: endDate
    });

    let overtimes = [];
    if (includeOvertime) {
      overtimes = await db('employee_overtimes')
        .where('status', 'approved')
        .whereBetween('overtime_date', [startDate, endDate])
        .select('*');
    }

    return {
      month,
      employees,
      leave_requests: leaveRequests,
      holidays,
      overtimes
    };
  }

  /**
   * Reports and Summaries (SPEC §11.2)
   */
  async getReportsSummary({ periodKey = '2026/2027', schoolUnitId = null }, actor) {
    const period = await db('leave_balance_periods').where({ period_key: periodKey }).first();

    const pendingCount = await db('employee_leave_requests')
      .where({ status: 'pending' })
      .count('id as total').first();

    const approvedCount = await db('employee_leave_requests')
      .where({ status: 'approved' })
      .count('id as total').first();

    const activeEmployees = await db('employees')
      .where({ account_status: 'active' })
      .count('id as total').first();

    const totalDaysTaken = await db('employee_leave_requests')
      .where({ status: 'approved' })
      .sum('duration_days as total').first();

    return {
      pending_requests: pendingCount ? pendingCount.total : 0,
      approved_requests: approvedCount ? approvedCount.total : 0,
      total_active_employees: activeEmployees ? activeEmployees.total : 0,
      total_leave_days_taken: totalDaysTaken && totalDaysTaken.total ? parseFloat(totalDaysTaken.total) : 0
    };
  }

  /**
   * Payroll Feed Contract (SPEC §10.5)
   */
  async getPayrollFeed({ period, schoolUnitId = null }) {
    if (!period) period = todayWIB().slice(0, 7);

    const startDate = `${period}-01`;
    const endDate = `${period}-31`;

    const employees = await db('employees')
      .where({ account_status: 'active' })
      .select('id', 'full_name', 'employee_number', 'school_unit_id');

    const leaveRequests = await db('employee_leave_requests as elr')
      .join('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .where('elr.status', 'approved')
      .whereBetween('elr.start_date', [startDate, endDate])
      .select('elr.*', 'lt.code as leave_code', 'lt.payroll_pay_percent', 'lt.affects_attendance_allowance');

    const overtimes = await db('employee_overtimes')
      .where('status', 'approved')
      .whereBetween('overtime_date', [startDate, endDate])
      .select('*');

    const feed = employees.map(emp => {
      const empLeaves = leaveRequests.filter(l => l.employee_id === emp.id);
      const empOvertimes = overtimes.filter(o => o.employee_id === emp.id);

      const leave_days_by_type = empLeaves.map(l => ({
        code: l.leave_code,
        days: parseFloat(l.duration_days),
        pay_percent: l.payroll_pay_percent,
        affects_attendance_allowance: l.affects_attendance_allowance
      }));

      const overtimeList = empOvertimes.map(o => ({
        day_type: o.day_type,
        payable_hours: o.payable_hours ? parseFloat(o.payable_hours) : parseFloat(o.hours),
        multiplier_breakdown: typeof o.multiplier_breakdown === 'string' ? JSON.parse(o.multiplier_breakdown) : o.multiplier_breakdown,
        estimated_wage: o.estimated_wage ? parseFloat(o.estimated_wage) : null
      }));

      return {
        employee_id: emp.id,
        name: emp.full_name,
        nip: emp.employee_number,
        leave_days_by_type,
        overtime: overtimeList
      };
    });

    return {
      period,
      as_of: new Date().toISOString(),
      data: feed
    };
  }
}

module.exports = new LeaveService();
