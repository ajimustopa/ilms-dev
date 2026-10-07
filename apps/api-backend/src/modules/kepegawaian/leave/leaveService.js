/**
 * Main Leave Service Coordinator
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4, §5, §6, §8, §9, §10, §11, §12
 */

const fs = require('fs');
const path = require('path');
const db = require('../../../config/db/kepegawaian');
const coreDb = require('../../../config/db/core');
const holidayService = require('./holidayService');
const leaveTypeService = require('./leaveTypeService');
const leaveLedgerService = require('./leaveLedgerService');
const { computeDuration, computeEndDate } = require('./durationCalculator');
const { todayWIB, dateRange, diffInDays, formatDbDate } = require('./dateHelper');
const { resolveActor, isUnitInScope } = require('../common/actorHelper');
const { saveLeaveAttachment, resolveAttachmentPath } = require('./attachmentHelper');
const { validateLeaveRequest } = require('./leaveRequestValidator');
const {
  buildApprovalSteps,
  canActOnStep,
  applyAction,
  nextOvertimeStatus
} = require('./approvalEngine');

const HR_PERMISSIONS = {
  LEAVE_READ: 'kepegawaian.leave_requests.read',
  LEAVE_MANAGE: 'kepegawaian.leave_requests.manage',
  LEAVE_OVERRIDE: 'kepegawaian.leave_requests.override',
  LEAVE_TYPES_MANAGE: 'kepegawaian.leave_types.manage',
  LEAVE_BALANCES_MANAGE: 'kepegawaian.leave_balances.manage',
  OVERTIMES_MANAGE: 'kepegawaian.overtimes.manage',
  LEAVE_REPORTS_READ: 'kepegawaian.leave_reports.read'
};

class LeaveService {
  /**
   * Helper to resolve actor context from JWT user
   * SPEC §9.1
   */
  async resolveActor(user) {
    return resolveActor(user, db);
  }

  /**
   * Acquire MySQL named lock for concurrency protection (SPEC §5.4)
   */
  async acquireLock(key, timeoutSec = 5) {
    try {
      const res = await db.raw('SELECT GET_LOCK(?, ?) as lock_acquired', [key, timeoutSec]);
      return res && res[0] && res[0][0] && res[0][0].lock_acquired === 1;
    } catch (e) {
      return true; // Fallback if GET_LOCK not supported
    }
  }

