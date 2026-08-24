/**
 * Consumables Controller Implementation
 */
const consumablesService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createConsumableItemSchema,
  updateConsumableItemSchema,
  stockMutationSchema,
  createOpnameSchema,
  updateOpnameItemsSchema
} = require('./validators');

class ConsumablesController {
  // Master Items
  async listItems(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.listItems(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar bahan habis pakai berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listLowStock(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.listLowStock(schoolUnitId);
      res.json({ success: true, data, message: 'Daftar barang dengan stok menipis berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getItemById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.getItemById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail bahan habis pakai berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createItem(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createConsumableItemSchema.parse(req.body);
      const data = await consumablesService.createItem(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Bahan habis pakai berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateConsumableItemSchema.parse(req.body);
      const data = await consumablesService.updateItem(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Bahan habis pakai berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.deleteItem(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Mutations
  async stockIn(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = stockMutationSchema.parse(req.body);
      const userId = req.user.id;
      const data = await consumablesService.stockIn(schoolUnitId, req.params.id, parsed, userId);
      res.status(201).json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async stockOut(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = stockMutationSchema.parse(req.body);
      const userId = req.user.id;
      const data = await consumablesService.stockOut(schoolUnitId, req.params.id, parsed, userId);
      res.status(201).json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listMutations(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.listMutations(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Riwayat mutasi stok berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Stock Opnames
  async listOpnames(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.listOpnames(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar sesi stock opname berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createOpname(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createOpnameSchema.parse(req.body);
      const userId = req.user.id;
      const data = await consumablesService.createOpname(schoolUnitId, parsed, userId);
      res.status(201).json({ success: true, data, message: 'Sesi stock opname berhasil dimulai', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getOpnameById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await consumablesService.getOpnameById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail sesi stock opname berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateOpnameItems(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateOpnameItemsSchema.parse(req.body);
      const data = await consumablesService.updateOpnameItems(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Input fisik stock opname berhasil disimpan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async finalizeOpname(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = req.user.id;
      const data = await consumablesService.finalizeOpname(schoolUnitId, req.params.id, userId);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConsumablesController();
