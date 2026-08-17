/**
 * System Settings Service Implementation
 * Fitur #8: Pengaturan Sistem (Site Settings & Multi-Unit Override)
 */
const db = require('../../config/database');

class SystemSettingsService {
  async listSettings(query = {}) {
    let baseQuery = db('system_settings');

    if (query.school_unit_id !== undefined && query.school_unit_id !== 'all') {
      if (query.school_unit_id === 'global' || query.school_unit_id === null || query.school_unit_id === '') {
        baseQuery = baseQuery.whereNull('school_unit_id');
      } else {
        baseQuery = baseQuery.where('school_unit_id', query.school_unit_id);
      }
    }

    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('setting_key', 'like', `%${query.search}%`)
          .orWhere('description', 'like', `%${query.search}%`);
      });
    }

    return baseQuery.orderBy('setting_key', 'asc');
  }

  async getSettingByKey(key, schoolUnitId = null) {
    if (schoolUnitId) {
      const override = await db('system_settings')
        .where({ setting_key: key, school_unit_id: schoolUnitId })
        .first();
      if (override) return override;
    }

    const globalSetting = await db('system_settings')
      .where({ setting_key: key })
      .whereNull('school_unit_id')
      .first();

    if (!globalSetting) {
      const error = new Error(`Setting key '${key}' tidak ditemukan`);
      error.statusCode = 404;
      throw error;
    }

    return globalSetting;
  }

  async createSetting(payload, adminUser, ipAddress) {
    if (!payload.setting_key || payload.setting_value === undefined) {
      const error = new Error("Field 'setting_key' dan 'setting_value' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const unitId = payload.school_unit_id ? Number(payload.school_unit_id) : null;

    let existingQuery = db('system_settings').where({ setting_key: payload.setting_key.trim() });
    if (unitId) {
      existingQuery = existingQuery.where({ school_unit_id: unitId });
    } else {
      existingQuery = existingQuery.whereNull('school_unit_id');
    }

    const existing = await existingQuery.first();
    if (existing) {
      const error = new Error(`Setting key '${payload.setting_key}' sudah terdaftar untuk scope ini`);
      error.statusCode = 409;
      throw error;
    }

    const [id] = await db('system_settings').insert({
      school_unit_id: unitId,
      setting_key: payload.setting_key.trim(),
      setting_value: String(payload.setting_value),
      description: payload.description ? payload.description.trim() : null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newSetting = await db('system_settings').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: unitId,
      application: 'core',
      module: 'system_settings',
      action: 'create',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(newSetting),
      occurred_at: db.fn.now()
    });

    return newSetting;
  }

  async updateSetting(id, payload, adminUser, ipAddress) {
    const current = await db('system_settings').where({ id }).first();
    if (!current) {
      const error = new Error('Pengaturan sistem tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      setting_value: payload.setting_value !== undefined ? String(payload.setting_value) : current.setting_value,
      description: payload.description !== undefined ? payload.description : current.description,
      updated_at: db.fn.now()
    };

    await db('system_settings').where({ id }).update(updateData);
    const updated = await db('system_settings').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: current.school_unit_id,
      application: 'core',
      module: 'system_settings',
      action: 'update',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: JSON.stringify(updated),
      occurred_at: db.fn.now()
    });

    return updated;
  }

  async deleteSetting(id, adminUser, ipAddress) {
    const current = await db('system_settings').where({ id }).first();
    if (!current) {
      const error = new Error('Pengaturan sistem tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('system_settings').where({ id }).delete();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: current.school_unit_id,
      application: 'core',
      module: 'system_settings',
      action: 'delete',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(current),
      data_after: null,
      occurred_at: db.fn.now()
    });

    return true;
  }
}

module.exports = new SystemSettingsService();
