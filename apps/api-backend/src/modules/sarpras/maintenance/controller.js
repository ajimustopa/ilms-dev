/**
 * Maintenance Controller Implementation
 */
const maintenanceService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');
const {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  closeMaintenanceSchema
} = require('./validators');

class MaintenanceController {
  async listRequests(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await maintenanceService.listRequests(schoolUnitId, req.user, req.query);
      res.json({ success: true, data, message: 'Daftar laporan kerusakan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await maintenanceService.getRequestById(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: 'Detail laporan kerusakan berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = createMaintenanceSchema.parse(req.body);
      const data = await maintenanceService.createRequest(schoolUnitId, parsed);
      res.status(201).json({ success: true, data, message: 'Laporan kerusakan berhasil dikirim', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRequest(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = updateMaintenanceSchema.parse(req.body);
      const data = await maintenanceService.updateRequest(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: 'Laporan kerusakan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async closeRequest(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const parsed = closeMaintenanceSchema.parse(req.body || {});
      const data = await maintenanceService.closeRequest(schoolUnitId, req.params.id, parsed);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MaintenanceController();