  /**
   * Release MySQL named lock
   */
  async releaseLock(key) {
    try {
      await db.raw('SELECT RELEASE_LOCK(?)', [key]);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Check if a date touches a locked attendance period (SPEC §8 #3, V6)
   */
  async isPeriodLockedForDate(dateStr, schoolUnitId = null) {
    if (!dateStr) return false;
    let clean = dateStr;
    if (dateStr instanceof Date) {
      clean = dateStr.toISOString().slice(0, 10);
    } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
      clean = dateStr.split('T')[0];
    } else {
      clean = String(dateStr).slice(0, 10);
    }
    const [y, m] = clean.split('-').map(Number);
    if (!y || !m) return false;

    const lock = await db('attendance_period_locks')
      .where({ period_year: y, period_month: m })
      .whereIn('status', ['locked', 'submitted_to_payroll'])
      .where(function () {
        if (schoolUnitId) {
          this.whereNull('school_unit_id').orWhere('school_unit_id', schoolUnitId);
        }
      })
      .first();

    return Boolean(lock);
  }

  /**
   * Adapter to build dayFacts map for duration calculator using calendar & holiday service
   */
  async buildDayFacts(employeeId, schoolUnitId, startDate, endDate, workScheduleId = null) {
    const holidaysMap = await holidayService.getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, startDate, endDate, workScheduleId);
    const dates = dateRange(startDate, endDate);

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
   * Resolvers for approval steps
   */
  async getApprovalResolvers(schoolUnitId) {
    return {
      getUnitHead: async (unitId) => {
        const uId = unitId || schoolUnitId;
        const approver = await db('school_unit_approvers')
          .where({ school_unit_id: uId, approver_role: 'unit_head' })
          .where(b => {
            const today = todayWIB();
            b.where('valid_from', '<=', today)
              .andWhere(sub => sub.whereNull('valid_to').orWhere('valid_to', '>=', today));
          })
          .first();
        return approver ? { employeeId: approver.employee_id } : null;
      },
      isApplicantOnlyHrd: async (empId, unitId) => {
        return false;
      }
    };
  }

  /**
   * Preview leave request before submitting (SPEC §11.2, §4.4)
   */
  async previewLeaveRequest(data, actor, options = { throwOnError: false }) {
    const {
      employee_id,
      leave_type,
      leave_type_id,
      start_date,
      end_date,
      start_portion = 'full',
      end_portion = 'full',
      reason = '',
      attachment,
      attachment_url,
      attachment_name,
      bypass_approval = false,
      bypass_reason = null
    } = data;

    const isHr = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
                 (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    let targetEmployeeId = actor.employeeId;
    if (employee_id && isHr) {
      targetEmployeeId = Number(employee_id);
    }

    if (!targetEmployeeId) {
      const err = new Error('Akun Anda tidak terikat dengan profil pegawai');
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

    const inScope = isUnitInScope(actor.unitScope, employee.school_unit_id);
    if (!inScope) {
      const err = new Error('Pegawai berada di luar cakupan unit sekolah Anda');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    let typeRecord = null;
    if (leave_type_id) {
      typeRecord = await db('leave_types').where({ id: leave_type_id }).first();
    } else if (leave_type) {
      typeRecord = await leaveTypeService.getLeaveType(leave_type);
    } else {
      typeRecord = await leaveTypeService.getLeaveType('cuti_tahunan');
    }

    if (!typeRecord) {
      const err = new Error(`Jenis cuti '${leave_type || leave_type_id}' tidak valid`);
      err.code = 'TYPE_NOT_FOUND';
      err.statusCode = 422;
      throw err;
    }

    const dayFacts = await this.buildDayFacts(employee.id, employee.school_unit_id, start_date, end_date);
    const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);

    let durationRes;
    try {
      durationRes = computeDuration({
        startDate: start_date,
        endDate: end_date,
        startPortion: start_portion,
        endPortion: end_portion,
        countMode: typeRecord.count_mode || 'work_days',
        dayFacts,
        flexibleDayRule: settings.flexible_employee_day_rule || 'mon_fri',
        holidayInsideCalendarCounted: settings.holiday_inside_calendar_leave_counted !== undefined ? settings.holiday_inside_calendar_leave_counted : true
      });
    } catch (dErr) {
      if (options && options.throwOnError) {
        dErr.statusCode = dErr.statusCode || 422;
        throw dErr;
      }
      durationRes = {
        total: 0,
        breakdown: [],
        byPeriod: {},
        warnings: [],
        error: { code: dErr.code || 'INVALID_DURATION', message: dErr.message }
      };
    }

    // Existing requests for limit/overlap check
    const existingRequests = await db('employee_leave_requests')
      .where({ employee_id: employee.id })
      .whereNotIn('status', ['cancelled', 'rejected']);

    // Attendance & overtime records
    const reqDates = dateRange(start_date, end_date);
    const attendanceRecords = await db('employee_attendances')
      .where({ employee_id: employee.id })
      .whereIn('attendance_date', reqDates);

    const overtimeRecords = await db('employee_overtimes')
      .where({ employee_id: employee.id })
      .whereIn('overtime_date', reqDates);

    // Period locks
    const lockedDates = [];
    for (const d of reqDates) {
      const isLocked = await this.isPeriodLockedForDate(d, employee.school_unit_id);
      if (isLocked) lockedDates.push(d);
    }

    // Balance check
    let balance = null;
    if (typeRecord.deducts_balance) {
      balance = await leaveLedgerService.getEmployeeBalance(employee.id);
    }

    // Run pure validation
    const validation = validateLeaveRequest({
      request: {
        employee_id: employee.id,
        leave_type: typeRecord.code,
        leave_type_id: typeRecord.id,
        start_date,
        end_date,
        start_portion,
        end_portion,
        reason,
        attachment,
        attachment_url,
        attachment_name,
        bypass_approval,
        bypass_reason
      },
      actor,
      employee,
      leaveType: typeRecord,
      duration: durationRes,
      existingRequests,
      attendanceRecords,
      overtimeRecords,
      lockedPeriodDates: lockedDates,
      balance,
      today: todayWIB()
    });

    let balanceInfo = null;
    if (typeRecord.deducts_balance) {
      balanceInfo = {
        availableBefore: balance ? parseFloat(balance.available) : 0,
        required: durationRes.total,
        availableAfter: balance ? Math.max(0, parseFloat(balance.available) - durationRes.total) : 0,
        isSufficient: balance ? parseFloat(balance.available) >= durationRes.total : false
      };
    }

    return {
      can_submit: validation.isValid,
      employee_id: employee.id,
      leave_type: typeRecord.code,
      leave_type_id: typeRecord.id,
      leave_type_name: typeRecord.name,
      count_mode: typeRecord.count_mode,
      total_days: durationRes.total,
      duration_days: durationRes.total,
      breakdown: durationRes.breakdown,
      by_period: durationRes.byPeriod,
      warnings: validation.warnings,
      errors: validation.errors,
      balance_impact: balanceInfo
    };
  }

  /**
   * Lightweight duration computation endpoint
   */
  async computeDurationForRequest(data, actor) {
    return this.previewLeaveRequest(data, actor, { throwOnError: true });
  }

  /**
   * Submit a new leave request (SPEC §4.4, §5.5, §6, §9.2)
   */
  async createLeaveRequest(data, actor) {
    const {
      employee_id,
      leave_type,
      leave_type_id,
      start_date,
      end_date,
      start_portion = 'full',
      end_portion = 'full',
      reason = '',
      attachment = null,
      attachment_url = null,
      attachment_name = null,
      bypass_approval = false,
      bypass_reason = null
    } = data;

    const isHr = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
                 (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    let targetEmployeeId = actor.employeeId;
    let submittedOnBehalf = false;

    if (employee_id && isHr) {
      targetEmployeeId = Number(employee_id);
      submittedOnBehalf = targetEmployeeId !== actor.employeeId;
    }

    if (!targetEmployeeId) {
      const err = new Error('Akun Anda tidak terikat dengan profil pegawai aktif');
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
      const err = new Error('Pegawai berada di luar cakupan satuan pendidikan yang Anda kelola');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    let typeRecord = null;
    if (leave_type_id) {
      typeRecord = await db('leave_types').where({ id: leave_type_id }).first();
    } else if (leave_type) {
      typeRecord = await leaveTypeService.getLeaveType(leave_type);
    }

    if (!typeRecord) {
      const err = new Error(`Jenis cuti '${leave_type || leave_type_id}' tidak valid`);
      err.code = 'TYPE_NOT_FOUND';
      err.statusCode = 422;
      throw err;
    }

    // Concurrency Lock on employee (SPEC §5.4)
    const lockKey = `leave:emp:${employee.id}`;
    await this.acquireLock(lockKey, 5);

    try {
      // Process attachment if supplied
      let finalAttachmentUrl = attachment_url || null;
      let finalAttachmentName = attachment_name || null;
      let finalMimeType = null;
      let finalSizeBytes = null;

      let attachmentPayload = null;
      if (attachment && typeof attachment === 'object') {
        attachmentPayload = attachment;
      } else if (attachment || data.attachment_base64 || data.attachment_data) {
        attachmentPayload = {
          data: attachment || data.attachment_base64 || data.attachment_data,
          name: attachment_name || 'lampiran.pdf'
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

      // Existing requests for overlap and limits
      const existingRequests = await db('employee_leave_requests')
        .where({ employee_id: employee.id })
        .whereNotIn('status', ['cancelled', 'rejected']);

      const reqDates = dateRange(start_date, end_date);
      const attendanceRecords = await db('employee_attendances')
        .where({ employee_id: employee.id })
        .whereIn('attendance_date', reqDates);

      const overtimeRecords = await db('employee_overtimes')
        .where({ employee_id: employee.id })
        .whereIn('overtime_date', reqDates);

      const lockedDates = [];
      for (const d of reqDates) {
        const isLocked = await this.isPeriodLockedForDate(d, employee.school_unit_id);
        if (isLocked) lockedDates.push(d);
      }

      let balance = null;
      if (typeRecord.deducts_balance) {
        balance = await leaveLedgerService.getEmployeeBalance(employee.id);
      }

      // Validate context
      const validation = validateLeaveRequest({
        request: {
          employee_id: employee.id,
          leave_type: typeRecord.code,
          leave_type_id: typeRecord.id,
          start_date,
          end_date,
          start_portion,
          end_portion,
          reason,
          attachment: finalAttachmentUrl || attachment,
          attachment_url: finalAttachmentUrl,
          attachment_name: finalAttachmentName,
          bypass_approval,
          bypass_reason
        },
        actor,
        employee,
        leaveType: typeRecord,
        duration: durationRes,
        existingRequests,
        attendanceRecords,
        overtimeRecords,
        lockedPeriodDates: lockedDates,
        balance,
        today: todayWIB()
      });

      if (!validation.isValid) {
        const firstErr = validation.errors[0];
        const err = new Error(firstErr.message);
        err.code = firstErr.code;
        err.errors = validation.errors;
        err.statusCode = (firstErr.code.includes('OVERLAP') || firstErr.code.includes('CONFLICT') || firstErr.code === 'PERIOD_LOCKED' || firstErr.code === 'BALANCE_INSUFFICIENT') ? 409 : 422;
        throw err;
      }

      // Check bypass approval (requires override)
      const shouldBypass = Boolean(bypass_approval && isOverride);
      if (bypass_approval && !isOverride) {
        const err = new Error('Bypass approval memerlukan hak akses override');
        err.code = 'OVERRIDE_PERMISSION_REQUIRED';
        err.statusCode = 403;
        throw err;
      }
      if (shouldBypass && (!bypass_reason || !bypass_reason.trim())) {
        const err = new Error('Alasan bypass approval wajib diisi');
        err.code = 'BYPASS_REASON_REQUIRED';
        err.statusCode = 422;
        throw err;
      }

      const initialStatus = shouldBypass ? 'approved' : 'pending';

      // Execute in atomic transaction
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
          attachment_mime_type: finalMimeType,
          attachment_size_bytes: finalSizeBytes,
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

        // Reserve or Commit Balance in Ledger
        if (typeRecord.deducts_balance) {
          await leaveLedgerService.reserveBalance({
            employeeId: employee.id,
            days: durationDays,
            leaveRequestId: insertId,
            version: 1,
            reason: `Pengajuan ${typeRecord.name} (${start_date} s/d ${end_date})`,
            actor
          }, trx);

          if (shouldBypass) {
            await leaveLedgerService.commitBalance({
              employeeId: employee.id,
              days: durationDays,
              leaveRequestId: insertId,
              version: 1,
              reason: `Persetujuan bypass cuti (${bypass_reason || '-'})`,
              actor
            }, trx);
          }
        }

        // Build snapshot approval steps
        const profileId = typeRecord.approval_profile_id || 1;
        const profileSteps = await trx('leave_approval_profile_steps')
          .where({ profile_id: profileId })
          .orderBy('step_no', 'asc');

        const unitHead = await trx('school_unit_approvers')
          .where({ school_unit_id: employee.school_unit_id, approver_role: 'unit_head' })
          .where(b => {
            const today = todayWIB();
            b.where('valid_from', '<=', today)
              .andWhere(sub => sub.whereNull('valid_to').orWhere('valid_to', '>=', today));
          })
          .first();

        const { steps: snapshotSteps, initialStepNo } = buildApprovalSteps(
          { id: profileId, steps: profileSteps },
          employee,
          durationDays,
          {
            getUnitHead: () => (unitHead ? { employeeId: unitHead.employee_id } : null),
            isApplicantOnlyHrd: () => false
          }
        );

        if (shouldBypass) {
          for (const s of snapshotSteps) {
            if (s.status === 'pending') {
              s.status = 'bypassed';
              s.skip_reason = 'bypassed:hr_override';
              s.acted_by_user_id = actor.userId;
              s.acted_by_employee_id = actor.employeeId || null;
              s.acted_at = new Date();
              s.comment = bypass_reason;
            }
          }
        }

        const stepsToInsert = snapshotSteps.map(s => ({
          entity_type: 'leave',
          entity_id: insertId,
          request_version: 1,
          step_no: s.step_no,
          approver_source: s.approver_source,
          assigned_employee_id: s.assigned_employee_id,
          status: s.status,
          skip_reason: s.skip_reason,
          acted_by_user_id: s.acted_by_user_id,
          acted_by_employee_id: s.acted_by_employee_id,
          on_behalf_of_employee_id: s.on_behalf_of_employee_id,
          acted_at: s.acted_at,
          comment: s.comment,
          created_at: new Date(),
          updated_at: new Date()
        }));

        if (stepsToInsert.length > 0) {
          await trx('approval_steps').insert(stepsToInsert);
        }

        await trx('employee_leave_requests')
          .where({ id: insertId })
          .update({ current_step_no: shouldBypass ? null : initialStepNo });

        // Audit Log
        if (actor.userId) {
          await trx('leave_audit_logs').insert({
            entity_type: 'leave_request',
            entity_id: insertId,
            action: shouldBypass ? 'create_and_bypass' : 'submit',
            actor_user_id: actor.userId,
            actor_employee_id: actor.employeeId || null,
            after_json: JSON.stringify({
              leave_type: typeRecord.code,
              start_date,
              end_date,
              duration_days: durationDays,
              status: initialStatus
            }),
            reason: shouldBypass ? bypass_reason : reason,
            created_at: new Date()
          });
        }

        return insertId;
      });

      return this.getLeaveRequestById(insertResult, actor);
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Get list of leave requests with scoping, filters, and pagination (SPEC §11.2, §9.2)
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

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_READ) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );

    if (!isHr) {
      if (!actor || !actor.employeeId) {
        return { data: [], total: 0, page: 1, perPage: 25 };
      }
      q = q.where('elr.employee_id', actor.employeeId);
    } else {
      if (actor.unitScope && actor.unitScope !== 'all' && Array.isArray(actor.unitScope)) {
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

    const hasPage = query.page !== undefined;
    const page = parseInt(query.page, 10) || 1;
    const perPage = parseInt(query.per_page, 10) || 25;
    const offset = (page - 1) * perPage;

    const countQ = q.clone().clearSelect().count('elr.id as total').first();
    const countRes = await countQ;
    const total = countRes ? countRes.total : 0;

    let rowsQuery = q.orderBy('elr.created_at', 'desc');
    if (hasPage) {
      rowsQuery = rowsQuery.limit(perPage).offset(offset);
    }

    const rows = await rowsQuery;

    const formatted = rows.map(r => {
      const item = { ...r };
      const hasAttachment = Boolean(item.attachment_url || item.attachment_name);
      delete item.attachment_url; // Don't expose raw URL in list (SPEC §9.2)

      // Privacy §2 #17: Mask reason if sick leave and viewer is not HR nor owner
      const isOwner = actor && actor.employeeId && Number(actor.employeeId) === Number(item.employee_id);
      if (item.leave_type === 'sakit' && !isHr && !isOwner) {
        item.reason = '[Disembunyikan untuk privasi medis]';
      }

      return {
        ...item,
        start_date: formatDbDate(item.start_date),
        end_date: formatDbDate(item.end_date),
        has_attachment: hasAttachment,
        duration_days: parseFloat(item.duration_days) || 0,
        day_breakdown: typeof item.day_breakdown === 'string' ? JSON.parse(item.day_breakdown) : item.day_breakdown
      };
    });

    if (hasPage) {
      return {
        data: formatted,
        total,
        page,
        perPage
      };
    }

    return {
      data: formatted,
      total
    };
  }

  /**
   * Get single leave request detail by ID (SPEC §11.2, §9.3, §2 #17)
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

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_READ) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );
    const isOwner = actor && actor.employeeId && Number(actor.employeeId) === Number(row.employee_id);

    // Fetch approval steps for current version
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

    // Overlapping colleagues (colleague names only, no reasons/attachments)
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

    // Balance preview if available
    let balancePreview = null;
    if (row.leave_type_id) {
      const typeRecord = await db('leave_types').where({ id: row.leave_type_id }).first();
      if (typeRecord && typeRecord.deducts_balance) {
        balancePreview = await leaveLedgerService.getEmployeeBalance(row.employee_id);
      }
    }

    const item = { ...row };
    if (item.leave_type === 'sakit' && !isHr && !isOwner) {
      item.reason = '[Disembunyikan untuk privasi medis]';
      delete item.attachment_url;
    }

    return {
      ...item,
      start_date: formatDbDate(item.start_date),
      end_date: formatDbDate(item.end_date),
      duration_days: parseFloat(item.duration_days) || 0,
      day_breakdown: typeof item.day_breakdown === 'string' ? JSON.parse(item.day_breakdown) : item.day_breakdown,
      approval_steps: steps.map(s => ({
        ...s,
        acted_at: s.acted_at ? s.acted_at.toISOString ? s.acted_at.toISOString() : s.acted_at : null
      })),
      overlapping_colleagues: overlaps.map(o => ({
        ...o,
        start_date: formatDbDate(o.start_date),
        end_date: formatDbDate(o.end_date)
      })),
      balance_preview: balancePreview
    };
  }

  /**
   * Get Inbox for current actor (SPEC §11.2, §6.1, §6.3)
   */
  async getLeaveInbox(query = {}, actor = null) {
    if (!actor) return { data: [], total: 0 };

    const today = todayWIB();
    const isHr = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
                 (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    // 1. Fetch active delegations where actor is the delegate
    let delegatedFromEmpIds = [];
    if (actor.employeeId) {
      const delegations = await db('approval_delegations')
        .where({ delegate_employee_id: actor.employeeId, is_active: 1 })
        .whereNull('revoked_at')
        .whereIn('scope', ['leave', 'all'])
        .where('valid_from', '<=', today)
        .where('valid_to', '>=', today);
      delegatedFromEmpIds = delegations.map(d => d.delegator_employee_id);
    }

    let q = db('approval_steps as aps')
      .join('employee_leave_requests as elr', function() {
        this.on('aps.entity_id', '=', 'elr.id')
          .andOn('aps.request_version', '=', 'elr.version')
          .andOn('aps.step_no', '=', 'elr.current_step_no');
      })
      .join('employees as e', 'elr.employee_id', 'e.id')
      .leftJoin('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where('aps.entity_type', 'leave')
      .where('aps.status', 'pending')
      .where('elr.status', 'pending')
      .select(
        'elr.*',
        'aps.id as step_id',
        'aps.step_no',
        'aps.approver_source',
        'aps.assigned_employee_id',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        'jp.name as position_name',
        db.raw('COALESCE(lt.name, elr.leave_type) as leave_type_name'),
        'lt.category as leave_category',
        'lt.color as leave_type_color'
      );

    // Filter by actor authorization
    q = q.where(function() {
      // Direct assignment
      if (actor.employeeId) {
        this.where('aps.assigned_employee_id', actor.employeeId);
        if (delegatedFromEmpIds.length > 0) {
          this.orWhereIn('aps.assigned_employee_id', delegatedFromEmpIds);
        }
      }

      // HRD pool
      if (isHr) {
        this.orWhere('aps.approver_source', 'hrd_pool');
        // Unassigned supervisor/unit_head step fallback
        this.orWhere(sub => {
          sub.whereIn('aps.approver_source', ['direct_supervisor', 'unit_head'])
            .whereNull('aps.assigned_employee_id');
        });
      }

      // Yayasan pool
      if ((actor.roles && actor.roles.includes('admin_yayasan')) || isOverride) {
        this.orWhere('aps.approver_source', 'yayasan_pool');
      }
    });

    // Anti self-approval filter (SPEC §6.4: cannot approve own request unless override)
    if (actor.employeeId && !isOverride) {
      q = q.where('elr.employee_id', '!=', actor.employeeId);
    }

    // Unit scope filtering
    if (actor.unitScope && actor.unitScope !== 'all' && Array.isArray(actor.unitScope)) {
      q = q.whereIn('e.school_unit_id', actor.unitScope);
    }

    const rows = await q.orderBy('elr.created_at', 'desc');

    const formatted = rows.map(r => {
      const item = { ...r };
      delete item.attachment_url;
      const isOwner = actor && actor.employeeId && Number(actor.employeeId) === Number(item.employee_id);
      if (item.leave_type === 'sakit' && !isHr && !isOwner) {
        item.reason = '[Disembunyikan untuk privasi medis]';
      }
      return {
        ...item,
        duration_days: parseFloat(item.duration_days) || 0,
        day_breakdown: typeof item.day_breakdown === 'string' ? JSON.parse(item.day_breakdown) : item.day_breakdown
      };
    });

    return {
      data: formatted,
      total: formatted.length
    };
  }

  /**
   * Get Leave Requests that Need Review (SPEC §11.2, §8 #4, #5, §6.1)
   */
  async getLeaveNeedsReview(query = {}, actor = null) {
    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_READ) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );

    if (!isHr) {
      return { data: [], total: 0 };
    }

    // 1. Pending requests with unassigned active steps
    const unassignedItems = await db('approval_steps as aps')
      .join('employee_leave_requests as elr', function() {
        this.on('aps.entity_id', '=', 'elr.id')
          .andOn('aps.request_version', '=', 'elr.version')
          .andOn('aps.step_no', '=', 'elr.current_step_no');
      })
      .join('employees as e', 'elr.employee_id', 'e.id')
      .leftJoin('leave_types as lt', 'elr.leave_type_id', 'lt.id')
      .where('aps.entity_type', 'leave')
      .where('aps.status', 'pending')
      .whereNull('aps.assigned_employee_id')
      .whereIn('aps.approver_source', ['direct_supervisor', 'unit_head'])
      .select(
        'elr.*',
        'aps.step_no',
        'aps.approver_source',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        db.raw("'unassigned_step' as review_reason")
      );

    // 2. Pending/approved requests for inactive/resigned employees
    const inactiveEmployeeItems = await db('employee_leave_requests as elr')
      .join('employees as e', 'elr.employee_id', 'e.id')
      .whereIn('elr.status', ['pending', 'approved'])
      .where('e.account_status', '!=', 'active')
      .select(
        'elr.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        db.raw("'inactive_employee' as review_reason")
      );

    // 3. Overdue SLA pending requests (> 72 hours)
    const overdueHours = 72;
    const overdueThreshold = new Date(Date.now() - overdueHours * 60 * 60 * 1000);
    const overdueItems = await db('employee_leave_requests as elr')
      .join('employees as e', 'elr.employee_id', 'e.id')
      .where('elr.status', 'pending')
      .where('elr.created_at', '<', overdueThreshold)
      .select(
        'elr.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        db.raw("'overdue_sla' as review_reason")
      );

    // Combine and deduplicate
    const combined = [...unassignedItems, ...inactiveEmployeeItems, ...overdueItems];
    const seen = new Set();
    const result = [];

    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        delete item.attachment_url;
        result.push({
          ...item,
          duration_days: parseFloat(item.duration_days) || 0
        });
      }
    }

    return {
      data: result,
      total: result.length
    };
  }

  /**
   * Approve Leave Request Step (SPEC §6.3, §6.5, §5.5)
   */
  async approveLeaveRequest(id, actor, comment = null, bypass = false) {
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Pengajuan dengan status '${request.status}' tidak dapat disetujui`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    // Check period lock
    const isLocked = await this.isPeriodLockedForDate(request.start_date, request.school_unit_id);
    if (isLocked) {
      const err = new Error('Periode presensi untuk tanggal cuti ini telah terkunci');
      err.code = 'PERIOD_LOCKED';
      err.statusCode = 409;
      throw err;
    }

    const steps = request.approval_steps || [];
    const currentStep = steps.find(s => s.step_no === request.current_step_no && s.status === 'pending');

    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    if (bypass) {
      if (!isOverride) {
        const err = new Error('Bypass approval memerlukan hak akses override');
        err.code = 'OVERRIDE_PERMISSION_REQUIRED';
        err.statusCode = 403;
        throw err;
      }
    } else {
      if (!currentStep) {
        const err = new Error('Langkah persetujuan aktif tidak ditemukan');
        err.code = 'ILLEGAL_TRANSITION';
        err.statusCode = 409;
        throw err;
      }

      // Check delegations
      let delegations = [];
      if (actor.employeeId) {
        delegations = await db('approval_delegations')
          .where({ delegate_employee_id: actor.employeeId, is_active: 1 })
          .whereNull('revoked_at');
      }

      const authCheck = canActOnStep(actor, currentStep, delegations, todayWIB(), request.employee_id);
      if (!authCheck.canAct) {
        const err = new Error(authCheck.reason === 'SELF_APPROVAL_FORBIDDEN'
          ? 'Anda tidak dapat menyetujui pengajuan cuti Anda sendiri'
          : 'Anda tidak memiliki hak akses untuk menyetujui langkah ini');
        err.code = authCheck.reason || 'FORBIDDEN';
        err.statusCode = 403;
        throw err;
      }
    }

    const nextState = applyAction(
      {
        currentStatus: request.status,
        currentStepNo: request.current_step_no,
        version: request.version,
        steps
      },
      {
        type: bypass ? 'bypass' : 'approve',
        actor,
        comment,
        bypassReason: comment || 'Bypass oleh HRD override',
        isOverride
      }
    );

    await db.transaction(async (trx) => {
      for (const st of nextState.steps) {
        await trx('approval_steps')
          .where({
            entity_type: 'leave',
            entity_id: id,
            request_version: request.version,
            step_no: st.step_no
          })
          .update({
            status: st.status,
            acted_by_user_id: st.acted_by_user_id,
            acted_by_employee_id: st.acted_by_employee_id,
            acted_at: st.acted_at,
            comment: st.comment,
            skip_reason: st.skip_reason,
            updated_at: new Date()
          });
      }

      await trx('employee_leave_requests').where({ id }).update({
        status: nextState.currentStatus,
        current_step_no: nextState.currentStepNo,
        approved_by: nextState.currentStatus === 'approved' ? actor.userId : null,
        approved_at: nextState.currentStatus === 'approved' ? new Date() : null,
        updated_at: new Date()
      });

      // If fully approved and deducts balance -> Commit balance in ledger
      if (nextState.currentStatus === 'approved') {
        const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);
        if (typeRecord && typeRecord.deducts_balance) {
          await leaveLedgerService.commitBalance({
            employeeId: request.employee_id,
            days: request.duration_days,
            leaveRequestId: id,
            version: request.version,
            reason: `Persetujuan ${bypass ? 'bypass' : 'akhir'} cuti: ${comment || '-'}`,
            actor
          }, trx);
        }
      }

      // Audit Log
      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: bypass ? 'bypass_approve' : 'approve_step',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: comment,
          after_json: JSON.stringify({ status: nextState.currentStatus, current_step_no: nextState.currentStepNo }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Reject Leave Request (SPEC §6.4, §6.5, §5.5)
   */
  async rejectLeaveRequest(id, actor, rejectionReason) {
    if (!rejectionReason || !String(rejectionReason).trim()) {
      const err = new Error('Alasan penolakan wajib diisi');
      err.code = 'REJECTION_REASON_REQUIRED';
      err.statusCode = 422;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending' && request.status !== 'revision_requested') {
      const err = new Error(`Pengajuan dengan status '${request.status}' tidak dapat ditolak`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const steps = request.approval_steps || [];
    const currentStep = steps.find(s => s.step_no === request.current_step_no);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    if (currentStep && !isOverride) {
      let delegations = [];
      if (actor.employeeId) {
        delegations = await db('approval_delegations')
          .where({ delegate_employee_id: actor.employeeId, is_active: 1 })
          .whereNull('revoked_at');
      }
      const authCheck = canActOnStep(actor, currentStep, delegations, todayWIB(), request.employee_id);
      if (!authCheck.canAct) {
        const err = new Error('Anda tidak memiliki wewenang untuk menolak pengajuan ini');
        err.code = authCheck.reason || 'FORBIDDEN';
        err.statusCode = 403;
        throw err;
      }
    }

    const nextState = applyAction(
      {
        currentStatus: request.status,
        currentStepNo: request.current_step_no,
        version: request.version,
        steps
      },
      {
        type: 'reject',
        actor,
        reason: rejectionReason,
        isOverride
      }
    );

    await db.transaction(async (trx) => {
      for (const st of nextState.steps) {
        await trx('approval_steps')
          .where({
            entity_type: 'leave',
            entity_id: id,
            request_version: request.version,
            step_no: st.step_no
          })
          .update({
            status: st.status,
            acted_by_user_id: st.acted_by_user_id,
            acted_by_employee_id: st.acted_by_employee_id,
            acted_at: st.acted_at,
            comment: st.comment,
            updated_at: new Date()
          });
      }

      await trx('employee_leave_requests').where({ id }).update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        current_step_no: null,
        updated_at: new Date()
      });

      // Release reserved balance in ledger
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
   * Request Revision (SPEC §6.4, §6.5)
   */
  async requestRevision(id, actor, comment) {
    if (!comment || !String(comment).trim()) {
      const err = new Error('Catatan permintaan revisi wajib diisi');
      err.code = 'REVISION_COMMENT_REQUIRED';
      err.statusCode = 422;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error(`Pengajuan dengan status '${request.status}' tidak dapat diminta revisi`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const steps = request.approval_steps || [];
    const currentStep = steps.find(s => s.step_no === request.current_step_no);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    if (currentStep && !isOverride) {
      let delegations = [];
      if (actor.employeeId) {
        delegations = await db('approval_delegations')
          .where({ delegate_employee_id: actor.employeeId, is_active: 1 })
          .whereNull('revoked_at');
      }
      const authCheck = canActOnStep(actor, currentStep, delegations, todayWIB(), request.employee_id);
      if (!authCheck.canAct) {
        const err = new Error('Anda tidak memiliki hak akses untuk meminta revisi');
        err.code = authCheck.reason || 'FORBIDDEN';
        err.statusCode = 403;
        throw err;
      }
    }

    const nextState = applyAction(
      {
        currentStatus: request.status,
        currentStepNo: request.current_step_no,
        version: request.version,
        steps
      },
      {
        type: 'request-revision',
        actor,
        comment,
        isOverride
      }
    );

    await db.transaction(async (trx) => {
      for (const st of nextState.steps) {
        await trx('approval_steps')
          .where({
            entity_type: 'leave',
            entity_id: id,
            request_version: request.version,
            step_no: st.step_no
          })
          .update({
            status: st.status,
            acted_by_user_id: st.acted_by_user_id,
            acted_by_employee_id: st.acted_by_employee_id,
            acted_at: st.acted_at,
            comment: st.comment,
            updated_at: new Date()
          });
      }

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
   * Resubmit Leave Request with new details (SPEC §6.4, §6.5, §5.5)
   */
  async resubmitLeaveRequest(id, data = {}, actor) {
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (request.status !== 'revision_requested') {
      const err = new Error(`Pengajuan dengan status '${request.status}' tidak dapat dikirim ulang`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const isOwner = actor.employeeId && Number(actor.employeeId) === Number(request.employee_id);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    if (!isOwner && !isOverride) {
      const err = new Error('Hanya pemilik pengajuan yang dapat mengirim ulang revisi');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    // Merge revised fields or keep old ones
    const newStartDate = data.start_date || request.start_date;
    const newEndDate = data.end_date || request.end_date;
    const newStartPortion = data.start_portion || request.start_portion;
    const newEndPortion = data.end_portion || request.end_portion;
    const newReason = data.reason !== undefined ? data.reason : request.reason;

    const employee = await db('employees').where({ id: request.employee_id }).first();
    const typeRecord = await db('leave_types').where({ id: request.leave_type_id }).first();

    const dayFacts = await this.buildDayFacts(employee.id, employee.school_unit_id, newStartDate, newEndDate);
    const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);

    const durationRes = computeDuration({
      startDate: newStartDate,
      endDate: newEndDate,
      startPortion: newStartPortion,
      endPortion: newEndPortion,
      countMode: typeRecord.count_mode || 'work_days',
      dayFacts,
      flexibleDayRule: settings.flexible_employee_day_rule || 'mon_fri',
      holidayInsideCalendarCounted: settings.holiday_inside_calendar_leave_counted !== undefined ? settings.holiday_inside_calendar_leave_counted : true
    });

    const newDurationDays = durationRes.total;
    const nextVersion = request.version + 1;

    // Reset approval steps for version + 1
    const profileId = typeRecord.approval_profile_id || 1;
    const profileSteps = await db('leave_approval_profile_steps')
      .where({ profile_id: profileId })
      .orderBy('step_no', 'asc');

    const unitHead = await db('school_unit_approvers')
      .where({ school_unit_id: employee.school_unit_id, approver_role: 'unit_head' })
      .first();

    const { steps: newSnapshotSteps, initialStepNo } = buildApprovalSteps(
      { id: profileId, steps: profileSteps },
      employee,
      newDurationDays,
      {
        getUnitHead: () => (unitHead ? { employeeId: unitHead.employee_id } : null),
        isApplicantOnlyHrd: () => false
      }
    );

    await db.transaction(async (trx) => {
      // Re-adjust ledger if duration or leave type changed
      if (typeRecord.deducts_balance) {
        // Release old version reservation
        await leaveLedgerService.releaseBalance({
          employeeId: employee.id,
          days: request.duration_days,
          leaveRequestId: id,
          version: request.version,
          reason: `Pembaruan revisi pengajuan (v${request.version} -> v${nextVersion})`,
          actor
        }, trx);

        // Reserve new version amount
        await leaveLedgerService.reserveBalance({
          employeeId: employee.id,
          days: newDurationDays,
          leaveRequestId: id,
          version: nextVersion,
          reason: `Pengajuan revisi (v${nextVersion})`,
          actor
        }, trx);
      }

      // Insert new version steps
      const stepsToInsert = newSnapshotSteps.map(s => ({
        entity_type: 'leave',
        entity_id: id,
        request_version: nextVersion,
        step_no: s.step_no,
        approver_source: s.approver_source,
        assigned_employee_id: s.assigned_employee_id,
        status: s.status,
        skip_reason: s.skip_reason,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await trx('approval_steps').insert(stepsToInsert);

      await trx('employee_leave_requests').where({ id }).update({
        start_date: newStartDate,
        end_date: newEndDate,
        start_portion: newStartPortion,
        end_portion: newEndPortion,
        duration_days: newDurationDays,
        day_breakdown: JSON.stringify(durationRes.breakdown),
        reason: newReason,
        status: 'pending',
        version: nextVersion,
        current_step_no: initialStepNo,
        rejection_reason: null,
        updated_at: new Date()
      });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'resubmit',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason: 'Kirim ulang pengajuan setelah revisi',
          after_json: JSON.stringify({ version: nextVersion, start_date: newStartDate, end_date: newEndDate, duration_days: newDurationDays }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Cancel Leave Request (SPEC §2 #23, §5.5, §6.4)
   */
  async cancelLeaveRequest(id, actor, cancelReason = 'Dibatalkan oleh pemohon') {
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (request.status === 'cancelled' || request.status === 'rejected') {
      const err = new Error(`Pengajuan dengan status '${request.status}' tidak dapat dibatalkan`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const isOwner = actor.employeeId && Number(actor.employeeId) === Number(request.employee_id);
    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    // Rule §2 #23: Owner can self-cancel approved request only if start_date >= 3 days ahead and period not locked
    const today = todayWIB();
    const daysAhead = diffInDays(today, request.start_date);

    if (request.status === 'approved') {
      const isLocked = await this.isPeriodLockedForDate(request.start_date, request.school_unit_id);
      if (isLocked) {
        const err = new Error('Periode presensi telah terkunci. Pembatalan cuti disetujui tidak dapat diproses.');
        err.code = 'PERIOD_LOCKED';
        err.statusCode = 409;
        throw err;
      }

      if (isOwner && !isOverride) {
        if (daysAhead < 3) {
          const err = new Error('Pembatalan cuti yang telah disetujui hanya dapat dilakukan minimal H-3 sebelum tanggal mulai. Hubungi HRD untuk bantuan.');
          err.code = 'SELF_CANCEL_DEADLINE_EXCEEDED';
          err.statusCode = 422;
          throw err;
        }
      }
    }

    if (!isOwner && !isOverride) {
      const err = new Error('Anda tidak memiliki wewenang untuk membatalkan pengajuan ini');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const typeRecord = await leaveTypeService.getLeaveType(request.leave_type);

    await db.transaction(async (trx) => {
      if (request.status === 'pending' || request.status === 'revision_requested') {
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
        if (typeRecord && typeRecord.deducts_balance) {
          // If start_date > today -> full refund. If partially elapsed -> refund future days
          let refundDays = request.duration_days;
          if (request.start_date <= today && request.end_date >= today && isOverride) {
            // Partial refund for remaining days
            const breakdown = request.day_breakdown || [];
            const futureBreakdown = breakdown.filter(b => b.date > today && b.state === 'COUNTED');
            refundDays = futureBreakdown.reduce((sum, b) => sum + (parseFloat(b.weight) || 0), 0);
          }

          if (refundDays > 0) {
            await leaveLedgerService.refundBalance({
              employeeId: request.employee_id,
              days: refundDays,
              leaveRequestId: id,
              reason: `Pengembalian saldo pembatalan cuti disetujui: ${cancelReason}`,
              actor
            }, trx);
          }
        }
      }

      await trx('employee_leave_requests').where({ id }).update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by_user_id: actor.userId,
        cancel_reason: cancelReason,
        current_step_no: null,
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
   * Reassign Approver on active pending step (SPEC §6.2, §11.2)
   */
  async reassignApprover(id, data = {}, actor) {
    const { step_no, new_employee_id, reason } = data;
    if (!new_employee_id || !reason) {
      const err = new Error('Field new_employee_id dan reason wajib diisi');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      throw err;
    }

    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE) ||
                       (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE);
    if (!isOverride) {
      const err = new Error('Pengalihan approver memerlukan hak akses HR/Override');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const targetStepNo = step_no || request.current_step_no;

    await db.transaction(async (trx) => {
      await trx('approval_steps')
        .where({
          entity_type: 'leave',
          entity_id: id,
          request_version: request.version,
          step_no: targetStepNo
        })
        .update({
          assigned_employee_id: new_employee_id,
          updated_at: new Date()
        });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'reassign_approver',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason,
          after_json: JSON.stringify({ step_no: targetStepNo, new_employee_id }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Reclassify leave type (SPEC §6.6, §11.2)
   */
  async reclassifyLeaveRequest(id, data = {}, actor) {
    const { new_leave_type, reason } = data;
    if (!new_leave_type || !reason) {
      const err = new Error('Field new_leave_type dan reason wajib diisi');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 422;
      throw err;
    }

    const isOverride = (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);
    if (!isOverride) {
      const err = new Error('Reklasifikasi jenis cuti memerlukan hak akses override');
      err.code = 'FORBIDDEN';
      err.statusCode = 403;
      throw err;
    }

    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const newType = await leaveTypeService.getLeaveType(new_leave_type);
    if (!newType) {
      const err = new Error(`Jenis cuti '${new_leave_type}' tidak ditemukan`);
      err.statusCode = 422;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('employee_leave_requests').where({ id }).update({
        leave_type: newType.code,
        leave_type_id: newType.id,
        updated_at: new Date()
      });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'reclassify',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason,
          after_json: JSON.stringify({ old_type: request.leave_type, new_type: newType.code }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Recalculate leave duration (SPEC §8 #4, §11.2)
   */
  async recalculateLeaveRequest(id, data = {}, actor) {
    const { reason = 'Rekalkulasi durasi oleh HRD' } = data;
    const request = await this.getLeaveRequestById(id, actor);
    if (!request) {
      const err = new Error('Pengajuan cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const employee = await db('employees').where({ id: request.employee_id }).first();
    const typeRecord = await db('leave_types').where({ id: request.leave_type_id }).first();

    const dayFacts = await this.buildDayFacts(employee.id, employee.school_unit_id, request.start_date, request.end_date);
    const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);

    const durationRes = computeDuration({
      startDate: request.start_date,
      endDate: request.end_date,
      startPortion: request.start_portion,
      endPortion: request.end_portion,
      countMode: typeRecord.count_mode || 'work_days',
      dayFacts,
      flexibleDayRule: settings.flexible_employee_day_rule || 'mon_fri',
      holidayInsideCalendarCounted: settings.holiday_inside_calendar_leave_counted !== undefined ? settings.holiday_inside_calendar_leave_counted : true
    });

    await db.transaction(async (trx) => {
      await trx('employee_leave_requests').where({ id }).update({
        duration_days: durationRes.total,
        day_breakdown: JSON.stringify(durationRes.breakdown),
        updated_at: new Date()
      });

      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: 'recalculate',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          reason,
          after_json: JSON.stringify({ old_duration: request.duration_days, new_duration: durationRes.total }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveRequestById(id, actor);
  }

  /**
   * Bulk Approve Leave Requests (SPEC §11.2)
   */
  async bulkApproveLeaveRequests(ids = [], actor, comment = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('Daftar ID pengajuan wajib berupa array tidak kosong');
      err.statusCode = 422;
      throw err;
    }
    if (ids.length > 50) {
      const err = new Error('Maksimal 50 pengajuan dalam satu proses bulk');
      err.statusCode = 422;
      throw err;
    }

    const results = [];
    for (const id of ids) {
      try {
        await this.approveLeaveRequest(id, actor, comment);
        results.push({ id, success: true, message: 'Berhasil disetujui' });
      } catch (err) {
        results.push({ id, success: false, message: err.message, code: err.code || 'APPROVE_FAILED' });
      }
    }

    return { results };
  }

  /**
   * Bulk Reject Leave Requests (SPEC §11.2)
   */
  async bulkRejectLeaveRequests(ids = [], actor, reason = 'Ditolak secara bulk') {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('Daftar ID pengajuan wajib berupa array tidak kosong');
      err.statusCode = 422;
      throw err;
    }
    if (ids.length > 50) {
      const err = new Error('Maksimal 50 pengajuan dalam satu proses bulk');
      err.statusCode = 422;
      throw err;
    }

    const results = [];
    for (const id of ids) {
      try {
        await this.rejectLeaveRequest(id, actor, reason);
        results.push({ id, success: true, message: 'Berhasil ditolak' });
      } catch (err) {
        results.push({ id, success: false, message: err.message, code: err.code || 'REJECT_FAILED' });
      }
    }

    return { results };
  }

  /**
   * Calendar matrix for monthly team view (SPEC §11.2)
   */
  async getCalendarMatrix({ month, schoolUnitId, category = null, includeOvertime = true }, actor) {
    if (!month) month = todayWIB().slice(0, 7);

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
