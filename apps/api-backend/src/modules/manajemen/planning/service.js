/**
 * Planning Service Implementation
 * Modul Manajemen: Renstra/RIPS (#190), Sasaran Strategis, RPS/RJJP/RJM/RKS (#191), Program Kerja Tahunan (#192), Renop Kegiatan (#4), dan Program Prioritas (#5)
 */
const db = require('../../../config/db/manajemen');
const dbCore = require('../../../config/db/core');
const dbKepegawaian = require('../../../config/db/kepegawaian');
const dbAkademik = require('../../../config/db/akademik');
const { validateEmployee } = require('../utils/crossModuleHelper');

class PlanningService {
  // ==========================================
  // 0. MASTER REFERENCES FOR PLANNING
  // ==========================================
  async getPlanningReferences(schoolUnitId) {
    let employees = [];
    let academicYears = [];
    let renstras = [];
    let rkjps = [];
    let rkjms = [];
    let rkts = [];
    let strategicGoals = [];

    try {
      let empQuery = dbKepegawaian('employees').select('id', 'full_name', 'nip', 'school_unit_id');
      if (schoolUnitId) {
        empQuery = empQuery.where(function () {
          this.where('school_unit_id', Number(schoolUnitId)).orWhereNull('school_unit_id');
        });
      }
      employees = await empQuery.orderBy('full_name', 'asc');
    } catch (err) {
      console.warn('[PlanningService] Unable to fetch employees from db_kepegawaian:', err.message);
    }

    try {
      academicYears = await dbAkademik('academic_years')
        .select('id', 'name', 'is_active')
        .orderBy('id', 'desc');
    } catch (err) {
      console.warn('[PlanningService] Unable to fetch academic_years from db_akademik:', err.message);
    }

    try {
      renstras = await db('institution_development_plans')
        .select('id', 'code', 'title', 'period_start_year', 'period_end_year', 'status')
        .orderBy('period_start_year', 'desc');

      strategicGoals = await db('strategic_goals')
        .select('id', 'institution_development_plan_id', 'code', 'name', 'perspective')
        .orderBy('order_index', 'asc');

      const allPlans = await db('school_work_plans')
        .select('id', 'plan_type', 'code', 'title', 'parent_plan_id', 'institution_development_plan_id', 'period_start_year', 'period_end_year', 'status')
        .orderBy('period_start_year', 'desc');

      rkjps = allPlans.filter((p) => p.plan_type === 'rkjp' || p.plan_type === 'rjjp');
      rkjms = allPlans.filter((p) => p.plan_type === 'rkjm' || p.plan_type === 'rps' || p.plan_type === 'rjm');
      rkts = allPlans.filter((p) => p.plan_type === 'rkt');
    } catch (err) {
      console.warn('[PlanningService] Unable to fetch planning references from db:', err.message);
    }

    return {
      employees: employees || [],
      academic_years: academicYears || [],
      renstras: renstras || [],
      strategic_goals: strategicGoals || [],
      rkjps: rkjps || [],
      rkjms: rkjms || [],
      rkts: rkts || []
    };
  }

  // ==========================================
  // TRACEABILITY CHAIN (Top-Down & Bottom-Up)
  // ==========================================
  async getTraceabilityChain(type, id) {
    let result = {
      target_type: type,
      target_id: Number(id),
      renstra: null,
      strategic_goal: null,
      rkjp: null,
      rkjm: null,
      rkt: null,
      program: null,
      activity: null,
      breadcrumbs: []
    };

    let activity = null;
    let program = null;
    let rkt = null;
    let rkjm = null;
    let rkjp = null;
    let goal = null;
    let renstra = null;

    if (type === 'activity') {
      activity = await db('work_plan_activities').where({ id }).first();
      if (activity && activity.work_plan_program_id) {
        program = await db('work_plan_programs').where({ id: activity.work_plan_program_id }).first();
      }
    } else if (type === 'program') {
      program = await db('work_plan_programs').where({ id }).first();
    } else if (type === 'rkt' || type === 'school_work_plan') {
      const swp = await db('school_work_plans').where({ id }).first();
      if (swp) {
        if (swp.plan_type === 'rkt') rkt = swp;
        else if (swp.plan_type === 'rkjm' || swp.plan_type === 'rps' || swp.plan_type === 'rjm') rkjm = swp;
        else if (swp.plan_type === 'rkjp' || swp.plan_type === 'rjjp') rkjp = swp;
      }
    } else if (type === 'rkjm') {
      rkjm = await db('school_work_plans').where({ id }).first();
    } else if (type === 'rkjp') {
      rkjp = await db('school_work_plans').where({ id }).first();
    } else if (type === 'strategic_goal' || type === 'goal') {
      goal = await db('strategic_goals').where({ id }).first();
    } else if (type === 'renstra') {
      renstra = await db('institution_development_plans').where({ id }).first();
    }

    // Traverse bottom-up
    if (program && !rkt && program.school_work_plan_id) {
      rkt = await db('school_work_plans').where({ id: program.school_work_plan_id }).first();
    }

    if (program && !goal && program.strategic_goal_id) {
      goal = await db('strategic_goals').where({ id: program.strategic_goal_id }).first();
    }

    if (rkt && !rkjm && rkt.parent_plan_id) {
      const parent = await db('school_work_plans').where({ id: rkt.parent_plan_id }).first();
      if (parent) {
        if (parent.plan_type === 'rkjm' || parent.plan_type === 'rps' || parent.plan_type === 'rjm') {
          rkjm = parent;
        } else if (parent.plan_type === 'rkjp' || parent.plan_type === 'rjjp') {
          rkjp = parent;
        }
      }
    }

    if (rkjm && !rkjp && rkjm.parent_plan_id) {
      rkjp = await db('school_work_plans').where({ id: rkjm.parent_plan_id }).first();
    }

    if (!goal) {
      const candidateGoalId =
        (activity && activity.strategic_goal_id) ||
        (program && program.strategic_goal_id) ||
        (rkt && rkt.strategic_goal_id) ||
        (rkjm && rkjm.strategic_goal_id) ||
        (rkjp && rkjp.strategic_goal_id);
      if (candidateGoalId) {
        goal = await db('strategic_goals').where({ id: candidateGoalId }).first();
      }
    }

    if (!renstra) {
      const candidateRenstraId =
        (goal && goal.institution_development_plan_id) ||
        (rkjp && rkjp.institution_development_plan_id) ||
        (rkjm && rkjm.institution_development_plan_id) ||
        (rkt && rkt.institution_development_plan_id);
      if (candidateRenstraId) {
        renstra = await db('institution_development_plans').where({ id: candidateRenstraId }).first();
      }
    }

    result.activity = activity;
    result.program = program;
    result.rkt = rkt;
    result.rkjm = rkjm;
    result.rkjp = rkjp;
    result.strategic_goal = goal;
    result.renstra = renstra;

    const bc = [];
    if (renstra) bc.push({ level: 'Renstra', code: renstra.code, title: renstra.title, id: renstra.id });
    if (goal) bc.push({ level: 'Sasaran BSC', code: goal.code, title: goal.name, id: goal.id });
    if (rkjp) bc.push({ level: 'RKJP (10 Thn)', code: rkjp.code, title: rkjp.title, id: rkjp.id });
    if (rkjm) bc.push({ level: 'RKJM (5 Thn)', code: rkjm.code, title: rkjm.title, id: rkjm.id });
    if (rkt) bc.push({ level: 'RKT (1 Thn)', code: rkt.code, title: rkt.title, id: rkt.id });
    if (program) bc.push({ level: 'Program', code: program.code, title: program.title, id: program.id });
    if (activity) bc.push({ level: 'Kegiatan', code: activity.code, title: activity.name, id: activity.id });

    result.breadcrumbs = bc;
    result.chain_text = bc.map((b) => `${b.level}: ${b.code}`).join(' ➔ ');

    return result;
  }

