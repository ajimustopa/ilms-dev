/**
 * Dapur Master Data Service Implementation
 */
const db = require('../../../config/db-dapur');

class MasterDataService {
  // -------------------------------------------------------------
  // 1. Ingredients (Bahan Baku)
  // -------------------------------------------------------------
  async listIngredients(schoolUnitId, query = {}) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    let qb = db('kitchen_ingredients as i')
      .leftJoin('kitchen_master_data as m', 'i.category_id', 'm.id')
      .leftJoin('kitchen_units as u', 'i.base_unit_id', 'u.id')
      .select(
        'i.*',
        'm.name as category_name',
        'u.name as base_unit_name',
        'u.code as base_unit_code'
      );

    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('i.satuan_pendidikan_id', schoolUnitId).orWhereNull('i.satuan_pendidikan_id');
      });
    }

    if (query.status) {
      qb = qb.where('i.status', query.status);
    }
    if (query.category_id) {
      qb = qb.where('i.category_id', query.category_id);
    }
    if (query.search) {
      qb = qb.where(function () {
        this.where('i.name', 'like', `%${query.search}%`).orWhere('i.code', 'like', `%${query.search}%`);
      });
    }

    const countRes = await qb.clone().clearSelect().count({ total: '*' }).first();
    const total = countRes ? parseInt(countRes.total) : 0;
    const items = await qb.orderBy('i.id', 'asc').limit(limit).offset(offset);

    // Fetch allergens for items
    if (items.length > 0) {
      const ingredientIds = items.map((it) => it.id);
      const allergens = await db('kitchen_ingredient_allergens as ia')
        .join('kitchen_master_data as m', 'ia.allergen_id', 'm.id')
        .whereIn('ia.ingredient_id', ingredientIds)
        .select('ia.ingredient_id', 'm.id as allergen_id', 'm.name as allergen_name');

      const allergenMap = {};
      allergens.forEach((a) => {
        if (!allergenMap[a.ingredient_id]) allergenMap[a.ingredient_id] = [];
        allergenMap[a.ingredient_id].push({ id: a.allergen_id, name: a.allergen_name });
      });

      items.forEach((it) => {
        it.allergens = allergenMap[it.id] || [];
      });
    }

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getIngredientById(schoolUnitId, id) {
    let qb = db('kitchen_ingredients as i')
      .leftJoin('kitchen_master_data as m', 'i.category_id', 'm.id')
      .leftJoin('kitchen_units as u', 'i.base_unit_id', 'u.id')
      .where('i.id', id)
      .select(
        'i.*',
        'm.name as category_name',
        'u.name as base_unit_name',
        'u.code as base_unit_code'
      )
      .first();

    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('i.satuan_pendidikan_id', schoolUnitId).orWhereNull('i.satuan_pendidikan_id');
      });
    }

    const item = await qb;
    if (!item) {
      const err = new Error('Bahan baku tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const allergens = await db('kitchen_ingredient_allergens as ia')
      .join('kitchen_master_data as m', 'ia.allergen_id', 'm.id')
      .where('ia.ingredient_id', id)
      .select('m.id as allergen_id', 'm.name as allergen_name');

    item.allergens = allergens;
    return item;
  }

  async createIngredient(schoolUnitId, data) {
    const { allergen_ids, ...ingredientData } = data;
    if (schoolUnitId && !ingredientData.satuan_pendidikan_id) {
      ingredientData.satuan_pendidikan_id = schoolUnitId;
    }

    const [id] = await db('kitchen_ingredients').insert(ingredientData);

    if (allergen_ids && Array.isArray(allergen_ids) && allergen_ids.length > 0) {
      const allergenInserts = allergen_ids.map((allergen_id) => ({
        ingredient_id: id,
        allergen_id,
        satuan_pendidikan_id: ingredientData.satuan_pendidikan_id || null,
      }));
      await db('kitchen_ingredient_allergens').insert(allergenInserts);
    }

    return this.getIngredientById(schoolUnitId, id);
  }

  async updateIngredient(schoolUnitId, id, data) {
    await this.getIngredientById(schoolUnitId, id);
    const { allergen_ids, ...ingredientData } = data;

    if (Object.keys(ingredientData).length > 0) {
      await db('kitchen_ingredients').where('id', id).update(ingredientData);
    }

    if (allergen_ids && Array.isArray(allergen_ids)) {
      await db('kitchen_ingredient_allergens').where('ingredient_id', id).del();
      if (allergen_ids.length > 0) {
        const allergenInserts = allergen_ids.map((allergen_id) => ({
          ingredient_id: id,
          allergen_id,
          satuan_pendidikan_id: schoolUnitId || null,
        }));
        await db('kitchen_ingredient_allergens').insert(allergenInserts);
      }
    }

    return this.getIngredientById(schoolUnitId, id);
  }

  async deactivateIngredient(schoolUnitId, id) {
    await this.getIngredientById(schoolUnitId, id);
    await db('kitchen_ingredients').where('id', id).update({ status: 'inactive' });
    return this.getIngredientById(schoolUnitId, id);
  }

  // -------------------------------------------------------------
  // 2. Units & Conversions
  // -------------------------------------------------------------
  async listUnits(schoolUnitId, query = {}) {
    let qb = db('kitchen_units').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.unit_type) qb = qb.where('unit_type', query.unit_type);
    if (query.status) qb = qb.where('status', query.status);
    return qb.orderBy('name', 'asc');
  }

  async createUnit(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const [id] = await db('kitchen_units').insert(data);
    return db('kitchen_units').where('id', id).first();
  }

  async listUnitConversions(schoolUnitId) {
    let qb = db('kitchen_unit_conversions as uc')
      .join('kitchen_units as u1', 'uc.from_unit_id', 'u1.id')
      .join('kitchen_units as u2', 'uc.to_unit_id', 'u2.id')
      .select(
        'uc.*',
        'u1.name as from_unit_name',
        'u1.code as from_unit_code',
        'u2.name as to_unit_name',
        'u2.code as to_unit_code'
      );

    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('uc.satuan_pendidikan_id', schoolUnitId).orWhereNull('uc.satuan_pendidikan_id');
      });
    }

    return qb;
  }

  async createUnitConversion(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const [id] = await db('kitchen_unit_conversions').insert(data);
    return db('kitchen_unit_conversions').where('id', id).first();
  }

  // -------------------------------------------------------------
  // 3. Suppliers
  // -------------------------------------------------------------
  async listSuppliers(schoolUnitId, query = {}) {
    let qb = db('kitchen_suppliers').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.status) qb = qb.where('status', query.status);
    if (query.search) {
      qb = qb.where(function () {
        this.where('name', 'like', `%${query.search}%`).orWhere('code', 'like', `%${query.search}%`);
      });
    }
    return qb.orderBy('name', 'asc');
  }

  async getSupplierById(schoolUnitId, id) {
    let qb = db('kitchen_suppliers').where('id', id).first();
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    const supplier = await qb;
    if (!supplier) {
      const err = new Error('Supplier tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return supplier;
  }

  async createSupplier(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const [id] = await db('kitchen_suppliers').insert(data);
    return this.getSupplierById(schoolUnitId, id);
  }

  async updateSupplier(schoolUnitId, id, data) {
    await this.getSupplierById(schoolUnitId, id);
    await db('kitchen_suppliers').where('id', id).update(data);
    return this.getSupplierById(schoolUnitId, id);
  }

  // -------------------------------------------------------------
  // 4. Student Groups
  // -------------------------------------------------------------
  async listStudentGroups(schoolUnitId, query = {}) {
    let qb = db('kitchen_student_groups').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.status) qb = qb.where('status', query.status);
    if (query.group_type) qb = qb.where('group_type', query.group_type);
    return qb.orderBy('name', 'asc');
  }

  async createStudentGroup(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const [id] = await db('kitchen_student_groups').insert(data);
    return db('kitchen_student_groups').where('id', id).first();
  }

  // -------------------------------------------------------------
  // 5. Operational Calendar
  // -------------------------------------------------------------
  async listOperationalCalendar(schoolUnitId, query = {}) {
    let qb = db('kitchen_operational_calendar').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.month && query.year) {
      const start = `${query.year}-${String(query.month).padStart(2, '0')}-01`;
      qb = qb.where('calendar_date', '>=', start);
    }
    return qb.orderBy('calendar_date', 'asc');
  }

  async setOperationalCalendar(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const existing = await db('kitchen_operational_calendar')
      .where('calendar_date', data.calendar_date)
      .first();

    if (existing) {
      await db('kitchen_operational_calendar')
        .where('calendar_date', data.calendar_date)
        .update(data);
      return db('kitchen_operational_calendar').where('calendar_date', data.calendar_date).first();
    } else {
      const [id] = await db('kitchen_operational_calendar').insert(data);
      return db('kitchen_operational_calendar').where('id', id).first();
    }
  }

  // -------------------------------------------------------------
  // 6. System Parameters
  // -------------------------------------------------------------
  async getSystemParameters(schoolUnitId) {
    let qb = db('kitchen_system_parameters').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    return qb.orderBy('param_key', 'asc');
  }

  async updateSystemParameter(schoolUnitId, data) {
    const existing = await db('kitchen_system_parameters')
      .where('param_key', data.param_key)
      .first();

    if (existing) {
      await db('kitchen_system_parameters')
        .where('param_key', data.param_key)
        .update(data);
      return db('kitchen_system_parameters').where('param_key', data.param_key).first();
    } else {
      if (schoolUnitId && !data.satuan_pendidikan_id) {
        data.satuan_pendidikan_id = schoolUnitId;
      }
      const [id] = await db('kitchen_system_parameters').insert(data);
      return db('kitchen_system_parameters').where('id', id).first();
    }
  }

  // -------------------------------------------------------------
  // 7. Generic Master Data (master_type)
  // -------------------------------------------------------------
  async listMasterData(schoolUnitId, query = {}) {
    let qb = db('kitchen_master_data').select('*');
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    if (query.type || query.master_type) {
      qb = qb.where('master_type', query.type || query.master_type);
    }
    if (query.status) {
      qb = qb.where('status', query.status);
    }
    if (query.search) {
      qb = qb.where(function () {
        this.where('name', 'like', `%${query.search}%`).orWhere('code', 'like', `%${query.search}%`);
      });
    }
    return qb.orderBy('name', 'asc');
  }

  async getMasterDataById(schoolUnitId, id) {
    let qb = db('kitchen_master_data').where('id', id).first();
    if (schoolUnitId) {
      qb = qb.where(function () {
        this.where('satuan_pendidikan_id', schoolUnitId).orWhereNull('satuan_pendidikan_id');
      });
    }
    const item = await qb;
    if (!item) {
      const err = new Error('Master data tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return item;
  }

  async createMasterData(schoolUnitId, data) {
    if (schoolUnitId && !data.satuan_pendidikan_id) {
      data.satuan_pendidikan_id = schoolUnitId;
    }
    const [id] = await db('kitchen_master_data').insert(data);
    return this.getMasterDataById(schoolUnitId, id);
  }

  async updateMasterData(schoolUnitId, id, data) {
    await this.getMasterDataById(schoolUnitId, id);
    await db('kitchen_master_data').where('id', id).update(data);
    return this.getMasterDataById(schoolUnitId, id);
  }
}

module.exports = new MasterDataService();
