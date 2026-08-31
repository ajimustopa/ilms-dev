/**
 * Calendar Controller
 * Modul Akademik - Handler Kalender Pendidikan
 */
const calendarService = require('./service');

class CalendarController {
  // 1. Kategori Event
  async listCategories(req, res, next) {
    try {
      const data = await calendarService.listCategories(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar kategori kegiatan kalender berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req, res, next) {
    try {
      const data = await calendarService.createCategory(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Kategori kegiatan kalender berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const data = await calendarService.updateCategory(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Kategori kegiatan kalender berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const data = await calendarService.deleteCategory(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Kategori kegiatan kalender berhasil dinonaktifkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Dokumen Versi Kaldik
  async listDocumentVersions(req, res, next) {
    try {
      const data = await calendarService.listDocumentVersions(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar versi dokumen kaldik berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createDocumentVersion(req, res, next) {
    try {
      const data = await calendarService.createDocumentVersion(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Revisi versi baru dokumen kaldik berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async publishDocumentVersion(req, res, next) {
    try {
      const data = await calendarService.publishDocumentVersion(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Dokumen kalender pendidikan resmi diterbitkan & disahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Kegiatan Kalender
  async listCalendarEvents(req, res, next) {
    try {
      const data = await calendarService.listCalendarEvents(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar kegiatan kalender berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCalendarEvent(req, res, next) {
    try {
      const data = await calendarService.createCalendarEvent(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Kegiatan kalender akademik berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCalendarEvent(req, res, next) {
    try {
      const data = await calendarService.updateCalendarEvent(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Kegiatan kalender akademik berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCalendarEvent(req, res, next) {
    try {
      const data = await calendarService.deleteCalendarEvent(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Kegiatan kalender akademik berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. RKT Program Integration
  async getRktPrograms(req, res, next) {
    try {
      const data = await calendarService.getRktPrograms(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Program kerja RKT manajemen berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CalendarController();
