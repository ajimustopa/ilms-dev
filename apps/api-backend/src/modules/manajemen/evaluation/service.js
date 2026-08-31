/**
 * Evaluation & Follow-Up (Monev & RTL) Service Implementation
 * Modul Manajemen - Fitur 12: Monitoring, Evaluasi & Tindak Lanjut
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee, dbKepegawaian } = require('../utils/crossModuleHelper');

class EvaluationService {
  // Helper safe date string
  toDateStr(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  }

  // ==========================================
  // 1. Dashboard Metrics Summary
  // ==========================================
  async getDashboardMetrics(schoolUnitId) {
    // 1. Sasaran Mutu & Strategis
    const goals = await db('quality_goals').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });
    const totalGoals = goals.length;
    const achievedGoals = goals.filter(g => g.status === 'achieved').length;

    // 2. Program Kerja
    let progQ = db('work_plan_programs as prg')
      .leftJoin('school_work_plans as rkt', 'prg.school_work_plan_id', 'rkt.id');
    if (schoolUnitId) progQ = progQ.where('rkt.school_unit_id', schoolUnitId);
    const programs = await progQ.select('prg.*');
    const totalPrograms = programs.length;
    const activePrograms = programs.filter(p => p.status === 'in_progress').length;

    // 3. Kamus KPI Capaian
    const indicators = await db('quality_indicators');
    const achievements = await db('quality_indicator_achievements');
    let totalKpi = indicators.length;
    let avgAchievement = 0;
    if (achievements.length > 0) {
      const sum = achievements.reduce((acc, a) => acc + (Number(a.achievement_percentage) || 0), 0);
      avgAchievement = Math.round(sum / achievements.length);
    }

    // 4. RTL Stats
    const followUps = await db('evaluation_follow_ups').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });
    const totalRtl = followUps.length;
    const activeRtl = followUps.filter(f => ['draft', 'in_progress'].includes(f.status)).length;
    const completedRtl = followUps.filter(f => ['completed', 'verified'].includes(f.status)).length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueRtl = followUps.filter(f => f.deadline && this.toDateStr(f.deadline) < todayStr && !['completed', 'verified'].includes(f.status)).length;

    return {
      goals_summary: { total: totalGoals, achieved: achievedGoals, percentage: totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0 },
      programs_summary: { total: totalPrograms, active: activePrograms },
      kpi_summary: { total: totalKpi, avg_achievement_percentage: avgAchievement },
      rtl_summary: { total: totalRtl, active: activeRtl, completed: completedRtl, overdue: overdueRtl }
    };
  }

  // ==========================================
  // 2. Monitoring Sasaran (BSC & Sasaran Mutu)
  // ==========================================
  async getMonitoringGoals(schoolUnitId) {
    const goals = await db('quality_goals as qg')
      .leftJoin('strategic_goals as sg', 'qg.strategic_goal_id', 'sg.id')
      .leftJoin('quality_indicators as qi', 'qg.quality_indicator_id', 'qi.id')
      .where(function () {
        if (schoolUnitId) this.where('qg.school_unit_id', schoolUnitId);
      })
      .select(
        'qg.*',
        'sg.name as strategic_goal_name',
        'sg.perspective as strategic_goal_perspective',
        'qi.name as indicator_name',
        'qi.unit_of_measure as indicator_unit'
      )
      .orderBy('qg.id', 'asc');

    // Get linked follow-ups count
    const followUps = await db('evaluation_follow_ups')
      .where('source_type', 'quality_goal')
      .select('source_id', 'status');

    return goals.map(g => {
      const gFollowUps = followUps.filter(f => String(f.source_id) === String(g.id));
      const target = Number(g.target_value) || 0;
      const actual = Number(g.actual_value) || 0;
      const dev = actual - target;

      return {
        ...g,
        deviation: dev,
        follow_ups_count: gFollowUps.length,
        has_active_rtl: gFollowUps.some(f => ['draft', 'in_progress'].includes(f.status))
      };
    });
  }

  // ==========================================
  // 3. Monitoring Program Kerja & Prioritas
  // ==========================================
  async getMonitoringPrograms(schoolUnitId) {
    let q = db('work_plan_programs as prg')
      .leftJoin('school_work_plans as rkt', 'prg.school_work_plan_id', 'rkt.id')
      .leftJoin('strategic_goals as sg', 'prg.strategic_goal_id', 'sg.id');

    if (schoolUnitId) q = q.where('rkt.school_unit_id', schoolUnitId);

    const programs = await q.select(
      'prg.*',
      'rkt.title as rkt_title',
      'rkt.academic_year_id',
      'sg.name as strategic_goal_name'
    ).orderBy('prg.id', 'asc');

    const followUps = await db('evaluation_follow_ups')
      .where('source_type', 'program')
      .select('source_id', 'status');

    return programs.map(p => {
      const budgetPlanned = Number(p.budget_estimate) || 0;
      const budgetRealized = Number(p.budget_realization) || 0;
      const budgetGap = budgetRealized - budgetPlanned;
      const pFollowUps = followUps.filter(f => String(f.source_id) === String(p.id));

      return {
        ...p,
        budget_planned: budgetPlanned,
        budget_realized: budgetRealized,
        budget_gap: budgetGap,
        follow_ups_count: pFollowUps.length,
        has_active_rtl: pFollowUps.some(f => ['draft', 'in_progress'].includes(f.status))
      };
    });
  }

  // ==========================================
  // 4. Monitoring Kamus KPI Multi-Arah
  // ==========================================
  async getMonitoringKPI(schoolUnitId) {
    const indicators = await db('quality_indicators as qi')
      .leftJoin('strategic_goals as sg', 'qi.strategic_goal_id', 'sg.id')
      .select('qi.*', 'sg.name as strategic_goal_name')
      .orderBy('qi.id', 'asc');

    const achievements = await db('quality_indicator_achievements');
    const followUps = await db('evaluation_follow_ups')
      .where('source_type', 'kpi')
      .select('source_id', 'status');

    return indicators.map(ind => {
      const ach = achievements.find(a => a.quality_indicator_id === ind.id);
      const target = ind.target_value ? Number(ind.target_value) : null;
      const actual = ach ? Number(ach.actual_value) : null;
      const achPct = ach ? Number(ach.achievement_percentage) : 0;
      const gap = (target !== null && actual !== null) ? (actual - target) : 0;
      const iFollowUps = followUps.filter(f => String(f.source_id) === String(ind.id));

      return {
        ...ind,
        target_value: target,
        actual_value: actual,
        achievement_percentage: achPct,
        achievement_status: ach?.status || (achPct >= 100 ? 'achieved' : achPct < 60 ? 'critical' : 'pending'),
        gap_deviation: gap,
        evidence_url: ach?.evidence_url || null,
        verification_status: ach?.verification_status || 'unverified',
        follow_ups_count: iFollowUps.length,
        has_active_rtl: iFollowUps.some(f => ['draft', 'in_progress'].includes(f.status))
      };
    });
  }

  // ==========================================
  // 5. Agregasi Temuan Masalah & Gap Evaluasi
  // ==========================================
  async getEvaluationFindings(schoolUnitId) {
    const findings = [];

    // 1. Temuan dari KPI Kritis / Capaian < 75%
    const kpis = await this.getMonitoringKPI(schoolUnitId);
    kpis.forEach(k => {
      if (k.actual_value !== null && k.achievement_percentage < 75) {
        const u = k.unit_of_measure || '';
        findings.push({
          source_type: 'kpi',
          source_id: k.id,
          source_code: k.code,
          source_name: k.name,
          title: `Capaian KPI '${k.name}' di Bawah Target (${k.achievement_percentage}%)`,
          issue: `Realisasi ${k.actual_value} ${u} belum mencapai target ${k.target_value} ${u} (Capaian: ${k.achievement_percentage}%).`,
          deviation_analysis: `Terdapat gap deviasi sebesar ${k.gap_deviation} ${u}.`,
          severity: k.achievement_percentage < 50 ? 'critical' : 'warning',
          has_active_rtl: k.has_active_rtl
        });
      }
    });

    // 2. Temuan dari Sasaran Mutu Belum Tercapai
    const goals = await this.getMonitoringGoals(schoolUnitId);
    goals.forEach(g => {
      if (g.status === 'critical' || (g.achievement_percentage && g.achievement_percentage < 60)) {
        findings.push({
          source_type: 'quality_goal',
          source_id: g.id,
          source_code: g.code,
          source_name: g.name,
          title: `Sasaran Mutu '${g.name}' Masuk Kategori Kritis`,
          issue: `Capaian sasaran mutu pada standar ${g.quality_standard} baru mencapai ${g.achievement_percentage || 0}%.`,
          deviation_analysis: `Deviasi: aktual ${g.actual_value || 0} vs target ${g.target_value || 0}.`,
          severity: 'critical',
          has_active_rtl: g.has_active_rtl
        });
      }
    });

    // 3. Temuan dari Risiko Ekstrem / Tinggi
    const risks = await db('school_risks').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    }).whereIn('risk_level', ['extreme', 'high']).whereNot('status', 'resolved');

    risks.forEach(r => {
      findings.push({
        source_type: 'risk',
        source_id: r.id,
        source_code: r.code,
        source_name: r.title,
        title: `Risiko '${r.title}' Level ${r.risk_level.toUpperCase()} (Skor ${r.risk_score})`,
        issue: r.root_cause || r.description || 'Risiko berpotensi mengganggu operasional kelembagaan.',
        deviation_analysis: `Skor Risiko Inherent: ${r.risk_score} (P:${r.probability_val} x I:${r.impact_val}). Rencana mitigasi: ${r.mitigation_action || 'Belum ditetapkan'}.`,
        severity: r.risk_level === 'extreme' ? 'critical' : 'warning',
        has_active_rtl: false
      });
    });

    return findings;
  }

  // ==========================================
  // 6. Rencana Tindak Lanjut (RTL) CRUD
  // ==========================================
  async listFollowUps(schoolUnitId, query = {}) {
    let q = db('evaluation_follow_ups').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.status && query.status !== 'all') q = q.where('status', query.status);
    if (query.source_type && query.source_type !== 'all') q = q.where('source_type', query.source_type);
    if (query.pic_employee_id) q = q.where('pic_employee_id', query.pic_employee_id);

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('issue', 'like', s)
          .orWhere('action_plan', 'like', s)
          .orWhere('source_name', 'like', s)
          .orWhere('source_code', 'like', s);
      });
    }

    const items = await q.orderBy('id', 'desc');

    // Collect Employee IDs
    const empIds = [...new Set([
      ...items.filter(i => i.pic_employee_id).map(i => i.pic_employee_id),
      ...items.filter(i => i.verified_by_employee_id).map(i => i.verified_by_employee_id)
    ])];

    let empMap = {};
    if (empIds.length > 0) {
      try {
        const emps = await dbKepegawaian('employees').whereIn('id', empIds).select('id', 'full_name');
        emps.forEach(e => { empMap[e.id] = e.full_name; });
      } catch (e) {}
    }

    return items.map(item => ({
      ...item,
      pic_name: empMap[item.pic_employee_id] || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      verified_by_name: empMap[item.verified_by_employee_id] || (item.verified_by_employee_id ? `Pegawai #${item.verified_by_employee_id}` : null),
    }));
  }

  async getFollowUpById(id) {
    const item = await db('evaluation_follow_ups').where({ id }).first();
    if (!item) {
      const err = new Error('Rencana tindak lanjut (RTL) tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    let pic_name = null;
    let verified_by_name = null;

    if (item.pic_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.pic_employee_id }).first();
        if (emp) pic_name = emp.full_name;
      } catch (e) {}
    }

    if (item.verified_by_employee_id) {
      try {
        const emp = await dbKepegawaian('employees').where({ id: item.verified_by_employee_id }).first();
        if (emp) verified_by_name = emp.full_name;
      } catch (e) {}
    }

    return {
      ...item,
      pic_name: pic_name || (item.pic_employee_id ? `Pegawai #${item.pic_employee_id}` : null),
      verified_by_name: verified_by_name || (item.verified_by_employee_id ? `Pegawai #${item.verified_by_employee_id}` : null),
    };
  }

  async createFollowUp(data, userId) {
    if (!data.issue || !data.issue.trim()) {
      const err = new Error('Uraian masalah / temuan wajib diisi');
      err.statusCode = 422;
      throw err;
    }
    if (!data.action_plan || !data.action_plan.trim()) {
      const err = new Error('Rencana aksi perbaikan wajib diisi');
      err.statusCode = 422;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    const [id] = await db('evaluation_follow_ups').insert({
      school_unit_id: data.school_unit_id || 1,
      source_type: data.source_type || 'general',
      source_id: data.source_id ? Number(data.source_id) : null,
      source_code: data.source_code || null,
      source_name: data.source_name || null,
      issue: data.issue.trim(),
      deviation_analysis: data.deviation_analysis || null,
      action_plan: data.action_plan.trim(),
      pic_employee_id: data.pic_employee_id ? Number(data.pic_employee_id) : null,
      deadline: data.deadline || null,
      status: data.status || 'draft',
      progress_percent: data.progress_percent !== undefined ? Number(data.progress_percent) : 0,
      completion_notes: data.completion_notes || null,
      evidence_url: data.evidence_url || null,
      created_by: userId || 1,
    });

    return this.getFollowUpById(id);
  }

  async updateFollowUp(id, data, userId) {
    const item = await db('evaluation_follow_ups').where({ id }).first();
    if (!item) {
      const err = new Error('RTL tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    if (data.pic_employee_id) {
      await validateEmployee(data.pic_employee_id);
    }

    const progress = data.progress_percent !== undefined ? Number(data.progress_percent) : item.progress_percent;
    let nextStatus = data.status !== undefined ? data.status : item.status;
    let completedAt = item.completed_at;

    if (progress === 100 && nextStatus !== 'verified') {
      nextStatus = 'completed';
      completedAt = completedAt || new Date();
    } else if (progress < 100 && nextStatus === 'completed') {
      nextStatus = 'in_progress';
      completedAt = null;
    }

    await db('evaluation_follow_ups')
      .where({ id })
      .update({
        source_type: data.source_type !== undefined ? data.source_type : item.source_type,
        source_id: data.source_id !== undefined ? (data.source_id ? Number(data.source_id) : null) : item.source_id,
        source_code: data.source_code !== undefined ? data.source_code : item.source_code,
        source_name: data.source_name !== undefined ? data.source_name : item.source_name,
        issue: data.issue !== undefined ? data.issue.trim() : item.issue,
        deviation_analysis: data.deviation_analysis !== undefined ? data.deviation_analysis : item.deviation_analysis,
        action_plan: data.action_plan !== undefined ? data.action_plan.trim() : item.action_plan,
        pic_employee_id: data.pic_employee_id !== undefined ? (data.pic_employee_id ? Number(data.pic_employee_id) : null) : item.pic_employee_id,
        deadline: data.deadline !== undefined ? data.deadline : item.deadline,
        status: nextStatus,
        progress_percent: progress,
        completion_notes: data.completion_notes !== undefined ? data.completion_notes : item.completion_notes,
        completed_at: completedAt,
        evidence_url: data.evidence_url !== undefined ? data.evidence_url : item.evidence_url,
        updated_by: userId || 1,
      });

    return this.getFollowUpById(id);
  }

  async verifyFollowUp(id, data, userId) {
    const item = await db('evaluation_follow_ups').where({ id }).first();
    if (!item) {
      const err = new Error('RTL tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const verifierId = data.verified_by_employee_id || userId || 1;

    await db('evaluation_follow_ups')
      .where({ id })
      .update({
        status: 'verified',
        progress_percent: 100,
        completed_at: item.completed_at || new Date(),
        verified_by_employee_id: verifierId,
        verified_at: new Date(),
        completion_notes: data.notes || item.completion_notes,
        updated_by: userId || 1
      });

    return this.getFollowUpById(id);
  }

  async deleteFollowUp(id) {
    const item = await db('evaluation_follow_ups').where({ id }).first();
    if (!item) {
      const err = new Error('RTL tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    await db('evaluation_follow_ups').where({ id }).delete();
    return { success: true, message: 'Rencana tindak lanjut berhasil dihapus' };
  }
}

module.exports = new EvaluationService();