  // ==========================================
  // 1. RIPS / RENSTRA (Institution Development Plans) - #190
  // ==========================================
  async listRips(schoolUnitId, query = {}) {
    let q = db('institution_development_plans as idp')
      .leftJoin('strategic_goals as sg', 'idp.id', 'sg.institution_development_plan_id')
      .select(
        'idp.*',
        db.raw('COUNT(DISTINCT sg.id) as goals_count')
      )
      .groupBy('idp.id');

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('idp.school_unit_id', Number(schoolUnitId))
          .orWhereNull('idp.school_unit_id');
      });
    }

    if (query.status) q = q.where('idp.status', query.status);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('idp.title', 'like', s)
          .orWhere('idp.code', 'like', s)
          .orWhere('idp.vision', 'like', s)
          .orWhere('idp.mission', 'like', s);
      });
    }

    const rawRips = await q.orderBy('idp.period_start_year', 'desc').orderBy('idp.id', 'desc');
    const approverIds = [...new Set(rawRips.filter((r) => r.approved_by).map((r) => r.approved_by))];
    let userMap = {};
    if (approverIds.length > 0) {
      try {
        const users = await dbCore('users').whereIn('id', approverIds).select('id', 'full_name', 'username');
        users.forEach((u) => { userMap[u.id] = u.full_name || u.username; });
      } catch (e) {}
    }

    return rawRips.map((r) => ({
      ...r,
      approved_by_name: userMap[r.approved_by] || (r.approved_by ? `User #${r.approved_by}` : null)
    }));
  }

  async getRipsById(id) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Renstra / RIPS tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const goals = await db('strategic_goals')
      .where({ institution_development_plan_id: id })
      .orderBy('order_index', 'asc')
      .orderBy('id', 'asc');

    let approverName = null;
    if (item.approved_by) {
      try {
        const u = await dbCore('users').where({ id: item.approved_by }).select('full_name', 'username').first();
        if (u) approverName = u.full_name || u.username;
      } catch (e) {}
    }

    return {
      ...item,
      approved_by_name: approverName,
      strategic_goals: goals || []
    };
  }

  async createRips(data, userId) {
    if (!data.title || !data.title.trim()) {
      const err = new Error('Nama/Judul Renstra wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const startYear = Number(data.period_start_year) || new Date().getFullYear();
    const endYear = Number(data.period_end_year) || startYear + 4;

    if (startYear > endYear) {
      const err = new Error('Tahun mulai periode tidak boleh lebih besar dari tahun selesai');
      err.statusCode = 422;
      throw err;
    }

    const defaultCode = data.code ? data.code.trim() : `RENSTRA-${startYear}-${endYear}`;

    const [id] = await db('institution_development_plans').insert({
      code: defaultCode,
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      title: data.title.trim(),
      period_start_year: startYear,
      period_end_year: endYear,
      vision: data.vision || null,
      mission: data.mission || null,
      description: data.description || null,
      document_url: data.document_url || null,
      status: data.status || 'draft',
      created_by: userId || 1,
    });

    return this.getRipsById(id);
  }

  async updateRips(id, data, userId) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Renstra tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const startYear = data.period_start_year !== undefined ? Number(data.period_start_year) : item.period_start_year;
    const endYear = data.period_end_year !== undefined ? Number(data.period_end_year) : item.period_end_year;

    if (startYear > endYear) {
      const err = new Error('Tahun mulai periode tidak boleh lebih besar dari tahun selesai');
      err.statusCode = 422;
      throw err;
    }

    await db('institution_development_plans')
      .where({ id })
      .update({
        code: data.code !== undefined ? (data.code ? data.code.trim() : null) : item.code,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        title: data.title !== undefined ? data.title.trim() : item.title,
        period_start_year: startYear,
        period_end_year: endYear,
        vision: data.vision !== undefined ? data.vision : item.vision,
        mission: data.mission !== undefined ? data.mission : item.mission,
        description: data.description !== undefined ? data.description : item.description,
        document_url: data.document_url !== undefined ? data.document_url : item.document_url,
        status: data.status !== undefined ? data.status : item.status,
        updated_by: userId || 1,
      });

    return this.getRipsById(id);
  }

  async deleteRips(id) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Renstra tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('institution_development_plans').where({ id }).delete();
    return { success: true, message: 'Renstra berhasil dihapus' };
  }

  async approveRips(id, userId) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Renstra tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('institution_development_plans').where({ id }).update({
      status: 'active',
      approved_by: userId || 1,
      approved_at: new Date(),
    });
    return this.getRipsById(id);
  }

  async archiveRips(id) {
    const item = await db('institution_development_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Renstra tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('institution_development_plans').where({ id }).update({
      status: 'archived',
    });
    return this.getRipsById(id);
  }

  // Helper to normalize perspective values
  normalizePerspectiveKey(val) {
    if (!val) return 'learning_growth';
    const v = String(val).toLowerCase();
    if (v.includes('pembelajaran') || v.includes('santri') || v.includes('learning')) return 'learning_growth';
    if (v.includes('internal') || v.includes('proses') || v.includes('tata kelola')) return 'internal_process';
    if (v.includes('pemangku') || v.includes('stakeholder') || v.includes('kepuasan')) return 'stakeholder';
    if (v.includes('finansial') || v.includes('keuangan') || v.includes('sarpras') || v.includes('financial')) return 'financial';
    if (['learning_growth', 'internal_process', 'stakeholder', 'financial'].includes(val)) return val;
    return 'learning_growth';
  }

  // ==========================================
  // 2. SASARAN STRATEGIS (Strategic Goals)
  // ==========================================
  async listStrategicGoals(schoolUnitId, query = {}) {
    let q = db('strategic_goals as sg')
      .leftJoin('institution_development_plans as idp', 'sg.institution_development_plan_id', 'idp.id')
      .select(
        'sg.*',
        'idp.title as renstra_title',
        'idp.code as renstra_code',
        'idp.period_start_year',
        'idp.period_end_year'
      );

    if (query.renstra_id || query.institution_development_plan_id) {
      const renstraId = Number(query.renstra_id || query.institution_development_plan_id);
      q = q.where('sg.institution_development_plan_id', renstraId);
    }

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('sg.school_unit_id', Number(schoolUnitId))
          .orWhereNull('sg.school_unit_id')
          .orWhere('idp.school_unit_id', Number(schoolUnitId))
          .orWhereNull('idp.school_unit_id');
      });
    }

    if (query.perspective) {
      const normP = this.normalizePerspectiveKey(query.perspective);
      q = q.where(function () {
        this.where('sg.perspective', normP).orWhere('sg.perspective', query.perspective);
      });
    }
    if (query.status) q = q.where('sg.status', query.status);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('sg.name', 'like', s)
          .orWhere('sg.code', 'like', s)
          .orWhere('sg.description', 'like', s)
          .orWhere('sg.perspective', 'like', s);
      });
    }

    return await q.orderBy('sg.order_index', 'asc').orderBy('sg.id', 'asc');
  }

  async getStrategicGoalById(id) {
    const item = await db('strategic_goals as sg')
      .leftJoin('institution_development_plans as idp', 'sg.institution_development_plan_id', 'idp.id')
      .select(
        'sg.*',
        'idp.title as renstra_title',
        'idp.code as renstra_code',
        'idp.period_start_year',
        'idp.period_end_year'
      )
      .where('sg.id', id)
      .first();

    if (!item) {
      const err = new Error('Sasaran Strategis tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return item;
  }

  async createStrategicGoal(data, userId) {
    if (!data.institution_development_plan_id) {
      const err = new Error('Renstra induk wajib dipilih');
      err.statusCode = 422;
      throw err;
    }
    if (!data.name || !data.name.trim()) {
      const err = new Error('Nama sasaran strategis wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const renstra = await db('institution_development_plans')
      .where({ id: Number(data.institution_development_plan_id) })
      .first();
    if (!renstra) {
      const err = new Error('Renstra induk tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let code = data.code ? data.code.trim() : '';
    if (!code) {
      const count = await db('strategic_goals')
        .where({ institution_development_plan_id: data.institution_development_plan_id })
        .count('id as c')
        .first();
      const num = String(Number(count?.c || 0) + 1).padStart(2, '0');
      code = `SS-${num}`;
    }

    let trajectoryJson = null;
    if (data.trajectory_targets) {
      trajectoryJson = typeof data.trajectory_targets === 'object' ? JSON.stringify(data.trajectory_targets) : data.trajectory_targets;
    }

    const [id] = await db('strategic_goals').insert({
      institution_development_plan_id: Number(data.institution_development_plan_id),
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : (renstra.school_unit_id || null),
      code: code,
      name: data.name.trim(),
      perspective: this.normalizePerspectiveKey(data.perspective),
      field_snp: data.field_snp || 'Standar Kompetensi Lulusan & Proses',
      description: data.description || null,
      target_description: data.target_description || null,
      current_condition: data.current_condition || null,
      ideal_condition: data.ideal_condition || null,
      strategy_program: data.strategy_program || null,
      trajectory_targets: trajectoryJson,
      baseline_year: data.baseline_year ? Number(data.baseline_year) : null,
      baseline_value: data.baseline_value !== undefined && data.baseline_value !== '' ? Number(data.baseline_value) : null,
      target_value: data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : null,
      unit: data.unit ? data.unit.trim() : null,
      weight: data.weight !== undefined && data.weight !== '' ? Number(data.weight) : 0.00,
      order_index: Number(data.order_index) || 1,
      status: data.status || 'active',
      created_by: userId || 1,
    });

    return this.getStrategicGoalById(id);
  }

  async updateStrategicGoal(id, data, userId) {
    const item = await db('strategic_goals').where({ id }).first();
    if (!item) {
      const err = new Error('Sasaran Strategis tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let trajectoryJson = item.trajectory_targets;
    if (data.trajectory_targets !== undefined) {
      trajectoryJson = typeof data.trajectory_targets === 'object' ? JSON.stringify(data.trajectory_targets) : data.trajectory_targets;
    }

    await db('strategic_goals')
      .where({ id })
      .update({
        institution_development_plan_id: data.institution_development_plan_id !== undefined ? Number(data.institution_development_plan_id) : item.institution_development_plan_id,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        code: data.code !== undefined ? data.code.trim() : item.code,
        name: data.name !== undefined ? data.name.trim() : item.name,
        perspective: data.perspective !== undefined ? this.normalizePerspectiveKey(data.perspective) : item.perspective,
        field_snp: data.field_snp !== undefined ? data.field_snp : item.field_snp,
        description: data.description !== undefined ? data.description : item.description,
        target_description: data.target_description !== undefined ? data.target_description : item.target_description,
        current_condition: data.current_condition !== undefined ? data.current_condition : item.current_condition,
        ideal_condition: data.ideal_condition !== undefined ? data.ideal_condition : item.ideal_condition,
        strategy_program: data.strategy_program !== undefined ? data.strategy_program : item.strategy_program,
        trajectory_targets: trajectoryJson,
        baseline_year: data.baseline_year !== undefined ? (data.baseline_year ? Number(data.baseline_year) : null) : item.baseline_year,
        baseline_value: data.baseline_value !== undefined ? (data.baseline_value !== '' ? Number(data.baseline_value) : null) : item.baseline_value,
        target_value: data.target_value !== undefined ? (data.target_value !== '' ? Number(data.target_value) : null) : item.target_value,
        unit: data.unit !== undefined ? data.unit : item.unit,
        weight: data.weight !== undefined ? (data.weight !== '' ? Number(data.weight) : 0.00) : item.weight,
        order_index: data.order_index !== undefined ? Number(data.order_index) : item.order_index,
        status: data.status !== undefined ? data.status : item.status,
        updated_by: userId || 1,
      });

    return this.getStrategicGoalById(id);
  }

  async reorderStrategicGoals(items) {
    if (!Array.isArray(items)) return { success: false, message: 'Invalid data' };
    for (const it of items) {
      if (it.id && it.order_index !== undefined) {
        await db('strategic_goals').where({ id: it.id }).update({ order_index: Number(it.order_index) });
      }
    }
    return { success: true, message: 'Urutan sasaran berhasil diperbarui' };
  }

  async deleteStrategicGoal(id) {
    const item = await db('strategic_goals').where({ id }).first();
    if (!item) {
      const err = new Error('Sasaran Strategis tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('strategic_goals').where({ id }).delete();
    return { success: true, message: 'Sasaran Strategis berhasil dihapus' };
  }

  // ==========================================
  // 3. RKJP, RKJM & RKT (School Work Plans)
  // ==========================================
  normalizePlanType(type) {
    if (!type) return 'rkjm';
    const t = String(type).toLowerCase().trim();
    if (t === 'rjjp' || t === 'rkjp') return 'rkjp';
    if (t === 'rps' || t === 'rjm' || t === 'rkjm') return 'rkjm';
    if (t === 'rkt') return 'rkt';
    return t;
  }

  async listRks(schoolUnitId, query = {}) {
    let q = db('school_work_plans as swp')
      .leftJoin('institution_development_plans as idp', 'swp.institution_development_plan_id', 'idp.id')
      .leftJoin('strategic_goals as sg', 'swp.strategic_goal_id', 'sg.id')
      .leftJoin('school_work_plans as parent_swp', 'swp.parent_plan_id', 'parent_swp.id')
      .select(
        'swp.*',
        'idp.title as renstra_title',
        'idp.code as renstra_code',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'parent_swp.title as parent_plan_title',
        'parent_swp.code as parent_plan_code',
        'parent_swp.plan_type as parent_plan_type'
      );

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('swp.school_unit_id', Number(schoolUnitId))
          .orWhereNull('swp.school_unit_id');
      });
    }

    if (query.plan_type) {
      const norm = this.normalizePlanType(query.plan_type);
      if (norm === 'rkjp') {
        q = q.whereIn('swp.plan_type', ['rkjp', 'rjjp']);
      } else if (norm === 'rkjm') {
        q = q.whereIn('swp.plan_type', ['rkjm', 'rps', 'rjm']);
      } else {
        q = q.where('swp.plan_type', norm);
      }
    }

    if (query.parent_plan_id) q = q.where('swp.parent_plan_id', Number(query.parent_plan_id));
    if (query.institution_development_plan_id) q = q.where('swp.institution_development_plan_id', Number(query.institution_development_plan_id));
    if (query.strategic_goal_id) q = q.where('swp.strategic_goal_id', Number(query.strategic_goal_id));
    if (query.status) q = q.where('swp.status', query.status);
    if (query.academic_year_id) q = q.where('swp.academic_year_id', query.academic_year_id);

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('swp.title', 'like', s)
          .orWhere('swp.code', 'like', s)
          .orWhere('swp.program_focus', 'like', s)
          .orWhere('swp.description', 'like', s);
      });
    }

    return await q.orderBy('swp.period_start_year', 'desc').orderBy('swp.id', 'desc');
  }

  async getRksById(id) {
    const item = await db('school_work_plans as swp')
      .leftJoin('institution_development_plans as idp', 'swp.institution_development_plan_id', 'idp.id')
      .leftJoin('strategic_goals as sg', 'swp.strategic_goal_id', 'sg.id')
      .leftJoin('school_work_plans as parent_swp', 'swp.parent_plan_id', 'parent_swp.id')
      .select(
        'swp.*',
        'idp.title as renstra_title',
        'idp.code as renstra_code',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'parent_swp.title as parent_plan_title',
        'parent_swp.code as parent_plan_code',
        'parent_swp.plan_type as parent_plan_type'
      )
      .where('swp.id', id)
      .first();

    if (!item) {
      const err = new Error('Rencana kerja / RKT tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const childrenPlans = await db('school_work_plans')
      .where({ parent_plan_id: id })
      .orderBy('period_start_year', 'asc')
      .orderBy('id', 'asc');

    const rawPrograms = await db('work_plan_programs')
      .where({ school_work_plan_id: id })
      .orderBy('id', 'asc');

    const empIds = [...new Set(rawPrograms.filter((p) => p.pic_employee_id).map((p) => p.pic_employee_id))];
    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name', 'nip');
        emps.forEach((e) => {
          empMap[e.id] = e.full_name;
        });
      } catch (e) {}
    }

    const programs = rawPrograms.map((p) => ({
      ...p,
      pic_name: empMap[p.pic_employee_id] || (p.pic_employee_id ? `Pegawai #${p.pic_employee_id}` : null)
    }));

    return {
      ...item,
      children_plans: childrenPlans || [],
      programs: programs || []
    };
  }

  async createRks(data, userId) {
    if (!data.title || !data.title.trim()) {
      const err = new Error('Judul rencana kerja / RKT wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const planType = this.normalizePlanType(data.plan_type || 'rkjm');
    const startYear = data.period_start_year ? Number(data.period_start_year) : new Date().getFullYear();
    const endYear = data.period_end_year
      ? Number(data.period_end_year)
      : planType === 'rkjp'
      ? startYear + 9
      : planType === 'rkt'
      ? startYear + 1
      : startYear + 4;

    if (startYear > endYear) {
      const err = new Error('Tahun mulai periode tidak boleh lebih besar dari tahun selesai');
      err.statusCode = 422;
      throw err;
    }

    // Validate parent hierarchy if parent_plan_id provided
    let parentPlanId = data.parent_plan_id ? Number(data.parent_plan_id) : null;
    let renstraId = data.institution_development_plan_id ? Number(data.institution_development_plan_id) : null;

    if (parentPlanId) {
      const parent = await db('school_work_plans').where({ id: parentPlanId }).first();
      if (parent) {
        if (!renstraId && parent.institution_development_plan_id) {
          renstraId = parent.institution_development_plan_id;
        }
      }
    }

    const defaultCode = data.code ? data.code.trim() : `${planType.toUpperCase()}-${startYear}-${endYear}`;

    const [id] = await db('school_work_plans').insert({
      plan_type: planType,
      code: defaultCode,
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      institution_development_plan_id: renstraId,
      parent_plan_id: parentPlanId,
      strategic_goal_id: data.strategic_goal_id ? Number(data.strategic_goal_id) : null,
      academic_year_id: data.academic_year_id ? Number(data.academic_year_id) : null,
      period_start_year: startYear,
      period_end_year: endYear,
      title: data.title.trim(),
      program_focus: data.program_focus || null,
      description: data.description || null,
      target_initial: data.target_initial || null,
      target_final: data.target_final || null,
      current_achievement: data.current_achievement || null,
      progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : 0.0,
      budget_ceiling_reference: data.budget_ceiling_reference || null,
      document_url: data.document_url || null,
      status: data.status || 'draft',
      created_by: userId || 1
    });

    return this.getRksById(id);
  }

  async updateRks(id, data) {
    const item = await db('school_work_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Rencana kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const planType = data.plan_type !== undefined ? this.normalizePlanType(data.plan_type) : item.plan_type;
    const startYear = data.period_start_year !== undefined ? Number(data.period_start_year) : item.period_start_year;
    const endYear = data.period_end_year !== undefined ? Number(data.period_end_year) : item.period_end_year;

    if (startYear && endYear && startYear > endYear) {
      const err = new Error('Tahun mulai periode tidak boleh lebih besar dari tahun selesai');
      err.statusCode = 422;
      throw err;
    }

    await db('school_work_plans')
      .where({ id })
      .update({
        plan_type: planType,
        code: data.code !== undefined ? data.code.trim() : item.code,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        institution_development_plan_id: data.institution_development_plan_id !== undefined ? (data.institution_development_plan_id ? Number(data.institution_development_plan_id) : null) : item.institution_development_plan_id,
        parent_plan_id: data.parent_plan_id !== undefined ? (data.parent_plan_id ? Number(data.parent_plan_id) : null) : item.parent_plan_id,
        strategic_goal_id: data.strategic_goal_id !== undefined ? (data.strategic_goal_id ? Number(data.strategic_goal_id) : null) : item.strategic_goal_id,
        academic_year_id: data.academic_year_id !== undefined ? data.academic_year_id : item.academic_year_id,
        period_start_year: startYear,
        period_end_year: endYear,
        title: data.title !== undefined ? data.title.trim() : item.title,
        program_focus: data.program_focus !== undefined ? data.program_focus : item.program_focus,
        description: data.description !== undefined ? data.description : item.description,
        target_initial: data.target_initial !== undefined ? data.target_initial : item.target_initial,
        target_final: data.target_final !== undefined ? data.target_final : item.target_final,
        current_achievement: data.current_achievement !== undefined ? data.current_achievement : item.current_achievement,
        progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : item.progress_percent,
        budget_ceiling_reference: data.budget_ceiling_reference !== undefined ? data.budget_ceiling_reference : item.budget_ceiling_reference,
        document_url: data.document_url !== undefined ? data.document_url : item.document_url,
        status: data.status !== undefined ? data.status : item.status
      });

    return this.getRksById(id);
  }

  async deleteRks(id) {
    const item = await db('school_work_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Rencana kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('school_work_plans').where({ id }).delete();
    return { success: true, message: 'Rencana kerja berhasil dihapus' };
  }

  async submitRks(id) {
    const item = await db('school_work_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Rencana kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await db('school_work_plans').where({ id }).update({ status: 'submitted' });
    return this.getRksById(id);
  }

  async approveRks(id, userId) {
    const item = await db('school_work_plans').where({ id }).first();
    if (!item) {
      const err = new Error('Rencana kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await db('school_work_plans').where({ id }).update({
      status: 'approved',
      approved_by: userId || 1,
      approved_at: new Date(),
    });
    return this.getRksById(id);
  }

  // ==========================================
  // 4. PROGRAM KERJA TAHUNAN (#192) & PRIORITAS (#5)
  // ==========================================
  async listPrograms(schoolUnitId, query = {}) {
    let q = db('work_plan_programs as wpp')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .leftJoin('strategic_goals as sg', 'wpp.strategic_goal_id', 'sg.id')
      .leftJoin('work_plan_activities as wpa', 'wpp.id', 'wpa.work_plan_program_id')
      .select(
        'wpp.*',
        'swp.title as school_work_plan_title',
        'swp.code as school_work_plan_code',
        'swp.plan_type as school_work_plan_type',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        db.raw('COUNT(DISTINCT wpa.id) as activities_count')
      )
      .groupBy('wpp.id');

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('wpp.school_unit_id', Number(schoolUnitId))
          .orWhereNull('wpp.school_unit_id');
      });
    }

    if (query.is_priority !== undefined && query.is_priority !== '') {
      const isPri = query.is_priority === 'true' || query.is_priority === true || query.is_priority === 1 || query.is_priority === '1';
      q = q.where('wpp.is_priority', isPri);
    }

    if (query.priority_level) q = q.where('wpp.priority_level', query.priority_level);
    if (query.status) q = q.where('wpp.status', query.status);
    if (query.school_work_plan_id) q = q.where('wpp.school_work_plan_id', Number(query.school_work_plan_id));
    if (query.strategic_goal_id) q = q.where('wpp.strategic_goal_id', Number(query.strategic_goal_id));
    if (query.unit_name) q = q.where('wpp.unit_name', query.unit_name);

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('wpp.title', 'like', s)
          .orWhere('wpp.code', 'like', s)
          .orWhere('wpp.description', 'like', s)
          .orWhere('wpp.unit_name', 'like', s);
      });
    }

    const list = await q.orderBy('wpp.is_priority', 'desc').orderBy('wpp.id', 'desc');

    const empIds = [...new Set(list.filter(p => p.pic_employee_id).map(p => p.pic_employee_id))];
    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name', 'nip');
        emps.forEach(e => { empMap[e.id] = { name: e.full_name, nip: e.nip }; });
      } catch (e) {}
    }

    return list.map(item => ({
      ...item,
      pic_name: empMap[item.pic_employee_id]?.name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      pic_nip: empMap[item.pic_employee_id]?.nip || null
    }));
  }

  async getProgramById(id) {
    const item = await db('work_plan_programs as wpp')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .leftJoin('strategic_goals as sg', 'wpp.strategic_goal_id', 'sg.id')
      .select(
        'wpp.*',
        'swp.title as school_work_plan_title',
        'swp.code as school_work_plan_code',
        'swp.plan_type as school_work_plan_type',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'sg.perspective as strategic_goal_perspective'
      )
      .where('wpp.id', id)
      .first();

    if (!item) {
      const err = new Error('Program kerja tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Include activities
    const rawActivities = await db('work_plan_activities')
      .where({ work_plan_program_id: id })
      .orderBy('id', 'asc');

    // Include tasks linked to this program or activities
    let tasks = [];
    try {
      tasks = await db('tasks')
        .where(function () {
          this.where({ reference_type: 'work_plan_program', reference_id: id });
        })
        .select('id', 'title', 'status', 'priority', 'due_date');
    } catch (e) {}

    // Include risks linked
    let risks = [];
    try {
      risks = await db('school_risks')
        .where({ school_unit_id: item.school_unit_id || 1 })
        .limit(3)
        .select('id', 'title', 'likelihood', 'impact', 'status');
    } catch (e) {}

    let pic_name = null;
    if (item.pic_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.pic_employee_id }).first();
        if (emp) pic_name = emp.full_name;
      } catch (e) {}
    }

    return {
      ...item,
      pic_name: pic_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      activities: rawActivities || [],
      tasks: tasks || [],
      risks: risks || []
    };
  }

  async createProgram(data) {
    if (!data.title || !data.title.trim()) {
      const err = new Error('Nama program kerja tahunan wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    let code = data.code ? data.code.trim() : '';
    if (!code) {
      const count = await db('work_plan_programs')
        .where({ school_work_plan_id: data.school_work_plan_id })
        .count('id as c')
        .first();
      const num = String(Number(count?.c || 0) + 1).padStart(2, '0');
      code = `PRG-${num}`;
    }

    const [id] = await db('work_plan_programs').insert({
      code: code,
      school_work_plan_id: data.school_work_plan_id ? Number(data.school_work_plan_id) : null,
      strategic_goal_id: data.strategic_goal_id ? Number(data.strategic_goal_id) : null,
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      unit_name: data.unit_name || 'Umum & Manajemen',
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      title: data.title.trim(),
      description: data.description || null,
      target: data.target || null,
      indicator: data.indicator || null,
      budget_estimate_reference: data.budget_estimate_reference || null,
      progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : 0.00,
      status: data.status || 'planned',
      is_priority: data.is_priority ? true : false,
      priority_level: data.priority_level || 'medium',
      priority_reason: data.priority_reason || null,
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
        code: data.code !== undefined ? data.code.trim() : item.code,
        school_work_plan_id: data.school_work_plan_id !== undefined ? (data.school_work_plan_id ? Number(data.school_work_plan_id) : null) : item.school_work_plan_id,
        strategic_goal_id: data.strategic_goal_id !== undefined ? (data.strategic_goal_id ? Number(data.strategic_goal_id) : null) : item.strategic_goal_id,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        unit_name: data.unit_name !== undefined ? data.unit_name : item.unit_name,
        pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
        title: data.title !== undefined ? data.title.trim() : item.title,
        description: data.description !== undefined ? data.description : item.description,
        target: data.target !== undefined ? data.target : item.target,
        indicator: data.indicator !== undefined ? data.indicator : item.indicator,
        budget_estimate_reference: data.budget_estimate_reference !== undefined ? data.budget_estimate_reference : item.budget_estimate_reference,
        progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : item.progress_percent,
        status: data.status !== undefined ? data.status : item.status,
        is_priority: data.is_priority !== undefined ? Boolean(data.is_priority) : item.is_priority,
        priority_level: data.priority_level !== undefined ? data.priority_level : item.priority_level,
        priority_reason: data.priority_reason !== undefined ? data.priority_reason : item.priority_reason,
        start_date: data.start_date !== undefined ? data.start_date : item.start_date,
        end_date: data.end_date !== undefined ? data.end_date : item.end_date,
      });
    return this.getProgramById(id);
  }

  async setProgramPriority(id, data) {
    const item = await this.getProgramById(id);
    await db('work_plan_programs')
      .where({ id })
      .update({
        is_priority: data.is_priority !== undefined ? Boolean(data.is_priority) : true,
        priority_level: data.priority_level || item.priority_level || 'medium',
        priority_reason: data.priority_reason !== undefined ? data.priority_reason : item.priority_reason,
      });
    return this.getProgramById(id);
  }

  async updateProgramStatus(id, status) {
    await this.getProgramById(id);
    await db('work_plan_programs').where({ id }).update({ status });
    return this.getProgramById(id);
  }

  async deleteProgram(id) {
    await this.getProgramById(id);
    await db('work_plan_programs').where({ id }).delete();
    return { success: true, message: 'Program kerja berhasil dihapus' };
  }

  // ==========================================
  // 5. RENOP KEGIATAN & SUBKEGIATAN (Fitur 4)
  // ==========================================
  async listActivities(schoolUnitId, query = {}) {
    let q = db('work_plan_activities as wpa')
      .leftJoin('work_plan_programs as wpp', 'wpa.work_plan_program_id', 'wpp.id')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .leftJoin('work_plan_activities as parent_act', 'wpa.parent_activity_id', 'parent_act.id')
      .select(
        'wpa.*',
        'wpp.title as program_title',
        'wpp.code as program_code',
        'swp.title as rkt_title',
        'swp.code as rkt_code',
        'parent_act.name as parent_activity_name',
        'parent_act.code as parent_activity_code'
      );

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('wpa.school_unit_id', Number(schoolUnitId))
          .orWhereNull('wpa.school_unit_id');
      });
    }

    if (query.work_plan_program_id) q = q.where('wpa.work_plan_program_id', Number(query.work_plan_program_id));
    if (query.parent_activity_id) q = q.where('wpa.parent_activity_id', Number(query.parent_activity_id));
    if (query.status) q = q.where('wpa.status', query.status);
    if (query.unit_name) q = q.where('wpa.unit_name', query.unit_name);

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('wpa.name', 'like', s)
          .orWhere('wpa.code', 'like', s)
          .orWhere('wpa.output', 'like', s)
          .orWhere('wpa.description', 'like', s);
      });
    }

    const list = await q.orderBy('wpa.id', 'asc');

    const empIds = [...new Set(list.filter(a => a.pic_employee_id).map(a => a.pic_employee_id))];
    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name', 'nip');
        emps.forEach(e => { empMap[e.id] = { name: e.full_name, nip: e.nip }; });
      } catch (e) {}
    }

    return list.map(item => ({
      ...item,
      pic_name: empMap[item.pic_employee_id]?.name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      pic_nip: empMap[item.pic_employee_id]?.nip || null
    }));
  }

  async getActivityById(id) {
    const item = await db('work_plan_activities as wpa')
      .leftJoin('work_plan_programs as wpp', 'wpa.work_plan_program_id', 'wpp.id')
      .leftJoin('school_work_plans as swp', 'wpp.school_work_plan_id', 'swp.id')
      .leftJoin('work_plan_activities as parent_act', 'wpa.parent_activity_id', 'parent_act.id')
      .select(
        'wpa.*',
        'wpp.title as program_title',
        'wpp.code as program_code',
        'swp.title as rkt_title',
        'swp.code as rkt_code',
        'parent_act.name as parent_activity_name',
        'parent_act.code as parent_activity_code'
      )
      .where('wpa.id', id)
      .first();

    if (!item) {
      const err = new Error('Kegiatan Renop tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const subActivities = await db('work_plan_activities')
      .where({ parent_activity_id: id })
      .orderBy('id', 'asc');

    let pic_name = null;
    if (item.pic_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.pic_employee_id }).first();
        if (emp) pic_name = emp.full_name;
      } catch (e) {}
    }

    return {
      ...item,
      pic_name: pic_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      sub_activities: subActivities || []
    };
  }

  async createActivity(data, userId) {
    if (!data.work_plan_program_id) {
      const err = new Error('Program kerja induk wajib dipilih');
      err.statusCode = 422;
      throw err;
    }
    if (!data.name || !data.name.trim()) {
      const err = new Error('Nama kegiatan Renop wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    let code = data.code ? data.code.trim() : '';
    if (!code) {
      const count = await db('work_plan_activities')
        .where({ work_plan_program_id: data.work_plan_program_id })
        .count('id as c')
        .first();
      const num = String(Number(count?.c || 0) + 1).padStart(2, '0');
      code = data.parent_activity_id ? `SUB-${num}` : `ACT-${num}`;
    }

    const [id] = await db('work_plan_activities').insert({
      work_plan_program_id: Number(data.work_plan_program_id),
      parent_activity_id: data.parent_activity_id ? Number(data.parent_activity_id) : null,
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      code: code,
      name: data.name.trim(),
      description: data.description || null,
      output: data.output || null,
      target_output: data.target_output || null,
      unit: data.unit || 'Dokumen',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      unit_name: data.unit_name || null,
      budget_reference: data.budget_reference || null,
      budget_account_code: data.budget_account_code || null,
      progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : 0.00,
      status: data.status || 'planned',
      document_url: data.document_url || null,
      created_by: userId || 1,
    });

    return this.getActivityById(id);
  }

  async updateActivity(id, data, userId) {
    const item = await this.getActivityById(id);
    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('work_plan_activities')
      .where({ id })
      .update({
        work_plan_program_id: data.work_plan_program_id !== undefined ? Number(data.work_plan_program_id) : item.work_plan_program_id,
        parent_activity_id: data.parent_activity_id !== undefined ? (data.parent_activity_id ? Number(data.parent_activity_id) : null) : item.parent_activity_id,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        code: data.code !== undefined ? data.code.trim() : item.code,
        name: data.name !== undefined ? data.name.trim() : item.name,
        description: data.description !== undefined ? data.description : item.description,
        output: data.output !== undefined ? data.output : item.output,
        target_output: data.target_output !== undefined ? data.target_output : item.target_output,
        unit: data.unit !== undefined ? data.unit : item.unit,
        start_date: data.start_date !== undefined ? data.start_date : item.start_date,
        end_date: data.end_date !== undefined ? data.end_date : item.end_date,
        pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
        unit_name: data.unit_name !== undefined ? data.unit_name : item.unit_name,
        budget_reference: data.budget_reference !== undefined ? data.budget_reference : item.budget_reference,
        budget_account_code: data.budget_account_code !== undefined ? data.budget_account_code : item.budget_account_code,
        progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : item.progress_percent,
        status: data.status !== undefined ? data.status : item.status,
        document_url: data.document_url !== undefined ? data.document_url : item.document_url,
        updated_by: userId || 1,
      });

    return this.getActivityById(id);
  }

  async deleteActivity(id) {
    const item = await db('work_plan_activities').where({ id }).first();
    if (!item) {
      const err = new Error('Kegiatan Renop tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('work_plan_activities').where({ id }).delete();
    return { success: true, message: 'Kegiatan Renop berhasil dihapus' };
  }

  // ==========================================
  // 6. EXECUTIVE DASHBOARD AGGREGATOR (FITUR 14)
  // ==========================================
  async getExecutiveDashboard(schoolUnitId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dTom = new Date();
    dTom.setDate(dTom.getDate() + 1);
    const tomorrowStr = dTom.toISOString().slice(0, 10);
    const dWeek = new Date();
    dWeek.setDate(dWeek.getDate() + 7);
    const weekEndStr = dWeek.toISOString().slice(0, 10);

    // 1. Strategis (RIPS & Sasaran)
    let ripsQ = db('rips_documents');
    if (schoolUnitId) ripsQ = ripsQ.where(function () { this.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id'); });
    const allRips = await ripsQ.select('*').orderBy('id', 'desc');
    const activeRips = allRips.find(r => r.status === 'published') || allRips[0] || null;

    let strategicGoals = [];
    if (activeRips) {
      strategicGoals = await db('rips_goals as g')
        .leftJoin('bsc_aspects as bsc', 'g.bsc_aspect_id', 'bsc.id')
        .where('g.rips_document_id', activeRips.id)
        .select('g.*', 'bsc.name as bsc_aspect_name');
    }

    const goalsByPerspective = {
      learning_growth: strategicGoals.filter(g => g.bsc_aspect_name === 'Pembelajaran & Pertumbuhan').length,
      internal_process: strategicGoals.filter(g => g.bsc_aspect_name === 'Proses Bisnis Internal').length,
      stakeholder: strategicGoals.filter(g => g.bsc_aspect_name === 'Pelanggan & Stakeholder').length,
      financial: strategicGoals.filter(g => g.bsc_aspect_name === 'Finansial').length,
    };

    // 2. Program Kerja & Prioritas (RKT & RIPS Programs)
    let progQ = db('rips_programs as p')
      .leftJoin('rips_documents as d', 'p.rips_document_id', 'd.id');
    if (activeRips) progQ = progQ.where('p.rips_document_id', activeRips.id);
    const programs = await progQ.select('p.*');

    const totalPrograms = programs.length;
    const priorityPrograms = programs.filter(p => p.is_flagship === 1 || p.is_flagship === true);
    const priorityProgramsCount = priorityPrograms.length;

    // 3. Aktivitas RKT Progress
    let actQ = db('work_plan_activities as a')
      .join('annual_work_plans as awp', 'a.annual_work_plan_id', 'awp.id');
    if (schoolUnitId) actQ = actQ.where('awp.school_unit_id', schoolUnitId);
    const activities = await actQ.select('a.progress_percent', 'a.status');

    const totalActivities = activities.length;
    const avgProgProgress = totalActivities > 0
      ? Math.round(activities.reduce((sum, a) => sum + (Number(a.progress_percent) || 0), 0) / totalActivities)
      : 0;
    const totalBudgetEstimate = 0;
    const totalBudgetRealization = 0;

    // 4. EVADIR / Mutu Capaian
    let evadirQ = db('evadir_reports as r');
    if (schoolUnitId) evadirQ = evadirQ.where('r.school_unit_id', schoolUnitId);
    const latestEvadir = await evadirQ.orderBy('r.evaluation_date', 'desc').first();

    let achievedKpis = 0;
    let pendingKpis = 0;
    let criticalKpis = 0;
    let sumKpiAch = 0;
    let evalCount = 0;

    if (latestEvadir) {
      const results = await db('evadir_goal_results').where('evadir_report_id', latestEvadir.id);
      results.forEach(res => {
        const pct = res.achieved_percent !== null ? Number(res.achieved_percent) : 0;
        sumKpiAch += pct;
        evalCount++;
        if (pct >= 100) achievedKpis++;
        else if (pct >= 75) pendingKpis++;
        else criticalKpis++;
      });
    }

    const avgKpiAchievement = evalCount > 0 ? Math.round(sumKpiAch / evalCount) : 0;
    const indicators = strategicGoals;

    // 4. Manajemen Risiko
    let riskQ = db('school_risks');
    if (schoolUnitId) riskQ = riskQ.where(function () { this.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id'); });
    const risks = await riskQ.select('*');
    const risksByLevel = {
      low: risks.filter(r => r.risk_level === 'low').length,
      medium: risks.filter(r => r.risk_level === 'medium').length,
      high: risks.filter(r => r.risk_level === 'high').length,
      extreme: risks.filter(r => r.risk_level === 'extreme').length,
    };
    const topCriticalRisks = risks
      .filter(r => ['high', 'extreme'].includes(r.risk_level) && r.status !== 'resolved')
      .sort((a, b) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
      .slice(0, 3);

    // 5. Tasks Time Layer
    let taskQ = db('tasks');
    if (schoolUnitId) taskQ = taskQ.where('school_unit_id', schoolUnitId);
    const tasks = await taskQ.select('*');

    const toDateStr = (d) => d ? (typeof d === 'string' ? d.slice(0, 10) : (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10))) : null;

    let todayTasks = 0;
    let overdueTasks = 0;
    let tomorrowTasks = 0;
    let weekTasks = 0;
    let completedTasks = tasks.filter(t => t.status === 'done').length;

    tasks.forEach(t => {
      const d = toDateStr(t.due_date);
      if (d) {
        if (d < todayStr && t.status !== 'done') overdueTasks++;
        else if (d === todayStr) todayTasks++;
        else if (d === tomorrowStr) tomorrowTasks++;
        else if (d > todayStr && d <= weekEndStr) weekTasks++;
      }
    });

    // 6. RTL Monev
    let rtlQ = db('evaluation_follow_ups');
    if (schoolUnitId) rtlQ = rtlQ.where('school_unit_id', schoolUnitId);
    const followUps = await rtlQ.select('*');
    const activeRtl = followUps.filter(f => ['draft', 'in_progress'].includes(f.status)).length;
    const completedRtl = followUps.filter(f => ['completed', 'verified'].includes(f.status)).length;
    const overdueRtl = followUps.filter(f => f.deadline && toDateStr(f.deadline) < todayStr && !['completed', 'verified'].includes(f.status)).length;

    // 7. Approvals
    let appQ = db('approval_requests');
    if (schoolUnitId) appQ = appQ.where('school_unit_id', schoolUnitId);
    const approvalRequests = await appQ.select('*');
    const pendingApprovalsCount = approvalRequests.filter(a => a.status === 'pending').length;

    // 8. Upcoming Agendas
    let agendaQ = db('planning_agendas');
    if (schoolUnitId) agendaQ = agendaQ.where('school_unit_id', schoolUnitId);
    const upcomingAgendas = await agendaQ
      .where(function () {
        this.where('start_date', '>=', todayStr).orWhereNull('start_date');
      })
      .orderBy('start_date', 'asc')
      .orderBy('start_time', 'asc')
      .limit(4);

    return {
      strategic: {
        active_rips: activeRips,
        total_goals: strategicGoals.length,
        goals_by_perspective: goalsByPerspective
      },
      programs: {
        total_programs: totalPrograms,
        priority_programs_count: priorityProgramsCount,
        avg_progress_percentage: avgProgProgress,
        total_budget_estimate: totalBudgetEstimate,
        total_budget_realization: totalBudgetRealization,
        top_priority_programs: priorityPrograms.slice(0, 4)
      },
      kpi: {
        total_indicators: indicators.length,
        achieved_count: achievedKpis,
        pending_count: pendingKpis,
        critical_count: criticalKpis,
        avg_achievement_percentage: avgKpiAchievement,
        highlights: indicators.slice(0, 4).map(g => ({
          id: g.id,
          code: g.code,
          name: g.title,
          unit: g.indicator_unit,
          target: g.target_percent,
          actual: null,
          achievement_percentage: g.target_percent,
          status: 'on_track'
        }))
      },
      risks: {
        total_risks: risks.length,
        by_level: risksByLevel,
        top_critical_risks: topCriticalRisks
      },
      tasks: {
        total_tasks: tasks.length,
        today_tasks: todayTasks,
        overdue_tasks: overdueTasks,
        tomorrow_tasks: tomorrowTasks,
        week_tasks: weekTasks,
        completed_tasks: completedTasks
      },
      rtl: {
        total_rtl: followUps.length,
        active_rtl: activeRtl,
        completed_rtl: completedRtl,
        overdue_rtl: overdueRtl
      },
      approvals: {
        total_requests: approvalRequests.length,
        pending_count: pendingApprovalsCount
      },
      upcoming_agendas: upcomingAgendas
    };
  }
}

module.exports = new PlanningService();
