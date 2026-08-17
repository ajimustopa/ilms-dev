/**
 * Activity Logs Service Implementation
 * Fitur #5: Log Aktivitas Login Pengguna & Fitur #13: Endpoint Audit Log Lintas Aplikasi
 */
const db = require('../../config/database');

class ActivityLogsService {
  async listLoginLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    let baseQuery = db('activity_logs')
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .where('activity_logs.log_type', 'login');

    if (query.user_id) {
      baseQuery = baseQuery.where('activity_logs.user_id', query.user_id);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('activity_logs.school_unit_id', query.school_unit_id);
    }

    const countResult = await baseQuery.clone().count('activity_logs.id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const items = await baseQuery
      .select(
        'activity_logs.id',
        'activity_logs.user_id',
        'users.username as admin_username',
        'activity_logs.school_unit_id',
        'activity_logs.action',
        'activity_logs.ip_address',
        'activity_logs.user_agent',
        'activity_logs.occurred_at'
      )
      .orderBy('activity_logs.occurred_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  async internalRecordLog(payload, clientIp) {
    const { user_id, school_unit_id, application, module, action, data_before, data_after } = payload;

    if (!application || !module || !action) {
      const error = new Error("Field wajib: 'application', 'module', 'action'");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: user_id || null,
      school_unit_id: school_unit_id || null,
      application: application.trim().toLowerCase(),
      module: module.trim(),
      action: action.trim(),
      ip_address: clientIp || null,
      data_before: data_before ? JSON.stringify(data_before) : null,
      data_after: data_after ? JSON.stringify(data_after) : null,
      occurred_at: db.fn.now()
    });

    return { id: Number(id), status: 'recorded' };
  }

  async listAdminActionLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 50);
    const offset = (page - 1) * limit;

    let baseQuery = db('activity_logs')
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .leftJoin('school_units', 'activity_logs.school_unit_id', 'school_units.id')
      .where('activity_logs.log_type', 'admin_action');

    if (query.application && query.application !== 'all') {
      baseQuery = baseQuery.where('activity_logs.application', query.application.toLowerCase());
    }
    if (query.school_unit_id && query.school_unit_id !== 'all') {
      baseQuery = baseQuery.where('activity_logs.school_unit_id', query.school_unit_id);
    }
    if (query.action) {
      baseQuery = baseQuery.where('activity_logs.action', 'like', `%${query.action}%`);
    }
    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('users.username', 'like', `%${query.search}%`)
          .orWhere('activity_logs.module', 'like', `%${query.search}%`)
          .orWhere('activity_logs.action', 'like', `%${query.search}%`);
      });
    }

    const countResult = await baseQuery.clone().count('activity_logs.id as total').first();
    const totalItems = parseInt(countResult.total, 10) || 0;

    const rawItems = await baseQuery
      .select(
        'activity_logs.id',
        'activity_logs.log_type',
        'activity_logs.user_id',
        'users.username as admin_username',
        'activity_logs.school_unit_id',
        'school_units.name as school_name',
        'activity_logs.application',
        'activity_logs.module',
        'activity_logs.action',
        'activity_logs.ip_address',
        'activity_logs.data_before',
        'activity_logs.data_after',
        'activity_logs.occurred_at'
      )
      .orderBy('activity_logs.occurred_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items = rawItems.map((item) => ({
      ...item,
      data_before: typeof item.data_before === 'string' ? JSON.parse(item.data_before) : item.data_before,
      data_after: typeof item.data_after === 'string' ? JSON.parse(item.data_after) : item.data_after,
    }));

    return {
      items,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit) || 1
      }
    };
  }

  async getAdminActionLogById(id) {
    const log = await db('activity_logs')
      .leftJoin('users', 'activity_logs.user_id', 'users.id')
      .leftJoin('school_units', 'activity_logs.school_unit_id', 'school_units.id')
      .where('activity_logs.id', id)
      .select(
        'activity_logs.id',
        'activity_logs.log_type',
        'activity_logs.user_id',
        'users.username as admin_username',
        'activity_logs.school_unit_id',
        'school_units.name as school_name',
        'activity_logs.application',
        'activity_logs.module',
        'activity_logs.action',
        'activity_logs.ip_address',
        'activity_logs.data_before',
        'activity_logs.data_after',
        'activity_logs.occurred_at'
      )
      .first();

    if (!log) {
      const error = new Error('Log audit tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return {
      ...log,
      data_before: typeof log.data_before === 'string' ? JSON.parse(log.data_before) : log.data_before,
      data_after: typeof log.data_after === 'string' ? JSON.parse(log.data_after) : log.data_after,
    };
  }
}

module.exports = new ActivityLogsService();
