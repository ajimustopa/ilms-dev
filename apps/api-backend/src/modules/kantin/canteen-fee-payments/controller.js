const canteenFeePaymentsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class CanteenFeePaymentsController {
  async getAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.getAccountingConfig(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async saveAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.saveAccountingConfig(schoolUnitId, req.body);
      res.json({ success: true, data, message: 'Setelan akuntansi penyetoran hak kantin berhasil disimpan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listPayments(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.listPayments(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCashAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.getCashAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCoaAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.getCoaAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBankStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.getBankStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getUndisbursedSales(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await canteenFeePaymentsService.getUndisbursedSales(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createPayment(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { amount } = req.body;
      if (amount === undefined || amount === null || parseFloat(amount) <= 0) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Nominal penyetoran (amount) wajib diisi dan lebih dari 0',
          errors: null
        });
      }
      const data = await canteenFeePaymentsService.createPayment(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Penyetoran hak kantin ke kas keuangan berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanteenFeePaymentsController();

