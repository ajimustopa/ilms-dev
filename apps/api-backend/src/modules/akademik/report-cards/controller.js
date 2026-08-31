/**
 * Report Cards Controller Implementation
 * Modul Akademik - Fitur: Rapor Siswa, Materialisasi Nilai Akhir Mapel,
 * Input Manual Riwayat Lampau & Impor Excel
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
        message: 'Rapor berhasil digenerate dan dimaterialisasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createLegacyEntry(req, res, next) {
    try {
      const data = await reportCardsService.createLegacyEntry(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: data.message || 'Nilai rapor berhasil disimpan secara manual',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getImportTemplate(req, res, next) {
    try {
      const buffer = await reportCardsService.getImportTemplate(req.query);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="template_import_rapor.xlsx"');
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async importReportCards(req, res, next) {
    try {
      const data = await reportCardsService.importReportCards(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: `Impor nilai rapor selesai: ${data.success_count} baris sukses (${data.created_students_count} siswa baru dibuat, ${data.matched_students_count} siswa cocok), ${data.errors.length} gagal`,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudentReportCardHistory(req, res, next) {
    try {
      const data = await reportCardsService.getStudentReportCardHistory(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Riwayat rapor siswa lintas semester berhasil diambil',
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
