/**
 * Leave Type & Settings Service
 * Modul Kepegawaian - Core Aldepos
 * Manages leave_types, leave_approval_profiles, school_unit_approvers, approval_delegations, leave_module_settings, absence_thresholds
 * Conforms to SPEC-CUTI-LEMBUR.md §3, §6.1-6.3, §10.2, §11.1, §12
 */

const db = require('../../../config/db/kepegawaian');
const {
  validateLeaveTypeConfig,
  checkUnitApproverOverlap,
  validateDelegationRules
} = require('./leaveTypeValidation');
const { isUnitInScope } = require('../common/actorHelper');

const { formatDbDate } = require('./dateHelper');

class LeaveTypeService {
  /**
   * Get list of leave types
   * Non-HR: only is_active=1 AND visible_in_self_service=1
   * HR: all, with optional category / is_active filtering
   */
  async getLeaveTypes(query = {}, actor = null) {
    let q = db('leave_types as lt')
      .leftJoin('leave_approval_profiles as lap', 'lt.approval_profile_id', 'lap.id')
      .select('lt.*', 'lap.name as approval_profile_name', 'lap.code as approval_profile_code');

    const isHr = actor && (
      (actor.permissions && actor.permissions.includes('kepegawaian.leave_types.manage')) ||
      (actor.permissions && actor.permissions.includes('kepegawaian.leave_requests.read')) ||
      (actor.permissions && actor.permissions.includes('kepegawaian.leave_requests.manage'))
    );

    if (!isHr) {
      q = q.where('lt.is_active', 1).andWhere('lt.visible_in_self_service', 1);
    } else {
      if (query.is_active !== undefined && query.is_active !== '') {
        const activeBool = query.is_active === '1' || query.is_active === 'true' || query.is_active === 1;
        q = q.where('lt.is_active', activeBool ? 1 : 0);
      }
    }

    if (query.category) {
      q = q.where('lt.category', query.category);
    }

    if (query.q) {
      const search = `%${query.q.trim()}%`;
      q = q.where(b => {
        b.where('lt.name', 'like', search)
          .orWhere('lt.code', 'like', search)
          .orWhere('lt.description', 'like', search);
      });
    }

    const rows = await q.orderBy('lt.sort_order', 'asc').orderBy('lt.id', 'asc');
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      is_system: Boolean(r.is_system),
      deducts_balance: Boolean(r.deducts_balance),
      half_day_allowed: Boolean(r.half_day_allowed),
      affects_attendance_allowance: Boolean(r.affects_attendance_allowance),
      affects_discipline: Boolean(r.affects_discipline),
      visible_in_self_service: Boolean(r.visible_in_self_service),
      reason_required: Boolean(r.reason_required),
      eligible_employment_statuses: typeof r.eligible_employment_statuses === 'string' ? JSON.parse(r.eligible_employment_statuses) : r.eligible_employment_statuses,
      eligible_marital_statuses: typeof r.eligible_marital_statuses === 'string' ? JSON.parse(r.eligible_marital_statuses) : r.eligible_marital_statuses
    }));
  }

  /**
   * Get leave type by ID or Code
   */
  async getLeaveType(identifier) {
    let q = db('leave_types as lt')
      .leftJoin('leave_approval_profiles as lap', 'lt.approval_profile_id', 'lap.id')
      .select('lt.*', 'lap.name as approval_profile_name', 'lap.code as approval_profile_code');

    if (typeof identifier === 'number' || (!isNaN(identifier) && !isNaN(parseFloat(identifier)))) {
      q = q.where('lt.id', identifier);
    } else {
      q = q.where('lt.code', String(identifier).trim().toLowerCase());
    }

    const row = await q.first();
    if (!row) return null;
    return {
      ...row,
      is_active: Boolean(row.is_active),
      is_system: Boolean(row.is_system),
      deducts_balance: Boolean(row.deducts_balance),
      half_day_allowed: Boolean(row.half_day_allowed),
      affects_attendance_allowance: Boolean(row.affects_attendance_allowance),
      affects_discipline: Boolean(row.affects_discipline),
      visible_in_self_service: Boolean(row.visible_in_self_service),
      reason_required: Boolean(row.reason_required),
      eligible_employment_statuses: typeof row.eligible_employment_statuses === 'string' ? JSON.parse(row.eligible_employment_statuses) : row.eligible_employment_statuses,
      eligible_marital_statuses: typeof row.eligible_marital_statuses === 'string' ? JSON.parse(row.eligible_marital_statuses) : row.eligible_marital_statuses
    };
  }

  /**
   * Create a new custom leave type (SPEC §3.2, §11.1)
   */
  async createLeaveType(data, actor) {
    const validation = validateLeaveTypeConfig(data);
    if (!validation.isValid) {
      const err = new Error(validation.errors[0]?.message || 'Konfigurasi jenis cuti tidak valid');
      err.statusCode = 422;
      err.errors = validation.errors;
      throw err;
    }

    const payload = validation.normalizedData;

    // Check if code already exists
    const existingCode = await db('leave_types').where({ code: payload.code }).first();
    if (existingCode) {
      const err = new Error(`Kode jenis cuti '${payload.code}' sudah digunakan.`);
      err.statusCode = 409;
      err.code = 'DUPLICATE_LEAVE_TYPE_CODE';
      throw err;
    }

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('leave_types').insert({
        code: payload.code,
        name: payload.name,
        category: payload.category,
        description: payload.description || null,
        color: payload.color || '#3b82f6',
        sort_order: payload.sort_order || 0,
        is_active: payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : 1,
        is_system: 0,
        count_mode: payload.count_mode || 'work_days',
        deducts_balance: payload.deducts_balance ? 1 : 0,
        balance_policy_id: payload.balance_policy_id || null,
        max_days_per_request: payload.max_days_per_request || null,
        max_days_per_year: payload.max_days_per_year || null,
        max_occurrences_lifetime: payload.max_occurrences_lifetime || null,
        half_day_allowed: payload.half_day_allowed ? 1 : 0,
        attachment_rule: payload.attachment_rule || 'none',
        attachment_required_after_days: payload.attachment_required_after_days || null,
        gender_restriction: payload.gender_restriction || 'any',
        eligible_employment_statuses: payload.eligible_employment_statuses ? JSON.stringify(payload.eligible_employment_statuses) : null,
        eligible_marital_statuses: payload.eligible_marital_statuses ? JSON.stringify(payload.eligible_marital_statuses) : null,
        min_service_months: payload.min_service_months || 0,
        min_notice_days: payload.min_notice_days || 0,
        max_backdate_days: payload.max_backdate_days || 0,
        payroll_pay_percent: payload.payroll_pay_percent !== undefined ? payload.payroll_pay_percent : null,
        affects_attendance_allowance: payload.affects_attendance_allowance ? 1 : 0,
        affects_discipline: payload.affects_discipline ? 1 : 0,
        attendance_status: payload.attendance_status || 'permitted',
        attendance_sub_status: payload.attendance_sub_status !== undefined ? payload.attendance_sub_status : 'cuti',
        approval_profile_id: payload.approval_profile_id || null,
        visible_in_self_service: payload.visible_in_self_service !== undefined ? (payload.visible_in_self_service ? 1 : 0) : 1,
        reason_required: payload.reason_required ? 1 : 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_type',
          entity_id: insertId,
          action: 'create',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify(payload),
          created_at: new Date()
        });
      }

      return [insertId];
    });

    return this.getLeaveType(id);
  }

  /**
   * Update leave type (SPEC §3.2, §11.1)
   */
  async updateLeaveType(id, data, actor) {
    const existing = await this.getLeaveType(id);
    if (!existing) {
      const err = new Error('Jenis cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const validation = validateLeaveTypeConfig(data, existing);
    if (!validation.isValid) {
      const err = new Error(validation.errors[0]?.message || 'Konfigurasi jenis cuti tidak valid');
      err.statusCode = 422;
      err.errors = validation.errors;
      throw err;
    }

    const payload = validation.normalizedData;

    await db.transaction(async (trx) => {
      const updateData = {
        updated_at: new Date()
      };

      const directFields = [
        'name', 'category', 'description', 'color', 'sort_order', 'count_mode',
        'max_days_per_request', 'max_days_per_year', 'max_occurrences_lifetime',
        'attachment_rule', 'attachment_required_after_days', 'gender_restriction',
        'min_service_months', 'min_notice_days', 'max_backdate_days',
        'payroll_pay_percent', 'attendance_status', 'attendance_sub_status',
        'approval_profile_id', 'balance_policy_id'
      ];

      for (const f of directFields) {
        if (payload[f] !== undefined) {
          updateData[f] = payload[f];
        }
      }

      if (!existing.is_system && payload.code !== undefined) {
        updateData.code = payload.code;
      }

      if (payload.is_active !== undefined) updateData.is_active = payload.is_active ? 1 : 0;
      if (payload.deducts_balance !== undefined) updateData.deducts_balance = payload.deducts_balance ? 1 : 0;
      if (payload.half_day_allowed !== undefined) updateData.half_day_allowed = payload.half_day_allowed ? 1 : 0;
      if (payload.affects_attendance_allowance !== undefined) updateData.affects_attendance_allowance = payload.affects_attendance_allowance ? 1 : 0;
      if (payload.affects_discipline !== undefined) updateData.affects_discipline = payload.affects_discipline ? 1 : 0;
      if (payload.visible_in_self_service !== undefined) updateData.visible_in_self_service = payload.visible_in_self_service ? 1 : 0;
      if (payload.reason_required !== undefined) updateData.reason_required = payload.reason_required ? 1 : 0;

      if (payload.eligible_employment_statuses !== undefined) {
        updateData.eligible_employment_statuses = payload.eligible_employment_statuses ? JSON.stringify(payload.eligible_employment_statuses) : null;
      }
      if (payload.eligible_marital_statuses !== undefined) {
        updateData.eligible_marital_statuses = payload.eligible_marital_statuses ? JSON.stringify(payload.eligible_marital_statuses) : null;
      }

      await trx('leave_types').where({ id: existing.id }).update(updateData);

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_type',
          entity_id: existing.id,
          action: 'update',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          after_json: JSON.stringify(updateData),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveType(id);
  }

  /**
   * Toggle leave type active status
   */
  async toggleLeaveTypeActive(id, isActive, actor) {
    const existing = await this.getLeaveType(id);
    if (!existing) {
      const err = new Error('Jenis cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const activeInt = (isActive === 1 || isActive === true || isActive === 'true' || isActive === '1') ? 1 : 0;

    await db.transaction(async (trx) => {
      await trx('leave_types').where({ id: existing.id }).update({
        is_active: activeInt,
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_type',
          entity_id: existing.id,
          action: 'toggle_active',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify({ is_active: existing.is_active }),
          after_json: JSON.stringify({ is_active: Boolean(activeInt) }),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveType(id);
  }

  /**
   * Delete leave type (SPEC §3.2, §11.1)
   * Only allowed if:
   * 1. Not a system type (is_system != 1)
   * 2. Has never been used in employee_leave_requests
   * Otherwise throws 409 and advises deactivation.
   */
  async deleteLeaveType(id, actor) {
    const existing = await this.getLeaveType(id);
    if (!existing) {
      const err = new Error('Jenis cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (existing.is_system) {
      const err = new Error('Jenis cuti bawaan sistem (is_system) tidak boleh dihapus. Silakan nonaktifkan bila tidak digunakan.');
      err.statusCode = 409;
      err.code = 'SYSTEM_TYPE_CANNOT_BE_DELETED';
      throw err;
    }

    // Check if used in employee_leave_requests
    const hasRequests = await db('employee_leave_requests')
      .where(b => {
        b.where('leave_type_id', existing.id)
          .orWhere('leave_type', existing.code);
      })
      .first();

    if (hasRequests) {
      const err = new Error('Jenis cuti sudah memiliki data pengajuan terkait dan tidak dapat dihapus. Silakan nonaktifkan bila tidak digunakan.');
      err.statusCode = 409;
      err.code = 'LEAVE_TYPE_HAS_EXISTING_REQUESTS';
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('leave_types').where({ id: existing.id }).del();

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_type',
          entity_id: existing.id,
          action: 'delete',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          created_at: new Date()
        });
      }
    });

    return { success: true, message: `Jenis cuti '${existing.name}' berhasil dihapus` };
  }

  /**
   * Get all approval profiles and their steps (SPEC §3.4)
   */
  async getApprovalProfiles() {
    const profiles = await db('leave_approval_profiles')
      .where({ is_active: 1 })
      .orderBy('id', 'asc');

    const profileIds = profiles.map(p => p.id);
    if (profileIds.length === 0) return [];

    const steps = await db('leave_approval_profile_steps')
      .whereIn('profile_id', profileIds)
      .orderBy('step_no', 'asc');

    const stepMap = {};
    steps.forEach(s => {
      if (!stepMap[s.profile_id]) stepMap[s.profile_id] = [];
      stepMap[s.profile_id].push({
        ...s,
        is_required: Boolean(s.is_required)
      });
    });

    return profiles.map(p => ({
      ...p,
      is_active: Boolean(p.is_active),
      steps: stepMap[p.id] || []
    }));
  }

  /**
   * Update approval profile and steps (SPEC §3.4, §11.1)
   */
  async updateApprovalProfile(id, data, actor) {
    const existing = await db('leave_approval_profiles').where({ id }).first();
    if (!existing) {
      const err = new Error('Profil approval tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const { name, description, steps } = data;

    await db.transaction(async (trx) => {
      await trx('leave_approval_profiles').where({ id }).update({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        updated_at: new Date()
      });

      if (Array.isArray(steps) && steps.length > 0) {
        // Delete existing steps and insert updated steps
        await trx('leave_approval_profile_steps').where({ profile_id: id }).del();

        let stepNo = 1;
        for (const s of steps) {
          await trx('leave_approval_profile_steps').insert({
            profile_id: id,
            step_no: s.step_no || stepNo++,
            step_name: s.step_name || `Langkah ${stepNo}`,
            approver_source: s.approver_source,
            is_required: s.is_required !== undefined ? (s.is_required ? 1 : 0) : 1,
            min_days_threshold: s.min_days_threshold || null,
            sla_hours: s.sla_hours || 72,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_approval_profile',
          entity_id: id,
          action: 'update',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          after_json: JSON.stringify(data),
          created_at: new Date()
        });
      }
    });

    const profiles = await this.getApprovalProfiles();
    return profiles.find(p => p.id === Number(id));
  }

  /**
   * Principal candidate suggestions (SPEC §6.1)
   * Looks up employees having job_positions.level = 1 WITHOUT LIKE name matching
   */
  async getPrincipalSuggestions(schoolUnitId = null, actor = null) {
    let q = db('employees as e')
      .join('job_positions as jp', 'e.current_position_id', 'jp.id')
      .select(
        'e.id as employee_id',
        'e.employee_number',
        'e.nip',
        'e.full_name',
        'e.school_unit_id',
        'jp.name as position_name',
        'jp.level as position_level'
      )
      .where('jp.level', 1)
      .andWhere('e.account_status', 'active');

    if (schoolUnitId) {
      q = q.where('e.school_unit_id', schoolUnitId);
    } else if (actor && actor.unitScope && actor.unitScope.length > 0) {
      q = q.whereIn('e.school_unit_id', actor.unitScope);
    }

    return q.orderBy('e.full_name', 'asc');
  }

  /**
   * School Unit Approvers CRUD (SPEC §6.1, §10.2, §11.1)
   */
  async getUnitApprovers(schoolUnitId = null, actor = null) {
    let q = db('school_unit_approvers as sua')
      .join('employees as e', 'sua.employee_id', 'e.id')
      .leftJoin('job_positions as jp', 'e.current_position_id', 'jp.id')
      .select(
        'sua.*',
        'e.full_name as employee_name',
        'e.employee_number as employee_nip',
        'e.nip',
        'jp.name as current_position_name'
      );

    if (schoolUnitId) {
      q = q.where('sua.school_unit_id', schoolUnitId);
    } else if (actor && actor.unitScope && actor.unitScope.length > 0) {
      q = q.whereIn('sua.school_unit_id', actor.unitScope);
    }

    return q.orderBy('sua.school_unit_id', 'asc').orderBy('sua.valid_from', 'desc');
  }

  /**
   * Set Unit Approver (Head of School) with overlap validation
   */
  async setUnitApprover(data, actor) {
    const { school_unit_id, approver_role = 'unit_head', employee_id, valid_from, valid_to = null } = data;

    if (!school_unit_id || !employee_id || !valid_from) {
      const err = new Error('Satuan pendidikan, pegawai, dan tanggal mulai berlaku wajib diisi.');
      err.statusCode = 422;
      throw err;
    }

    // Verify employee belongs to unit and is active
    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const err = new Error('Pegawai tidak ditemukan.');
      err.statusCode = 404;
      throw err;
    }

    if (employee.account_status !== 'active') {
      const err = new Error('Pegawai yang ditugaskan harus berstatus aktif.');
      err.statusCode = 422;
      err.code = 'EMPLOYEE_INACTIVE';
      throw err;
    }

    if (Number(employee.school_unit_id) !== Number(school_unit_id)) {
      const err = new Error(`Pegawai '${employee.full_name}' tidak terdaftar pada unit sekolah yang dipilih.`);
      err.statusCode = 422;
      err.code = 'EMPLOYEE_UNIT_MISMATCH';
      throw err;
    }

    // Check overlap for same unit and approver_role
    const existingApprovers = await db('school_unit_approvers')
      .where({ school_unit_id, approver_role });

    const overlapCheck = checkUnitApproverOverlap(existingApprovers, { valid_from, valid_to });
    if (!overlapCheck.isValid) {
      const err = new Error(overlapCheck.error);
      err.statusCode = 409;
      err.code = 'OVERLAP_CONFLICT';
      throw err;
    }

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('school_unit_approvers').insert({
        school_unit_id,
        approver_role,
        employee_id,
        valid_from: formatDbDate(valid_from),
        valid_to: valid_to ? formatDbDate(valid_to) : null,
        created_by: actor ? actor.userId : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'unit_approver',
          entity_id: insertId,
          action: 'create',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify(data),
          created_at: new Date()
        });
      }
      return [insertId];
    });

    return db('school_unit_approvers as sua')
      .join('employees as e', 'sua.employee_id', 'e.id')
      .select('sua.*', 'e.full_name as employee_name', 'e.employee_number as employee_nip')
      .where('sua.id', id)
      .first();
  }

  /**
   * Update Unit Approver
   */
  async updateUnitApprover(id, data, actor) {
    const existing = await db('school_unit_approvers').where({ id }).first();
    if (!existing) {
      const err = new Error('Data approver satuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const school_unit_id = data.school_unit_id || existing.school_unit_id;
    const approver_role = data.approver_role || existing.approver_role;
    const employee_id = data.employee_id || existing.employee_id;
    const valid_from = data.valid_from !== undefined ? formatDbDate(data.valid_from) : formatDbDate(existing.valid_from);
    const valid_to = data.valid_to !== undefined ? (data.valid_to ? formatDbDate(data.valid_to) : null) : (existing.valid_to ? formatDbDate(existing.valid_to) : null);

    // Verify employee
    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee || employee.account_status !== 'active') {
      const err = new Error('Pegawai tidak valid atau tidak berstatus aktif.');
      err.statusCode = 422;
      throw err;
    }

    // Check overlap
    const existingApprovers = await db('school_unit_approvers')
      .where({ school_unit_id, approver_role });

    const overlapCheck = checkUnitApproverOverlap(existingApprovers, { valid_from, valid_to }, id);
    if (!overlapCheck.isValid) {
      const err = new Error(overlapCheck.error);
      err.statusCode = 409;
      err.code = 'OVERLAP_CONFLICT';
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('school_unit_approvers').where({ id }).update({
        school_unit_id,
        approver_role,
        employee_id,
        valid_from,
        valid_to,
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'unit_approver',
          entity_id: id,
          action: 'update',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          after_json: JSON.stringify(data),
          created_at: new Date()
        });
      }
    });

    return db('school_unit_approvers as sua')
      .join('employees as e', 'sua.employee_id', 'e.id')
      .select('sua.*', 'e.full_name as employee_name', 'e.employee_number as employee_nip')
      .where('sua.id', id)
      .first();
  }

  /**
   * Delete Unit Approver
   */
  async deleteUnitApprover(id, actor) {
    const existing = await db('school_unit_approvers').where({ id }).first();
    if (!existing) {
      const err = new Error('Data approver satuan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('school_unit_approvers').where({ id }).del();

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'unit_approver',
          entity_id: id,
          action: 'delete',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          created_at: new Date()
        });
      }
    });

    return { success: true, message: 'Penetapan approver satuan berhasil dihapus' };
  }

  /**
   * Approval Delegations (SPEC §6.3, §10.2, §11.1)
   */
  async getDelegations(employeeId = null, schoolUnitId = null, actor = null) {
    let q = db('approval_delegations as ad')
      .join('employees as de', 'ad.delegator_employee_id', 'de.id')
      .join('employees as te', 'ad.delegate_employee_id', 'te.id')
      .select(
        'ad.*',
        'de.full_name as delegator_name',
        'de.employee_number as delegator_nip',
        'te.full_name as delegate_name',
        'te.employee_number as delegate_nip'
      );

    const isHr = actor && actor.permissions && actor.permissions.includes('kepegawaian.leave_types.manage');

    if (!isHr && actor && actor.employeeId) {
      q = q.where(b => {
        b.where('ad.delegator_employee_id', actor.employeeId)
          .orWhere('ad.delegate_employee_id', actor.employeeId);
      });
    } else if (employeeId) {
      q = q.where(b => {
        b.where('ad.delegator_employee_id', employeeId)
          .orWhere('ad.delegate_employee_id', employeeId);
      });
    }

    if (schoolUnitId) {
      q = q.where('ad.school_unit_id', schoolUnitId);
    } else if (actor && actor.unitScope && actor.unitScope.length > 0) {
      q = q.whereIn('ad.school_unit_id', actor.unitScope);
    }

    const rows = await q.orderBy('ad.valid_from', 'desc');
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active)
    }));
  }

  /**
   * Create Delegation with Depth-1, Non-Self, and Range Validations (SPEC §6.3)
   */
  async createDelegation(data, actor) {
    const isHr = actor && actor.permissions && actor.permissions.includes('kepegawaian.leave_types.manage');
    let delegator_employee_id = data.delegator_employee_id;

    if (!isHr) {
      if (!actor || !actor.employeeId) {
        const err = new Error('Hanya pegawai yang dapat membuat delegasi persetujuan.');
        err.statusCode = 403;
        err.code = 'ACTOR_NOT_EMPLOYEE';
        throw err;
      }
      delegator_employee_id = actor.employeeId;
    }

    const {
      school_unit_id,
      delegate_employee_id,
      scope = 'all',
      valid_from,
      valid_to,
      reason
    } = data;

    // Verify both employees exist and are active in the same school unit
    const delegator = await db('employees').where({ id: delegator_employee_id }).first();
    const delegate = await db('employees').where({ id: delegate_employee_id }).first();

    if (!delegator || delegator.account_status !== 'active') {
      const err = new Error('Pemberi delegasi tidak ditemukan atau tidak berstatus aktif.');
      err.statusCode = 422;
      throw err;
    }

    if (!delegate || delegate.account_status !== 'active') {
      const err = new Error('Penerima delegasi tidak ditemukan atau tidak berstatus aktif.');
      err.statusCode = 422;
      throw err;
    }

    const unitId = school_unit_id || delegator.school_unit_id;

    // Fetch active delegations for unit to validate depth 1 and overlaps
    const activeDelegations = await db('approval_delegations')
      .where({ school_unit_id: unitId, is_active: 1 });

    const ruleValidation = validateDelegationRules(activeDelegations, {
      delegator_employee_id,
      delegate_employee_id,
      scope,
      valid_from,
      valid_to
    });

    if (!ruleValidation.isValid) {
      const err = new Error(ruleValidation.error);
      err.statusCode = 422;
      err.code = ruleValidation.code || 'DELEGATION_INVALID';
      throw err;
    }

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('approval_delegations').insert({
        school_unit_id: unitId,
        delegator_employee_id,
        delegate_employee_id,
        scope,
        valid_from: formatDbDate(valid_from),
        valid_to: formatDbDate(valid_to),
        reason: reason || null,
        is_active: 1,
        created_by: actor ? actor.userId : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'approval_delegation',
          entity_id: insertId,
          action: 'create',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ ...data, delegator_employee_id }),
          created_at: new Date()
        });
      }
      return [insertId];
    });

    return db('approval_delegations as ad')
      .join('employees as de', 'ad.delegator_employee_id', 'de.id')
      .join('employees as te', 'ad.delegate_employee_id', 'te.id')
      .select(
        'ad.*',
        'de.full_name as delegator_name',
        'te.full_name as delegate_name'
      )
      .where('ad.id', id)
      .first();
  }

  /**
   * Revoke Delegation (SPEC §6.3, §11.1)
   */
  async deleteDelegation(id, actor) {
    const existing = await db('approval_delegations').where({ id }).first();
    if (!existing) {
      const err = new Error('Delegasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const isHr = actor && actor.permissions && actor.permissions.includes('kepegawaian.leave_types.manage');
    if (!isHr && actor && actor.employeeId) {
      if (Number(existing.delegator_employee_id) !== Number(actor.employeeId) &&
          Number(existing.delegate_employee_id) !== Number(actor.employeeId)) {
        const err = new Error('Anda tidak berhak mencabut delegasi ini.');
        err.statusCode = 403;
        throw err;
      }
    }

    await db.transaction(async (trx) => {
      await trx('approval_delegations').where({ id }).update({
        is_active: 0,
        revoked_at: new Date(),
        updated_at: new Date()
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'approval_delegation',
          entity_id: id,
          action: 'revoke',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          created_at: new Date()
        });
      }
    });

    return { success: true, message: 'Delegasi persetujuan berhasil dicabut' };
  }

  /**
   * Leave Module Settings (SPEC §3.5, §11.1)
   */
  async getLeaveSettings(schoolUnitId = null) {
    const rows = await db('leave_module_settings')
      .where(b => {
        if (schoolUnitId) {
          b.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
        } else {
          b.whereNull('school_unit_id');
        }
      });

    const settings = {
      flexible_employee_day_rule: 'mon_fri',
      holiday_inside_calendar_leave_counted: true,
      employee_self_cancel_approved_until_days_before: 3,
      reason_visible_to_supervisor_for_sick: false,
      overtime_self_claim_max_backdate_days: 7,
      approval_overdue_hours: 72,
      semester_ranges: []
    };

    rows.forEach(r => {
      let val = r.setting_value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch (e) {}
      }
      settings[r.setting_key] = val;
    });

    return settings;
  }

  /**
   * Update Leave Module Settings
   */
  async updateLeaveSettings(schoolUnitId, newSettings, actor) {
    if (!newSettings || typeof newSettings !== 'object') {
      const err = new Error('Objek pengaturan cuti tidak valid.');
      err.statusCode = 422;
      throw err;
    }

    await db.transaction(async (trx) => {
      for (const [key, val] of Object.entries(newSettings)) {
        const existing = await trx('leave_module_settings')
          .where({ school_unit_id: schoolUnitId || null, setting_key: key })
          .first();

        if (existing) {
          await trx('leave_module_settings')
            .where({ id: existing.id })
            .update({
              setting_value: JSON.stringify(val),
              updated_at: new Date()
            });
        } else {
          await trx('leave_module_settings').insert({
            school_unit_id: schoolUnitId || null,
            setting_key: key,
            setting_value: JSON.stringify(val),
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_module_settings',
          entity_id: schoolUnitId || 0,
          action: 'update',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify(newSettings),
          created_at: new Date()
        });
      }
    });

    return this.getLeaveSettings(schoolUnitId);
  }

  /**
   * Absence Thresholds (SPEC §2 #36, §10.2, §11.1)
   */
  async getAbsenceThresholds(schoolUnitId = null) {
    return db('absence_thresholds')
      .where(b => {
        if (schoolUnitId) b.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
        else b.whereNull('school_unit_id');
      })
      .andWhere({ is_active: 1 })
      .orderBy('id', 'asc');
  }

  /**
   * Update Absence Thresholds
   */
  async updateAbsenceThresholds(schoolUnitId, thresholds, actor) {
    if (!Array.isArray(thresholds)) {
      const err = new Error('Daftar ambang rawan harus berupa array.');
      err.statusCode = 422;
      throw err;
    }

    await db.transaction(async (trx) => {
      for (const t of thresholds) {
        if (t.id) {
          await trx('absence_thresholds').where({ id: t.id }).update({
            max_absent_count: t.max_absent_count !== undefined ? t.max_absent_count : null,
            max_absent_percent: t.max_absent_percent !== undefined ? t.max_absent_percent : null,
            is_active: t.is_active !== undefined ? (t.is_active ? 1 : 0) : 1,
            updated_at: new Date()
          });
        } else {
          await trx('absence_thresholds').insert({
            school_unit_id: schoolUnitId || null,
            group_type: t.group_type || 'unit',
            group_ref_id: t.group_ref_id || null,
            max_absent_count: t.max_absent_count !== undefined ? t.max_absent_count : null,
            max_absent_percent: t.max_absent_percent !== undefined ? t.max_absent_percent : null,
            is_active: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'absence_thresholds',
          entity_id: schoolUnitId || 0,
          action: 'update',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify(thresholds),
          created_at: new Date()
        });
      }
    });

    return this.getAbsenceThresholds(schoolUnitId);
  }
}

module.exports = new LeaveTypeService();
