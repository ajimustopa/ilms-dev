const salesTransactionsService = require('./service');

class SalesTransactionsController {
  async listTransactions(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await salesTransactionsService.listTransactions(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getTransactionById(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
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
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await salesTransactionsService.createTransaction(schoolUnitId, req.body, req.user?.id || 1);
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
}

module.exports = new SalesTransactionsController();
