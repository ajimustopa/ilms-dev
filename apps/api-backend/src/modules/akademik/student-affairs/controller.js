/**
 * Student Affairs Controller Implementation
 * Modul Akademik - Fitur 6: Kesiswaan, Kejadian Siswa Terpadu, & BK
 */
const studentAffairsService = require('./service');

class StudentAffairsController {
  // ==========================================
  // Master Kategori Kejadian (Incident Categories)
  // ==========================================
  async listIncidentCategories(req, res, next) {
    try {
      const data = await studentAffairsService.listIncidentCategories(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar kategori kejadian siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createIncidentCategory(req, res, next) {
    try {
      const data = await studentAffairsService.createIncidentCategory(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Kategori kejadian siswa berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateIncidentCategory(req, res, next) {
    try {
      const data = await studentAffairsService.updateIncidentCategory(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Kategori kejadian siswa berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Buku Catatan Kejadian Siswa (Student Incidents)
  // ==========================================
  async listIncidents(req, res, next) {
    try {
      const data = await studentAffairsService.listIncidents(req.query, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar catatan kejadian siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncidentById(req, res, next) {
    try {
      const data = await studentAffairsService.getIncidentById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Detail catatan kejadian siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createIncident(req, res, next) {
    try {
      const data = await studentAffairsService.createIncident(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Catatan kejadian siswa berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateIncident(req, res, next) {
    try {
      const data = await studentAffairsService.updateIncident(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Catatan kejadian siswa berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateHandlingStatus(req, res, next) {
    try {
      const data = await studentAffairsService.updateHandlingStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Status penanganan kejadian siswa berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyIncidentPoints(req, res, next) {
    try {
      const data = await studentAffairsService.verifyIncidentPoints(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Poin kejadian siswa berhasil diverifikasi oleh Kesiswaan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudentIncidentSummary(req, res, next) {
    try {
      const data = await studentAffairsService.getStudentIncidentSummary(req.params.student_id);
      res.status(200).json({
        success: true,
        data,
        message: 'Ringkasan poin & rekam jejak perilaku siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Legacy Disiplin
  // ==========================================
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

  // ==========================================
  // Legacy Prestasi
  // ==========================================
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

  // ==========================================
  // BK
  // ==========================================
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

  // ==========================================
  // Ekskul
  // ==========================================
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

  // ==========================================
  // Kalender
  // ==========================================
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
