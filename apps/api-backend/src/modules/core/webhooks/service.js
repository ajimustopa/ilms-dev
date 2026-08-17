/**
 * Webhooks Service Implementation
 * Fitur #9: Webhook Publisher & Subscriber Management
 */
const crypto = require('crypto');
const db = require('../../../config/db/core');

class WebhooksService {
  async listEvents(query = {}) {
    let baseQuery = db('webhook_events');
    if (query.event_type) {
      baseQuery = baseQuery.where('event_type', query.event_type);
    }
    return baseQuery.orderBy('id', 'desc').limit(50);
  }

  async getEventById(id) {
    const event = await db('webhook_events').where({ id }).first();
    if (!event) {
      const error = new Error('Webhook event tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const deliveries = await db('webhook_deliveries')
      .join('webhook_subscribers', 'webhook_deliveries.subscriber_id', 'webhook_subscribers.id')
      .where('webhook_deliveries.event_id', id)
      .select(
        'webhook_deliveries.id',
        'webhook_deliveries.subscriber_id',
        'webhook_subscribers.application_name',
        'webhook_deliveries.status',
        'webhook_deliveries.attempt_count',
        'webhook_deliveries.last_attempt_at',
        'webhook_deliveries.response_status_code',
        'webhook_deliveries.response_body',
        'webhook_deliveries.error_message'
      );

    return { ...event, deliveries };
  }

  async retryDelivery(deliveryId, adminUser) {
    const delivery = await db('webhook_deliveries').where({ id: deliveryId }).first();
    if (!delivery) {
      const error = new Error('Delivery webhook tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('webhook_deliveries').where({ id: deliveryId }).update({
      status: 'pending',
      attempt_count: db.raw('attempt_count + 1'),
      last_attempt_at: db.fn.now()
    });

    return { delivery_id: Number(deliveryId), status: 'retrying' };
  }

  async listSubscribers(query = {}) {
    let baseQuery = db('webhook_subscribers');
    if (query.status && query.status !== 'all') {
      baseQuery = baseQuery.where('status', query.status);
    }
    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('application_name', 'like', `%${query.search}%`)
          .orWhere('endpoint_url', 'like', `%${query.search}%`);
      });
    }

    const subscribers = await baseQuery.orderBy('id', 'asc');
    return subscribers.map((s) => ({
      ...s,
      subscribed_events: typeof s.subscribed_events === 'string' ? JSON.parse(s.subscribed_events) : s.subscribed_events
    }));
  }

  async getSubscriberById(id) {
    const sub = await db('webhook_subscribers').where({ id }).first();
    if (!sub) {
      const error = new Error('Subscriber webhook tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return {
      ...sub,
      subscribed_events: typeof sub.subscribed_events === 'string' ? JSON.parse(sub.subscribed_events) : sub.subscribed_events
    };
  }

  async createSubscriber(payload, adminUser, ipAddress) {
    if (!payload.application_name || !payload.endpoint_url) {
      const error = new Error("Field 'application_name' dan 'endpoint_url' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const secretKey = `whsec_${payload.application_name.toLowerCase()}_${crypto.randomBytes(16).toString('hex')}`;
    const events = payload.subscribed_events || ['account.created', 'account.status_changed'];

    const [id] = await db('webhook_subscribers').insert({
      application_name: payload.application_name.trim().toLowerCase(),
      endpoint_url: payload.endpoint_url.trim(),
      subscribed_events: JSON.stringify(events),
      secret_key: secretKey,
      status: payload.status || 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newSub = await this.getSubscriberById(id);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'webhooks',
      action: 'create_subscriber',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(newSub),
      occurred_at: db.fn.now()
    });

    return { ...newSub, secret_key: secretKey };
  }

  async updateSubscriber(id, payload, adminUser, ipAddress) {
    const current = await this.getSubscriberById(id);
    if (!current) {
      const error = new Error('Subscriber webhook tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.endpoint_url) updateData.endpoint_url = payload.endpoint_url.trim();
    if (payload.subscribed_events) updateData.subscribed_events = JSON.stringify(payload.subscribed_events);
    if (payload.status) updateData.status = payload.status;

    await db('webhook_subscribers').where({ id }).update(updateData);
    const updated = await this.getSubscriberById(id);

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'webhooks',
      action: 'update_subscriber',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: JSON.stringify(updated),
      occurred_at: db.fn.now()
    });

    return updated;
  }

  async rotateSecret(id, adminUser, ipAddress) {
    const current = await this.getSubscriberById(id);
    if (!current) {
      const error = new Error('Subscriber webhook tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const newSecretKey = `whsec_${current.application_name}_${crypto.randomBytes(16).toString('hex')}`;

    await db('webhook_subscribers').where({ id }).update({
      secret_key: newSecretKey,
      updated_at: db.fn.now()
    });

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'webhooks',
      action: 'rotate_secret',
      ip_address: ipAddress || null,
      data_before: { subscriber_id: id, rotated: false },
      data_after: { subscriber_id: id, rotated: true },
      occurred_at: db.fn.now()
    });

    return { subscriber_id: Number(id), application_name: current.application_name, new_secret_key: newSecretKey };
  }

  async deleteSubscriber(id, adminUser, ipAddress) {
    const current = await this.getSubscriberById(id);
    if (!current) {
      const error = new Error('Subscriber webhook tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('webhook_deliveries').where({ subscriber_id: id }).delete();
    await db('webhook_subscribers').where({ id }).delete();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      application: 'core',
      module: 'webhooks',
      action: 'delete_subscriber',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: null,
      occurred_at: db.fn.now()
    });

    return true;
  }
}

module.exports = new WebhooksService();
