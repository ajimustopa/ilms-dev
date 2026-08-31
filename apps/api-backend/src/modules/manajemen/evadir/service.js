/**
 * EVADIR (Self Evaluation) Service Implementation
 * Modul Manajemen - Evaluasi Diri Terintegrasi Berbasis Sasaran RIPS & BSC
 */
const db = require('../../../config/db/manajemen');

class EvadirService {
  /**
   * Helper: Menghitung achieved_percent secara otomatis jika input_mode === 'unit_ratio'
   */
  calculateAchievedPercent(inputMode, directPercent, numerator, denominator) {
    if (inputMode === 'unit_ratio') {
      const num = Number(numerator) || 0;
      const den = Number(denominator) || 0;
      if (den === 0) return 0;
      return Number(((num / den) * 100).toFixed(2));
    }
    return directPercent !== undefined && directPercent !== null && directPercent !== ''
      ? Number(directPercent)
      : null;
  }

  // ==========================================
  // 1. EVADIR REPORTS (HEADER)
  // ==========================================
  async listReports(query = {}) {
    let q = db('evadir_reports as r')
      .join('rips_documents as d', 'r.rips_document_id', 'd.id')
      .select('r.*', 'd.name as rips_document_name');

    if (query.school_unit_id) {
      q = q.where('r.school_unit_id', Number(query.school_unit_id));
    } else if (query.foundation_only === 'true') {
      q = q.whereNull('r.school_unit_id');
    }

    if (query.rips_document_id) {
      q = q.where('r.rips_document_id', Number(query.rips_document_id));
    }

    if (query.status) {
      q = q.where('r.status', query.status);
    }

    return q.orderBy('r.evaluation_date', 'desc').orderBy('r.id', 'desc');
  }

