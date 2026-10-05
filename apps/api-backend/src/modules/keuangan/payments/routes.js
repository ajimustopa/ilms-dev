/**
 * Payments Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 4) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// 1. Catat Pembayaran Tagihan (Fitur #17)
router.post(
  '/bill-payments',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.recordBillPayment
);
router.get(
  '/bill-payments',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.listBillPayments
);

// 1.1 Rekap Seluruh Penerimaan Kas Terpadu (Siswa, PPDB, Sumber Lain)
router.get(
  '/payments/all-inflows',
  verifyJwt,
  requirePermission('keuangan.payments.record', 'keuangan.reports.view'),
  controller.getAllInflows
);

// 1.2 Siswa Berhak Bayar (Siswa Aktif, Siswa Baru/Pindahan T.A. Depan, & Alumni Bertunggakan)
router.get(
  '/payments/eligible-students',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.getEligibleStudents
);

// 2. Edit & Riwayat Koreksi Pembayaran (Fitur #18)
router.get(
  '/bill-payments/:id',
  verifyJwt,
  requirePermission('keuangan.payments.record', 'keuangan.payments.correct'),
  controller.getPaymentById
);
router.get(
  '/bill-payments/:id/history',
  verifyJwt,
  requirePermission('keuangan.payments.correct'),
  controller.getPaymentHistory
);
router.patch(
  '/bill-payments/:id',
  verifyJwt,
  requirePermission('keuangan.payments.correct'),
  controller.correctPayment
);

// 3. Cetak Kwitansi Pembayaran (Fitur #19)
router.get(
  '/bill-payments/:id/receipt',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.getReceipt
);
router.get(
  '/bill-payments/:id/receipt.pdf',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.getReceiptPdf
);

// 4. Payment Gateway (Fitur #20)
router.post(
  '/payment-gateway/checkout',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.checkoutGateway
);
router.post(
  '/payment-gateway/callback',
  controller.handleGatewayCallback
);
router.get(
  '/payment-gateway/transactions',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.listGatewayTransactions
);

// 5. Rekonsiliasi Pembayaran (Fitur #21)
router.get(
  '/payment-reconciliations',
  verifyJwt,
  requirePermission('keuangan.payments.reconcile'),
  controller.listReconciliations
);
router.post(
  '/payment-reconciliations/:id/match',
  verifyJwt,
  requirePermission('keuangan.payments.reconcile'),
  controller.matchReconciliation
);
router.post(
  '/payment-reconciliations/:id/flag-discrepancy',
  verifyJwt,
  requirePermission('keuangan.payments.reconcile'),
  controller.flagDiscrepancy
);
router.post(
  '/internal/payment-reconciliations/ingest',
  requireApiKey,
  controller.ingestReconciliationInternal
);

// 6. Bukti Transfer Manual & Verifikasi (Pengganti Payment Gateway)
router.get(
  '/bill-payment-proofs',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.listPaymentProofs
);
router.get(
  '/bill-payment-proofs/:id/allocations',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.getPaymentProofAllocations
);
router.post(
  '/bill-payment-proofs/:id/allocations',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.savePaymentProofAllocations
);
router.patch(
  '/bill-payment-proofs/:id/verify',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.verifyPaymentProof
);
router.patch(
  '/bill-payment-proofs/:id/reject',
  verifyJwt,
  requirePermission('keuangan.payments.record'),
  controller.rejectPaymentProof
);

// 7. Pengembalian Kelebihan Bayar Siswa (Refund)
router.post(
  '/bill-payments/:id/refund',
  verifyJwt,
  requirePermission('keuangan.payments.correct'),
  controller.refundPayment
);

module.exports = router;
