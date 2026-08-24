/**
 * Report Cards Controller Implementation
 * Modul Akademik - Fitur 4: Rapor Siswa
 */
const reportCardsService = require('./service');

class ReportCardsController {
  async list(req, res, next) {
    try {
      const data = await reportCardsService.listReportCards(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar rapor berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await reportCardsService.getReportCardById(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail rapor siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async generate(req, res, next) {
    try {
      const data = await reportCardsService.generateReportCards(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Rapor berhasil digenerate',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateNote(req, res, next) {
    try {
      const data = await reportCardsService.updateNote(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Catatan wali kelas berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportCardsController();