  async getReportById(id) {
    const report = await db('evadir_reports as r')
      .join('rips_documents as d', 'r.rips_document_id', 'd.id')
      .where('r.id', id)
      .select('r.*', 'd.name as rips_document_name')
      .first();

    if (!report) {
      const error = new Error('Laporan Evaluasi Diri (EVADIR) tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return report;
  }

  async createReport(payload, user = null) {
    if (!payload.rips_document_id || !payload.period_label || !payload.evaluation_date) {
      const error = new Error("rips_document_id, period_label, dan evaluation_date wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('evadir_reports').insert({
      school_unit_id: payload.school_unit_id ? Number(payload.school_unit_id) : null,
      rips_document_id: Number(payload.rips_document_id),
      period_label: payload.period_label.trim(),
      evaluation_date: payload.evaluation_date,
      status: 'draft',
      current_version: 1,
      created_by: user?.id || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return this.getReportById(id);
  }

  async updateReport(id, payload) {
    const report = await db('evadir_reports').where({ id }).first();
    if (!report) {
      const error = new Error('Laporan EVADIR tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.period_label) updateData.period_label = payload.period_label.trim();
    if (payload.evaluation_date) updateData.evaluation_date = payload.evaluation_date;
    if (payload.status) updateData.status = payload.status;

    await db('evadir_reports').where({ id }).update(updateData);
    return this.getReportById(id);
  }

  async deleteReport(id) {
    const report = await db('evadir_reports').where({ id }).first();
    if (!report) {
      const error = new Error('Laporan EVADIR tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    await db('evadir_reports').where({ id }).del();
    return { success: true };
  }

  // ==========================================
  // 2. EVADIR GOAL RESULTS (HASIL EVALUASI SASARAN)
  // ==========================================
  async getGoalResults(reportId) {
    const report = await this.getReportById(reportId);

    // Ambil seluruh sasaran RIPS milik rips_document_id ini
    const goals = await db('rips_goals as g')
      .leftJoin('rips_domains as dom', 'g.domain_id', 'dom.id')
      .leftJoin('rips_subdomains as sub', 'g.subdomain_id', 'sub.id')
      .leftJoin('bsc_aspects as bsc', 'g.bsc_aspect_id', 'bsc.id')
      .where('g.rips_document_id', report.rips_document_id)
      .select(
        'g.*',
        'dom.name as domain_name',
        'sub.name as subdomain_name',
        'bsc.name as bsc_aspect_name'
      )
      .orderBy('dom.order_index', 'asc')
      .orderBy('g.order_index', 'asc')
      .orderBy('g.id', 'asc');

    // Ambil hasil evaluasi yang sudah tersimpan untuk report ini
    const savedResults = await db('evadir_goal_results').where('evadir_report_id', reportId);

    // Bentuk matriks perbandingan: Target vs Capaian
    return goals.map((g) => {
      const res = savedResults.find((r) => r.rips_goal_id === g.id);
      const achieved = res ? res.achieved_percent : null;
      const target = g.target_percent !== null ? Number(g.target_percent) : 100;
      const baseline = g.baseline_percent !== null ? Number(g.baseline_percent) : 0;

      // Hitung selisih gap & status pencapaian
      let gap = null;
      let isUnderperformed = false;
      if (achieved !== null && target !== null) {
        gap = Number((achieved - target).toFixed(2));
        if (gap < -10) isUnderperformed = true; // Di bawah target lebih dari 10%
      }

      return {
        goal_id: g.id,
        goal_code: g.code,
        goal_title: g.title,
        indicator_name: g.indicator_name,
        indicator_unit: g.indicator_unit,
        domain_name: g.domain_name,
        subdomain_name: g.subdomain_name,
        bsc_aspect_name: g.bsc_aspect_name,
        baseline_percent: baseline,
        target_percent: target,
        result_id: res?.id || null,
        input_mode: res?.input_mode || 'percent',
        achieved_percent: achieved,
        achieved_numerator: res?.achieved_numerator || null,
        achieved_denominator: res?.achieved_denominator || null,
        analysis_notes: res?.analysis_notes || null,
        gap,
        is_underperformed: isUnderperformed,
      };
    });
  }

  async bulkUpsertGoalResults(reportId, items = []) {
    const report = await this.getReportById(reportId);
    if (!Array.isArray(items) || items.length === 0) {
      const error = new Error('items array wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    return db.transaction(async (trx) => {
      for (const item of items) {
        const { rips_goal_id, input_mode, achieved_percent, achieved_numerator, achieved_denominator, analysis_notes } = item;
        if (!rips_goal_id) continue;

        const mode = input_mode === 'unit_ratio' ? 'unit_ratio' : 'percent';
        const finalAchievedPercent = this.calculateAchievedPercent(
          mode,
          achieved_percent,
          achieved_numerator,
          achieved_denominator
        );

        const existing = await trx('evadir_goal_results')
          .where({
            evadir_report_id: Number(reportId),
            rips_goal_id: Number(rips_goal_id),
          })
          .first();

        if (existing) {
          await trx('evadir_goal_results')
            .where({ id: existing.id })
            .update({
              input_mode: mode,
              achieved_percent: finalAchievedPercent,
              achieved_numerator: mode === 'unit_ratio' ? (Number(achieved_numerator) || 0) : null,
              achieved_denominator: mode === 'unit_ratio' ? (Number(achieved_denominator) || 0) : null,
              analysis_notes: analysis_notes !== undefined ? analysis_notes : existing.analysis_notes,
              updated_at: trx.fn.now(),
            });
        } else {
          await trx('evadir_goal_results').insert({
            evadir_report_id: Number(reportId),
            rips_goal_id: Number(rips_goal_id),
            input_mode: mode,
            achieved_percent: finalAchievedPercent,
            achieved_numerator: mode === 'unit_ratio' ? (Number(achieved_numerator) || 0) : null,
            achieved_denominator: mode === 'unit_ratio' ? (Number(achieved_denominator) || 0) : null,
            analysis_notes: analysis_notes || null,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });
        }
      }

      return { success: true, count: items.length };
    });
  }

  // ==========================================
  // 3. PUBLISH EVADIR TO DOCUMENT_PUBLICATIONS
  // ==========================================
  async publishReport(reportId, payload, user = null) {
    const report = await this.getReportById(reportId);
    const goalResults = await this.getGoalResults(reportId);

    const currentVersion = report.current_version || 1;
    const snapshot = {
      report,
      goal_results: goalResults,
      published_at: new Date().toISOString(),
      published_by_user: user ? { id: user.id, username: user.username, full_name: user.full_name } : null,
    };

    // Archive previous published publications of this report
    await db('document_publications')
      .where({
        document_type: 'evadir',
        source_id: reportId,
        status: 'published',
      })
      .update({
        status: 'archived',
        updated_at: db.fn.now(),
      });

    // Create new publication record
    const [pubId] = await db('document_publications').insert({
      document_type: 'evadir',
      source_id: reportId,
      school_unit_id: report.school_unit_id || null,
      version_number: currentVersion,
      document_number: payload.document_number || `SK-EVADIR/${report.evaluation_date.toString().substring(0, 4)}/V${currentVersion}`,
      title: payload.title || `Laporan Evaluasi Diri ${report.period_label} (Versi ${currentVersion})`,
      snapshot_json: JSON.stringify(snapshot),
      change_summary: payload.change_summary || `Penerbitan Laporan EVADIR ${report.period_label}`,
      file_url: payload.file_url || null,
      status: 'published',
      effective_date: payload.effective_date || report.evaluation_date,
      published_by: user?.id || null,
      published_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Update report status & increment version
    await db('evadir_reports')
      .where({ id: reportId })
      .update({
        status: 'published',
        current_version: currentVersion + 1,
        updated_at: db.fn.now(),
      });

    return db('document_publications').where({ id: pubId }).first();
  }

  async getPublications(reportId) {
    return db('document_publications')
      .where({
        document_type: 'evadir',
        source_id: reportId,
      })
      .orderBy('version_number', 'desc');
  }

  // ==========================================
  // 4. BALANCED SCORECARD (BSC) AGGREGATION & TRENDS
  // ==========================================
  async getBscDashboard(evadirReportId) {
    if (!evadirReportId) {
      const error = new Error('evadir_report_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const report = await this.getReportById(evadirReportId);
    const goalResults = await this.getGoalResults(evadirReportId);

    // Ambil seluruh aspek BSC master
    const bscAspects = await db('bsc_aspects').orderBy('order_index', 'asc');

    // Thresholds
    const THRESHOLD_ACHIEVED = 100; // >= 100%
    const THRESHOLD_ON_TRACK = 75;  // 75% - 99.9%

    const aspectsData = bscAspects.map((aspect) => {
      // Filter goals belonging to this aspect
      const matchingGoals = goalResults.filter((g) => {
        return g.bsc_aspect_name === aspect.name;
      });

      const totalGoals = matchingGoals.length;
      let sumAchieved = 0;
      let sumTarget = 0;
      let sumBaseline = 0;
      let countWithAchieved = 0;

      let achievedCount = 0;
      let onTrackCount = 0;
      let laggedCount = 0;

      const goalsWithStatus = matchingGoals.map((g) => {
        const achieved = g.achieved_percent !== null ? Number(g.achieved_percent) : null;
        const target = Number(g.target_percent) || 100;
        const baseline = Number(g.baseline_percent) || 0;

        sumTarget += target;
        sumBaseline += baseline;

        let status = 'belum_dinilai';
        if (achieved !== null) {
          sumAchieved += achieved;
          countWithAchieved++;

          const percentOfTarget = target > 0 ? (achieved / target) * 100 : achieved;
          if (percentOfTarget >= THRESHOLD_ACHIEVED) {
            status = 'tercapai';
            achievedCount++;
          } else if (percentOfTarget >= THRESHOLD_ON_TRACK) {
            status = 'on_track';
            onTrackCount++;
          } else {
            status = 'tertinggal';
            laggedCount++;
          }
        }

        return {
          ...g,
          bsc_status: status,
        };
      });

      const avgAchieved = countWithAchieved > 0 ? Number((sumAchieved / countWithAchieved).toFixed(2)) : 0;
      const avgTarget = totalGoals > 0 ? Number((sumTarget / totalGoals).toFixed(2)) : 0;
      const avgBaseline = totalGoals > 0 ? Number((sumBaseline / totalGoals).toFixed(2)) : 0;

      return {
        aspect_id: aspect.id,
        aspect_code: aspect.code,
        aspect_name: aspect.name,
        description: aspect.description,
        total_goals: totalGoals,
        evaluated_goals_count: countWithAchieved,
        avg_achieved_percent: avgAchieved,
        avg_target_percent: avgTarget,
        avg_baseline_percent: avgBaseline,
        stats: {
          tercapai: achievedCount,
          on_track: onTrackCount,
          tertinggal: laggedCount,
        },
        goals: goalsWithStatus,
      };
    });

    return {
      report: {
        id: report.id,
        period_label: report.period_label,
        evaluation_date: report.evaluation_date,
        status: report.status,
        current_version: report.current_version,
      },
      aspects: aspectsData,
      all_goals: goalResults,
    };
  }

  async getBscTrend(ripsDocumentId, bscAspectId = null) {
    if (!ripsDocumentId) {
      const error = new Error('rips_document_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Ambil seluruh laporan evadir yang statusnya published untuk rips_document ini
    const reports = await db('evadir_reports')
      .where({
        rips_document_id: Number(ripsDocumentId),
        status: 'published',
      })
      .orderBy('evaluation_date', 'asc');

    const bscAspects = await db('bsc_aspects').orderBy('order_index', 'asc');

    // Untuk setiap laporan, hitung rata-rata per aspek
    const trendData = [];
    for (const rep of reports) {
      const dashboard = await this.getBscDashboard(rep.id);
      const point = {
        report_id: rep.id,
        period_label: rep.period_label,
        evaluation_date: rep.evaluation_date,
      };

      dashboard.aspects.forEach((asp) => {
        point[asp.aspect_name] = asp.avg_achieved_percent;
      });

      trendData.push(point);
    }

    return {
      aspects: bscAspects.map((a) => a.name),
      series: trendData,
    };
  }
}

module.exports = EvadirService;

