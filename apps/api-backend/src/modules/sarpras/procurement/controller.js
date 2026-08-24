/**
 * Procurement Controller Implementation
 */
const procurementService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createVendorSchema,
  updateVendorSchema,
  createProcurementSchema,
  updateFinanceReferenceSchema
} = require('./validators');

class ProcurementController {
  // Vendors
  async listVendors(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.listVendors(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar vendor berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getVendorById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.getVendorById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail vendor berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createVendor(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createVendorSchema.parse(req.body);
      const data = await procurementService.createVendor(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Vendor berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateVendor(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateVendorSchema.parse(req.body);
      const data = await procurementService.updateVendor(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Vendor berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteVendor(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.deleteVendor(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Procurements
  async listProcurements(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.listProcurements(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar pengadaan barang berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getProcurementById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.getProcurementById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail pengadaan barang berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createProcurement(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createProcurementSchema.parse(req.body);
      const userId = req.user.id;
      const data = await procurementService.createProcurement(schoolUnitId, parsed, userId);
      res.status(201).json({ success: true, data, message: 'Pengadaan barang berhasil diajukan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveProcurement(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = req.user.id;
      const data = await procurementService.approveProcurement(schoolUnitId, req.params.id, userId);
      res.json({ success: true, data, message: 'Pengadaan barang berhasil disetujui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async receiveProcurement(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await procurementService.receiveProcurement(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Barang pengadaan berhasil ditandai diterima', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Internal Service-to-Service: Keuangan
  async updateFinanceReference(req, res, next) {
    try {
      const parsed = updateFinanceReferenceSchema.parse(req.body);
      const data = await procurementService.updateFinanceReference(req.params.id, parsed);
      res.json({ success: true, data, message: 'Referensi transaksi keuangan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProcurementController();
