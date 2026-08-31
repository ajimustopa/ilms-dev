/**
 * Quality Service Implementation
 * Modul Manajemen: Kamus Indikator Kinerja / KPI (#193), Target & Realisasi (#7), Sasaran Mutu (#8), Evadir (#195), Akreditasi (#196), Dashboard Agregat (#201), Risiko (#202)
 */
const db = require('../../../config/db/manajemen');
const dbKepegawaian = require('../../../config/db/kepegawaian');
const { validateEmployee } = require('../utils/crossModuleHelper');

class QualityService {
  // ==========================================
  // 0. HELPER FORMULA CAPAIAN KPI MULTI-ARAH (FITUR 7)
  // ==========================================
  calculateAchievementRate(direction, targetVal, actualVal, tolMin = null, tolMax = null) {
    const target = targetVal !== null && targetVal !== undefined && targetVal !== '' ? Number(targetVal) : 0;
    const actual = actualVal !== null && actualVal !== undefined && actualVal !== '' ? Number(actualVal) : 0;

    if (target === 0 && actual === 0) {
      return { percentage: 100.00, status: 'achieved' };
    }

    let pct = 0;
    if (direction === 'lower_is_better') {
      if (target === 0) {
        pct = actual === 0 ? 100.00 : 0.00;
      } else {
        pct = (2 - (actual / target)) * 100;
      }
    } else if (direction === 'range_ideal') {
      const min = tolMin !== null && tolMin !== undefined ? Number(tolMin) : target * 0.9;
      const max = tolMax !== null && tolMax !== undefined ? Number(tolMax) : target * 1.1;
      if (actual >= min && actual <= max) {
        pct = 100.00;
      } else if (actual < min) {
        pct = min > 0 ? (actual / min) * 100 : 0;
      } else {
        pct = max > 0 ? (2 - (actual / max)) * 100 : 0;
      }
    } else {
      // Default: higher_is_better
      if (target === 0) {
        pct = actual > 0 ? 100.00 : 0.00;
      } else {
        pct = (actual / target) * 100;
      }
    }

    pct = Math.max(0, Math.min(200, Number(pct.toFixed(2))));

    let status = 'critical';
    if (pct >= 100) status = 'achieved';
    else if (pct >= 80) status = 'on_track';
    else if (pct >= 60) status = 'warning';
    else status = 'critical';

    return { percentage: pct, status };
  }

