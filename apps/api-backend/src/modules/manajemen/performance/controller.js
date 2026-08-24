/**
 * Performance Controller Implementation
 */
const performanceService = require('./service');
const { getSchoolUnitId } = require('../utils/crossModuleHelper');

class PerformanceController {
  async listEvaluations(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await performanceService.listEvaluations(schoolUnitId, req.query, req.user);
      res.json({ success: true, data, message: 'Daftar evaluasi kinerja berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getEvaluationById(req, res, next) {
    try {
      const data = await performanceService.getEvaluationById(req.params.id);
      res.json({ success: true, data, message: 'Detail evaluasi kinerja berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createEvaluation(req, res, next) {
    try {
      const schoolUnitId = getSchoolUnitId(req);
      const data = await performanceService.createEvaluation({ ...req.body, school_unit_id: schoolUnitId });
      res.status(201).json({ success: true, data, message: 'Evaluasi kinerja berhasil dibuat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateEvaluation(req, res, next) {
    try {
      const data = await performanceService.updateEvaluation(req.params.id, req.body);
      res.json({ success: true, data, message: 'Evaluasi kinerja berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async addCriteria(req, res, next) {
    try {
      const data = await performanceService.addCriteria(req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'Kriteria penilaian berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async submitEvaluation(req, res, next) {
    try {
      const data = await performanceService.submitEvaluation(req.params.id);
      res.json({ success: true, data, message: 'Evaluasi kinerja berhasil diajukan dan total skor dihitung', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async approveEvaluation(req, res, next) {
    try {
      const userId = req.user?.id || 1;
      const data = await performanceService.approveEvaluation(req.params.id, userId);
      res.json({ success: true, data, message: 'Evaluasi kinerja berhasil disetujui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getInternalFinalEvaluations(req, res, next) {
    try {
      const data = await performanceService.getInternalFinalEvaluations(req.query);
      res.json({ success: true, data, message: 'Data evaluasi kinerja internal berhasil diambil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PerformanceController();
