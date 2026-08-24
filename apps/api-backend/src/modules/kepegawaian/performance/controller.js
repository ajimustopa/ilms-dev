/**
 * Performance Controller Implementation
 * Modul Kepegawaian - Fitur 5: Penilaian Kinerja & Statistik
 */
const performanceService = require('./service');

class PerformanceController {
  async listReviews(req, res, next) {
    try {
      const result = await performanceService.listReviews(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar penilaian kinerja berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createReview(req, res, next) {
    try {
      const result = await performanceService.createReview(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Penilaian kinerja berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateReview(req, res, next) {
    try {
      const result = await performanceService.updateReview(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Penilaian kinerja berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatistics(req, res, next) {
    try {
      const result = await performanceService.getStatistics(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Statistik kepegawaian berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PerformanceController();
