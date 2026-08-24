/**
 * Scores Controller Implementation
 * Modul Akademik - Fitur 3: Penilaian (Assessment Types, Sessions, Scores & Report Card Processor)
 */
const scoresService = require('./service');

class ScoresController {
  // 1. Jenis Pengujian & Bobot Nilai Rapor
  async listAssessmentTypes(req, res, next) {
    try {
      const data = await scoresService.listAssessmentTypes(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar jenis pengujian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAssessmentType(req, res, next) {
    try {
      const data = await scoresService.createAssessmentType(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Jenis pengujian berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAssessmentType(req, res, next) {
    try {
      const data = await scoresService.updateAssessmentType(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Jenis pengujian berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAssessmentType(req, res, next) {
    try {
      const data = await scoresService.deleteAssessmentType(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Jenis pengujian berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Sesi Penilaian (Assessment Sessions)
  async listAssessmentSessions(req, res, next) {
    try {
      const data = await scoresService.listAssessmentSessions(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar sesi pengujian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAssessmentSession(req, res, next) {
    try {
      const data = await scoresService.createAssessmentSession(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Sesi pengujian berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAssessmentSession(req, res, next) {
    try {
      const data = await scoresService.updateAssessmentSession(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Sesi pengujian berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAssessmentSession(req, res, next) {
    try {
      const data = await scoresService.deleteAssessmentSession(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Sesi pengujian berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Nilai Sesi Ujian (Session Scores)
  async getSessionScores(req, res, next) {
    try {
      const data = await scoresService.getSessionScores(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: 'Data nilai sesi pengujian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async saveSessionScoresBulk(req, res, next) {
    try {
      const data = await scoresService.saveSessionScoresBulk(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Nilai sesi pengujian berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Rekap Matriks Nilai per TP & Jenis Ujian
  async getRecapMatrix(req, res, next) {
    try {
      const data = await scoresService.getRecapMatrix(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Matriks rekap nilai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Pengolahan Nilai Rapor & Deskripsi Capaian TP
  async processReportScores(req, res, next) {
    try {
      const data = await scoresService.processReportScores(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Pengolahan nilai rapor dan deskripsi capaian berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Leger Nilai Kelas
  async getLegerData(req, res, next) {
    try {
      const data = await scoresService.getLegerData(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Data leger nilai kelas berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Legacy Endpoints
  async listScores(req, res, next) {
    try {
      const data = await scoresService.listScores(req.query, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar nilai berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createScore(req, res, next) {
    try {
      const data = await scoresService.createScore(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Nilai berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createScoresBulk(req, res, next) {
    try {
      const data = await scoresService.createScoresBulk(req.body, req.user);
      res.status(201).json({
        success: true,
        data,
        message: 'Input nilai massal berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async calculateFinalScore(req, res, next) {
    try {
      const data = await scoresService.calculateFinalScore(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Kalkulasi nilai akhir otomatis berhasil dilakukan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listAttitudeScores(req, res, next) {
    try {
      const data = await scoresService.listAttitudeScores(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar nilai sikap berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAttitudeScore(req, res, next) {
    try {
      const data = await scoresService.createAttitudeScore(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Nilai sikap berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listTpScores(req, res, next) {
    try {
      const data = await scoresService.listTpScores(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar nilai TP berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async saveTpScoresBulk(req, res, next) {
    try {
      const data = await scoresService.saveTpScoresBulk(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Nilai Tujuan Pembelajaran berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // Penilaian Ekstrakurikuler
  async listExtracurricularScores(req, res, next) {
    try {
      const data = await scoresService.listExtracurricularScores(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Daftar nilai ekstrakurikuler berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getExtracurricularScoringSheet(req, res, next) {
    try {
      const data = await scoresService.getExtracurricularScoringSheet(req.query);
      res.status(200).json({
        success: true,
        data,
        message: 'Lembar penilaian ekstrakurikuler berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async saveExtracurricularScoresBulk(req, res, next) {
    try {
      const data = await scoresService.saveExtracurricularScoresBulk(req.body, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Nilai ekstrakurikuler siswa berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ScoresController();
