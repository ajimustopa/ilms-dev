/**
 * Holiday Service
 * Modul Kepegawaian - Core Aldepos
 * Manages holidays, holiday schedule targets, and effective holiday calculation
 */

const db = require('../../../config/db/kepegawaian');
const { dateRange, parseDate } = require('./dateHelper');

class HolidayService {
  /**
   * Get list of holidays with filtering
   */
  async getHolidays({ year, schoolUnitId, holidayType, dateFrom, dateTo, includeInactive = false }) {
    let query = db('holidays as h')
      .whereNull('h.deleted_at')
      .select('h.*');

    if (schoolUnitId !== undefined && schoolUnitId !== null && schoolUnitId !== '') {
      query = query.where(builder => {
        builder.where('h.school_unit_id', schoolUnitId)
          .orWhereNull('h.school_unit_id');
      });
    }

    if (year) {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      query = query.where(builder => {
        builder.whereBetween('h.start_date', [startOfYear, endOfYear])
          .orWhereBetween('h.end_date', [startOfYear, endOfYear])
          .orWhere(sub => {
            sub.where('h.start_date', '<=', startOfYear)
              .andWhere('h.end_date', '>=', endOfYear);
          });
      });
    }

    if (dateFrom && dateTo) {
      query = query.where(builder => {
        builder.where('h.start_date', '<=', dateTo)
          .andWhere('h.end_date', '>=', dateFrom);
      });
    }

    if (holidayType) {
      query = query.where('h.holiday_type', holidayType);
    }

    const holidays = await query.orderBy('h.start_date', 'asc');

    // Attach target schedule IDs for each holiday
    const holidayIds = holidays.map(h => h.id);
    if (holidayIds.length > 0) {
      const targets = await db('holiday_schedule_targets')
        .whereIn('holiday_id', holidayIds);
      
      const targetMap = {};
      targets.forEach(t => {
        if (!targetMap[t.holiday_id]) targetMap[t.holiday_id] = [];
        targetMap[t.holiday_id].push(t.work_schedule_id);
      });

      holidays.forEach(h => {
        h.target_schedule_ids = targetMap[h.id] || [];
      });
    }

    return holidays;
  }

  /**
   * Get single holiday by ID
   */
  async getHolidayById(id) {
    const holiday = await db('holidays')
      .where({ id })
      .whereNull('deleted_at')
      .first();
    if (!holiday) return null;

    const targets = await db('holiday_schedule_targets')
      .where({ holiday_id: id });
    holiday.target_schedule_ids = targets.map(t => t.work_schedule_id);
    return holiday;
  }

  /**
   * Create a new holiday
   */
  async createHoliday(data, actor) {
    const {
      name,
      holiday_type,
      start_date,
      end_date,
      school_unit_id = null,
      is_off_day = true,
      applies_to = 'all_employees',
      deducts_annual_leave = false,
      date_rule = 'floating',
      review_status = 'confirmed',
      notes = null,
      target_schedule_ids = []
    } = data;

    const [id] = await db.transaction(async (trx) => {
      const [insertId] = await trx('holidays').insert({
        name,
        holiday_type,
        start_date,
        end_date: end_date || start_date,
        school_unit_id: school_unit_id ? Number(school_unit_id) : null,
        is_off_day: is_off_day ? 1 : 0,
        applies_to,
        deducts_annual_leave: deducts_annual_leave ? 1 : 0,
        date_rule,
        review_status,
        notes,
        created_by: actor ? actor.userId : null,
        updated_by: actor ? actor.userId : null,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (applies_to === 'schedules' && Array.isArray(target_schedule_ids) && target_schedule_ids.length > 0) {
        const targetInserts = target_schedule_ids.map(schedId => ({
          holiday_id: insertId,
          work_schedule_id: schedId,
          created_at: new Date()
        }));
        await trx('holiday_schedule_targets').insert(targetInserts);
      }

      // Log audit
      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'holiday',
          entity_id: insertId,
          action: 'create',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          after_json: JSON.stringify({ name, holiday_type, start_date, end_date }),
          created_at: new Date()
        });
      }

      return [insertId];
    });

