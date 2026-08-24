/**
 * Employment Statuses Controller Implementation
 * Modul Kepegawaian - Master Data Status Kepegawaian Fleksibel
 */
const employmentStatusesService = require('./service');

class EmploymentStatusesController {
  async list(req, res, next) {
    try {
      const result = await employmentStatusesService.listStatuses(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar status kepegawaian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await employmentStatusesService.getStatusById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail status kepegawaian berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await employmentStatusesService.createStatus(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Status kepegawaian baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await employmentStatusesService.updateStatus(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status kepegawaian berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await employmentStatusesService.deleteStatus(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status kepegawaian berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EmploymentStatusesController();
