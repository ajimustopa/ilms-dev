/**
 * School Units Service Implementation
 * Fitur #7: CRUD Satuan Pendidikan & school_unit_status_history
 */
const db = require('../../config/database');

class SchoolUnitsService {
  async listSchoolUnits(query = {}) {
    let baseQuery = db('school_units');

    if (query.level && query.level !== 'all') {
      baseQuery = baseQuery.where('level', query.level);
    }
    if (query.is_active !== undefined && query.is_active !== 'all') {
      baseQuery = baseQuery.where('is_active', query.is_active === 'true' || query.is_active === true || query.is_active === 1);
    }
    if (query.search) {
      baseQuery = baseQuery.where((builder) => {
        builder.where('name', 'like', `%${query.search}%`)
          .orWhere('npsn', 'like', `%${query.search}%`);
      });
    }

    const items = await baseQuery.orderBy('id', 'asc');
    return {
      items,
      pagination: {
        current_page: 1,
        per_page: items.length,
        total_items: items.length,
        total_pages: 1
      }
    };
  }

  async getSchoolUnitById(id) {
    const unit = await db('school_units').where({ id }).first();
    if (!unit) {
      const error = new Error('Satuan pendidikan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return unit;
  }

  async createSchoolUnit(payload, adminUser, ipAddress) {
    if (!payload.name || !payload.level) {
      const error = new Error("Field 'name' dan 'level' wajib diisi");
      error.statusCode = 422;
      throw error;
    }

    const foundation = await db('foundation_profiles').first();
    const foundationId = foundation ? foundation.id : 1;

    const [id] = await db('school_units').insert({
      foundation_id: foundationId,
      name: payload.name.trim(),
      level: payload.level.trim(),
      npsn: payload.npsn ? payload.npsn.trim() : null,
      address: payload.address || null,
      principal_name: payload.principal_name || null,
      phone_number: payload.phone_number || null,
      website: payload.website || null,
      email: payload.email || null,
      operating_license: payload.operating_license || null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newUnit = await db('school_units').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: id,
      application: 'core',
      module: 'school_units',
      action: 'create',
      ip_address: ipAddress || null,
      data_before: null,
      data_after: JSON.stringify(newUnit),
      occurred_at: db.fn.now()
    });

    return newUnit;
  }

  async updateSchoolUnit(id, payload, adminUser, ipAddress) {
    const currentUnit = await db('school_units').where({ id }).first();
    if (!currentUnit) {
      const error = new Error('Satuan pendidikan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {
      name: payload.name !== undefined ? payload.name.trim() : currentUnit.name,
      level: payload.level !== undefined ? payload.level.trim() : currentUnit.level,
      npsn: payload.npsn !== undefined ? (payload.npsn ? payload.npsn.trim() : null) : currentUnit.npsn,
      address: payload.address !== undefined ? payload.address : currentUnit.address,
      principal_name: payload.principal_name !== undefined ? payload.principal_name : currentUnit.principal_name,
      phone_number: payload.phone_number !== undefined ? payload.phone_number : currentUnit.phone_number,
      website: payload.website !== undefined ? payload.website : currentUnit.website,
      email: payload.email !== undefined ? payload.email : currentUnit.email,
      operating_license: payload.operating_license !== undefined ? payload.operating_license : currentUnit.operating_license,
      updated_at: db.fn.now()
    };

    await db('school_units').where({ id }).update(updateData);
    const updatedUnit = await db('school_units').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: id,
      application: 'core',
      module: 'school_units',
      action: 'update',
      ip_address: ipAddress || null,
      data_before: JSON.stringify(currentUnit),
      data_after: JSON.stringify(updatedUnit),
      occurred_at: db.fn.now()
    });

    return updatedUnit;
  }

  async updateSchoolUnitStatus(id, { is_active, reason }, adminUser, ipAddress) {
    const currentUnit = await db('school_units').where({ id }).first();
    if (!currentUnit) {
      const error = new Error('Satuan pendidikan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = is_active === true || is_active === 'true' || is_active === 1;

    await db('school_units').where({ id }).update({
      is_active: newStatus,
      updated_at: db.fn.now()
    });

    // Catat ke school_unit_status_history
    await db('school_unit_status_history').insert({
      school_unit_id: id,
      new_status: newStatus,
      reason: reason || 'Perubahan status operasional oleh admin',
      changed_by: adminUser?.id || 1,
      changed_at: db.fn.now()
    });

    const updatedUnit = await db('school_units').where({ id }).first();

    await db('activity_logs').insert({
      log_type: 'admin_action',
      user_id: adminUser?.id || null,
      school_unit_id: id,
      application: 'core',
      module: 'school_units',
      action: 'toggle_status',
      ip_address: ipAddress || null,
      data_before: JSON.stringify({ is_active: currentUnit.is_active }),
      data_after: JSON.stringify({ is_active: newStatus, reason }),
      occurred_at: db.fn.now()
    });

    return updatedUnit;
  }

  async getStatusHistory(id) {
    let query = db('school_unit_status_history')
      .join('users', 'school_unit_status_history.changed_by', 'users.id')
      .join('school_units', 'school_unit_status_history.school_unit_id', 'school_units.id')
      .select(
        'school_unit_status_history.id',
        'school_unit_status_history.school_unit_id',
        'school_units.name as school_name',
        'school_unit_status_history.new_status',
        'school_unit_status_history.reason',
        'school_unit_status_history.changed_by',
        'users.full_name as changed_by_name',
        'school_unit_status_history.changed_at'
      )
      .orderBy('school_unit_status_history.changed_at', 'desc');

    if (id) {
      query = query.where('school_unit_status_history.school_unit_id', id);
    }

    return query;
  }
}

module.exports = new SchoolUnitsService();
