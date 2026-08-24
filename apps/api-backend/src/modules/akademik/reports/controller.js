/**
 * Reports Controller Implementation
 * Modul Akademik - Fitur 7: Laporan
 */
const reportsService = require('./service');

class ReportsController {
  async getSummary(req, res, next) {
    try {
      const data = await reportsService.getAcademicSummary(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Ringkasan akademik berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async exportReport(req, res, next) {
    try {
      const data = await reportsService.exportReport(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Ekspor data akademik berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportsController();
