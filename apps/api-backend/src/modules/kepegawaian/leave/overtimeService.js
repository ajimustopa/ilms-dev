/**
 * Overtime Service
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §7
 */

const db = require('../../../config/db/kepegawaian');
const holidayService = require('./holidayService');
const { todayWIB } = require('./dateHelper');

class OvertimeService {
  /**
   * Determine automatic day_type (workday, weekend, holiday)
   */
  async resolveDayType(dateStr, employeeId, schoolUnitId) {
    const holidays = await holidayService.getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, dateStr, dateStr);
    if (holidays[dateStr] && holidays[dateStr].length > 0) {
      return 'holiday';
    }

    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) {
      return 'weekend';
    }

    return 'workday';
  }

  /**
   * Get overtime list with scoping and filters
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

    const isHr = actor && (actor.permissions.includes('kepegawaian.overtimes.manage') || actor.permissions.includes('kepegawaian.leave_requests.read') || actor.permissions.includes('kepegawaian.leave_requests.manage'));

    if (!isHr) {
      if (!actor || !actor.employeeId) {
        return { data: [], total: 0, page: 1, perPage: 25 };
      }
      q = q.where('eo.employee_id', actor.employeeId);
    } else {
      if (actor.unitScope && actor.unitScope.length > 0) {
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

    const page = parseInt(query.page, 10) || 1;
    const perPage = parseInt(query.per_page, 10) || 25;
    const offset = (page - 1) * perPage;

    const countQ = q.clone().clearSelect().count('eo.id as total').first();
    const countRes = await countQ;
    const total = countRes ? countRes.total : 0;

    const rows = await q.orderBy('eo.overtime_date', 'desc').orderBy('eo.id', 'desc').limit(perPage).offset(offset);

    return {
      data: rows.map(r => ({
        ...r,
        hours: parseFloat(r.hours),
        payable_hours: r.payable_hours ? parseFloat(r.payable_hours) : null,
        hourly_rate_snapshot: r.hourly_rate_snapshot ? parseFloat(r.hourly_rate_snapshot) : null,
        estimated_wage: r.estimated_wage ? parseFloat(r.estimated_wage) : null,
        multiplier_breakdown: typeof r.multiplier_breakdown === 'string' ? JSON.parse(r.multiplier_breakdown) : r.multiplier_breakdown
      })),
      total,
      page,
      perPage
    };
  }

  /**
   * Get single overtime by ID
   */
  async getOvertimeById(id) {
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
    return {
      ...row,
      hours: parseFloat(row.hours),
      payable_hours: row.payable_hours ? parseFloat(row.payable_hours) : null,
      hourly_rate_snapshot: row.hourly_rate_snapshot ? parseFloat(row.hourly_rate_snapshot) : null,
      estimated_wage: row.estimated_wage ? parseFloat(row.estimated_wage) : null,
      multiplier_breakdown: typeof row.multiplier_breakdown === 'string' ? JSON.parse(row.multiplier_breakdown) : row.multiplier_breakdown
    };
  }

  /**
   * Submit or Assign Overtime Request
   */
  async createOvertime(data, actor) {
    const {
      employee_id,
      overtime_date,
      start_time = null,
      end_time = null,
      hours,
      task_description,
      origin = 'requested',
      spk_number = null,
      day_type_override = null,
      requires_actual_attendance = true
    } = data;

    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const err = new Error('Pegawai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const dayType = day_type_override || await this.resolveDayType(overtime_date, employee_id, employee.school_unit_id);

    // Initial policy
    const policy = await db('overtime_rate_policies').where({ id: 1 }).first();

    // Check multiplier tiers
    let tiers = [];
    if (policy) {
      tiers = await db('overtime_multiplier_tiers')
        .where({ policy_id: policy.id, day_type: dayType })
        .orderBy('from_hour', 'asc');
    }

    const reqHours = parseFloat(hours) || 0;
    const breakdown = tiers.map(t => ({
      tier: `${t.from_hour}-${t.to_hour || '+'}h`,
      multiplier: parseFloat(t.multiplier)
    }));

    const [insertId] = await db('employee_overtimes').insert({
      employee_id,
      origin,
      assigned_by_user_id: origin === 'assigned' ? (actor ? actor.userId : null) : null,
      spk_number,
      overtime_date,
      start_time,
      end_time,
      hours: reqHours,
      day_type: dayType,
      day_type_overridden: day_type_override ? 1 : 0,
      requires_actual_attendance: requires_actual_attendance ? 1 : 0,
      rate_policy_id: policy ? policy.id : null,
      multiplier_breakdown: JSON.stringify(breakdown),
      estimated_wage: null, // Left NULL per SPEC (no fake wage)
      task_description,
      status: 'pending',
      version: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getOvertimeById(insertId);
  }

  /**
   * Approve Overtime
   */
  async approveOvertime(id, actor, comment = null) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('employee_overtimes').where({ id }).update({
      status: 'approved',
      approved_by: actor ? actor.userId : null,
      approved_at: new Date(),
      updated_at: new Date()
    });

    return this.getOvertimeById(id);
  }

  /**
   * Reject Overtime
   */
  async rejectOvertime(id, actor, rejectionReason) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('employee_overtimes').where({ id }).update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      updated_at: new Date()
    });

    return this.getOvertimeById(id);
  }

  /**
   * Cancel Overtime
   */
  async cancelOvertime(id, actor, reason = null) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('employee_overtimes').where({ id }).update({
      status: 'cancelled',
      rejection_reason: reason,
      updated_at: new Date()
    });

    return this.getOvertimeById(id);
  }

  /**
   * Reconcile Overtime with Attendance (SPEC §7.3)
   */
  async reconcileOvertime(id, { payable_hours, realization_status = 'manual', reason }, actor) {
    const existing = await this.getOvertimeById(id);
    if (!existing) {
      const err = new Error('Pengajuan lembur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('employee_overtimes').where({ id }).update({
      payable_hours: parseFloat(payable_hours),
      realization_status,
      updated_at: new Date()
    });

    return this.getOvertimeById(id);
  }
}

module.exports = new OvertimeService();
