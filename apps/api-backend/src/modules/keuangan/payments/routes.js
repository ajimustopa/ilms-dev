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

// 2. Edit & Riwayat Koreksi Pembayaran (Fitur #18)
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

module.exports = router;
