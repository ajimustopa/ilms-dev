/**
 * Consumables Service Implementation
 * Modul Sarpras: Bahan Habis Pakai (Items, Mutations, Stock Opname)
 */
const db = require('../../../config/db/sarpras');
const { validateUser } = require('../utils/crossModuleHelper');

class ConsumablesService {
  // ==========================================
  // 1. Consumable Items (Master Bahan Habis Pakai)
  // ==========================================
  async listItems(schoolUnitId, query = {}) {
    let q = db('consumable_items').where({ school_unit_id: schoolUnitId });

    if (query.category) {
      q = q.where('category', query.category);
    }
    if (query.search) {
      const s = `%${query.search.trim()}%`;
      q = q.where(b => b.where('name', 'like', s).orWhere('item_code', 'like', s));
    }

    return q.orderBy('id', 'asc');
  }

  async listLowStock(schoolUnitId) {
    return db('consumable_items')
      .where({ school_unit_id: schoolUnitId })
      .whereRaw('current_stock <= minimum_stock')
      .orderBy('current_stock', 'asc');
  }

  async getItemById(schoolUnitId, id) {
    const item = await db('consumable_items')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!item) {
      const err = new Error('Bahan habis pakai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return item;
  }

  async createItem(schoolUnitId, payload) {
    const existing = await db('consumable_items')
      .where({ school_unit_id: schoolUnitId, item_code: payload.item_code })
      .first();

    if (existing) {
      const err = new Error(`Kode barang '${payload.item_code}' sudah digunakan pada satuan pendidikan ini`);
      err.statusCode = 409;
      throw err;
    }

    const [id] = await db('consumable_items').insert({
      school_unit_id: schoolUnitId,
      item_code: payload.item_code,
      name: payload.name,
      unit: payload.unit,
      category: payload.category || null,
      minimum_stock: payload.minimum_stock !== undefined ? Number(payload.minimum_stock) : 0,
      current_stock: payload.current_stock !== undefined ? Number(payload.current_stock) : 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.getItemById(schoolUnitId, id);
  }

  async updateItem(schoolUnitId, id, payload) {
    await this.getItemById(schoolUnitId, id);
    const updateData = { ...payload, updated_at: new Date() };
    delete updateData.id;
    delete updateData.school_unit_id;

    await db('consumable_items').where({ id, school_unit_id: schoolUnitId }).update(updateData);
    return this.getItemById(schoolUnitId, id);
  }

  async deleteItem(schoolUnitId, id) {
    await this.getItemById(schoolUnitId, id);
    const hasMutations = await db('consumable_stock_mutations').where({ consumable_item_id: id }).first();
    if (hasMutations) {
      const err = new Error('Barang tidak dapat dihapus karena sudah memiliki riwayat mutasi stok');
      err.statusCode = 409;
      throw err;
    }
    await db('consumable_items').where({ id, school_unit_id: schoolUnitId }).delete();
    return { message: 'Item bahan habis pakai berhasil dihapus' };
  }

  // ==========================================
  // 2. Stock Mutations (In / Out)
  // ==========================================
  async stockIn(schoolUnitId, id, payload, mutatedByUserId) {
    const item = await this.getItemById(schoolUnitId, id);
    await validateUser(mutatedByUserId);
    const qty = Number(payload.quantity);

    return db.transaction(async (trx) => {
      // 1. Catat ke consumable_stock_mutations (append-only)
      const [mutationId] = await trx('consumable_stock_mutations').insert({
        consumable_item_id: id,
        school_unit_id: schoolUnitId,
        mutation_type: 'in',
        quantity: qty,
        reference_type: payload.reference_type || 'procurement',
        reference_id: payload.reference_id || null,
        facility_room_id: payload.facility_room_id || null,
        mutated_by: mutatedByUserId,
        notes: payload.notes || null,
        occurred_at: new Date()
      });

      // 2. Update current_stock
      const newStock = Number(item.current_stock) + qty;
      await trx('consumable_items').where({ id, school_unit_id: schoolUnitId }).update({
        current_stock: newStock,
        updated_at: new Date()
      });

      const updatedItem = await trx('consumable_items').where({ id }).first();
      return {
        mutation_id: mutationId,
        item: updatedItem,
        message: 'Stok masuk berhasil dicatat'
      };
    });
  }

  async stockOut(schoolUnitId, id, payload, mutatedByUserId) {
    const item = await this.getItemById(schoolUnitId, id);
    await validateUser(mutatedByUserId);
    const qty = Number(payload.quantity);

    if (Number(item.current_stock) < qty) {
      const err = new Error(`Stok saat ini (${item.current_stock} ${item.unit}) tidak mencukupi untuk pengeluaran sebesar ${qty} ${item.unit}`);
      err.statusCode = 400;
      throw err;
    }

    return db.transaction(async (trx) => {
      // 1. Catat ke consumable_stock_mutations (append-only)
      const [mutationId] = await trx('consumable_stock_mutations').insert({
        consumable_item_id: id,
        school_unit_id: schoolUnitId,
        mutation_type: 'out',
        quantity: qty,
        reference_type: payload.reference_type || 'usage',
        reference_id: payload.reference_id || null,
        facility_room_id: payload.facility_room_id || null,
        mutated_by: mutatedByUserId,
        notes: payload.notes || null,
        occurred_at: new Date()
      });

      // 2. Update current_stock
      const newStock = Number(item.current_stock) - qty;
      await trx('consumable_items').where({ id, school_unit_id: schoolUnitId }).update({
        current_stock: newStock,
        updated_at: new Date()
      });

      const updatedItem = await trx('consumable_items').where({ id }).first();
      return {
        mutation_id: mutationId,
        item: updatedItem,
        message: 'Stok keluar berhasil dicatat'
      };
    });
  }

  async listMutations(schoolUnitId, id) {
    await this.getItemById(schoolUnitId, id);
    return db('consumable_stock_mutations')
      .leftJoin('facility_rooms', 'consumable_stock_mutations.facility_room_id', 'facility_rooms.id')
      .where('consumable_stock_mutations.consumable_item_id', id)
      .where('consumable_stock_mutations.school_unit_id', schoolUnitId)
      .select(
        'consumable_stock_mutations.*',
        'facility_rooms.room_name'
      )
      .orderBy('consumable_stock_mutations.occurred_at', 'desc');
  }

  // ==========================================
  // 3. Stock Opnames
  // ==========================================
  async listOpnames(schoolUnitId, query = {}) {
    let q = db('consumable_stock_opnames')
      .where({ school_unit_id: schoolUnitId });

    if (query.status) {
      q = q.where('status', query.status);
    }
    if (query.date) {
      q = q.where('opname_date', query.date);
    }

    return q.orderBy('id', 'desc');
  }

  async createOpname(schoolUnitId, payload, conductedByUserId) {
    await validateUser(conductedByUserId);

    return db.transaction(async (trx) => {
      // 1. Insert header opname
      const [opnameId] = await trx('consumable_stock_opnames').insert({
        school_unit_id: schoolUnitId,
        opname_date: payload.opname_date,
        conducted_by: conductedByUserId,
        status: 'draft',
        notes: payload.notes || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // 2. Ambil semua item aktif di school_unit_id dan snapshot system_stock
      const items = await trx('consumable_items').where({ school_unit_id: schoolUnitId });
      if (items.length > 0) {
        const opnameItems = items.map(item => ({
          stock_opname_id: opnameId,
          consumable_item_id: item.id,
          system_stock: Number(item.current_stock),
          physical_stock: Number(item.current_stock),
          difference: 0,
          notes: null,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await trx('consumable_stock_opname_items').insert(opnameItems);
      }

      return this.getOpnameById(schoolUnitId, opnameId, trx);
    });
  }

  async getOpnameById(schoolUnitId, id, customDb = db) {
    const opname = await customDb('consumable_stock_opnames')
      .where({ id, school_unit_id: schoolUnitId })
      .first();

    if (!opname) {
      const err = new Error('Sesi stock opname tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const items = await customDb('consumable_stock_opname_items')
      .join('consumable_items', 'consumable_stock_opname_items.consumable_item_id', 'consumable_items.id')
      .where('consumable_stock_opname_items.stock_opname_id', id)
      .select(
        'consumable_stock_opname_items.*',
        'consumable_items.item_code',
        'consumable_items.name as item_name',
        'consumable_items.unit as item_unit',
        'consumable_items.category as item_category'
      )
      .orderBy('consumable_stock_opname_items.id', 'asc');

    return { ...opname, items };
  }

  async updateOpnameItems(schoolUnitId, id, payload) {
    const opname = await this.getOpnameById(schoolUnitId, id);
    if (opname.status !== 'draft') {
      const err = new Error('Item opname hanya dapat diubah selama sesi berstatus draft');
      err.statusCode = 400;
      throw err;
    }

    return db.transaction(async (trx) => {
      for (const itemInput of payload.items) {
        const existingItem = await trx('consumable_stock_opname_items')
          .where({ stock_opname_id: id, consumable_item_id: itemInput.consumable_item_id })
          .first();

        if (existingItem) {
          const phys = Number(itemInput.physical_stock);
          const sys = Number(existingItem.system_stock);
          const diff = phys - sys;

          await trx('consumable_stock_opname_items')
            .where({ id: existingItem.id })
            .update({
              physical_stock: phys,
              difference: diff,
              notes: itemInput.notes !== undefined ? itemInput.notes : existingItem.notes,
              updated_at: new Date()
            });
        }
      }

      return this.getOpnameById(schoolUnitId, id, trx);
    });
  }

  async finalizeOpname(schoolUnitId, id, finalizedByUserId) {
    const opname = await this.getOpnameById(schoolUnitId, id);
    if (opname.status !== 'draft') {
      const err = new Error('Sesi stock opname ini sudah difinalisasi sebelumnya');
      err.statusCode = 400;
      throw err;
    }

    await validateUser(finalizedByUserId);

    return db.transaction(async (trx) => {
      const items = await trx('consumable_stock_opname_items').where({ stock_opname_id: id });

      for (const item of items) {
        const diff = Number(item.difference);
        const phys = Number(item.physical_stock);

        // Jika terdapat selisih difference != 0, catat baris mutasi stok dengan reference_type = 'opname'
        if (diff !== 0) {
          const mutationType = diff > 0 ? 'in' : 'out';
          const mutationQty = Math.abs(diff);

          await trx('consumable_stock_mutations').insert({
            consumable_item_id: item.consumable_item_id,
            school_unit_id: schoolUnitId,
            mutation_type: mutationType,
            quantity: mutationQty,
            reference_type: 'opname',
            reference_id: id,
            mutated_by: finalizedByUserId,
            notes: `Penyesuaian stok dari Stock Opname #${id} (Selisih: ${diff > 0 ? '+' : ''}${diff})`,
            occurred_at: new Date()
          });
        }

        // Update current_stock di consumable_items sesuai physical_stock
        await trx('consumable_items')
          .where({ id: item.consumable_item_id, school_unit_id: schoolUnitId })
          .update({
            current_stock: phys,
            updated_at: new Date()
          });
      }

      // Update status opname header menjadi 'final'
      await trx('consumable_stock_opnames')
        .where({ id, school_unit_id: schoolUnitId })
        .update({
          status: 'final',
          updated_at: new Date()
        });

      const finalizedOpname = await this.getOpnameById(schoolUnitId, id, trx);
      return {
        opname: finalizedOpname,
        message: 'Stock opname berhasil difinalisasi dan stok barang telah diperbarui'
      };
    });
  }
}

module.exports = new ConsumablesService();
