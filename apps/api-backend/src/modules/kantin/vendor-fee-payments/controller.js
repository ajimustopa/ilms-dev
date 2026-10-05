const vendorFeePaymentsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class VendorFeePaymentsController {
  async listPayments(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorFeePaymentsService.listPayments(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCashAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorFeePaymentsService.getCashAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getCoaAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorFeePaymentsService.getCoaAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getBankStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorFeePaymentsService.getBankStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getUndisbursedItems(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await vendorFeePaymentsService.getUndisbursedVendorItems(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createPayment(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { vendor_id, amount } = req.body;
      if (!vendor_id || amount === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'vendor_id dan amount wajib diisi',
          errors: null
        });
      }
      const data = await vendorFeePaymentsService.createPayment(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Pembayaran hak vendor berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VendorFeePaymentsController();
