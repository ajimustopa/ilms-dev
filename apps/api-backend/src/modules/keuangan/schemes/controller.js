/**
 * Fee Schemes Controller for Keuangan Module
 * apps/api-backend/src/modules/keuangan/schemes/controller.js
 */
const feeSchemesService = require('./service');

class FeeSchemesController {
  // 1. Fee Schemes (Templates)
  async listFeeSchemes(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id;
      const data = await feeSchemesService.listFeeSchemes(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar skema biaya pendidikan berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getFeeSchemeById(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id;
      const data = await feeSchemesService.getFeeSchemeById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Skema biaya tidak ditemukan'
        });
      }
      return res.json({
        success: true,
        data,
        message: 'Detail skema biaya berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createFeeScheme(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.createFeeScheme(schoolUnitId, req.body, userId);
      return res.status(201).json({
        success: true,
        data,
        message: 'Skema biaya pendidikan berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateFeeScheme(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.updateFeeScheme(schoolUnitId, req.params.id, req.body, userId);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Skema biaya tidak ditemukan'
        });
      }
      return res.json({
        success: true,
        data,
        message: 'Skema biaya pendidikan berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleFeeSchemeStatus(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const { is_active } = req.body;
      const data = await feeSchemesService.toggleFeeSchemeStatus(schoolUnitId, req.params.id, is_active, userId);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Skema biaya tidak ditemukan'
        });
      }
      return res.json({
        success: true,
        data,
        message: `Status skema biaya berhasil diubah menjadi ${is_active ? 'Aktif' : 'Non-aktif'}`
      });
    } catch (err) {
      next(err);
    }
  }

  async duplicateFeeSchemes(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.duplicateFeeSchemes(schoolUnitId, req.body, userId);
      return res.status(201).json({
        success: true,
        data,
        message: data.message
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Student Fee Scheme Assignments
  async listStudentAssignments(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id;
      const data = await feeSchemesService.listStudentAssignments(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar penetapan biaya siswa berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async assignSchemeToStudent(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.assignSchemeToStudent(schoolUnitId, req.body, userId);
      return res.json({
        success: true,
        data,
        message: 'Penetapan skema biaya siswa berhasil disimpan'
      });
    } catch (err) {
      next(err);
    }
  }

  async bulkAssignScheme(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.bulkAssignScheme(schoolUnitId, req.body, userId);
      return res.json({
        success: true,
        data,
        message: `Berhasil menetapkan skema biaya ke ${data.total_assigned} siswa`
      });
    } catch (err) {
      next(err);
    }
  }

  async assignCustomStudentFee(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id;
      const userId = req.user?.id || null;
      const data = await feeSchemesService.assignCustomStudentFee(schoolUnitId, req.body, userId);
      return res.json({
        success: true,
        data,
        message: 'Penetapan biaya khusus (custom) siswa berhasil disimpan'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FeeSchemesController();
