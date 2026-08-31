/**
 * Quality Controller Implementation
 */
const qualityService = require('./service');
const { getSchoolUnitId, getUserId } = require('../utils/crossModuleHelper');

class QualityController {
  // KPI
  async listIndicators(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listIndicators(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar indikator mutu berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getIndicatorById(req, res, next) {
    try {
      const data = await qualityService.getIndicatorById(req.params.id);
      res.json({ success: true, data, message: 'Detail indikator mutu berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createIndicator(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await qualityService.createIndicator({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Indikator mutu berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateIndicator(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.updateIndicator(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Indikator mutu berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteIndicator(req, res, next) {
    try {
      const data = await qualityService.deleteIndicator(req.params.id);
      res.json({ success: true, data, message: 'Indikator mutu berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listAchievements(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listAchievements(req.params.id, schoolUnitId);
      res.json({ success: true, data, message: 'Riwayat capaian indikator berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async recordAchievement(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await qualityService.recordAchievement(
        req.params.id,
        { ...req.body, school_unit_id: schoolUnitId },
        userId
      );
      res.status(201).json({ success: true, data, message: 'Capaian indikator berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async verifyAchievement(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.verifyAchievement(req.params.id, req.body.verification_status, userId);
      res.json({ success: true, data, message: 'Status verifikasi capaian berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getKpiDashboard(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.getKpiDashboard(schoolUnitId, req.query.period);
      res.json({ success: true, data, message: 'Dashboard KPI mutu berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Sasaran Mutu (#8)
  async listQualityGoals(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listQualityGoals(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar sasaran mutu berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getQualityGoalById(req, res, next) {
    try {
      const data = await qualityService.getQualityGoalById(req.params.id);
      res.json({ success: true, data, message: 'Detail sasaran mutu berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createQualityGoal(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await qualityService.createQualityGoal({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Sasaran mutu berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateQualityGoal(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.updateQualityGoal(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Sasaran mutu berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteQualityGoal(req, res, next) {
    try {
      const data = await qualityService.deleteQualityGoal(req.params.id);
      res.json({ success: true, data, message: 'Sasaran mutu berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Evadir
  async listSelfEvaluations(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listSelfEvaluations(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar evaluasi diri sekolah berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createSelfEvaluation(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await qualityService.createSelfEvaluation({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Evadir berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateSelfEvaluation(req, res, next) {
    try {
      const data = await qualityService.updateSelfEvaluation(req.params.id, req.body);
      res.json({ success: true, data, message: 'Evadir berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async submitSelfEvaluation(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.submitSelfEvaluation(req.params.id, userId);
      res.json({ success: true, data, message: 'Evadir berhasil diajukan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Akreditasi
  async listAccreditationReports(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listAccreditationReports(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar laporan akreditasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createAccreditationReport(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.createAccreditationReport({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Standar akreditasi berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listEvidences(req, res, next) {
    try {
      const data = await qualityService.listEvidences(req.params.id);
      res.json({ success: true, data, message: 'Daftar bukti akreditasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async uploadEvidence(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.uploadEvidence(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data, message: 'Bukti akreditasi berhasil diunggah', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async generateSummary(req, res, next) {
    try {
      const data = await qualityService.generateSummary(req.params.id);
      res.json({ success: true, data, message: 'Ringkasan akreditasi berhasil di-generate', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Dashboard Agregat
  async getCrossAppDashboard(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.getCrossAppDashboard(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Dashboard agregat lintas aplikasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async triggerSnapshot(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.generateCrossAppSnapshot(schoolUnitId);
      res.status(201).json({ success: true, data, message: 'Snapshot agregat lintas aplikasi berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  // Risiko (#202 & Fitur 9)
  async listRisks(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.listRisks(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar risiko sekolah berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRiskHeatmap(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await qualityService.getRiskHeatmapData(schoolUnitId);
      res.json({ success: true, data, message: 'Peta risiko heatmap 5x5 berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getRiskById(req, res, next) {
    try {
      const data = await qualityService.getRiskById(req.params.id);
      res.json({ success: true, data, message: 'Detail risiko berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createRisk(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id !== undefined ? req.body.school_unit_id : getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await qualityService.createRisk({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Risiko sekolah berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRisk(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.updateRisk(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Detail risiko berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRiskMitigation(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await qualityService.updateRiskMitigation(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Rencana mitigasi dan residual risk berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateRiskStatus(req, res, next) {
    try {
      const data = await qualityService.updateRiskStatus(req.params.id, req.body.status);
      res.json({ success: true, data, message: 'Status risiko berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteRisk(req, res, next) {
    try {
      const data = await qualityService.deleteRisk(req.params.id);
      res.json({ success: true, data, message: 'Risiko berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QualityController();
