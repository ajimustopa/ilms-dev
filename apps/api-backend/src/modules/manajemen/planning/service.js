/**
 * Planning Service Implementation
 * Modul Manajemen: RIPS (#190), RKS (#191), dan Program Kerja Unit (#192)
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class PlanningService {
  // ==========================================
  // 1. RIPS (Institution Development Plans) - #190
  // ==========================================
  async listRips(schoolUnitId, query = {}) {
    let q = db('institution_development_plans').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.status) q = q.where('status', query.status);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('title', 'like', s).orWhere('vision', 'like', s);
      });
    }

    return await q.orderBy('id', 'desc');
  }

  async getRipsById(id) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('RIPS tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return item;
  }

  async createRips(data, userId) {
    const [id] = await db('institution_development_plans').insert({
      school_unit_id: data.school_unit_id || 1,
      title: data.title,
      period_start_year: data.period_start_year,
      period_end_year: data.period_end_year,
      vision: data.vision || null,
      mission: data.mission || null,
      document_url: data.document_url || null,
      status: 'draft',
      created_by: userId || 1,
    });
    return this.getRipsById(id);
  }

  async updateRips(id, data) {
    const item = await this.getRipsById(id);
    if (item.status !== 'draft') {
      const err = new Error('RIPS hanya dapat diubah saat status draft');
      err.statusCode = 422;
      throw err;
    }
    await db('institution_development_plans')
      .where({ id })
      .update({
        title: data.title !== undefined ? data.title : item.title,
        period_start_year: data.period_start_year !== undefined ? data.period_start_year : item.period_start_year,
        period_end_year: data.period_end_year !== undefined ? data.period_end_year : item.period_end_year,
        vision: data.vision !== undefined ? data.vision : item.vision,
        mission: data.mission !== undefined ? data.mission : item.mission,
        document_url: data.document_url !== undefined ? data.document_url : item.document_url,
      });
    return this.getRipsById(id);
  }

  async approveRips(id, userId) {
    await this.getRipsById(id);
    await db('institution_development_plans').where({ id }).update({
      status: 'active',
      approved_by: userId || 1,
      approved_at: new Date(),
    });
    return this.getRipsById(id);
  }

  async archiveRips(id) {
    await this.getRipsById(id);
    await db('institution_development_plans').where({ id }).update({
      status: 'archived',
    });
    return this.getRipsById(id);
  }

  // ==========================================
  // 2. RKS (School Work Plans) - #191
  // ==========================================
  async listRks(schoolUnitId, query = {}) {
    let q = db('school_work_plans as swp')
      .leftJoin('institution_development_plans as idp', 'swp.institution_development_plan_id', 'idp.id')
      .where(function () {
        if (schoolUnitId) this.where('swp.school_unit_id', schoolUnitId);
      });

    if (query.academic_year_id) q = q.where('swp.academic_year_id', query.academic_year_id);
    if (query.status) q = q.where('swp.status', query.status);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('swp.title', 'like', s).orWhere('swp.program_focus', 'like', s);
      });
    }

    return await q
      .select(
        'swp.*',
        'idp.title as rips_title',
        'idp.period_start_year as rips_start_year',
        'idp.period_end_year as rips_end_year'
      )
      .orderBy('swp.id', 'desc');
  }

  async getRksById(id) {
    const item = await db('school_work_plans as swp')
      .leftJoin('institution_development_plans as idp', 'swp.institution_development_plan_id', 'idp.id')
      .where('swp.id', id)
      .select('swp.*', 'idp.title as rips_title')
      .first();

    if (!item) {
      const err = new Error('RKS tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const programs = await db('work_plan_programs').where('school_work_plan_id', id).orderBy('id', 'asc');
    return { ...item, programs };
  }

  async createRks(data, userId) {
    const [id] = await db('school_work_plans').insert({
      school_unit_id: data.school_unit_id || 1,
      institution_development_plan_id: data.institution_development_plan_id || null,
      academic_year_id: data.academic_year_id || null,
      title: data.title,
      program_focus: data.program_focus || null,
      budget_ceiling_reference: data.budget_ceiling_reference || null,
      status: 'draft',
      created_by: userId || 1,
    });
    return this.getRksById(id);
  }

  async updateRks(id, data) {
    const item = await this.getRksById(id);
    if (!['draft', 'submitted'].includes(item.status)) {
      const err = new Error('RKS hanya dapat diubah saat berstatus draft atau submitted');
      err.statusCode = 422;
      throw err;
    }
    await db('school_work_plans')
      .where({ id })
      .update({
        title: data.title !== undefined ? data.title : item.title,
        institution_development_plan_id:
          data.institution_development_plan_id !== undefined
            ? data.institution_development_plan_id
            : item.institution_development_plan_id,
        academic_year_id: data.academic_year_id !== undefined ? data.academic_year_id : item.academic_year_id,
        program_focus: data.program_focus !== undefined ? data.program_focus : item.program_focus,
        budget_ceiling_reference:
          data.budget_ceiling_reference !== undefined
            ? data.budget_ceiling_reference
            : item.budget_ceiling_reference,
      });
    return this.getRksById(id);
  }

  async submitRks(id) {
    await this.getRksById(id);
    await db('school_work_plans').where({ id }).update({ status: 'submitted' });
    return this.getRksById(id);
  }

  async approveRks(id, userId) {
    await this.getRksById(id);
    await db('school_work_plans').where({ id }).update({
      status: 'approved',
      approved_by: userId || 1,
      approved_at: new Date(),
    });
    return this.getRksById(id);
  }

  // ==========================================
  // 3. Work Plan Programs - #192
  // ==========================================
  async listPrograms(schoolUnitId, query = {}) {
    let q = db('work_plan_programs as wpp')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .where(function () {
        if (schoolUnitId) this.where('wpp.school_unit_id', schoolUnitId);
      });

    if (query.school_work_plan_id) q = q.where('wpp.school_work_plan_id', query.school_work_plan_id);
    if (query.pic_employee_id) q = q.where('wpp.pic_employee_id', query.pic_employee_id);
    if (query.status) q = q.where('wpp.status', query.status);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('wpp.title', 'like', s)
          .orWhere('wpp.unit_name', 'like', s)
          .orWhere('wpp.description', 'like', s);
      });
    }

    const items = await q
      .select('wpp.*', 'swp.title as rks_title')
      .orderBy('wpp.id', 'desc');

    const enriched = await Promise.all(
      items.map(async (item) => {
        let pic = null;
        try {
          pic = await validateEmployee(item.pic_employee_id);
        } catch (e) {
          pic = { id: item.pic_employee_id, full_name: `Pegawai #${item.pic_employee_id}` };
        }
        return {
          ...item,
          pic_name: pic?.full_name || `Pegawai #${item.pic_employee_id}`,
        };
      })
    );

    return enriched;
  }

  async getProgramById(id) {
    const item = await db('work_plan_programs as wpp')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .where('wpp.id', id)
      .select('wpp.*', 'swp.title as rks_title')
      .first();

    if (!item) {
      const err = new Error('Program kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let pic = null;
    try {
      pic = await validateEmployee(item.pic_employee_id);
    } catch (e) {
      pic = { id: item.pic_employee_id, full_name: `Pegawai #${item.pic_employee_id}` };
    }

    return {
      ...item,
      pic_name: pic?.full_name || `Pegawai #${item.pic_employee_id}`,
    };
  }

  async createProgram(data) {
    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    const [id] = await db('work_plan_programs').insert({
      school_work_plan_id: data.school_work_plan_id || null,
      school_unit_id: data.school_unit_id || 1,
      unit_name: data.unit_name,
      pic_employee_id: data.pic_employee_id,
      title: data.title,
      description: data.description || null,
      target: data.target || null,
      budget_estimate_reference: data.budget_estimate_reference || null,
      status: data.status || 'planned',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    });
    return this.getProgramById(id);
  }

  async updateProgram(id, data) {
    const item = await this.getProgramById(id);
    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('work_plan_programs')
      .where({ id })
      .update({
        school_work_plan_id:
          data.school_work_plan_id !== undefined ? data.school_work_plan_id : item.school_work_plan_id,
        unit_name: data.unit_name !== undefined ? data.unit_name : item.unit_name,
        pic_employee_id: data.pic_employee_id !== undefined ? data.pic_employee_id : item.pic_employee_id,
        title: data.title !== undefined ? data.title : item.title,
        description: data.description !== undefined ? data.description : item.description,
        target: data.target !== undefined ? data.target : item.target,
        budget_estimate_reference:
          data.budget_estimate_reference !== undefined
            ? data.budget_estimate_reference
            : item.budget_estimate_reference,
        start_date: data.start_date !== undefined ? data.start_date : item.start_date,
        end_date: data.end_date !== undefined ? data.end_date : item.end_date,
      });
    return this.getProgramById(id);
  }

  async updateProgramStatus(id, status) {
    await this.getProgramById(id);
    await db('work_plan_programs').where({ id }).update({ status });
    return this.getProgramById(id);
  }

  async deleteProgram(id) {
    const item = await this.getProgramById(id);
    if (item.status !== 'planned') {
      const err = new Error('Hanya program kerja dengan status planned yang dapat dihapus');
      err.statusCode = 422;
      throw err;
    }
    await db('work_plan_programs').where({ id }).del();
    return { id: Number(id), deleted: true };
  }
}

module.exports = new PlanningService();
