/**
 * Payments Controller for Keuangan Module
 */
const paymentsService = require('./service');

class PaymentsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  recordBillPayment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await paymentsService.recordBillPayment(schoolUnitId, req.body, req.user?.id);
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'VALIDATION') {
        return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.status(201).json({ success: true, data: result.data, message: 'Pembayaran berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  listBillPayments = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.listBillPayments(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar riwayat pembayaran tagihan siswa berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getAllInflows = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.getAllInflows(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar seluruh penerimaan kas (Siswa, PPDB & Sumber Lain) berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getPaymentHistory = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.getPaymentHistory(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Pembayaran tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Riwayat pembayaran berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  correctPayment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await paymentsService.correctPayment(schoolUnitId, req.params.id, req.body, req.user?.id);
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'VALIDATION') {
        return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({ success: true, data: result.data, message: 'Pembayaran berhasil dikoreksi', errors: null });
    } catch (err) { next(err); }
  };

  getReceipt = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.getReceiptData(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Pembayaran tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Data kwitansi berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getReceiptPdf = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.getReceiptData(schoolUnitId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Pembayaran tidak ditemukan', errors: null });
      res.json({
        success: true,
        data: {
          ...data,
          download_url: `/api/v1/keuangan/bill-payments/${req.params.id}/receipt.pdf`
        },
        message: 'Kwitansi PDF berhasil disiapkan',
        errors: null
      });
    } catch (err) { next(err); }
  };

  // 4. Payment Gateway (Nonaktif Sementara untuk Fase Ini - Keputusan Bisnis: Manual Bukti Transfer)
  checkoutGateway = async (req, res, next) => {
    try {
      return res.status(501).json({
        success: false,
        data: null,
        message: 'Fitur payment gateway belum diaktifkan, gunakan alur bukti transfer manual',
        errors: null
      });
    } catch (err) { next(err); }
  };

  handleGatewayCallback = async (req, res, next) => {
    try {
      return res.status(501).json({
        success: false,
        data: null,
        message: 'Fitur payment gateway belum diaktifkan, gunakan alur bukti transfer manual',
        errors: null
      });
    } catch (err) { next(err); }
  };

  listGatewayTransactions = async (req, res, next) => {
    try {
      const data = await paymentsService.listGatewayTransactions(req.query.status);
      res.json({ success: true, data, message: 'Daftar transaksi gateway berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  // 5. Rekonsiliasi Pembayaran (Fitur #21)
  listReconciliations = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.listReconciliations(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar rekonsiliasi pembayaran berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  matchReconciliation = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.matchReconciliation(schoolUnitId, req.params.id, req.body.bill_payment_id, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data rekonsiliasi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Rekonsiliasi ditandai cocok', errors: null });
    } catch (err) { next(err); }
  };

  flagDiscrepancy = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.flagDiscrepancy(schoolUnitId, req.params.id, req.body.notes, req.user?.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Data rekonsiliasi tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Diskrepansi rekonsiliasi berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  ingestReconciliationInternal = async (req, res, next) => {
    try {
      const data = await paymentsService.ingestReconciliationInternal(req.body);
      res.status(201).json({ success: true, data, message: 'Data transaksi eksternal berhasil di-ingest untuk rekonsiliasi', errors: null });
    } catch (err) { next(err); }
  };

  // 6. Bukti Transfer & Verifikasi (Pengganti Gateway)
  listPaymentProofs = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.listPaymentProofs(schoolUnitId, req.query);
      res.json({
        success: true,
        data,
        message: 'Daftar antrean bukti transfer berhasil diambil',
        errors: null
      });
    } catch (err) { next(err); }
  };

  getPaymentProofAllocations = async (req, res, next) => {
    try {
      const data = await paymentsService.getPaymentProofAllocations(req.params.id);
      res.json({ success: true, data, message: 'Daftar alokasi bukti transfer berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  savePaymentProofAllocations = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await paymentsService.savePaymentProofAllocations(
        schoolUnitId,
        req.params.id,
        req.body.allocations || [],
        req.user?.id
      );
      res.json({ success: true, data, message: 'Rincian alokasi tagihan bukti transfer berhasil disimpan', errors: null });
    } catch (err) { next(err); }
  };

  verifyPaymentProof = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await paymentsService.verifyPaymentProof(
        schoolUnitId,
        req.params.id,
        req.user?.id,
        req.body.cash_account_id
      );
      if (result.error === 'VALIDATION') {
        return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({
        success: true,
        data: result.data,
        message: 'Bukti transfer berhasil diverifikasi dan pembayaran resmi telah dicatat',
        errors: null
      });
    } catch (err) { next(err); }
  };

  rejectPaymentProof = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await paymentsService.rejectPaymentProof(
        schoolUnitId,
        req.params.id,
        req.body.rejection_reason,
        req.user?.id
      );
      if (result.error === 'VALIDATION') {
        return res.status(422).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.json({
        success: true,
        data: result.data,
        message: 'Bukti transfer berhasil ditolak',
        errors: null
      });
    } catch (err) { next(err); }
  };

  refundPayment = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const reason = req.body.reason || req.body.refund_reason;
      const cashAccountId = req.body.refund_cash_account_id || req.body.cash_account_id;
      const data = await paymentsService.refundBillPayment(schoolUnitId, req.params.id, cashAccountId, reason, req.user?.id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new PaymentsController();
