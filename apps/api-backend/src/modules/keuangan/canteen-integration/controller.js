/**
 * Canteen Integration Controller for Keuangan Module
 */
const service = require('./service');

class CanteenIntegrationController {
  async getOverview(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.getOverview(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Ringkasan rekonsiliasi dan bagi hasil kantin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listStudents(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listStudents(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar santri kantin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listWalletTransactions(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listWalletTransactions(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Riwayat transaksi dompet santri berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async topUpWallet(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const data = await service.topUpWallet(schoolUnitId, req.body, req.user?.id || null);
      return res.status(201).json({
        success: true,
        data,
        message: 'Top up saldo dompet santri berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async withdrawWallet(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const data = await service.withdrawWallet(schoolUnitId, req.body, req.user?.id || null);
      return res.json({
        success: true,
        data,
        message: 'Penarikan tunai saldo dompet santri berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listBankStatements(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listBankStatements(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar mutasi rekening koran berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listCashAccounts(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listCashAccounts(schoolUnitId);
      return res.json({
        success: true,
        data,
        message: 'Daftar rekening kas/bank berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getCanteenShare(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.getCanteenShare(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Data hak dan piutang kantin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getCanteenShareDetail(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.getCanteenShareDetail(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Rincian produk hak kantin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listCanteenFeePayments(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listCanteenFeePayments(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Riwayat penyerahan hak kantin berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCanteenFeePayment(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const data = await service.createCanteenFeePayment(schoolUnitId, req.body, req.user?.id || null);
      return res.status(201).json({
        success: true,
        data,
        message: 'Penyerahan hak kantin berhasil dicatat dan diposting ke Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getVendorShares(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.getVendorShares(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar bagi hasil vendor berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listVendorFeePayments(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const data = await service.listVendorFeePayments(schoolUnitId, req.query);
      return res.json({
        success: true,
        data,
        message: 'Riwayat pembayaran hak vendor berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createVendorFeePayment(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const data = await service.createVendorFeePayment(schoolUnitId, req.body, req.user?.id || null);
      return res.status(201).json({
        success: true,
        data,
        message: 'Pembayaran hak vendor berhasil dicatat dan diposting ke Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createCanteenCashTransfer(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const data = await service.createCanteenCashTransfer(schoolUnitId, req.body, req.user?.id || null);
      return res.status(201).json({
        success: true,
        data,
        message: 'Mutasi kas operasional dompet kantin berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWalletTransaction(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.body.school_unit_id || null;
      const txId = Number(req.params.id);
      const data = await service.updateWalletTransaction(schoolUnitId, txId, req.body, req.user || {});
      return res.json({
        success: true,
        data,
        message: 'Transaksi dompet santri berhasil direvisi dan disinkronkan ke Keuangan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listWalletRevisions(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || null;
      const txId = Number(req.params.id);
      const data = await service.listWalletRevisions(schoolUnitId, txId);
      return res.json({
        success: true,
        data,
        message: 'Riwayat revisi transaksi dompet santri berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanteenIntegrationController();
