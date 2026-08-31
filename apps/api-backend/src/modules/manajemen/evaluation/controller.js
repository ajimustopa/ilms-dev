/**
 * Evaluation Controller Implementation
 * Modul Manajemen - Fitur 12: Monitoring, Evaluasi & Tindak Lanjut
 */
const evaluationService = require('./service');
const { getSchoolUnitId, getUserId } = require('../utils/crossModuleHelper');

class EvaluationController {
  async getDashboardMetrics(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.getDashboardMetrics(schoolUnitId);
      res.json({ success: true, data, message: 'Ringkasan metrik dashboard evaluasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getMonitoringGoals(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.getMonitoringGoals(schoolUnitId);
      res.json({ success: true, data, message: 'Monitoring sasaran berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getMonitoringPrograms(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.getMonitoringPrograms(schoolUnitId);
      res.json({ success: true, data, message: 'Monitoring program berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getMonitoringKPI(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.getMonitoringKPI(schoolUnitId);
      res.json({ success: true, data, message: 'Monitoring KPI berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getEvaluationFindings(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.getEvaluationFindings(schoolUnitId);
      res.json({ success: true, data, message: 'Daftar temuan evaluasi berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listFollowUps(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await evaluationService.listFollowUps(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar rencana tindak lanjut berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getFollowUpById(req, res, next) {
    try {
      const data = await evaluationService.getFollowUpById(req.params.id);
      res.json({ success: true, data, message: 'Detail rencana tindak lanjut berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createFollowUp(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const userId = getUserId(req);
      const data = await evaluationService.createFollowUp({ ...req.body, school_unit_id: schoolUnitId }, userId);
      res.status(201).json({ success: true, data, message: 'Rencana tindak lanjut (RTL) berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateFollowUp(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await evaluationService.updateFollowUp(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Rencana tindak lanjut berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async verifyFollowUp(req, res, next) {
    try {
      const userId = getUserId(req);
      const data = await evaluationService.verifyFollowUp(req.params.id, req.body, userId);
      res.json({ success: true, data, message: 'Rencana tindak lanjut berhasil diverifikasi', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async deleteFollowUp(req, res, next) {
    try {
      const data = await evaluationService.deleteFollowUp(req.params.id);
      res.json({ success: true, data, message: 'Rencana tindak lanjut berhasil dihapus', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EvaluationController();
