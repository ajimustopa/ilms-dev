/**
 * Reports Controller Implementation
 */
const reportsService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class ReportsController {
  async getCirculationReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getCirculationReport(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Laporan sirkulasi peminjaman berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPopularBooks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getPopularBooks(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar buku terpopuler berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUtilizationReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await reportsService.getUtilizationReport(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Statistik pemanfaatan perpustakaan berhasil diambil',
        errors: null,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportsController();
