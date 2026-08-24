/**
 * Performance Evaluation Service Implementation
 * Modul Manajemen - Fitur #194: Evaluasi Kinerja Pegawai Lanjutan
 */
const db = require('../../../config/db/manajemen');
const { validateEmployee } = require('../utils/crossModuleHelper');

class PerformanceService {
  async listEvaluations(schoolUnitId, query = {}, user = null) {
    let q = db('employee_performance_evaluations').where(function () {
      if (schoolUnitId) this.where('school_unit_id', schoolUnitId);
    });

    if (query.employee_id) q = q.where('employee_id', query.employee_id);
    if (query.period) q = q.where('period', query.period);
    if (query.status) q = q.where('status', query.status);

    const items = await q.orderBy('id', 'desc');

    return await Promise.all(
      items.map(async (item) => {
        let emp = null;
        let evaluator = null;
        try {
          emp = await validateEmployee(item.employee_id);
          evaluator = await validateEmployee(item.evaluator_employee_id);
        } catch (e) {
          emp = { id: item.employee_id, full_name: `Pegawai #${item.employee_id}` };
        }
        return {
          ...item,
          employee_name: emp?.full_name || `Pegawai #${item.employee_id}`,
          evaluator_name: evaluator?.full_name || `Evaluator #${item.evaluator_employee_id}`,
        };
      })
    );
  }

  async getEvaluationById(id) {
    const item = await db('employee_performance_evaluations').where({ id }).first();
    if (!item) {
      const err = new Error('Evaluasi kinerja pegawai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const criteria = await db('employee_performance_evaluation_criteria')
      .where({ employee_performance_evaluation_id: id })
      .orderBy('id', 'asc');

    let emp = null;
    let evaluator = null;
    try {
      emp = await validateEmployee(item.employee_id);
      evaluator = await validateEmployee(item.evaluator_employee_id);
    } catch (e) {
      emp = { id: item.employee_id, full_name: `Pegawai #${item.employee_id}` };
    }

    return {
      ...item,
      employee_name: emp?.full_name || `Pegawai #${item.employee_id}`,
      evaluator_name: evaluator?.full_name || `Evaluator #${item.evaluator_employee_id}`,
      criteria,
    };
  }

  async createEvaluation(data) {
    await validateEmployee(data.employee_id);
    await validateEmployee(data.evaluator_employee_id);

    const existing = await db('employee_performance_evaluations')
      .where({ employee_id: data.employee_id, period: data.period })
      .first();

    if (existing) {
      const err = new Error(`Evaluasi kinerja untuk pegawai #${data.employee_id} pada periode ${data.period} sudah ada`);
      err.statusCode = 409;
      throw err;
    }

    const [id] = await db('employee_performance_evaluations').insert({
      employee_id: data.employee_id,
      school_unit_id: data.school_unit_id || 1,
      base_performance_review_id: data.base_performance_review_id || null,
      evaluator_employee_id: data.evaluator_employee_id,
      period: data.period,
      total_score: data.total_score !== undefined ? data.total_score : null,
      category: data.category || null,
      status: 'draft',
      notes: data.notes || null,
    });

    return this.getEvaluationById(id);
  }

  async updateEvaluation(id, data) {
    const item = await this.getEvaluationById(id);
    if (item.status !== 'draft') {
      const err = new Error('Evaluasi kinerja hanya dapat diubah saat berstatus draft');
      err.statusCode = 422;
      throw err;
    }

    await db('employee_performance_evaluations')
      .where({ id })
      .update({
        evaluator_employee_id:
          data.evaluator_employee_id !== undefined ? data.evaluator_employee_id : item.evaluator_employee_id,
        base_performance_review_id:
          data.base_performance_review_id !== undefined
            ? data.base_performance_review_id
            : item.base_performance_review_id,
        total_score: data.total_score !== undefined ? data.total_score : item.total_score,
        category: data.category !== undefined ? data.category : item.category,
        notes: data.notes !== undefined ? data.notes : item.notes,
      });

    return this.getEvaluationById(id);
  }

  async addCriteria(evaluationId, data) {
    await this.getEvaluationById(evaluationId);
    const [id] = await db('employee_performance_evaluation_criteria').insert({
      employee_performance_evaluation_id: evaluationId,
      criteria_name: data.criteria_name,
      weight: data.weight !== undefined ? data.weight : null,
      score: data.score !== undefined ? data.score : null,
      notes: data.notes || null,
    });
    return db('employee_performance_evaluation_criteria').where({ id }).first();
  }

  async submitEvaluation(id) {
    const item = await this.getEvaluationById(id);
    const criteria = item.criteria || [];

    let calculatedTotal = 0;
    let totalWeight = 0;

    criteria.forEach((c) => {
      const w = Number(c.weight) || 0;
      const s = Number(c.score) || 0;
      if (w > 0) {
        calculatedTotal += (s * w) / 100;
        totalWeight += w;
      } else {
        calculatedTotal += s;
      }
    });

    const finalScore = totalWeight > 0 ? calculatedTotal : (calculatedTotal / (criteria.length || 1));
    let cat = 'cukup';
    if (finalScore >= 85) cat = 'sangat_baik';
    else if (finalScore >= 75) cat = 'baik';
    else if (finalScore >= 60) cat = 'cukup';
    else cat = 'kurang';

    await db('employee_performance_evaluations')
      .where({ id })
      .update({
        total_score: parseFloat(finalScore.toFixed(2)),
        category: cat,
        status: 'submitted',
      });

    return this.getEvaluationById(id);
  }

  async approveEvaluation(id, userId) {
    await this.getEvaluationById(id);
    await db('employee_performance_evaluations').where({ id }).update({
      status: 'approved',
    });
    return this.getEvaluationById(id);
  }

  // Internal Service-to-Service for Kepegawaian module
  async getInternalFinalEvaluations(query = {}) {
    let q = db('employee_performance_evaluations').where('status', 'approved');
    if (query.employee_id) q = q.where('employee_id', query.employee_id);
    if (query.period) q = q.where('period', query.period);
    if (query.school_unit_id) q = q.where('school_unit_id', query.school_unit_id);
    return await q.orderBy('id', 'desc');
  }
}

module.exports = new PerformanceService();
