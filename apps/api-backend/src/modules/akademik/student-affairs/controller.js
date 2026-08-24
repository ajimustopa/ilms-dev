/**
 * Student Affairs Controller Implementation
 * Modul Akademik - Fitur 6: Kesiswaan
 */
const studentAffairsService = require('./service');

class StudentAffairsController {
  // Disiplin
  async listDisciplinaryRecords(req, res, next) {
    try {
      const data = await studentAffairsService.listDisciplinaryRecords(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar catatan pelanggaran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createDisciplinaryRecord(req, res, next) {
    try {
      const data = await studentAffairsService.createDisciplinaryRecord(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Catatan pelanggaran berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Prestasi
  async listAchievements(req, res, next) {
    try {
      const data = await studentAffairsService.listAchievements(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar prestasi siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAchievement(req, res, next) {
    try {
      const data = await studentAffairsService.createAchievement(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Prestasi siswa berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // BK
  async listCounselingRecords(req, res, next) {
    try {
      const data = await studentAffairsService.listCounselingRecords(req.query, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar catatan BK berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCounselingRecord(req, res, next) {
    try {
      const data = await studentAffairsService.createCounselingRecord(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Catatan bimbingan konseling berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Ekskul
  async listExtracurriculars(req, res, next) {
    try {
      const data = await studentAffairsService.listExtracurriculars(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar ekstrakurikuler berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createExtracurricular(req, res, next) {
    try {
      const data = await studentAffairsService.createExtracurricular(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Ekstrakurikuler berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addExtracurricularMember(req, res, next) {
    try {
      const data = await studentAffairsService.addExtracurricularMember(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Anggota ekstrakurikuler berhasil didaftarkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Kalender
  async listCalendarEvents(req, res, next) {
    try {
      const data = await studentAffairsService.listCalendarEvents(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar agenda kalender akademik berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCalendarEvent(req, res, next) {
    try {
      const data = await studentAffairsService.createCalendarEvent(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Agenda kalender akademik berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StudentAffairsController();
