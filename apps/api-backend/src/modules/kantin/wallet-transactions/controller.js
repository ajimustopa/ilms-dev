const walletTransactionsService = require('./service');

class WalletTransactionsController {
  async listTransactions(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await walletTransactionsService.listTransactions(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async topUp(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { student_id, amount } = req.body;
      if (!student_id || amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'student_id dan amount wajib diisi', errors: null });
      }
      const data = await walletTransactionsService.topUp(schoolUnitId, req.body, req.user?.id || 1);
      res.status(201).json({ success: true, data, message: 'Top up berhasil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async withdrawal(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { student_id, amount } = req.body;
      if (!student_id || amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'student_id dan amount wajib diisi', errors: null });
      }
      const data = await walletTransactionsService.withdrawal(schoolUnitId, req.body, req.user?.id || 1);
      res.status(201).json({ success: true, data, message: 'Penarikan saldo berhasil', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WalletTransactionsController();
