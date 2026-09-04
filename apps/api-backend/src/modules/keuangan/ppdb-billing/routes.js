/**
 * PPDB Registration Billing Routes for Keuangan Module
 * Fully aligned with Bills lifecycle (Draft, Publish, Approval, Revisions, Installments, Refunds, Quotas)
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// 1. PPDB Registration Bills Management
router.get(
  '/ppdb-billing/registration-bills',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.listRegistrationBills
);

router.get(
  '/ppdb-billing/candidates',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getRegistrantCandidates
);

router.post(
  '/ppdb-billing/registration-bills',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.createRegistrationBill
);

// 1.1 Penerbitan Tagihan (Draft -> Unpaid + Jurnal Piutang ppdb_bill_issued)
router.post(
  '/ppdb-billing/registration-bills/publish',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.publishRegistrationBills
);

// 1.2 Approval Berjenjang Diskon Kasuistik
router.post(
  '/ppdb-billing/registration-bills/:id/approve-discount',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.approveRegistrationBillDiscount
);

router.post(
  '/ppdb-billing/registration-bills/:id/reject-discount',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.rejectRegistrationBillDiscount
);

// 1.3 Revisi Pasca-Terbit & Histori Revisi
router.post(
  '/ppdb-billing/registration-bills/:id/revise',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.reviseRegistrationBill
);

router.get(
  '/ppdb-billing/registration-bills/:id/revisions',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getRegistrationBillRevisions
);

// 1.4 Paket Cicilan / Termin Uang Pangkal
router.post(
  '/ppdb-billing/registration-bills/:id/installments',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.createInstallmentPlan
);

// 1.5 Refund Calon Murid
router.post(
  '/ppdb-billing/registration-bills/:id/refund-request',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.requestRefund
);

router.patch(
  '/ppdb-billing/registration-bills/:id/refund-request/approve',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.approveRefund
);

router.patch(
  '/ppdb-billing/registration-bills/:id/refund-request/reject',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.rejectRefund
);

router.patch(
  '/ppdb-billing/registration-bills/:id/refund-request/process',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.processRefund
);

// 1.6 Pembayaran Kasir & Pembatalan
router.post(
  '/ppdb-billing/registration-bills/:id/pay',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.recordRegistrationPayment
);

router.post(
  '/ppdb-billing/registration-bills/:id/cancel',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.cancelRegistrationBill
);

router.get(
  '/ppdb-billing/payments/:payment_id/receipt',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getReceiptPdf
);

// 2. Master Data Kebijakan Refund PPDB (ppdb_refund_policy_rules)
router.get(
  '/ppdb-billing/refund-policy-rules',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.listRefundPolicyRules
);

router.post(
  '/ppdb-billing/refund-policy-rules',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.createRefundPolicyRule
);

router.put(
  '/ppdb-billing/refund-policy-rules/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.updateRefundPolicyRule
);

router.delete(
  '/ppdb-billing/refund-policy-rules/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.deleteRefundPolicyRule
);

// 3. Master Data Kuota Beasiswa PPDB (ppdb_scholarship_quotas)
router.get(
  '/ppdb-billing/scholarship-quotas',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.listScholarshipQuotas
);

router.post(
  '/ppdb-billing/scholarship-quotas',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.createScholarshipQuota
);

router.put(
  '/ppdb-billing/scholarship-quotas/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.updateScholarshipQuota
);

router.delete(
  '/ppdb-billing/scholarship-quotas/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.deleteScholarshipQuota
);

router.get(
  '/ppdb-billing/scholarship-quotas/check',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.checkScholarshipQuota
);

// 4. PPDB Registration Transfer Proofs Verification Queue (FIFO)
router.get(
  '/ppdb-billing/proofs',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.listProofs
);

router.patch(
  '/ppdb-billing/proofs/:id/verify',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.verifyProof
);

router.patch(
  '/ppdb-billing/proofs/:id/reject',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.rejectProof
);

// 5. Public PPDB Billing Endpoints (No JWT - untuk pendaftar publik Website Utama)
router.post(
  '/public/ppdb-billing/registration-bills/:id/upload-proof',
  controller.uploadPublicProof
);

router.get(
  '/public/ppdb-billing/registration-bills/:id/status',
  controller.getPublicStatus
);

router.get(
  '/public/ppdb-billing/bank-accounts',
  controller.getPublicBankAccounts
);

// 7. Tab 1: Penetapan Biaya PPDB (Fee Assignments for Target Academic Year)
router.get(
  '/ppdb-billing/fee-assignments',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getPpdbFeeAssignments
);

router.post(
  '/ppdb-billing/fee-assignments/assign',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.assignPpdbFeeScheme
);

router.post(
  '/ppdb-billing/fee-assignments/adjust',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.adjustPpdbCandidateFee
);

// 8. Tab 2: Matriks Penagihan PPDB
router.get(
  '/ppdb-billing/matrix',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getPpdbBillsMatrix
);

// 9. Tab 4: Pengeluaran Program PPDB (Beban Tahun Berjalan dialokasikan ke TA Sasaran)
router.get(
  '/ppdb-billing/expenses',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.listPpdbExpenses
);

router.post(
  '/ppdb-billing/expenses',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.createPpdbExpense
);

router.delete(
  '/ppdb-billing/expenses/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.deletePpdbExpense
);

// 10. Tab 5: Kartu Bayar PPDB (Rekap Gabungan & Buku Pembantu Individual)
router.get(
  '/ppdb-billing/ledger-recap',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getPpdbLedgerRecap
);

router.get(
  '/ppdb-billing/student-ledger/:id',
  verifyJwt,
  requirePermission('keuangan.ppdb_billing.manage'),
  controller.getPpdbStudentLedger
);

module.exports = router;
