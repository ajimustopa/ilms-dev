/**
 * Bookkeeping (Pembukuan) Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 8) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// 1. Jurnal Umum & Jurnal Koreksi Manual (Fitur #26)
router.get(
  '/journal-entries',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view'),
  controller.listJournalEntries
);
router.get(
  '/journal-entries/:id',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view'),
  controller.getJournalEntryById
);
router.post(
  '/journal-entries/manual',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.manual_entry'),
  controller.createManualJournalEntry
);

// 2. Tabungan Siswa & Pegawai (Fitur #27)
router.get(
  '/savings-accounts',
  verifyJwt,
  requirePermission('keuangan.savings.manage'),
  controller.listSavingsAccounts
);
router.post(
  '/savings-accounts',
  verifyJwt,
  requirePermission('keuangan.savings.manage'),
  controller.createSavingsAccount
);
router.post(
  '/savings-accounts/:id/deposit',
  verifyJwt,
  requirePermission('keuangan.savings.manage'),
  controller.depositSavings
);
router.post(
  '/savings-accounts/:id/withdraw',
  verifyJwt,
  requirePermission('keuangan.savings.manage'),
  controller.withdrawSavings
);
router.get(
  '/savings-accounts/:id/transactions',
  verifyJwt,
  requirePermission('keuangan.savings.manage'),
  controller.listSavingsTransactions
);

// 3. Tutup Buku Tahunan (Fitur #28)
router.get(
  '/fiscal-year-closings',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view'),
  controller.listFiscalYearClosings
);
router.post(
  '/fiscal-year-closings',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.close_year'),
  controller.closeFiscalYear
);
router.patch(
  '/fiscal-year-closings/:id/reopen',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.close_year'),
  controller.reopenFiscalYear
);

// 4. Audit Trail Transaksi Keuangan (Fitur #29)
router.get(
  '/finance-audit-logs',
  verifyJwt,
  requirePermission('keuangan.security.audit_logs.view'),
  controller.listAuditLogs
);

module.exports = router;
