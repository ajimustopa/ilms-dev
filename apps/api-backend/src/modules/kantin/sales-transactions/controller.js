const salesTransactionsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class SalesTransactionsController {
  async listTransactions(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await salesTransactionsService.listTransactions(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTransactionById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await salesTransactionsService.getTransactionById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Transaksi penjualan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createTransaction(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await salesTransactionsService.createTransaction(schoolUnitId, req.body, req.user);
      res.status(201).json({ success: true, data, message: 'Transaksi berhasil', errors: null });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          data: null,
          message: err.message,
          errors: err.errors || null
        });
      }
      next(err);
    }
  }

  async reviseTransaction(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await salesTransactionsService.reviseTransaction(schoolUnitId, req.params.id, req.body, req.user);
      res.json({ success: true, data, message: 'Revisi transaksi berhasil disimpan', errors: null });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          data: null,
          message: err.message,
          errors: err.errors || null
        });
      }
      next(err);
    }
  }

  async getRevisionHistory(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await salesTransactionsService.getRevisionHistory(schoolUnitId, req.params.id);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalesTransactionsController();