  // ==========================================
  // 1. KPI & KAMUS INDIKATOR KINERJA (#193 & FITUR 6/7)
  // ==========================================
  async listIndicators(schoolUnitId, query = {}) {
    let q = db('quality_indicators as qi')
      .leftJoin('strategic_goals as sg', 'qi.strategic_goal_id', 'sg.id')
      .select(
        'qi.*',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'sg.perspective as strategic_goal_perspective'
      );

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('qi.school_unit_id', Number(schoolUnitId)).orWhereNull('qi.school_unit_id');
      });
    }

    if (query.category) q = q.where('qi.category', query.category);
    if (query.frequency) q = q.where('qi.frequency', query.frequency);
    if (query.status) q = q.where('qi.status', query.status);
    if (query.direction) q = q.where('qi.direction', query.direction);
    if (query.strategic_goal_id) q = q.where('qi.strategic_goal_id', Number(query.strategic_goal_id));

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('qi.name', 'like', s)
          .orWhere('qi.code', 'like', s)
          .orWhere('qi.definition', 'like', s)
          .orWhere('qi.calculation_method', 'like', s);
      });
    }

    const list = await q.orderBy('qi.code', 'asc');

    // Attach PIC employee name
    const empIds = [...new Set(list.filter(item => item.pic_employee_id).map(item => item.pic_employee_id))];
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

  async getIndicatorById(id) {
    const item = await db('quality_indicators as qi')
      .leftJoin('strategic_goals as sg', 'qi.strategic_goal_id', 'sg.id')
      .select(
        'qi.*',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'sg.perspective as strategic_goal_perspective'
      )
      .where('qi.id', id)
      .first();

    if (!item) {
      const err = new Error('Indikator mutu / KPI tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let pic_name = null;
    if (item.pic_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.pic_employee_id }).first();
        if (emp) pic_name = emp.full_name;
      } catch (e) {}
    }

    const achievements = await db('quality_indicator_achievements')
      .where({ quality_indicator_id: id })
      .orderBy('period', 'desc');

    let programs = [];
    try {
      if (item.strategic_goal_id) {
        programs = await db('work_plan_programs')
          .where({ strategic_goal_id: item.strategic_goal_id })
          .select('id', 'code', 'title', 'target', 'status');
      }
    } catch (e) {}

    return {
      ...item,
      pic_name: pic_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      achievements: achievements || [],
      programs: programs || []
    };
  }

  async createIndicator(data, userId) {
    if (!data.code || !data.code.trim()) {
      const err = new Error('Kode indikator mutu wajib diisi');
      err.statusCode = 422;
      throw err;
    }
    if (!data.name || !data.name.trim()) {
      const err = new Error('Nama indikator mutu wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const existing = await db('quality_indicators').where({ code: data.code.trim() }).first();
    if (existing) {
      const err = new Error(`Kode indikator '${data.code.trim()}' sudah digunakan`);
      err.statusCode = 422;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    const [id] = await db('quality_indicators').insert({
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      code: data.code.trim(),
      name: data.name.trim(),
      definition: data.definition || null,
      category: data.category || 'akademik',
      unit_of_measure: data.unit_of_measure || null,
      baseline_value: data.baseline_value || null,
      baseline_year: data.baseline_year ? Number(data.baseline_year) : null,
      target_value: data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : null,
      calculation_method: data.calculation_method || null,
      direction: data.direction || 'higher_is_better',
      tolerance_min: data.tolerance_min ? Number(data.tolerance_min) : null,
      tolerance_max: data.tolerance_max ? Number(data.tolerance_max) : null,
      frequency: data.frequency || 'tahunan',
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      strategic_goal_id: data.strategic_goal_id ? Number(data.strategic_goal_id) : null,
      data_source_module: data.data_source_module || null,
      status: data.status || 'active',
      created_by: userId || 1,
    });

    return this.getIndicatorById(id);
  }

  async updateIndicator(id, data, userId) {
    const item = await db('quality_indicators').where({ id }).first();
    if (!item) {
      const err = new Error('Indikator mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.code && data.code.trim() !== item.code) {
      const existing = await db('quality_indicators').where({ code: data.code.trim() }).whereNot({ id }).first();
      if (existing) {
        const err = new Error(`Kode indikator '${data.code.trim()}' sudah digunakan`);
        err.statusCode = 422;
        throw err;
      }
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('quality_indicators')
      .where({ id })
      .update({
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        code: data.code !== undefined ? data.code.trim() : item.code,
        name: data.name !== undefined ? data.name.trim() : item.name,
        definition: data.definition !== undefined ? data.definition : item.definition,
        category: data.category !== undefined ? data.category : item.category,
        unit_of_measure: data.unit_of_measure !== undefined ? data.unit_of_measure : item.unit_of_measure,
        baseline_value: data.baseline_value !== undefined ? data.baseline_value : item.baseline_value,
        baseline_year: data.baseline_year !== undefined ? (data.baseline_year ? Number(data.baseline_year) : null) : item.baseline_year,
        target_value: data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : item.target_value,
        calculation_method: data.calculation_method !== undefined ? data.calculation_method : item.calculation_method,
        direction: data.direction !== undefined ? data.direction : item.direction,
        tolerance_min: data.tolerance_min !== undefined ? (data.tolerance_min ? Number(data.tolerance_min) : null) : item.tolerance_min,
        tolerance_max: data.tolerance_max !== undefined ? (data.tolerance_max ? Number(data.tolerance_max) : null) : item.tolerance_max,
        frequency: data.frequency !== undefined ? data.frequency : item.frequency,
        pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
        strategic_goal_id: data.strategic_goal_id !== undefined ? (data.strategic_goal_id ? Number(data.strategic_goal_id) : null) : item.strategic_goal_id,
        data_source_module: data.data_source_module !== undefined ? data.data_source_module : item.data_source_module,
        status: data.status !== undefined ? data.status : item.status,
        updated_by: userId || 1,
      });

    return this.getIndicatorById(id);
  }

  async deleteIndicator(id) {
    const item = await db('quality_indicators').where({ id }).first();
    if (!item) {
      const err = new Error('Indikator mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('quality_indicators').where({ id }).delete();
    return { success: true, message: 'Indikator mutu berhasil dihapus' };
  }

  // ==========================================
  // 2. TARGET, REALISASI & CAPAIAN KPI (FITUR 7)
  // ==========================================
  async listAchievements(indicatorId, schoolUnitId) {
    let q = db('quality_indicator_achievements as qia')
      .leftJoin('quality_indicators as qi', 'qia.quality_indicator_id', 'qi.id')
      .select('qia.*', 'qi.code as indicator_code', 'qi.name as indicator_name', 'qi.unit_of_measure')
      .where('qia.quality_indicator_id', indicatorId);

    if (schoolUnitId) q = q.where('qia.school_unit_id', schoolUnitId);
    return await q.orderBy('qia.period', 'desc');
  }

  async recordAchievement(indicatorId, data, userId) {
    const indicator = await db('quality_indicators').where({ id: indicatorId }).first();
    if (!indicator) {
      const err = new Error('Indikator mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const schoolUnitId = data.school_unit_id || 1;
    const period = data.period || '2026/2027';
    const targetVal = data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : (Number(indicator.target_value) || 0);
    const actualVal = Number(data.actual_value) || 0;

    const calcResult = this.calculateAchievementRate(
      indicator.direction || 'higher_is_better',
      targetVal,
      actualVal,
      indicator.tolerance_min,
      indicator.tolerance_max
    );

    const existing = await db('quality_indicator_achievements')
      .where({ quality_indicator_id: indicatorId, school_unit_id: schoolUnitId, period })
      .first();

    let achRecord = null;
    if (existing) {
      await db('quality_indicator_achievements')
        .where({ id: existing.id })
        .update({
          target_value: targetVal,
          actual_value: actualVal,
          achievement_percentage: calcResult.percentage,
          status: calcResult.status,
          evidence_url: data.evidence_url || existing.evidence_url,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          verification_status: data.verification_status || existing.verification_status,
          recorded_by: userId || 1,
          recorded_at: new Date(),
        });
      achRecord = await db('quality_indicator_achievements').where({ id: existing.id }).first();
    } else {
      const [id] = await db('quality_indicator_achievements').insert({
        quality_indicator_id: indicatorId,
        school_unit_id: schoolUnitId,
        period,
        target_value: targetVal,
        actual_value: actualVal,
        achievement_percentage: calcResult.percentage,
        status: calcResult.status,
        evidence_url: data.evidence_url || null,
        notes: data.notes || null,
        verification_status: data.verification_status || 'draft',
        recorded_by: userId || 1,
        recorded_at: new Date(),
      });
      achRecord = await db('quality_indicator_achievements').where({ id }).first();
    }

    // Auto-sync linked quality_goals
    try {
      const goalStatus = calcResult.percentage >= 100 ? 'achieved' : calcResult.percentage < 60 ? 'critical' : 'pending';
      await db('quality_goals')
        .where({ quality_indicator_id: indicatorId, period })
        .update({
          actual_value: actualVal,
          target_value: targetVal,
          achievement_percentage: calcResult.percentage,
          status: goalStatus
        });
    } catch (e) {}

    return achRecord;
  }

  async verifyAchievement(achievementId, status, userId) {
    const item = await db('quality_indicator_achievements').where({ id: achievementId }).first();
    if (!item) {
      const err = new Error('Data capaian KPI tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('quality_indicator_achievements')
      .where({ id: achievementId })
      .update({
        verification_status: status,
        verified_by: userId || 1,
        verified_at: new Date(),
      });

    return db('quality_indicator_achievements').where({ id: achievementId }).first();
  }

  async getKpiDashboard(schoolUnitId, period = '2026/2027') {
    const indicators = await this.listIndicators(schoolUnitId);
    const achievements = await db('quality_indicator_achievements')
      .where(function () {
        if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
        if (period) this.where('period', period);
      });

    const achievementMap = {};
    achievements.forEach((a) => {
      achievementMap[a.quality_indicator_id] = a;
    });

    let stats = { total: indicators.length, achieved: 0, on_track: 0, warning: 0, critical: 0 };

    const items = indicators.map((ind) => {
      const ach = achievementMap[ind.id];
      const target = ach?.target_value !== null && ach?.target_value !== undefined ? Number(ach.target_value) : (Number(ind.target_value) || 0);
      const actual = ach ? Number(ach.actual_value) : null;

      let pct = null;
      let status = 'critical';

      if (ach && ach.achievement_percentage !== null) {
        pct = Number(ach.achievement_percentage);
        status = ach.status || 'on_track';
      } else if (actual !== null) {
        const calc = this.calculateAchievementRate(ind.direction, target, actual, ind.tolerance_min, ind.tolerance_max);
        pct = calc.percentage;
        status = calc.status;
      }

      if (status === 'achieved') stats.achieved++;
      else if (status === 'on_track') stats.on_track++;
      else if (status === 'warning') stats.warning++;
      else stats.critical++;

      return {
        ...ind,
        period: ach ? ach.period : period,
        target_value: target,
        actual_value: actual,
        achievement_percentage: pct,
        status: status,
        evidence_url: ach?.evidence_url || null,
        notes: ach?.notes || null,
        verification_status: ach?.verification_status || 'draft',
        recorded_at: ach ? ach.recorded_at : null,
      };
    });

    return { stats, items, period };
  }

  // ==========================================
  // 3. SASARAN MUTU (#8)
  // ==========================================
  async listQualityGoals(schoolUnitId, query = {}) {
    let q = db('quality_goals as qg')
      .leftJoin('strategic_goals as sg', 'qg.strategic_goal_id', 'sg.id')
      .leftJoin('quality_indicators as qi', 'qg.quality_indicator_id', 'qi.id')
      .select(
        'qg.*',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'sg.perspective as strategic_goal_perspective',
        'qi.name as indicator_name',
        'qi.code as indicator_code',
        'qi.unit_of_measure as indicator_unit',
        'qi.direction as indicator_direction'
      );

    if (schoolUnitId) {
      q = q.where(function () {
        this.where('qg.school_unit_id', Number(schoolUnitId)).orWhereNull('qg.school_unit_id');
      });
    }

    if (query.period) q = q.where('qg.period', query.period);
    if (query.status) q = q.where('qg.status', query.status);
    if (query.quality_standard) q = q.where('qg.quality_standard', query.quality_standard);
    if (query.strategic_goal_id) q = q.where('qg.strategic_goal_id', Number(query.strategic_goal_id));

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('qg.name', 'like', s)
          .orWhere('qg.code', 'like', s)
          .orWhere('qg.description', 'like', s)
          .orWhere('qg.quality_standard', 'like', s);
      });
    }

    const list = await q.orderBy('qg.code', 'asc');

    // Attach PIC employee name
    const empIds = [...new Set(list.filter(item => item.pic_employee_id).map(item => item.pic_employee_id))];
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

  async getQualityGoalById(id) {
    const item = await db('quality_goals as qg')
      .leftJoin('strategic_goals as sg', 'qg.strategic_goal_id', 'sg.id')
      .leftJoin('quality_indicators as qi', 'qg.quality_indicator_id', 'qi.id')
      .select(
        'qg.*',
        'sg.name as strategic_goal_name',
        'sg.code as strategic_goal_code',
        'sg.perspective as strategic_goal_perspective',
        'qi.name as indicator_name',
        'qi.code as indicator_code',
        'qi.unit_of_measure as indicator_unit',
        'qi.direction as indicator_direction',
        'qi.definition as indicator_definition',
        'qi.calculation_method as indicator_formula'
      )
      .where('qg.id', id)
      .first();

    if (!item) {
      const err = new Error('Sasaran mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

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
    };
  }

  async createQualityGoal(data, userId) {
    if (!data.code || !data.code.trim()) {
      const err = new Error('Kode sasaran mutu wajib diisi');
      err.statusCode = 422;
      throw err;
    }
    if (!data.name || !data.name.trim()) {
      const err = new Error('Nama sasaran mutu wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    const existing = await db('quality_goals').where({ code: data.code.trim() }).first();
    if (existing) {
      const err = new Error(`Kode sasaran mutu '${data.code.trim()}' sudah digunakan`);
      err.statusCode = 422;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    // If indicator is attached, sync target/actual
    let targetVal = data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : null;
    let actualVal = data.actual_value !== undefined && data.actual_value !== '' ? Number(data.actual_value) : null;
    let achPct = data.achievement_percentage !== undefined && data.achievement_percentage !== '' ? Number(data.achievement_percentage) : null;
    let status = data.status || 'pending';

    if (data.quality_indicator_id) {
      const indicator = await db('quality_indicators').where({ id: data.quality_indicator_id }).first();
      if (indicator && targetVal === null) {
        targetVal = indicator.target_value ? Number(indicator.target_value) : null;
      }
      const period = data.period || '2026/2027';
      const ach = await db('quality_indicator_achievements')
        .where({ quality_indicator_id: data.quality_indicator_id, period })
        .first();
      if (ach) {
        actualVal = Number(ach.actual_value);
        achPct = Number(ach.achievement_percentage);
        status = achPct >= 100 ? 'achieved' : achPct < 60 ? 'critical' : 'pending';
      }
    }

    const [id] = await db('quality_goals').insert({
      strategic_goal_id: data.strategic_goal_id ? Number(data.strategic_goal_id) : null,
      school_unit_id: data.school_unit_id ? Number(data.school_unit_id) : null,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description || null,
      quality_standard: data.quality_standard || 'SNP - Standar Isi',
      quality_indicator_id: data.quality_indicator_id ? Number(data.quality_indicator_id) : null,
      period: data.period || '2026/2027',
      target_value: targetVal,
      actual_value: actualVal,
      achievement_percentage: achPct,
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      status: status,
      created_by: userId || 1,
    });

    return this.getQualityGoalById(id);
  }

  async updateQualityGoal(id, data, userId) {
    const item = await db('quality_goals').where({ id }).first();
    if (!item) {
      const err = new Error('Sasaran mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.code && data.code.trim() !== item.code) {
      const existing = await db('quality_goals').where({ code: data.code.trim() }).whereNot({ id }).first();
      if (existing) {
        const err = new Error(`Kode sasaran mutu '${data.code.trim()}' sudah digunakan`);
        err.statusCode = 422;
        throw err;
      }
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    await db('quality_goals')
      .where({ id })
      .update({
        strategic_goal_id: data.strategic_goal_id !== undefined ? (data.strategic_goal_id ? Number(data.strategic_goal_id) : null) : item.strategic_goal_id,
        school_unit_id: data.school_unit_id !== undefined ? (data.school_unit_id ? Number(data.school_unit_id) : null) : item.school_unit_id,
        code: data.code !== undefined ? data.code.trim() : item.code,
        name: data.name !== undefined ? data.name.trim() : item.name,
        description: data.description !== undefined ? data.description : item.description,
        quality_standard: data.quality_standard !== undefined ? data.quality_standard : item.quality_standard,
        quality_indicator_id: data.quality_indicator_id !== undefined ? (data.quality_indicator_id ? Number(data.quality_indicator_id) : null) : item.quality_indicator_id,
        period: data.period !== undefined ? data.period : item.period,
        target_value: data.target_value !== undefined && data.target_value !== '' ? Number(data.target_value) : item.target_value,
        actual_value: data.actual_value !== undefined && data.actual_value !== '' ? Number(data.actual_value) : item.actual_value,
        achievement_percentage: data.achievement_percentage !== undefined && data.achievement_percentage !== '' ? Number(data.achievement_percentage) : item.achievement_percentage,
        pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
        status: data.status !== undefined ? data.status : item.status,
        updated_by: userId || 1,
      });

    return this.getQualityGoalById(id);
  }

  async deleteQualityGoal(id) {
    const item = await db('quality_goals').where({ id }).first();
    if (!item) {
      const err = new Error('Sasaran mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('quality_goals').where({ id }).delete();
    return { success: true, message: 'Sasaran mutu berhasil dihapus' };
  }

  // ==========================================
  // 4. Evadir (Self Evaluations) - #195
  // ==========================================
  async listSelfEvaluations(schoolUnitId, query = {}) {
    let q = db('self_evaluations').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.period_year) q = q.where('period_year', query.period_year);
    if (query.status) q = q.where('status', query.status);

    return await q.orderBy('id', 'desc');
  }

  async createSelfEvaluation(data, userId) {
    const [id] = await db('self_evaluations').insert({
      school_unit_id: data.school_unit_id || 1,
      period_year: data.period_year,
      standard_component: data.standard_component,
      score: data.score !== undefined ? data.score : null,
      notes: data.notes || null,
      status: 'draft',
      submitted_by: userId || null,
    });
    return db('self_evaluations').where({ id }).first();
  }

  async updateSelfEvaluation(id, data) {
    const item = await db('self_evaluations').where({ id }).first();
    if (!item) {
      const err = new Error('Evadir tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    if (item.status !== 'draft') {
      const err = new Error('Evadir hanya dapat diubah saat berstatus draft');
      err.statusCode = 422;
      throw err;
    }

    await db('self_evaluations')
      .where({ id })
      .update({
        period_year: data.period_year !== undefined ? data.period_year : item.period_year,
        standard_component:
          data.standard_component !== undefined ? data.standard_component : item.standard_component,
        score: data.score !== undefined ? data.score : item.score,
        notes: data.notes !== undefined ? data.notes : item.notes,
      });
    return db('self_evaluations').where({ id }).first();
  }

  async submitSelfEvaluation(id, userId) {
    const item = await db('self_evaluations').where({ id }).first();
    if (!item) {
      const err = new Error('Evadir tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('self_evaluations').where({ id }).update({
      status: 'submitted',
      submitted_by: userId || 1,
      submitted_at: new Date(),
    });
    return db('self_evaluations').where({ id }).first();
  }

  // ==========================================
  // 5. Akreditasi & Instrumen Mutu - #196
  // ==========================================
  async listAccreditationReports(schoolUnitId, query = {}) {
    let q = db('accreditation_reports').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.accreditation_year) q = q.where('accreditation_year', query.accreditation_year);

    return await q.orderBy('id', 'desc');
  }

  async createAccreditationReport(data) {
    const [id] = await db('accreditation_reports').insert({
      school_unit_id: data.school_unit_id || 1,
      accreditation_year: data.accreditation_year,
      standard_code: data.standard_code,
      description: data.description || null,
    });
    return db('accreditation_reports').where({ id }).first();
  }

  async listEvidences(reportId) {
    return await db('accreditation_evidences')
      .where({ accreditation_report_id: reportId })
      .orderBy('id', 'asc');
  }

  async uploadEvidence(reportId, data, userId) {
    const report = await db('accreditation_reports').where({ id: reportId }).first();
    if (!report) {
      const err = new Error('Laporan akreditasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const [id] = await db('accreditation_evidences').insert({
      accreditation_report_id: reportId,
      evidence_description: data.evidence_description,
      file_url: data.file_url || null,
      score: data.score !== undefined ? data.score : null,
      verified_by: userId || null,
      verified_at: data.score ? new Date() : null,
    });
    return db('accreditation_evidences').where({ id }).first();
  }

  async generateSummary(reportId) {
    const report = await db('accreditation_reports').where({ id: reportId }).first();
    if (!report) {
      const err = new Error('Laporan akreditasi tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const evidences = await this.listEvidences(reportId);
    const totalScore = evidences.reduce((sum, e) => sum + (Number(e.score) || 0), 0);
    const avgScore = evidences.length > 0 ? (totalScore / evidences.length).toFixed(2) : 0;

    return {
      report,
      total_evidences: evidences.length,
      average_score: parseFloat(avgScore),
      evidences,
    };
  }

  // ==========================================
  // 6. Dashboard Agregat Lintas Aplikasi - #201
  // ==========================================
  async getCrossAppDashboard(schoolUnitId, query = {}) {
    let q = db('cross_app_dashboard_snapshots').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
      if (query.date) this.where('snapshot_date', query.date);
    });

    const snapshot = await q.orderBy('snapshot_date', 'desc').first();
    if (snapshot) {
      return snapshot;
    }

    return {
      school_unit_id: schoolUnitId || 1,
      snapshot_date: new Date().toISOString().slice(0, 10),
      metrics: {
        akademik: { total_siswa: 450, rerata_kehadiran_pct: 96.5 },
        kepegawaian: { total_guru_pegawai: 48, tingkat_kehadiran_pct: 94.2 },
        keuangan: { efisiensi_anggaran_pct: 89.0 },
        sarpras: { utilitas_ruangan_pct: 82.4 },
        perpustakaan: { total_koleksi: 1250, peminjaman_aktif: 145 },
      },
      generated_by: 'system',
    };
  }

  async generateCrossAppSnapshot(schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10);
    const metrics = {
      akademik: { total_siswa: 450, rerata_kehadiran_pct: 96.5 },
      kepegawaian: { total_guru_pegawai: 48, tingkat_kehadiran_pct: 94.2 },
      keuangan: { efisiensi_anggaran_pct: 89.0 },
      sarpras: { utilitas_ruangan_pct: 82.4 },
      perpustakaan: { total_koleksi: 1250, peminjaman_aktif: 145 },
    };

    const existing = await db('cross_app_dashboard_snapshots')
      .where({ school_unit_id: schoolUnitId || null, snapshot_date: today })
      .first();

    if (existing) {
      await db('cross_app_dashboard_snapshots')
        .where({ id: existing.id })
        .update({
          metrics: JSON.stringify(metrics),
          generated_by: 'manual_trigger',
          updated_at: new Date(),
        });
      return db('cross_app_dashboard_snapshots').where({ id: existing.id }).first();
    } else {
      const [id] = await db('cross_app_dashboard_snapshots').insert({
        school_unit_id: schoolUnitId || null,
        snapshot_date: today,
        metrics: JSON.stringify(metrics),
        generated_by: 'manual_trigger',
      });
      return db('cross_app_dashboard_snapshots').where({ id }).first();
    }
  }

  // ==========================================
  // 7. MANAJEMEN RISIKO & HEATMAP 5x5 (#202 & FITUR 9)
  // ==========================================
  calculateRiskScoreAndLevel(prob, impact) {
    const p = Math.max(1, Math.min(5, Number(prob) || 3));
    const i = Math.max(1, Math.min(5, Number(impact) || 3));
    const score = p * i;
    let level = 'low';
    if (score >= 20) level = 'extreme';
    else if (score >= 12) level = 'high';
    else if (score >= 6) level = 'medium';
    else level = 'low';
    return { probability: p, impact: i, score, level };
  }

  async listRisks(schoolUnitId, query = {}) {
    let q = db('school_risks').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.status) q = q.where('status', query.status);
    if (query.category) q = q.where('category', query.category);
    if (query.risk_level) q = q.where('risk_level', query.risk_level);
    if (query.mitigation_status) q = q.where('mitigation_status', query.mitigation_status);
    if (query.relation_type) q = q.where('relation_type', query.relation_type);

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('title', 'like', s)
          .orWhere('code', 'like', s)
          .orWhere('description', 'like', s)
          .orWhere('root_cause', 'like', s)
          .orWhere('source', 'like', s);
      });
    }

    const items = await q.orderBy('risk_score', 'desc').orderBy('id', 'desc');

    // Collect Employee IDs for owner & mitigation PIC
    const empIds = [...new Set([
      ...items.filter(i => i.owner_employee_id).map(i => i.owner_employee_id),
      ...items.filter(i => i.mitigation_pic_id).map(i => i.mitigation_pic_id)
    ])];

    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name', 'nip');
        emps.forEach(e => { empMap[e.id] = { name: e.full_name, nip: e.nip }; });
      } catch (e) {}
    }

    return items.map((item) => ({
      ...item,
      owner_name: empMap[item.owner_employee_id]?.name || (item.owner_employee_id ? `Pegawai #${item.owner_employee_id}` : null),
      owner_nip: empMap[item.owner_employee_id]?.nip || null,
      mitigation_pic_name: empMap[item.mitigation_pic_id]?.name || (item.mitigation_pic_id ? `Pegawai #${item.mitigation_pic_id}` : null),
      mitigation_pic_nip: empMap[item.mitigation_pic_id]?.nip || null,
    }));
  }

  async getRiskById(id) {
    const item = await db('school_risks').where({ id }).first();
    if (!item) {
      const err = new Error('Risiko tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let owner_name = null;
    let mitigation_pic_name = null;

    if (item.owner_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.owner_employee_id }).first();
        if (emp) owner_name = emp.full_name;
      } catch (e) {}
    }

    if (item.mitigation_pic_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.mitigation_pic_id }).first();
        if (emp) mitigation_pic_name = emp.full_name;
      } catch (e) {}
    }

    return {
      ...item,
      owner_name: owner_name || (item.owner_employee_id ? `Pegawai #${item.owner_employee_id}` : null),
      mitigation_pic_name: mitigation_pic_name || (item.mitigation_pic_id ? `Pegawai #${item.mitigation_pic_id}` : null),
    };
  }

  async createRisk(data, userId) {
    if (data.owner_employee_id) {
      await validateEmployee(data.owner_employee_id);
    }
    if (data.mitigation_pic_id) {
      await validateEmployee(data.mitigation_pic_id);
    }

    // Auto calculate inherent score
    const inherent = this.calculateRiskScoreAndLevel(data.probability_val, data.impact_val);

    // Auto calculate residual score if provided
    let residualScore = null;
    let residualLevel = null;
    if (data.residual_probability && data.residual_impact) {
      const res = this.calculateRiskScoreAndLevel(data.residual_probability, data.residual_impact);
      residualScore = res.score;
      residualLevel = res.level;
    }

    // Generate code if empty
    let code = data.code ? data.code.trim() : null;
    if (!code) {
      const count = await db('school_risks').count('id as cnt').first();
      code = `RSK-${String((count?.cnt || 0) + 1).padStart(2, '0')}`;
    }

    const [id] = await db('school_risks').insert({
      school_unit_id: data.school_unit_id || 1,
      code,
      title: data.title,
      category: data.category || 'Operasional',
      source: data.source || null,
      description: data.description || null,
      root_cause: data.root_cause || null,
      impact_description: data.impact_description || null,
      probability_val: inherent.probability,
      impact_val: inherent.impact,
      risk_score: inherent.score,
      risk_level: inherent.level,
      likelihood: inherent.probability >= 4 ? 'high' : inherent.probability >= 2 ? 'medium' : 'low',
      impact: inherent.impact >= 4 ? 'high' : inherent.impact >= 2 ? 'medium' : 'low',
      status: data.status || 'identified',
      mitigation_plan: data.mitigation_action || data.mitigation_plan || null,
      mitigation_action: data.mitigation_action || null,
      mitigation_pic_id: data.mitigation_pic_id ? Number(data.mitigation_pic_id) : null,
      mitigation_deadline: data.mitigation_deadline || null,
      mitigation_status: data.mitigation_status || 'planned',
      residual_probability: data.residual_probability ? Number(data.residual_probability) : null,
      residual_impact: data.residual_impact ? Number(data.residual_impact) : null,
      residual_score: residualScore,
      residual_level: residualLevel,
      relation_type: data.relation_type || 'none',
      relation_id: data.relation_id ? Number(data.relation_id) : null,
      relation_code: data.relation_code || null,
      relation_name: data.relation_name || null,
      owner_employee_id: data.owner_employee_id ? Number(data.owner_employee_id) : null,
      identified_at: data.identified_at || new Date().toISOString().slice(0, 10),
      created_by: userId || 1,
    });

    return this.getRiskById(id);
  }

  async updateRisk(id, data, userId) {
    const item = await db('school_risks').where({ id }).first();
    if (!item) {
      const err = new Error('Risiko tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.owner_employee_id) {
      await validateEmployee(data.owner_employee_id);
    }
    if (data.mitigation_pic_id) {
      await validateEmployee(data.mitigation_pic_id);
    }

    const prob = data.probability_val !== undefined ? data.probability_val : item.probability_val;
    const imp = data.impact_val !== undefined ? data.impact_val : item.impact_val;
    const inherent = this.calculateRiskScoreAndLevel(prob, imp);

    let resProb = data.residual_probability !== undefined ? data.residual_probability : item.residual_probability;
    let resImp = data.residual_impact !== undefined ? data.residual_impact : item.residual_impact;
    let residualScore = null;
    let residualLevel = null;
    if (resProb && resImp) {
      const res = this.calculateRiskScoreAndLevel(resProb, resImp);
      residualScore = res.score;
      residualLevel = res.level;
    }

    await db('school_risks')
      .where({ id })
      .update({
        code: data.code !== undefined ? data.code.trim() : item.code,
        title: data.title !== undefined ? data.title : item.title,
        category: data.category !== undefined ? data.category : item.category,
        source: data.source !== undefined ? data.source : item.source,
        description: data.description !== undefined ? data.description : item.description,
        root_cause: data.root_cause !== undefined ? data.root_cause : item.root_cause,
        impact_description: data.impact_description !== undefined ? data.impact_description : item.impact_description,
        probability_val: inherent.probability,
        impact_val: inherent.impact,
        risk_score: inherent.score,
        risk_level: inherent.level,
        likelihood: inherent.probability >= 4 ? 'high' : inherent.probability >= 2 ? 'medium' : 'low',
        impact: inherent.impact >= 4 ? 'high' : inherent.impact >= 2 ? 'medium' : 'low',
        status: data.status !== undefined ? data.status : item.status,
        mitigation_plan: data.mitigation_action !== undefined ? data.mitigation_action : item.mitigation_plan,
        mitigation_action: data.mitigation_action !== undefined ? data.mitigation_action : item.mitigation_action,
        mitigation_pic_id: data.mitigation_pic_id !== undefined ? (data.mitigation_pic_id ? Number(data.mitigation_pic_id) : null) : item.mitigation_pic_id,
        mitigation_deadline: data.mitigation_deadline !== undefined ? data.mitigation_deadline : item.mitigation_deadline,
        mitigation_status: data.mitigation_status !== undefined ? data.mitigation_status : item.mitigation_status,
        residual_probability: resProb ? Number(resProb) : null,
        residual_impact: resImp ? Number(resImp) : null,
        residual_score: residualScore,
        residual_level: residualLevel,
        relation_type: data.relation_type !== undefined ? data.relation_type : item.relation_type,
        relation_id: data.relation_id !== undefined ? (data.relation_id ? Number(data.relation_id) : null) : item.relation_id,
        relation_code: data.relation_code !== undefined ? data.relation_code : item.relation_code,
        relation_name: data.relation_name !== undefined ? data.relation_name : item.relation_name,
        owner_employee_id: data.owner_employee_id !== undefined ? (data.owner_employee_id ? Number(data.owner_employee_id) : null) : item.owner_employee_id,
        resolved_at: data.resolved_at !== undefined ? data.resolved_at : item.resolved_at,
        updated_by: userId || 1,
      });

    return this.getRiskById(id);
  }

  async updateRiskMitigation(id, data, userId) {
    const item = await db('school_risks').where({ id }).first();
    if (!item) {
      const err = new Error('Risiko tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.mitigation_pic_id) {
      await validateEmployee(data.mitigation_pic_id);
    }

    let residualScore = null;
    let residualLevel = null;
    if (data.residual_probability && data.residual_impact) {
      const res = this.calculateRiskScoreAndLevel(data.residual_probability, data.residual_impact);
      residualScore = res.score;
      residualLevel = res.level;
    }

    const nextStatus = data.mitigation_status === 'completed' ? 'mitigating' : item.status;

    await db('school_risks')
      .where({ id })
      .update({
        mitigation_action: data.mitigation_action !== undefined ? data.mitigation_action : item.mitigation_action,
        mitigation_plan: data.mitigation_action !== undefined ? data.mitigation_action : item.mitigation_plan,
        mitigation_pic_id: data.mitigation_pic_id !== undefined ? (data.mitigation_pic_id ? Number(data.mitigation_pic_id) : null) : item.mitigation_pic_id,
        mitigation_deadline: data.mitigation_deadline !== undefined ? data.mitigation_deadline : item.mitigation_deadline,
        mitigation_status: data.mitigation_status !== undefined ? data.mitigation_status : item.mitigation_status,
        residual_probability: data.residual_probability ? Number(data.residual_probability) : null,
        residual_impact: data.residual_impact ? Number(data.residual_impact) : null,
        residual_score: residualScore,
        residual_level: residualLevel,
        status: nextStatus,
        updated_by: userId || 1,
      });

    return this.getRiskById(id);
  }

  async updateRiskStatus(id, status) {
    await db('school_risks')
      .where({ id })
      .update({
        status,
        resolved_at: ['resolved', 'closed'].includes(status) ? new Date().toISOString().slice(0, 10) : null,
      });
    return this.getRiskById(id);
  }

  async deleteRisk(id) {
    const item = await db('school_risks').where({ id }).first();
    if (!item) {
      const err = new Error('Risiko tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('school_risks').where({ id }).delete();
    return { success: true, message: 'Risiko berhasil dihapus' };
  }

  async getRiskHeatmapData(schoolUnitId) {
    const risks = await this.listRisks(schoolUnitId);

    // Build 5x5 Matrix: Prob (1..5) vs Impact (1..5)
    // Grid coordinate: [prob][impact]
    const matrix = {};
    for (let p = 1; p <= 5; p++) {
      matrix[p] = {};
      for (let i = 1; i <= 5; i++) {
        const score = p * i;
        let level = 'low';
        if (score >= 20) level = 'extreme';
        else if (score >= 12) level = 'high';
        else if (score >= 6) level = 'medium';
        else level = 'low';

        matrix[p][i] = {
          probability: p,
          impact: i,
          score,
          level,
          count: 0,
          risks: []
        };
      }
    }

    let stats = { total: risks.length, extreme: 0, high: 0, medium: 0, low: 0 };

    risks.forEach((r) => {
      const p = Math.max(1, Math.min(5, Number(r.probability_val) || 3));
      const i = Math.max(1, Math.min(5, Number(r.impact_val) || 3));
      matrix[p][i].count++;
      matrix[p][i].risks.push({
        id: r.id,
        code: r.code,
        title: r.title,
        category: r.category,
        risk_score: r.risk_score,
        risk_level: r.risk_level,
        status: r.status,
        owner_name: r.owner_name
      });

      if (r.risk_level === 'extreme') stats.extreme++;
      else if (r.risk_level === 'high') stats.high++;
      else if (r.risk_level === 'medium') stats.medium++;
      else stats.low++;
    });

    return { stats, matrix, risks };
  }
}

module.exports = new QualityService();
