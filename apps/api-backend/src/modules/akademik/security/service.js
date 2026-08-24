/**
 * Security & Activity Logs Service Implementation
 * Modul Akademik - Fitur 8: Audit Log Aktivitas (Append-Only)
 */
const db = require('../../../config/db/akademik');

class SecurityService {
  async listActivityLogs(query = {}) {
    let baseQuery = db('activity_logs');

    if (query.user_id) {
      baseQuery = baseQuery.where('user_id', query.user_id);
    }
    if (query.action) {
      baseQuery = baseQuery.where('action', query.action);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    const rows = await baseQuery.orderBy('created_at', 'desc').limit(100);
    return rows.map(r => ({
      ...r,
      data_before: typeof r.data_before === 'string' ? JSON.parse(r.data_before) : r.data_before,
      data_after: typeof r.data_after === 'string' ? JSON.parse(r.data_after) : r.data_after
    }));
  }

  async recordActivity(payload) {
    const { satuan_pendidikan_id, user_id, action, data_before, data_after } = payload;
    if (!user_id || !action) {
      return null;
    }

    try {
      const [id] = await db('activity_logs').insert({
        satuan_pendidikan_id: satuan_pendidikan_id || null,
        user_id,
        action,
        data_before: data_before ? JSON.stringify(data_before) : null,
        data_after: data_after ? JSON.stringify(data_after) : null,
        created_at: db.fn.now()
      });
      return id;
    } catch (e) {
      console.warn('[Activity Log Error]:', e.message);
      return null;
    }
  }
}

module.exports = new SecurityService();
