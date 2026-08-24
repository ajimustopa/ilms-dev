/**
 * Supervision Service Implementation
 * Modul Manajemen - Fitur #197: Supervisi Akademik & Manajerial
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class SupervisionService {
  async listSchedules(schoolUnitId, query = {}, user = null) {
    let q = db('supervision_schedules').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.supervised_employee_id) q = q.where('supervised_employee_id', query.supervised_employee_id);
    if (query.supervisor_employee_id) q = q.where('supervisor_employee_id', query.supervisor_employee_id);
    if (query.supervision_type) q = q.where('supervision_type', query.supervision_type);
    if (query.status) q = q.where('status', query.status);

    const items = await q.orderBy('scheduled_date', 'desc');

    return await Promise.all(
      items.map(async (item) => {
        let supervisor = null;
        let supervised = null;
        try {
          supervisor = await validateEmployee(item.supervisor_employee_id);
          supervised = await validateEmployee(item.supervised_employee_id);
        } catch (e) {
          supervisor = { id: item.supervisor_employee_id, full_name: `Supervisor #${item.supervisor_employee_id}` };
          supervised = { id: item.supervised_employee_id, full_name: `Pegawai #${item.supervised_employee_id}` };
        }
        return {
          ...item,
          supervisor_name: supervisor?.full_name || `Supervisor #${item.supervisor_employee_id}`,
          supervised_name: supervised?.full_name || `Pegawai #${item.supervised_employee_id}`,
        };
      })
    );
  }

  async getScheduleById(id) {
    const item = await db('supervision_schedules').where({ id }).first();
    if (!item) {
      const err = new Error('Jadwal supervisi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const results = await db('supervision_results').where({ supervision_schedule_id: id }).orderBy('id', 'asc');

    let supervisor = null;
    let supervised = null;
    try {
      supervisor = await validateEmployee(item.supervisor_employee_id);
      supervised = await validateEmployee(item.supervised_employee_id);
    } catch (e) {
      supervisor = { id: item.supervisor_employee_id, full_name: `Supervisor #${item.supervisor_employee_id}` };
      supervised = { id: item.supervised_employee_id, full_name: `Pegawai #${item.supervised_employee_id}` };
    }

    return {
      ...item,
      supervisor_name: supervisor?.full_name || `Supervisor #${item.supervisor_employee_id}`,
      supervised_name: supervised?.full_name || `Pegawai #${item.supervised_employee_id}`,
      results,
    };
  }

  async createSchedule(data) {
    await validateEmployee(data.supervisor_employee_id);
    await validateEmployee(data.supervised_employee_id);

    const [id] = await db('supervision_schedules').insert({
      school_unit_id: data.school_unit_id || 1,
      supervisor_employee_id: data.supervisor_employee_id,
      supervised_employee_id: data.supervised_employee_id,
      supervision_type: data.supervision_type || 'akademik',
      class_group_id: data.class_group_id || null,
      scheduled_date: data.scheduled_date,
      status: 'scheduled',
    });

    return this.getScheduleById(id);
  }

  async updateScheduleStatus(id, status) {
    await this.getScheduleById(id);
    await db('supervision_schedules').where({ id }).update({ status });
    return this.getScheduleById(id);
  }

  async addResult(scheduleId, data) {
    await this.getScheduleById(scheduleId);
    const [id] = await db('supervision_results').insert({
      supervision_schedule_id: scheduleId,
      aspect: data.aspect,
      score: data.score !== undefined ? data.score : null,
      findings: data.findings || null,
      recommendations: data.recommendations || null,
    });
    return db('supervision_results').where({ id }).first();
  }

  async getResults(scheduleId) {
    await this.getScheduleById(scheduleId);
    return await db('supervision_results')
      .where({ supervision_schedule_id: scheduleId })
      .orderBy('id', 'asc');
  }
}

module.exports = new SupervisionService();
