/**
 * Payroll Controller Implementation
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 */
const payrollService = require('./service');

class PayrollController {
  async createPeriod(req, res, next) {
    try {
      const result = await payrollService.createPeriod(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Periode payroll berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async calculatePeriod(req, res, next) {
    try {
      const result = await payrollService.calculatePeriod(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Perhitungan payroll periode berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listItems(req, res, next) {
    try {
      const result = await payrollService.listPeriodItems(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rincian payroll berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const result = await payrollService.updateItem(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rincian payroll item berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyItem(req, res, next) {
    try {
      const result = await payrollService.verifyItem(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Rincian payroll item berhasil diverifikasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePeriodStatus(req, res, next) {
    try {
      const result = await payrollService.updatePeriodStatus(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status periode payroll berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PayrollController();
