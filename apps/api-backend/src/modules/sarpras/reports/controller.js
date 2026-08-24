/**
 * Reports Controller Implementation
 */
const reportsService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class ReportsController {
  async getAssetConditionReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getAssetConditionReport(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Laporan kondisi aset berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getAssetDepreciationReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getAssetDepreciationReport(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Laporan penyusutan aset berhasil dihitung', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardSummary(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getDashboardSummary(schoolUnitId);
      res.json({ success: true, data, message: 'Ringkasan dashboard Sarpras berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportsController();
