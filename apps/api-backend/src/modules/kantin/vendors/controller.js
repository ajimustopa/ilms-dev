const vendorsService = require('./service');

class VendorsController {
  async listVendors(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await vendorsService.listVendors(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getVendorById(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
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
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
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
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
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
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { status } = req.body;
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(422).json({ success: false, data: null, message: 'status harus active atau inactive', errors: null });
      }
      const data = await vendorsService.updateStatus(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Vendor tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Status vendor berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VendorsController();
