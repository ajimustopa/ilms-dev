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

// 5. Saldo per Sumber Dana (Pos Alokasi Dana & Opening Pool)
router.get(
  '/fund-balances',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.expenses.manage'),
  controller.listFundBalances
);
router.get(
  '/fund-balances/available-sources',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.expenses.manage'),
  controller.getAvailableFundSources
);
router.get(
  '/fund-balances/multi-year-trajectory',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.expenses.manage'),
  controller.getMultiYearTrajectory
);
router.get(
  '/fund-balances/academic-year-loans-summary',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.budget.view', 'keuangan.fund_balances.manage_loan'),
  controller.getAcademicYearLoansSummary
);
router.get(
  '/fund-balances/inter-year-loans',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.fund_balances.manage_loan'),
  controller.listInterYearLoans
);
router.post(
  '/fund-balances/inter-year-loans',
  verifyJwt,
  requirePermission('keuangan.fund_balances.manage_loan', 'keuangan.bookkeeping.close_year'),
  controller.createInterYearLoan
);
router.get(
  '/fund-balances/inter-year-loans/:id',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.fund_balances.manage_loan'),
  controller.getInterYearLoanById
);
router.post(
  '/fund-balances/inter-year-loans/:id/repay',
  verifyJwt,
  requirePermission('keuangan.fund_balances.manage_loan', 'keuangan.bookkeeping.close_year', 'keuangan.expenses.manage'),
  controller.repayInterYearLoan
);
router.get(
  '/fund-balances/:id/mutations',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view', 'keuangan.expenses.manage'),
  controller.listFundMutations
);

// 6. Buku Besar & Lembar Kerja Akuntansi (Siklus Akuntansi Nirlaba)
router.get(
  '/bookkeeping/general-ledger',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view'),
  controller.getGeneralLedger
);
router.get(
  '/bookkeeping/worksheet',
  verifyJwt,
  requirePermission('keuangan.bookkeeping.view', 'keuangan.reports.view'),
  controller.getWorksheet
);

module.exports = router;
