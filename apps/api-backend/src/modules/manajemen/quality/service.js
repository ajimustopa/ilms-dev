/**
 * Quality Service Implementation
 * Modul Manajemen: KPI (#193), Evadir (#195), Akreditasi (#196), Dashboard Agregat (#201), Risiko (#202)
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class QualityService {
  // ==========================================
  // 1. KPI & Indikator Mutu - #193
  // ==========================================
  async listIndicators(schoolUnitId, query = {}) {
    let q = db('quality_indicators').where(function () {
      if (schoolUnitId) {
        this.where('school_unit_id', schoolUnitId).orWhereNull('school_unit_id');
      }
    });

    if (query.category) q = q.where('category', query.category);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('name', 'like', s).orWhere('code', 'like', s);
      });
    }

    return await q.orderBy('id', 'asc');
  }

  async createIndicator(data) {
    const [id] = await db('quality_indicators').insert({
      school_unit_id: data.school_unit_id || null,
      code: data.code,
      name: data.name,
      category: data.category,
      unit_of_measure: data.unit_of_measure || null,
      target_value: data.target_value !== undefined ? data.target_value : null,
      data_source_module: data.data_source_module || null,
    });
    return db('quality_indicators').where({ id }).first();
  }

  async updateIndicator(id, data) {
    const item = await db('quality_indicators').where({ id }).first();
    if (!item) {
      const err = new Error('Indikator mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    await db('quality_indicators')
      .where({ id })
      .update({
        code: data.code !== undefined ? data.code : item.code,
        name: data.name !== undefined ? data.name : item.name,
        category: data.category !== undefined ? data.category : item.category,
        unit_of_measure: data.unit_of_measure !== undefined ? data.unit_of_measure : item.unit_of_measure,
        target_value: data.target_value !== undefined ? data.target_value : item.target_value,
        data_source_module:
          data.data_source_module !== undefined ? data.data_source_module : item.data_source_module,
      });
    return db('quality_indicators').where({ id }).first();
  }

  async listAchievements(indicatorId, schoolUnitId) {
    let q = db('quality_indicator_achievements').where({ quality_indicator_id: indicatorId });
    if (schoolUnitId) q = q.where('school_unit_id', schoolUnitId);
    return await q.orderBy('period', 'desc');
  }

  async recordAchievement(indicatorId, data, userId) {
    const indicator = await db('quality_indicators').where({ id: indicatorId }).first();
    if (!indicator) {
      const err = new Error('Indikator mutu tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const schoolUnitId = data.school_unit_id || 1;
    const period = data.period;

    const existing = await db('quality_indicator_achievements')
      .where({ quality_indicator_id: indicatorId, school_unit_id: schoolUnitId, period })
      .first();

    if (existing) {
      await db('quality_indicator_achievements')
        .where({ id: existing.id })
        .update({
          actual_value: data.actual_value,
          recorded_by: userId || 1,
          recorded_at: new Date(),
        });
      return db('quality_indicator_achievements').where({ id: existing.id }).first();
    } else {
      const [id] = await db('quality_indicator_achievements').insert({
        quality_indicator_id: indicatorId,
        school_unit_id: schoolUnitId,
        period,
        actual_value: data.actual_value,
        recorded_by: userId || 1,
        recorded_at: new Date(),
      });
      return db('quality_indicator_achievements').where({ id }).first();
    }
  }

  async getKpiDashboard(schoolUnitId, period) {
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

    return indicators.map((ind) => {
      const ach = achievementMap[ind.id];
      const target = Number(ind.target_value) || 0;
      const actual = ach ? Number(ach.actual_value) : null;
      const achievementPct = target > 0 && actual !== null ? ((actual / target) * 100).toFixed(1) : null;

      return {
        ...ind,
        period: ach ? ach.period : period || 'N/A',
        actual_value: actual,
        achievement_percentage: achievementPct ? parseFloat(achievementPct) : null,
        recorded_at: ach ? ach.recorded_at : null,
      };
    });
  }

  // ==========================================
  // 2. Evadir (Self Evaluations) - #195
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
  // 3. Akreditasi & Instrumen Mutu - #196
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
  // 4. Dashboard Agregat Lintas Aplikasi - #201
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

    // Default fallback mock aggregate jika belum ada snapshot
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
  // 5. Manajemen Risiko & Isu Sekolah - #202
  // ==========================================
  async listRisks(schoolUnitId, query = {}) {
    let q = db('school_risks').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.status) q = q.where('status', query.status);
    if (query.category) q = q.where('category', query.category);
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('title', 'like', s).orWhere('description', 'like', s);
      });
    }

    const items = await q.orderBy('id', 'desc');
    return await Promise.all(
      items.map(async (item) => {
        let owner = null;
        if (item.owner_employee_id) {
          try {
            owner = await validateEmployee(item.owner_employee_id);
          } catch (e) {
            owner = { id: item.owner_employee_id, full_name: `Pegawai #${item.owner_employee_id}` };
          }
        }
        return {
          ...item,
          owner_name: owner?.full_name || null,
        };
      })
    );
  }

  async createRisk(data) {
    if (data.owner_employee_id) {
      await validateEmployee(data.owner_employee_id);
    }

    const [id] = await db('school_risks').insert({
      school_unit_id: data.school_unit_id || 1,
      title: data.title,
      category: data.category || null,
      description: data.description || null,
      likelihood: data.likelihood || 'medium',
      impact: data.impact || 'medium',
      status: data.status || 'identified',
      mitigation_plan: data.mitigation_plan || null,
      owner_employee_id: data.owner_employee_id || null,
      identified_at: data.identified_at || new Date().toISOString().slice(0, 10),
    });
    return db('school_risks').where({ id }).first();
  }

  async updateRisk(id, data) {
    const item = await db('school_risks').where({ id }).first();
    if (!item) {
      const err = new Error('Risiko tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('school_risks')
      .where({ id })
      .update({
        title: data.title !== undefined ? data.title : item.title,
        category: data.category !== undefined ? data.category : item.category,
        description: data.description !== undefined ? data.description : item.description,
        likelihood: data.likelihood !== undefined ? data.likelihood : item.likelihood,
        impact: data.impact !== undefined ? data.impact : item.impact,
        status: data.status !== undefined ? data.status : item.status,
        mitigation_plan: data.mitigation_plan !== undefined ? data.mitigation_plan : item.mitigation_plan,
        owner_employee_id:
          data.owner_employee_id !== undefined ? data.owner_employee_id : item.owner_employee_id,
        resolved_at: data.resolved_at !== undefined ? data.resolved_at : item.resolved_at,
      });
    return db('school_risks').where({ id }).first();
  }

  async updateRiskStatus(id, status) {
    await db('school_risks')
      .where({ id })
      .update({
        status,
        resolved_at: ['resolved', 'closed'].includes(status) ? new Date().toISOString().slice(0, 10) : null,
      });
    return db('school_risks').where({ id }).first();
  }
}

module.exports = new QualityService();
