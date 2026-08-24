/**
 * Performance & Statistics Service Implementation
 * Modul Kepegawaian - Fitur 5: Penilaian Kinerja & Statistik Kepegawaian
 */
const db = require('../../../config/db/kepegawaian');

class PerformanceService {
  // ==========================================
  // 1. Penilaian Kinerja Dasar
  // ==========================================
  async listReviews(query = {}) {
    let baseQuery = db('performance_reviews')
      .leftJoin('employees as e', 'performance_reviews.employee_id', 'e.id')
      .leftJoin('employees as r', 'performance_reviews.reviewer_id', 'r.id')
      .select(
        'performance_reviews.*',
        'e.full_name as employee_name',
        'e.employee_number',
        'r.full_name as reviewer_name'
      );

    if (query.employee_id) {
      baseQuery = baseQuery.where('performance_reviews.employee_id', query.employee_id);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('performance_reviews.school_unit_id', query.school_unit_id);
    }
    if (query.period) {
      baseQuery = baseQuery.where('performance_reviews.period', query.period);
    }

    const rows = await baseQuery.orderBy('performance_reviews.id', 'desc');
    return rows.map((r) => ({
      ...r,
      score: r.score !== null ? parseFloat(r.score) : null
    }));
  }

  async createReview(payload, user = null) {
    let { employee_id, school_unit_id, reviewer_id, period, score, notes } = payload;

    if (!reviewer_id && user && user.ref_type === 'staff') {
      reviewer_id = user.ref_id;
    }

    if (!employee_id || !period) {
      const error = new Error('Field employee_id dan period wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id || employee.school_unit_id;
    const targetReviewerId = reviewer_id || employee_id;

    const [id] = await db('performance_reviews').insert({
      employee_id,
      school_unit_id: targetSchoolUnitId,
      reviewer_id: targetReviewerId,
      period: period.trim(),
      score: score !== undefined ? parseFloat(score) : null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const created = await db('performance_reviews').where({ id }).first();
    return {
      ...created,
      score: created.score !== null ? parseFloat(created.score) : null
    };
  }

  async updateReview(id, payload) {
    const review = await db('performance_reviews').where({ id }).first();
    if (!review) {
      const error = new Error('Penilaian kinerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.score !== undefined) updateData.score = parseFloat(payload.score);
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.period !== undefined) updateData.period = payload.period.trim();

    await db('performance_reviews').where({ id }).update(updateData);
    const updated = await db('performance_reviews').where({ id }).first();
    return {
      ...updated,
      score: updated.score !== null ? parseFloat(updated.score) : null
    };
  }

  // ==========================================
  // 2. Statistik Kepegawaian (Agregasi Query)
  // ==========================================
  async getStatistics(query = {}) {
    const { school_unit_id, dimension } = query;

    let baseQuery = db('employees').where('account_status', 'active');
    if (school_unit_id) {
      baseQuery = baseQuery.where('school_unit_id', school_unit_id);
    }

    // Total active employees
    const totalCount = await baseQuery.clone().count('id as total').first();
    const total = parseInt(totalCount.total, 10) || 0;

    let breakdown = [];

    switch (dimension) {
      case 'rank': {
        const rows = await baseQuery
          .clone()
          .select(db.raw("COALESCE(current_rank, 'Tanpa Golongan') as label"), db.raw('COUNT(id) as count'))
          .groupBy('current_rank')
          .orderBy('count', 'desc');
        breakdown = rows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
        break;
      }
      case 'gender': {
        const rows = await baseQuery
          .clone()
          .select('gender as label', db.raw('COUNT(id) as count'))
          .groupBy('gender');
        breakdown = rows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
        break;
      }
      case 'marital_status': {
        const rows = await baseQuery
          .clone()
          .select(db.raw("COALESCE(marital_status, 'unknown') as label"), db.raw('COUNT(id) as count'))
          .groupBy('marital_status');
        breakdown = rows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
        break;
      }
      case 'employment_status': {
        const rows = await baseQuery
          .clone()
          .select('employment_status as label', db.raw('COUNT(id) as count'))
          .groupBy('employment_status');
        breakdown = rows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
        break;
      }
      case 'age_group': {
        const rows = await baseQuery
          .clone()
          .select(
            db.raw(`
              CASE 
                WHEN birth_date IS NULL THEN 'Tidak Diketahui'
                WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) < 30 THEN '< 30 Tahun'
                WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 30 AND 39 THEN '30-39 Tahun'
                WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) BETWEEN 40 AND 49 THEN '40-49 Tahun'
                WHEN TIMESTAMPDIFF(YEAR, birth_date, CURDATE()) >= 50 THEN '>= 50 Tahun'
                ELSE 'Lainnya'
              END as label
            `),
            db.raw('COUNT(id) as count')
          )
          .groupBy('label');
        breakdown = rows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
        break;
      }
      default: {
        // Ringkasan umum jika dimensi tidak dispesifikasikan
        const statusRows = await baseQuery
          .clone()
          .select('employment_status as label', db.raw('COUNT(id) as count'))
          .groupBy('employment_status');
        breakdown = statusRows.map((r) => ({ label: r.label, count: parseInt(r.count, 10) }));
      }
    }

    return {
      school_unit_id: school_unit_id ? parseInt(school_unit_id, 10) : null,
      dimension: dimension || 'employment_status',
      total_active_employees: total,
      breakdown
    };
  }
}

module.exports = new PerformanceService();
