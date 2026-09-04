/**
 * Payroll Controller Implementation
 * Modul Kepegawaian - Fitur 4: Penggajian (Payroll)
 */
const payrollService = require('./service');

class PayrollController {
  async createPeriod(req, res, next) {
    try {
      const result = await payrollService.createPeriod(req.body, req.user?.id);
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
      const result = await payrollService.calculatePeriod(req.params.id, req.user?.id);
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
      const result = await payrollService.updateItem(req.params.id, req.body, req.user?.id);
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
      const result = await payrollService.updatePeriodStatus(req.params.id, req.body, req.user?.id);
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

  async lockPeriod(req, res, next) {
    try {
      const result = await payrollService.lockPeriod(req.params.id, req.user?.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Periode payroll berhasil dikunci (locked) dan siap diserahkan ke Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async sendToFinance(req, res, next) {
    try {
      const result = await payrollService.sendToFinance(req.params.id, req.user?.id);
      const statusCode = result.success ? 200 : 207; // 207 Multi-Status for partial
      res.status(statusCode).json({
        success: result.success,
        data: result.data || null,
        message: result.message,
        errors: result.failed_items || null
      });
    } catch (err) {
      next(err);
    }
  }

  async returnForCorrectionInternal(req, res, next) {
    try {
      const { employee_id, period_year, period_month } = req.params;
      const { rejection_reason } = req.body;
      const result = await payrollService.returnForCorrection({
        employee_id,
        period_year,
        period_month,
        rejection_reason,
        userId: req.user?.id
      });
      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const result = await payrollService.getPeriodAuditLogs(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat audit trail payroll berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PayrollController();