    return this.getHolidayById(id);
  }

  /**
   * Update an existing holiday
   */
  async updateHoliday(id, data, actor) {
    const existing = await this.getHolidayById(id);
    if (!existing) {
      const err = new Error('Hari libur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const {
      name,
      holiday_type,
      start_date,
      end_date,
      school_unit_id,
      is_off_day,
      applies_to,
      deducts_annual_leave,
      date_rule,
      review_status,
      notes,
      target_schedule_ids
    } = data;

    await db.transaction(async (trx) => {
      const updateData = {
        updated_by: actor ? actor.userId : null,
        updated_at: new Date()
      };
      if (name !== undefined) updateData.name = name;
      if (holiday_type !== undefined) updateData.holiday_type = holiday_type;
      if (start_date !== undefined) updateData.start_date = start_date;
      if (end_date !== undefined) updateData.end_date = end_date;
      if (school_unit_id !== undefined) updateData.school_unit_id = school_unit_id ? Number(school_unit_id) : null;
      if (is_off_day !== undefined) updateData.is_off_day = is_off_day ? 1 : 0;
      if (applies_to !== undefined) updateData.applies_to = applies_to;
      if (deducts_annual_leave !== undefined) updateData.deducts_annual_leave = deducts_annual_leave ? 1 : 0;
      if (date_rule !== undefined) updateData.date_rule = date_rule;
      if (review_status !== undefined) updateData.review_status = review_status;
      if (notes !== undefined) updateData.notes = notes;

      await trx('holidays').where({ id }).update(updateData);

      if (target_schedule_ids !== undefined) {
        await trx('holiday_schedule_targets').where({ holiday_id: id }).del();
        if (applies_to === 'schedules' && Array.isArray(target_schedule_ids) && target_schedule_ids.length > 0) {
          const targetInserts = target_schedule_ids.map(schedId => ({
            holiday_id: id,
            work_schedule_id: schedId,
            created_at: new Date()
          }));
          await trx('holiday_schedule_targets').insert(targetInserts);
        }
      }

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'holiday',
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

    return this.getHolidayById(id);
  }

  /**
   * Delete a holiday (soft delete)
   */
  async deleteHoliday(id, actor) {
    const existing = await this.getHolidayById(id);
    if (!existing) {
      const err = new Error('Hari libur tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      await trx('holidays').where({ id }).update({
        deleted_at: new Date(),
        updated_by: actor ? actor.userId : null
      });

      if (actor && actor.userId) {
        await trx('leave_audit_logs').insert({
          entity_type: 'holiday',
          entity_id: id,
          action: 'delete',
          actor_user_id: actor.userId,
          actor_employee_id: actor.employeeId || null,
          before_json: JSON.stringify(existing),
          created_at: new Date()
        });
      }
    });

    return { success: true, message: 'Hari libur berhasil dihapus' };
  }

  /**
   * Resolve effective off-holidays for a specific employee across a date range
   * Returns a map of dateStr -> array of holiday objects
   */
  async getEffectiveHolidaysForEmployee(employeeId, schoolUnitId, startDate, endDate, workScheduleId = null) {
    const holidays = await this.getHolidays({
      schoolUnitId,
      dateFrom: startDate,
      dateTo: endDate
    });

    const holidayMap = {};
    for (const h of holidays) {
      if (!h.is_off_day) continue;

      // Check applicability
      if (h.applies_to === 'schedules') {
        const targetIds = h.target_schedule_ids || [];
        if (workScheduleId && !targetIds.includes(workScheduleId)) {
          continue; // Does not apply to this employee's schedule
        }
      }

      const curDates = dateRange(
        h.start_date < startDate ? startDate : h.start_date,
        h.end_date > endDate ? endDate : h.end_date
      );

      for (const d of curDates) {
        if (!holidayMap[d]) holidayMap[d] = [];
        holidayMap[d].push(h);
      }
    }

    return holidayMap;
  }
}

module.exports = new HolidayService();
