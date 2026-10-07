/**
 * Overtime Service
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #18-22, §7 (seluruh), §8.3, §10.1, §10.2, §11.4, §12
 */

const db = require('../../../config/db/kepegawaian');
const holidayService = require('./holidayService');
const leaveTypeService = require('./leaveTypeService');
const { todayWIB, dateRange, diffInDays, formatDbDate } = require('./dateHelper');
const { resolveActor, isUnitInScope } = require('../common/actorHelper');
const {
  classifyDayType,
  checkOvertimeLimits,
  computePayableHours,
  computeMultiplierBreakdown,
  estimateWage,
  checkLeaveOvertimeConflict
} = require('./overtimeEngine');

const HR_PERMISSIONS = {
  OVERTIMES_MANAGE: 'kepegawaian.overtimes.manage',
  LEAVE_READ: 'kepegawaian.leave_requests.read',
  LEAVE_MANAGE: 'kepegawaian.leave_requests.manage',
  LEAVE_OVERRIDE: 'kepegawaian.leave_requests.override',
  OVERTIME_SETTINGS_MANAGE: 'kepegawaian.overtime_settings.manage'
};

class OvertimeService {
  /**
   * Helper to resolve actor context
   */
  async resolveActor(user) {
    return resolveActor(user, db);
  }

  /**
   * Check if date touches locked attendance period (SPEC §8 #3)
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
   * Fetch active policy and multiplier tiers for a school unit (or global default)
   */
  async getEffectivePolicy(schoolUnitId = null, trx = null) {
    const knex = trx || db;
    let policy = null;
    if (schoolUnitId) {
      policy = await knex('overtime_rate_policies')
        .where({ school_unit_id: schoolUnitId, is_active: 1 })
        .first();
    }
    if (!policy) {
      policy = await knex('overtime_rate_policies')
        .where({ is_active: 1 })
        .orderBy('school_unit_id', 'asc')
        .first();
    }

    if (!policy) {
      policy = {
        id: 1,
        name: 'Kebijakan Lembur Standar Yayasan',
        school_unit_id: null,
        calc_method: 'flat_hourly',
        flat_hourly_rate: null,
        wage_divisor: 173,
        rounding_minutes: 30,
        min_payable_minutes: 30,
        max_hours_per_day: 4.0,
        max_hours_per_week: 18.0,
        max_hours_per_month: 72.0,
        eligible_employment_statuses: ['GTY', 'PTY']
      };
    } else if (typeof policy.eligible_employment_statuses === 'string') {
      try {
        policy.eligible_employment_statuses = JSON.parse(policy.eligible_employment_statuses);
      } catch (e) {
        policy.eligible_employment_statuses = ['GTY', 'PTY'];
      }
    }

    let tiers = [];
    if (policy && policy.id) {
      tiers = await knex('overtime_multiplier_tiers')
        .where({ policy_id: policy.id })
        .orderBy('day_type', 'asc')
        .orderBy('from_hour', 'asc');
    }

    return { policy, tiers };
  }

  /**
   * Determine automatic day_type (workday, weekend, holiday) (SPEC §7.2)
   */
  async resolveDayType(dateStr, employeeId, schoolUnitId) {
    const holidays = await holidayService.getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, dateStr, dateStr);
    const dayHolidays = holidays[dateStr] || [];

