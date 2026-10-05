const walletTransactionsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class WalletTransactionsController {
  async getAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.getAccountingConfig(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async saveAccountingConfig(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.saveAccountingConfig(schoolUnitId, req.body);
      res.json({ success: true, data, message: 'Konfigurasi akuntansi dompet berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listTransactions(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.listTransactions(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listCashAccounts(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.listCashAccounts(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listBankStatements(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.listBankStatements(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async topUp(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { student_id, amount } = req.body;
      if (!student_id || amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'student_id dan amount wajib diisi', errors: null });
      }
      const data = await walletTransactionsService.topUp(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Top up berhasil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async setOpeningBalance(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { student_id, amount } = req.body;
      if (!student_id || amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'student_id dan amount wajib diisi', errors: null });
      }
      const data = await walletTransactionsService.setOpeningBalance(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Saldo awal dompet santri berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async withdrawal(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { student_id, amount } = req.body;
      if (!student_id || amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'student_id dan amount wajib diisi', errors: null });
      }
      const data = await walletTransactionsService.withdrawal(schoolUnitId, req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Penarikan saldo berhasil', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getReconciliationSummary(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await walletTransactionsService.getReconciliationSummary(schoolUnitId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateTransaction(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const txId = Number(req.params.id);
      const data = await walletTransactionsService.updateTransaction(schoolUnitId, txId, req.body, req.user || {});
      res.json({ success: true, data, message: 'Transaksi dompet berhasil direvisi', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async listRevisions(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const txId = Number(req.params.id);
      const data = await walletTransactionsService.listRevisions(schoolUnitId, txId);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WalletTransactionsController();
