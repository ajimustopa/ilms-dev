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
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }
      res.status(201).json({ success: true, data: result.data, message: 'Pembayaran berhasil dicatat', errors: null });
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

  checkoutGateway = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await paymentsService.checkoutGateway(schoolUnitId, req.body);
      if (result.error) return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      res.status(201).json({ success: true, data: result.data, message: 'Sesi checkout pembayaran berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  handleGatewayCallback = async (req, res, next) => {
    try {
      const result = await paymentsService.handleGatewayCallback(req.body);
      if (result.error) return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      res.json({ success: true, data: result.data, message: 'Callback gateway berhasil diproses', errors: null });
    } catch (err) { next(err); }
  };

  listGatewayTransactions = async (req, res, next) => {
    try {
      const data = await paymentsService.listGatewayTransactions(req.query.status);
      res.json({ success: true, data, message: 'Daftar transaksi gateway berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

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
}

module.exports = new PaymentsController();
