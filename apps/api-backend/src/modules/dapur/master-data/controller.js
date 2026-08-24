/**
 * Dapur Master Data Controller Implementation
 */
const masterDataService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createIngredientSchema,
  updateIngredientSchema,
  createUnitSchema,
  createUnitConversionSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createStudentGroupSchema,
  createOperationalCalendarSchema,
  updateSystemParameterSchema,
  createMasterDataSchema,
  updateMasterDataSchema,
} = require('./validators');

class MasterDataController {
  // 1. Ingredients
  async listIngredients(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listIngredients(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar bahan baku berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getIngredientById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.getIngredientById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail bahan baku berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createIngredient(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createIngredientSchema.parse(req.body);
      const data = await masterDataService.createIngredient(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Bahan baku berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateIngredient(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateIngredientSchema.parse(req.body);
      const data = await masterDataService.updateIngredient(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Bahan baku berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deactivateIngredient(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.deactivateIngredient(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Bahan baku berhasil dinonaktifkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 2. Units & Conversions
  async listUnits(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listUnits(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar satuan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createUnit(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createUnitSchema.parse(req.body);
      const data = await masterDataService.createUnit(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Satuan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listUnitConversions(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listUnitConversions(schoolUnitId);
      res.json({ success: true, data, message: 'Daftar konversi satuan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createUnitConversion(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createUnitConversionSchema.parse(req.body);
      const data = await masterDataService.createUnitConversion(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Konversi satuan berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 3. Suppliers
  async listSuppliers(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listSuppliers(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar supplier berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getSupplierById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.getSupplierById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail supplier berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createSupplier(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createSupplierSchema.parse(req.body);
      const data = await masterDataService.createSupplier(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Supplier berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateSupplier(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateSupplierSchema.parse(req.body);
      const data = await masterDataService.updateSupplier(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Supplier berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 4. Student Groups
  async listStudentGroups(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listStudentGroups(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar kelompok santri berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createStudentGroup(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createStudentGroupSchema.parse(req.body);
      const data = await masterDataService.createStudentGroup(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Kelompok santri berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 5. Operational Calendar
  async listOperationalCalendar(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listOperationalCalendar(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Kalender operasional dapur berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async setOperationalCalendar(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createOperationalCalendarSchema.parse(req.body);
      const data = await masterDataService.setOperationalCalendar(schoolUnitId, parsed);
      res.status(200).json({ success: true, data, message: 'Kalender operasional berhasil disimpan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 6. System Parameters
  async getSystemParameters(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.getSystemParameters(schoolUnitId);
      res.json({ success: true, data, message: 'Parameter sistem dapur berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateSystemParameter(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateSystemParameterSchema.parse(req.body);
      const data = await masterDataService.updateSystemParameter(schoolUnitId, parsed);
      res.json({ success: true, data, message: 'Parameter sistem berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // 7. Generic Master Data
  async listMasterData(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.listMasterData(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Master data berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getMasterDataById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await masterDataService.getMasterDataById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail master data berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createMasterData(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createMasterDataSchema.parse(req.body);
      const data = await masterDataService.createMasterData(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Master data berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateMasterData(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateMasterDataSchema.parse(req.body);
      const data = await masterDataService.updateMasterData(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Master data berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MasterDataController();