    const customAssignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: 1 })
      .first();

    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    let scheduleState = (dow === 0 || dow === 6) ? 'NONWORKDAY' : 'WORKDAY';

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

    return classifyDayType(dateStr, scheduleState, dayHolidays);
  }

  /**
   * Preview Overtime Request (SPEC §11.4, §7)
   */
  async previewOvertime(data, actor) {
    const {
      employee_id,
      overtime_date,
      start_time = null,
      end_time = null,
      hours = null,
      origin = 'requested',
      day_type_override = null,
      requires_actual_attendance = true
    } = data;

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );

    let targetEmployeeId = actor.employeeId;
    if (employee_id && isHr) {
      targetEmployeeId = Number(employee_id);
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

    if (!isUnitInScope(actor.unitScope, employee.school_unit_id)) {
      const err = new Error('Pegawai berada di luar cakupan satuan pendidikan Anda');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    const { policy, tiers } = await this.getEffectivePolicy(employee.school_unit_id);
    const errors = [];
    const warnings = [];

    // Check employment status eligibility (SPEC §7.1, §2 #22)
    if (policy.eligible_employment_statuses && Array.isArray(policy.eligible_employment_statuses)) {
      const empStatus = employee.employment_status || '';
      const isEligible = policy.eligible_employment_statuses.some(s => s.toUpperCase() === empStatus.toUpperCase());
      if (!isEligible) {
        errors.push({
          code: 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE',
          field: 'employee_id',
          message: `Status kepegawaian '${empStatus}' tidak memenuhi syarat penugasan/klaim lembur`
        });
      }
    }

    // Check period lock (SPEC §8 #3)
    const isLocked = await this.isPeriodLockedForDate(overtime_date, employee.school_unit_id);
    if (isLocked) {
      errors.push({
        code: 'PERIOD_LOCKED',
        field: 'overtime_date',
        message: `Periode presensi tanggal ${overtime_date} telah dikunci`
      });
    }

    // Check self-claim backdate limit (SPEC §7.1, §2 #18, §3.5)
    if (origin === 'requested') {
      const settings = await leaveTypeService.getLeaveSettings(employee.school_unit_id);
      const maxBackdate = settings.overtime_self_claim_max_backdate_days !== undefined ? settings.overtime_self_claim_max_backdate_days : 7;
      const today = todayWIB();
      const diffDays = diffInDays(overtime_date, today);
      if (diffDays > maxBackdate) {
        errors.push({
          code: 'BACKDATE_EXCEEDED',
          field: 'overtime_date',
          message: `Klaim lembur mandiri melampaui batas mundur maksimal (${maxBackdate} hari)`
        });
      }
    }

    // Check leave conflict (SPEC §7.4)
    const leavesOnDate = await db('employee_leave_requests')
      .where({ employee_id: employee.id })
      .where('start_date', '<=', overtime_date)
      .where('end_date', '>=', overtime_date)
      .whereNotIn('status', ['cancelled', 'rejected']);

    const leaveConflict = checkLeaveOvertimeConflict(leavesOnDate, overtime_date);
    if (leaveConflict.hasConflict) {
      errors.push({
        code: 'OVERTIME_CONFLICT',
        field: 'overtime_date',
        message: leaveConflict.message
      });
    } else if (leaveConflict.conflictingLeave) {
      warnings.push({
        code: 'HALF_DAY_LEAVE_WARNING',
        message: leaveConflict.message
      });
    }

    // Day type resolution
    const dayType = day_type_override || await this.resolveDayType(overtime_date, employee.id, employee.school_unit_id);

    // Determine hours
    let calculatedHours = parseFloat(hours) || 0;
    if ((!calculatedHours || calculatedHours <= 0) && start_time && end_time) {
      const payableRes = computePayableHours({
        windowStart: start_time,
        windowEnd: end_time,
        requiresAttendance: false,
        policy
      });
      calculatedHours = payableRes.payableHours;
    }

    if (calculatedHours <= 0) {
      errors.push({
        code: 'INVALID_HOURS',
        field: 'hours',
        message: 'Durasi lembur harus lebih dari 0 jam'
      });
    }

    // Check limits (daily, weekly, monthly)
    const existingOvertimes = await db('employee_overtimes')
      .where({ employee_id: employee.id })
      .whereNotIn('status', ['cancelled', 'rejected']);

    const limitCheck = checkOvertimeLimits(existingOvertimes, calculatedHours, policy, overtime_date);
    if (!limitCheck.valid) {
      for (const errStr of limitCheck.errors) {
        errors.push({
          code: 'OVERTIME_LIMIT_EXCEEDED',
          field: 'hours',
          message: errStr
        });
      }
    }

    // Multiplier & wage estimation
    const multiplierBreakdown = computeMultiplierBreakdown(calculatedHours, dayType, tiers);
    const estimatedWage = estimateWage(
      multiplierBreakdown,
      policy.flat_hourly_rate,
      null,
      policy.calc_method,
      policy.wage_divisor
    );

    return {
      can_submit: errors.length === 0,
      employee_id: employee.id,
      employee_name: employee.full_name,
      overtime_date,
      day_type: dayType,
      day_type_overridden: Boolean(day_type_override),
      hours: calculatedHours,
      start_time,
      end_time,
      requires_actual_attendance: Boolean(requires_actual_attendance),
      limits: limitCheck,
      multiplier_breakdown: multiplierBreakdown,
      estimated_wage: estimatedWage,
      warnings,
      errors
    };
  }

  /**
   * Submit / Assign Single Overtime Request (SPEC §7, §11.4)
   */
  async createOvertime(data, actor) {
    const {
      employee_id,
      overtime_date,
      start_time = null,
      end_time = null,
      hours = null,
      task_description = '',
      origin = 'requested',
      spk_number = null,
      day_type_override = null,
      requires_actual_attendance = true,
      bypass_approval = false,
      bypass_reason = null,
      bypass_limits = false
    } = data;

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );
    const isOverride = actor && (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE);

    let targetEmployeeId = actor.employeeId;
    let finalOrigin = origin;

    if (employee_id && isHr) {
      targetEmployeeId = Number(employee_id);
      if (targetEmployeeId !== actor.employeeId && origin === 'requested') {
        finalOrigin = 'assigned';
      }
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

    if (!isUnitInScope(actor.unitScope, employee.school_unit_id)) {
      const err = new Error('Pegawai berada di luar cakupan satuan pendidikan Anda');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    // Run preview validation
    const preview = await this.previewOvertime({
      employee_id: employee.id,
      overtime_date,
      start_time,
      end_time,
      hours,
      origin: finalOrigin,
      day_type_override,
      requires_actual_attendance
    }, actor);

    // Filter out limit errors if HR explicitly bypasses limits with a valid reason
    let validationErrors = preview.errors;
    if (isHr && bypass_limits && bypass_reason) {
      validationErrors = validationErrors.filter(e => e.code !== 'OVERTIME_LIMIT_EXCEEDED');
    }

    if (validationErrors.length > 0) {
      const firstErr = validationErrors[0];
      const err = new Error(firstErr.message);
      err.code = firstErr.code;
      err.errors = validationErrors;
      err.statusCode = (firstErr.code === 'OVERTIME_CONFLICT' || firstErr.code === 'PERIOD_LOCKED') ? 409 : 422;
      throw err;
    }

    const shouldBypassApproval = Boolean(bypass_approval && isOverride);
    const initialStatus = shouldBypassApproval ? 'approved' : 'pending';

    const insertResult = await db.transaction(async (trx) => {
      const [insertId] = await trx('employee_overtimes').insert({
        school_unit_id: employee.school_unit_id,
        employee_id: employee.id,
        origin: finalOrigin,
        assigned_by_user_id: finalOrigin === 'assigned' ? (actor ? actor.userId : null) : null,
        spk_number,
        overtime_date,
        start_time,
        end_time,
        hours: preview.hours,
        day_type: preview.day_type,
        day_type_overridden: preview.day_type_overridden ? 1 : 0,
        requires_actual_attendance: requires_actual_attendance ? 1 : 0,
        rate_policy_id: preview.limits ? 1 : null,
        multiplier_breakdown: JSON.stringify(preview.multiplier_breakdown.breakdown),
        estimated_wage: preview.estimated_wage,
        task_description,
        status: initialStatus,
        version: 1,
        approved_by: shouldBypassApproval ? actor.userId : null,
        approved_at: shouldBypassApproval ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Insert snapshot approval step in approval_steps (SPEC §10.2)
      await trx('approval_steps').insert({
        entity_type: 'overtime',
        entity_id: insertId,
        request_version: 1,
        step_no: 1,
        approver_source: 'hrd_pool',
        assigned_employee_id: null,
        status: shouldBypassApproval ? 'bypassed' : 'pending',
        acted_by_user_id: shouldBypassApproval ? actor.userId : null,
        acted_by_employee_id: shouldBypassApproval ? (actor.employeeId || null) : null,
        acted_at: shouldBypassApproval ? new Date() : null,
        comment: shouldBypassApproval ? bypass_reason : null,
        skip_reason: shouldBypassApproval ? 'bypassed:hr_override' : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Audit Log
      if (actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'overtime',
          entity_id: insertId,
          action: shouldBypassApproval ? 'create_and_bypass' : 'submit',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({
            employee_id: employee.id,
            overtime_date,
            hours: preview.hours,
            day_type: preview.day_type,
            status: initialStatus
          }),
          reason: shouldBypassApproval ? bypass_reason : (bypass_limits ? `Bypass batas lembur: ${bypass_reason}` : task_description),
          created_at: new Date()
        });
      }

      return insertId;
    });

    return this.getOvertimeById(insertResult, actor);
  }

  /**
   * Bulk Assign Overtime (SPEC §11.4, §7.1)
   */
  async bulkCreateOvertime(data, actor) {
    const {
      employee_ids = [],
      overtime_date,
      start_time = null,
      end_time = null,
      hours = null,
      task_description = '',
      spk_number = null,
      day_type_override = null,
      requires_actual_attendance = true
    } = data;

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE)
    );

    if (!isHr) {
      const err = new Error('Hanya HRD / Admin yang berhak menugaskan lembur massal');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      const err = new Error('Daftar pegawai (employee_ids) tidak boleh kosong');
      err.code = 'EMPTY_EMPLOYEE_IDS';
      err.statusCode = 422;
      throw err;
    }

    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const items = [];
    let successCount = 0;
    let failCount = 0;

    for (const empId of employee_ids) {
      try {
        const created = await this.createOvertime({
          employee_id: empId,
          overtime_date,
          start_time,
          end_time,
          hours,
          task_description,
          origin: 'assigned',
          spk_number,
          day_type_override,
          requires_actual_attendance,
          assignment_batch_id: batchId
        }, actor);

        // Update batch ID in record
        await db('employee_overtimes').where({ id: created.id }).update({ assignment_batch_id: batchId });
        created.assignment_batch_id = batchId;

        items.push({ employee_id: empId, success: true, data: created });
        successCount++;
      } catch (err) {
        items.push({ employee_id: empId, success: false, error: err.message, code: err.code || 'OVERTIME_CREATE_ERROR' });
        failCount++;
      }
    }

    return {
      batch_id: batchId,
      total: employee_ids.length,
      successful: successCount,
      failed: failCount,
      items
    };
  }

  /**
   * Get list of overtimes with scoping, filters, and pagination (SPEC §11.4, §9.2)
   */
  async getOvertimes(query = {}, actor = null) {
    let q = db('employee_overtimes as eo')
      .join('employees as e', 'eo.employee_id', 'e.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .select(
        'eo.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        'jp.name as position_name'
      );

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_READ) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_MANAGE)
    );

    if (!isHr) {
      if (!actor || !actor.employeeId) {
        return { data: [], total: 0, page: 1, perPage: 25, meta: { total: 0, page: 1, per_page: 25, total_pages: 0 } };
      }
      q = q.where('eo.employee_id', actor.employeeId);
    } else {
      if (actor.unitScope && actor.unitScope !== 'all' && Array.isArray(actor.unitScope)) {
        q = q.whereIn('e.school_unit_id', actor.unitScope);
      }
      if (query.school_unit_id) {
        q = q.where('e.school_unit_id', query.school_unit_id);
      }
      if (query.employee_id) {
        q = q.where('eo.employee_id', query.employee_id);
      }
    }

    if (query.status) {
      if (Array.isArray(query.status)) q = q.whereIn('eo.status', query.status);
      else q = q.where('eo.status', query.status);
    }

    if (query.day_type) {
      q = q.where('eo.day_type', query.day_type);
    }

    if (query.origin) {
      q = q.where('eo.origin', query.origin);
    }

    if (query.realization_status) {
      q = q.where('eo.realization_status', query.realization_status);
    }

    if (query.date_from && query.date_to) {
      q = q.whereBetween('eo.overtime_date', [query.date_from, query.date_to]);
    } else if (query.month) {
      const startOfMonth = `${query.month}-01`;
      const endOfMonth = `${query.month}-31`;
      q = q.whereBetween('eo.overtime_date', [startOfMonth, endOfMonth]);
    }

    if (query.q) {
      q = q.where(b => {
        b.where('e.full_name', 'like', `%${query.q}%`)
          .orWhere('eo.spk_number', 'like', `%${query.q}%`)
          .orWhere('eo.task_description', 'like', `%${query.q}%`);
      });
    }

    const hasPage = query.page !== undefined;
    const page = parseInt(query.page, 10) || 1;
    const perPage = parseInt(query.per_page, 10) || 25;
    const offset = (page - 1) * perPage;

    const countQ = q.clone().clearSelect().count('eo.id as total').first();
    const countRes = await countQ;
    const total = countRes ? parseInt(countRes.total, 10) : 0;
    const totalPages = Math.ceil(total / perPage);

    let rowsQuery = q.orderBy('eo.overtime_date', 'desc').orderBy('eo.id', 'desc');
    if (hasPage) {
      rowsQuery = rowsQuery.limit(perPage).offset(offset);
    }

    const rows = await rowsQuery;

    const data = rows.map(r => ({
      ...r,
      overtime_date: formatDbDate(r.overtime_date),
      hours: parseFloat(r.hours) || 0,
      payable_hours: r.payable_hours != null ? parseFloat(r.payable_hours) : null,
      hourly_rate_snapshot: r.hourly_rate_snapshot != null ? parseFloat(r.hourly_rate_snapshot) : null,
      estimated_wage: r.estimated_wage != null ? parseFloat(r.estimated_wage) : null,
      multiplier_breakdown: typeof r.multiplier_breakdown === 'string' ? JSON.parse(r.multiplier_breakdown) : r.multiplier_breakdown
    }));

    return {
      data,
      total,
      page,
      perPage,
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: totalPages
      }
    };
  }

  /**
   * Get single overtime by ID with approval steps (SPEC §11.4)
   */
  async getOvertimeById(id, actor = null) {
    const row = await db('employee_overtimes as eo')
      .join('employees as e', 'eo.employee_id', 'e.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .where('eo.id', id)
      .select(
        'eo.*',
        'e.full_name as employee_name',
        'e.employee_number as nip',
        'e.school_unit_id',
        'jp.name as position_name'
      )
      .first();

    if (!row) return null;

    // Load approval steps
    const steps = await db('approval_steps')
      .where({ entity_type: 'overtime', entity_id: id, request_version: row.version || 1 })
      .orderBy('step_no', 'asc');

    return {
      ...row,
      overtime_date: formatDbDate(row.overtime_date),
      hours: parseFloat(row.hours) || 0,
      payable_hours: row.payable_hours != null ? parseFloat(row.payable_hours) : null,
      hourly_rate_snapshot: row.hourly_rate_snapshot != null ? parseFloat(row.hourly_rate_snapshot) : null,
      estimated_wage: row.estimated_wage != null ? parseFloat(row.estimated_wage) : null,
      multiplier_breakdown: typeof row.multiplier_breakdown === 'string' ? JSON.parse(row.multiplier_breakdown) : row.multiplier_breakdown,
      approval_steps: steps
    };
  }

  /**
   * Approve Overtime (SPEC §11.4)
   */
  async approveOvertime(id, actor, comment = null) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'pending') {
      const err = new Error(`Pengajuan lembur sudah berstatus '${existing.status}'`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    // Check period lock
    const isLocked = await this.isPeriodLockedForDate(existing.overtime_date, existing.school_unit_id);
    if (isLocked) {
      const err = new Error(`Periode presensi tanggal ${existing.overtime_date} telah dikunci`);
      err.code = 'PERIOD_LOCKED';
      err.statusCode = 409;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('employee_overtimes').where({ id }).update({
        status: 'approved',
        approved_by: actor ? actor.userId : null,
        approved_at: new Date(),
        updated_at: new Date()
      });

      // Update approval steps
      await trx('approval_steps')
        .where({ entity_type: 'overtime', entity_id: id, request_version: existing.version || 1 })
        .update({
          status: 'approved',
          acted_by_user_id: actor ? actor.userId : null,
          acted_by_employee_id: actor ? (actor.employeeId || null) : null,
          acted_at: new Date(),
          comment,
          updated_at: new Date()
        });

      // Audit Log
      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'overtime',
          entity_id: id,
          action: 'approve',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ status: 'approved' }),
          reason: comment || 'Persetujuan lembur',
          created_at: new Date()
        });
      }
    });

    return this.getOvertimeById(id, actor);
  }

  /**
   * Reject Overtime (SPEC §11.4)
   */
  async rejectOvertime(id, actor, rejectionReason) {
    if (!rejectionReason || !rejectionReason.trim()) {
      const err = new Error('Alasan penolakan wajib diisi');
      err.code = 'REJECTION_REASON_REQUIRED';
      err.statusCode = 422;
      throw err;
    }

    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'pending') {
      const err = new Error(`Pengajuan lembur sudah berstatus '${existing.status}'`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('employee_overtimes').where({ id }).update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        updated_at: new Date()
      });

      await trx('approval_steps')
        .where({ entity_type: 'overtime', entity_id: id, request_version: existing.version || 1 })
        .update({
          status: 'rejected',
          acted_by_user_id: actor ? actor.userId : null,
          acted_by_employee_id: actor ? (actor.employeeId || null) : null,
          acted_at: new Date(),
          comment: rejectionReason,
          updated_at: new Date()
        });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'overtime',
          entity_id: id,
          action: 'reject',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ status: 'rejected', rejection_reason: rejectionReason }),
          reason: rejectionReason,
          created_at: new Date()
        });
      }
    });

    return this.getOvertimeById(id, actor);
  }

  /**
   * Cancel Overtime (SPEC §11.4)
   */
  async cancelOvertime(id, actor, reason = null) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (['cancelled', 'rejected'].includes(existing.status)) {
      const err = new Error(`Pengajuan lembur sudah berstatus '${existing.status}'`);
      err.code = 'ILLEGAL_TRANSITION';
      err.statusCode = 409;
      throw err;
    }

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.LEAVE_OVERRIDE)
    );
    const isOwner = actor && actor.employeeId && Number(actor.employeeId) === Number(existing.employee_id);

    if (!isHr && !isOwner) {
      const err = new Error('Anda tidak memiliki wewenang untuk membatalkan lembur ini');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    // If approved, only HR can cancel, and check period lock
    if (existing.status === 'approved') {
      if (!isHr) {
        const err = new Error('Lembur yang sudah disetujui hanya dapat dibatalkan oleh HRD');
        err.code = 'HR_OVERRIDE_REQUIRED';
        err.statusCode = 403;
        throw err;
      }
      const isLocked = await this.isPeriodLockedForDate(existing.overtime_date, existing.school_unit_id);
      if (isLocked) {
        const err = new Error(`Periode presensi tanggal ${existing.overtime_date} telah dikunci`);
        err.code = 'PERIOD_LOCKED';
        err.statusCode = 409;
        throw err;
      }
    }

    await db.transaction(async (trx) => {
      await trx('employee_overtimes').where({ id }).update({
        status: 'cancelled',
        rejection_reason: reason,
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'overtime',
          entity_id: id,
          action: 'cancel',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ status: 'cancelled' }),
          reason: reason || 'Pembatalan lembur',
          created_at: new Date()
        });
      }
    });

    return this.getOvertimeById(id, actor);
  }

  /**
   * Reconcile Overtime with Attendance (SPEC §7.3, §11.4)
   */
  async reconcileOvertime(id, { payable_hours, realization_status = 'manual', reason = '' }, actor) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Check period lock
    const isLocked = await this.isPeriodLockedForDate(existing.overtime_date, existing.school_unit_id);
    if (isLocked) {
      const err = new Error(`Periode presensi tanggal ${existing.overtime_date} telah dikunci`);
      err.code = 'PERIOD_LOCKED';
      err.statusCode = 409;
      throw err;
    }

    const { policy, tiers } = await this.getEffectivePolicy(existing.school_unit_id);
    const parsedPayable = parseFloat(payable_hours) || 0;
    const multiplierBreakdown = computeMultiplierBreakdown(parsedPayable, existing.day_type, tiers);
    const estimatedWage = estimateWage(
      multiplierBreakdown,
      policy.flat_hourly_rate,
      null,
      policy.calc_method,
      policy.wage_divisor
    );

    await db.transaction(async (trx) => {
      await trx('employee_overtimes').where({ id }).update({
        payable_hours: parsedPayable,
        realization_status,
        multiplier_breakdown: JSON.stringify(multiplierBreakdown.breakdown),
        estimated_wage: estimatedWage,
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'overtime',
          entity_id: id,
          action: 'reconcile',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({
            payable_hours: parsedPayable,
            realization_status,
            estimated_wage: estimatedWage
          }),
          reason: reason || 'Rekonsiliasi lembur dengan presensi',
          created_at: new Date()
        });
      }
    });

    return this.getOvertimeById(id, actor);
  }

  /**
   * Bulk Approve Overtimes (SPEC §11.4)
   */
  async bulkApproveOvertimes(ids = [], payload = {}, actor = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('Daftar ID lembur tidak boleh kosong');
      err.code = 'EMPTY_IDS';
      err.statusCode = 422;
      throw err;
    }

    const targetIds = ids.slice(0, 50); // max 50 items
    const results = [];

    for (const id of targetIds) {
      try {
        const approved = await this.approveOvertime(id, actor, payload.comment);
        results.push({ id, success: true, message: 'Lembur berhasil disetujui', data: approved });
      } catch (err) {
        results.push({ id, success: false, error: err.message, code: err.code || 'APPROVE_FAILED' });
      }
    }

    return {
      total: targetIds.length,
      processed: results
    };
  }

  /**
   * Get Overtime Settings (SPEC §11.1, §11.4)
   */
  async getOvertimeSettings(schoolUnitId = null, trx = null) {
    const { policy, tiers } = await this.getEffectivePolicy(schoolUnitId, trx);
    return {
      policy,
      tiers
    };
  }

  /**
   * Update Overtime Settings (SPEC §11.1, §11.4)
   */
  async updateOvertimeSettings(payload, actor) {
    const {
      school_unit_id = null,
      name,
      calc_method = 'flat_hourly',
      flat_hourly_rate = null,
      wage_divisor = 173,
      rounding_minutes = 30,
      min_payable_minutes = 30,
      max_hours_per_day = 4.0,
      max_hours_per_week = 18.0,
      max_hours_per_month = 72.0,
      eligible_employment_statuses = ['GTY', 'PTY'],
      tiers = []
    } = payload;

    const isHr = actor && (
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIME_SETTINGS_MANAGE) ||
      (actor.permissions || []).includes(HR_PERMISSIONS.OVERTIMES_MANAGE)
    );

    if (!isHr) {
      const err = new Error('Hanya HRD / Admin yang berhak mengubah pengaturan lembur');
      err.code = 'FORBIDDEN_SCOPE';
      err.statusCode = 403;
      throw err;
    }

    return await db.transaction(async (trx) => {
      let policyId = 1;
      const existing = await trx('overtime_rate_policies')
        .where(function () {
          if (school_unit_id) this.where({ school_unit_id });
          else this.whereNull('school_unit_id');
        })
        .first();

      if (existing) {
        policyId = existing.id;
        await trx('overtime_rate_policies').where({ id: policyId }).update({
          name: name || existing.name,
          calc_method,
          flat_hourly_rate: flat_hourly_rate != null ? parseFloat(flat_hourly_rate) : null,
          wage_divisor: parseInt(wage_divisor, 10) || 173,
          rounding_minutes: parseInt(rounding_minutes, 10) || 30,
          min_payable_minutes: parseInt(min_payable_minutes, 10) || 30,
          max_hours_per_day: parseFloat(max_hours_per_day) || 4.0,
          max_hours_per_week: parseFloat(max_hours_per_week) || 18.0,
          max_hours_per_month: parseFloat(max_hours_per_month) || 72.0,
          eligible_employment_statuses: JSON.stringify(eligible_employment_statuses),
          updated_at: new Date()
        });
      } else {
        const [newId] = await trx('overtime_rate_policies').insert({
          school_unit_id,
          name: name || 'Kebijakan Lembur',
          calc_method,
          flat_hourly_rate: flat_hourly_rate != null ? parseFloat(flat_hourly_rate) : null,
          wage_divisor: parseInt(wage_divisor, 10) || 173,
          rounding_minutes: parseInt(rounding_minutes, 10) || 30,
          min_payable_minutes: parseInt(min_payable_minutes, 10) || 30,
          max_hours_per_day: parseFloat(max_hours_per_day) || 4.0,
          max_hours_per_week: parseFloat(max_hours_per_week) || 18.0,
          max_hours_per_month: parseFloat(max_hours_per_month) || 72.0,
          eligible_employment_statuses: JSON.stringify(eligible_employment_statuses),
          is_active: 1,
          effective_from: todayWIB(),
          created_at: new Date(),
          updated_at: new Date()
        });
        policyId = newId;
      }

      // Update tiers if provided
      if (Array.isArray(tiers) && tiers.length > 0) {
        await trx('overtime_multiplier_tiers').where({ policy_id: policyId }).del();
        const tierRows = tiers.map(t => ({
          policy_id: policyId,
          day_type: t.day_type,
          from_hour: parseFloat(t.from_hour) || 0,
          to_hour: t.to_hour != null ? parseFloat(t.to_hour) : null,
          multiplier: parseFloat(t.multiplier) || 1.0,
          created_at: new Date(),
          updated_at: new Date()
        }));
        await trx('overtime_multiplier_tiers').insert(tierRows);
      }

      return this.getOvertimeSettings(school_unit_id, trx);
    });
  }
}

module.exports = new OvertimeService();
