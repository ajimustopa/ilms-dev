/**
 * Leave Type & Settings Service
 * Modul Kepegawaian - Core Aldepos
 * Manages leave_types, leave_approval_profiles, school_unit_approvers, approval_delegations, leave_module_settings, absence_thresholds
 */

const db = require('../../../config/db/kepegawaian');

class LeaveTypeService {
  /**
   * Get list of leave types
   */
  async getLeaveTypes(query = {}, actor = null) {
    let q = db('leave_types as lt')
      .leftJoin('leave_approval_profiles as lap', 'lt.approval_profile_id', 'lap.id')
      .select('lt.*', 'lap.name as approval_profile_name', 'lap.code as approval_profile_code');

    const isHr = actor && (actor.permissions.includes('kepegawaian.leave_types.manage') || actor.permissions.includes('kepegawaian.leave_requests.read') || actor.permissions.includes('kepegawaian.leave_requests.manage'));

    if (!isHr) {
      q = q.where('lt.is_active', 1).andWhere('lt.visible_in_self_service', 1);
    } else if (query.is_active !== undefined) {
      q = q.where('lt.is_active', query.is_active ? 1 : 0);
    }

    if (query.category) {
      q = q.where('lt.category', query.category);
    }

    const rows = await q.orderBy('lt.sort_order', 'asc').orderBy('lt.id', 'asc');
    return rows.map(r => ({
      ...r,
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
      q = q.where('lt.code', identifier);
    }

    const row = await q.first();
    if (!row) return null;
    return {
      ...row,
      eligible_employment_statuses: typeof row.eligible_employment_statuses === 'string' ? JSON.parse(row.eligible_employment_statuses) : row.eligible_employment_statuses,
      eligible_marital_statuses: typeof row.eligible_marital_statuses === 'string' ? JSON.parse(row.eligible_marital_statuses) : row.eligible_marital_statuses
    };
  }

  /**
   * Create a new leave type
   */
  async createLeaveType(data, actor) {
    const {
      code,
      name,
      category,
      description,
      color = '#3b82f6',
      sort_order = 0,
      is_active = true,
      count_mode = 'work_days',
      deducts_balance = false,
      balance_policy_id = null,
      max_days_per_request = null,
      max_days_per_year = null,
      max_occurrences_lifetime = null,
      half_day_allowed = false,
      attachment_rule = 'none',
      attachment_required_after_days = null,
      gender_restriction = 'any',
      eligible_employment_statuses = null,
      eligible_marital_statuses = null,
      min_service_months = 0,
      min_notice_days = 0,
      max_backdate_days = 0,
      payroll_pay_percent = null,
      affects_attendance_allowance = false,
      affects_discipline = false,
      attendance_status = 'permitted',
      attendance_sub_status = 'cuti',
      approval_profile_id = null,
      visible_in_self_service = true,
      reason_required = false
    } = data;

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('leave_types').insert({
        code,
        name,
        category,
        description,
        color,
        sort_order,
        is_active: is_active ? 1 : 0,
        is_system: 0,
        count_mode,
        deducts_balance: deducts_balance ? 1 : 0,
        balance_policy_id: deducts_balance ? balance_policy_id : null,
        max_days_per_request,
        max_days_per_year,
        max_occurrences_lifetime,
        half_day_allowed: half_day_allowed ? 1 : 0,
        attachment_rule,
        attachment_required_after_days,
        gender_restriction,
        eligible_employment_statuses: eligible_employment_statuses ? JSON.stringify(eligible_employment_statuses) : null,
        eligible_marital_statuses: eligible_marital_statuses ? JSON.stringify(eligible_marital_statuses) : null,
        min_service_months,
        min_notice_days,
        max_backdate_days,
        payroll_pay_percent,
        affects_attendance_allowance: affects_attendance_allowance ? 1 : 0,
        affects_discipline: affects_discipline ? 1 : 0,
        attendance_status,
        attendance_sub_status,
        approval_profile_id,
        visible_in_self_service: visible_in_self_service ? 1 : 0,
        reason_required: reason_required ? 1 : 0,
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
          after_json: JSON.stringify(data),
          created_at: new Date()
        });
      }

      return [insertId];
    });

