/**
 * Daily Spending Limits Service
 * Sesuai api-contract-kantin.md Modul 4 & erd-kantin.md §2.10
 */
const db = require('../../../config/db/kantin');

class DailySpendingLimitsService {
  async listLimits(schoolUnitId, query = {}) {
    let q = db('daily_spending_limits').where('school_unit_id', schoolUnitId);

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.search) {
      q = q.where('limit_name', 'like', `%${query.search}%`);
    }

    return q.orderBy('id', 'desc');
  }

  async getLimitById(schoolUnitId, id) {
    return db('daily_spending_limits').where({ id, school_unit_id: schoolUnitId }).first();
  }

  async getActiveLimit(schoolUnitId) {
    const today = new Date().toISOString().slice(0, 10);
    return db('daily_spending_limits')
      .where({ school_unit_id: schoolUnitId, status: 'active' })
      .where('valid_from', '<=', today)
      .where(function() {
        this.whereNull('valid_until').orWhere('valid_until', '>=', today);
      })
      .orderBy('id', 'desc')
      .first();
  }

  async createLimit(schoolUnitId, payload) {
    const { limit_name, limit_amount, valid_from, valid_until = null, note = null } = payload;
    const [id] = await db('daily_spending_limits').insert({
      school_unit_id: schoolUnitId,
      limit_name,
      limit_amount: parseFloat(limit_amount),
      valid_from: valid_from || new Date().toISOString().slice(0, 10),
      valid_until,
      note,
      status: 'active'
    });
    return this.getLimitById(schoolUnitId, id);
  }

  async updateLimit(schoolUnitId, id, payload) {
    const limit = await this.getLimitById(schoolUnitId, id);
    if (!limit) return null;

    const { limit_name, limit_amount, valid_from, valid_until, note } = payload;
    await db('daily_spending_limits')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        limit_name: limit_name !== undefined ? limit_name : limit.limit_name,
        limit_amount: limit_amount !== undefined ? parseFloat(limit_amount) : limit.limit_amount,
        valid_from: valid_from !== undefined ? valid_from : limit.valid_from,
        valid_until: valid_until !== undefined ? valid_until : limit.valid_until,
        note: note !== undefined ? note : limit.note,
        updated_at: db.fn.now()
      });

    return this.getLimitById(schoolUnitId, id);
  }

  async updateStatus(schoolUnitId, id, payload) {
    const limit = await this.getLimitById(schoolUnitId, id);
    if (!limit) return null;

    const { status, status_note = null } = payload;
    await db('daily_spending_limits')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        status,
        status_note,
        status_changed_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return this.getLimitById(schoolUnitId, id);
  }
}

module.exports = new DailySpendingLimitsService();
