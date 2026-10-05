const vendorsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class VendorsController {
  async listVendors(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorsService.listVendors(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getVendorById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorsService.getVendorById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Vendor tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createVendor(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { vendor_name } = req.body;
      if (!vendor_name) {
        return res.status(422).json({ success: false, data: null, message: 'vendor_name wajib diisi', errors: null });
      }
      const data = await vendorsService.createVendor(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Vendor berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateVendor(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorsService.updateVendor(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Vendor tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Vendor berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { status, reason, status_note } = req.body;
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(422).json({ success: false, data: null, message: 'status harus active atau inactive', errors: null });
      }
      const data = await vendorsService.updateStatus(schoolUnitId, req.params.id, {
        status,
        status_note: status_note || reason || null
      }, req.user || {});
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Vendor tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: `Status vendor berhasil diubah menjadi ${status === 'active' ? 'Aktif' : 'Non-Aktif'}`, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listStatusHistories(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorsService.listStatusHistories(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Riwayat status vendor berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VendorsController();