    return this.getLeaveType(id);
  }

  /**
   * Update leave type
   */
  async updateLeaveType(id, data, actor) {
    const existing = await this.getLeaveType(id);
    if (!existing) {
      const err = new Error('Jenis cuti tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      const updateData = {
        updated_at: new Date()
      };

      // If is_system, prevent changing code
      if (existing.is_system && data.code && data.code !== existing.code) {
        const err = new Error('Kode jenis cuti bawaan sistem (is_system) tidak boleh diubah');
        err.statusCode = 422;
        throw err;
      }

      const fields = [
        'code', 'name', 'category', 'description', 'color', 'sort_order', 'is_active',
        'count_mode', 'deducts_balance', 'balance_policy_id', 'max_days_per_request',
        'max_days_per_year', 'max_occurrences_lifetime', 'half_day_allowed', 'attachment_rule',
        'attachment_required_after_days', 'gender_restriction', 'eligible_employment_statuses',
        'eligible_marital_statuses', 'min_service_months', 'min_notice_days', 'max_backdate_days',
        'payroll_pay_percent', 'affects_attendance_allowance', 'affects_discipline',
        'attendance_status', 'attendance_sub_status', 'approval_profile_id', 'visible_in_self_service',
        'reason_required'
      ];

      for (const f of fields) {
        if (data[f] !== undefined) {
          if (f === 'eligible_employment_statuses' || f === 'eligible_marital_statuses') {
            updateData[f] = data[f] ? JSON.stringify(data[f]) : null;
          } else if (typeof data[f] === 'boolean') {
            updateData[f] = data[f] ? 1 : 0;
          } else {
            updateData[f] = data[f];
          }
        }
      }

      await trx('leave_types').where({ id }).update(updateData);

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'leave_type',
          entity_id: id,
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
    return this.updateLeaveType(id, { is_active: isActive }, actor);
  }

  /**
   * Get all approval profiles and their steps
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
      stepMap[s.profile_id].push(s);
    });

    profiles.forEach(p => {
      p.steps = stepMap[p.id] || [];
    });

    return profiles;
  }

  /**
   * School Unit Approvers CRUD
   */
  async getUnitApprovers(schoolUnitId = null) {
    let q = db('school_unit_approvers as sua')
      .join('employees as e', 'sua.employee_id', 'e.id')
      .select('sua.*', 'e.full_name as employee_name', 'e.employee_number as employee_nip');

    if (schoolUnitId) {
      q = q.where('sua.school_unit_id', schoolUnitId);
    }
    return q.orderBy('sua.school_unit_id', 'asc').orderBy('sua.valid_from', 'desc');
  }

  async setUnitApprover(data, actor) {
    const { school_unit_id, approver_role = 'unit_head', employee_id, valid_from, valid_to = null } = data;

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('school_unit_approvers').insert({
        school_unit_id,
        approver_role,
        employee_id,
        valid_from,
        valid_to,
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

    return db('school_unit_approvers').where({ id }).first();
  }

  /**
   * Approval Delegations
   */
  async getDelegations(employeeId = null, schoolUnitId = null) {
    let q = db('approval_delegations as ad')
      .join('employees as de', 'ad.delegator_employee_id', 'de.id')
      .join('employees as te', 'ad.delegate_employee_id', 'te.id')
      .select(
        'ad.*',
        'de.full_name as delegator_name',
        'te.full_name as delegate_name'
      );

    if (employeeId) {
      q = q.where(b => {
        b.where('ad.delegator_employee_id', employeeId)
          .orWhere('ad.delegate_employee_id', employeeId);
      });
    }

    if (schoolUnitId) {
      q = q.where('ad.school_unit_id', schoolUnitId);
    }

    return q.orderBy('ad.valid_from', 'desc');
  }

  async createDelegation(data, actor) {
    const {
      school_unit_id,
      delegator_employee_id,
      delegate_employee_id,
      scope = 'all',
      valid_from,
      valid_to,
      reason
    } = data;

    if (delegator_employee_id === delegate_employee_id) {
      const err = new Error('Tidak dapat mendelegasikan kepada diri sendiri');
      err.statusCode = 422;
      throw err;
    }

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('approval_delegations').insert({
        school_unit_id,
        delegator_employee_id,
        delegate_employee_id,
        scope,
        valid_from,
        valid_to,
        reason,
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
          after_json: JSON.stringify(data),
          created_at: new Date()
        });
      }
      return [insertId];
    });

    return db('approval_delegations').where({ id }).first();
  }

  async deleteDelegation(id, actor) {
    const existing = await db('approval_delegations').where({ id }).first();
    if (!existing) {
      const err = new Error('Delegasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
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
   * Leave Module Settings
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

    const settings = {};
    rows.forEach(r => {
      let val = r.setting_value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch (e) {}
      }
      settings[r.setting_key] = val;
    });

    return settings;
  }

  async updateLeaveSettings(schoolUnitId, newSettings, actor) {
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
   * Absence Thresholds
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

  async updateAbsenceThresholds(schoolUnitId, thresholds, actor) {
    await db.transaction(async (trx) => {
      for (const t of thresholds) {
        if (t.id) {
          await trx('absence_thresholds').where({ id: t.id }).update({
            max_absent_count: t.max_absent_count,
            max_absent_percent: t.max_absent_percent,
            is_active: t.is_active !== undefined ? (t.is_active ? 1 : 0) : 1,
            updated_at: new Date()
          });
        } else {
          await trx('absence_thresholds').insert({
            school_unit_id: schoolUnitId || null,
            group_type: t.group_type || 'unit',
            group_ref_id: t.group_ref_id || null,
            max_absent_count: t.max_absent_count,
            max_absent_percent: t.max_absent_percent,
            is_active: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    });
    return this.getAbsenceThresholds(schoolUnitId);
  }
}

module.exports = new LeaveTypeService();
