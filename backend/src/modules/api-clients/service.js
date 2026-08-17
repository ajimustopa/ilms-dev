/**
 * API Clients & Rate Limit Service Implementation
 * Fitur #10: API Gateway Internal & Service-to-Service Rate Limiter
 */
const crypto = require('crypto');
const db = require('../../config/database');

class ApiClientsService {
  async listClients(query = {}) {
    let baseQuery = db('api_clients');
    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('status', query.status);
    }
    return baseQuery.orderBy('id', 'asc');
  }

  async createClient(payload, adminUser, ipAddress) {
    if (!payload.client_name) {
      const error = new Error("Field 'client_name' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const rawApiKey = `core_ak_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    const [id] = await db('api_clients').insert({
      client_name: payload.client_name.trim().toLowerCase(),
      api_key_hash: keyHash,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newClient = await db('api_clients').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'api_clients',
      action: 'create_client',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(newClient),
      occurred_at: db.fn.now()
    });

    return {
      id: Number(id),
      client_name: newClient.client_name,
      api_key: rawApiKey,
      status: newClient.status
    };
  }

  async updateClientStatus(id, status, adminUser, ipAddress) {
    const current = await db('api_clients').where({ id }).first();
    if (!current) {
      const error = new Error('API Client tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('api_clients').where({ id }).update({
      status,
      updated_at: db.fn.now()
    });

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'api_clients',
      action: 'toggle_status',
      ip_address: ipAddress || null,
      data_before: { status: current.status },
      data_after: { status },
      occurred_at: db.fn.now()
    });

    return { id: Number(id), client_name: current.client_name, status };
  }

  async listRateLimitRules(query = {}) {
    let baseQuery = db('rate_limit_rules')
      .leftJoin('api_clients', 'rate_limit_rules.api_client_id', 'api_clients.id')
      .select(
        'rate_limit_rules.id',
        'rate_limit_rules.api_client_id',
        'api_clients.client_name',
        'rate_limit_rules.endpoint',
        'rate_limit_rules.limit_per_minute'
      );

    if (query.endpoint) {
      baseQuery = baseQuery.where('rate_limit_rules.endpoint', 'like', `%${query.endpoint}%`);
    }

    return baseQuery.orderBy('rate_limit_rules.id', 'asc');
  }

  async createRateLimitRule(payload, adminUser, ipAddress) {
    if (!payload.endpoint || !payload.limit_per_minute) {
      const error = new Error("Field 'endpoint' dan 'limit_per_minute' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('rate_limit_rules').insert({
      api_client_id: payload.api_client_id || null,
      endpoint: payload.endpoint.trim(),
      limit_per_minute: parseInt(payload.limit_per_minute, 10),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newRule = await db('rate_limit_rules').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'api_clients',
      action: 'create_rate_limit_rule',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(newRule),
      occurred_at: db.fn.now()
    });

    return newRule;
  }

  async updateRateLimitRule(id, payload, adminUser, ipAddress) {
    const current = await db('rate_limit_rules').where({ id }).first();
    if (!current) {
      const error = new Error('Aturan rate limit tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      api_client_id: payload.api_client_id !== undefined ? (payload.api_client_id || null) : current.api_client_id,
      endpoint: payload.endpoint !== undefined ? payload.endpoint.trim() : current.endpoint,
      limit_per_minute: payload.limit_per_minute !== undefined ? parseInt(payload.limit_per_minute, 10) : current.limit_per_minute,
      updated_at: db.fn.now()
    };

    await db('rate_limit_rules').where({ id }).update(updateData);
    const updated = await db('rate_limit_rules').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'api_clients',
      action: 'update_rate_limit_rule',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: JSON.stringify(updated),
      occurred_at: db.fn.now()
    });

    return updated;
  }

  async deleteRateLimitRule(id, adminUser, ipAddress) {
    const current = await db('rate_limit_rules').where({ id }).first();
    if (!current) {
      const error = new Error('Aturan rate limit tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('rate_limit_rules').where({ id }).delete();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'api_clients',
      action: 'delete_rate_limit_rule',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: null,
      occurred_at: db.fn.now()
    });

    return true;
  }
}

module.exports = new ApiClientsService();
