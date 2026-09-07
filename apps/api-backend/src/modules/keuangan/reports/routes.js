/**
 * Reports Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 9) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/reports/budget-realization',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getBudgetRealization
);
router.get(
  '/reports/general-ledger',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getGeneralLedger
);
router.get(
  '/reports/trial-balance',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getTrialBalance
);
router.get(
  '/reports/income-statement',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getIncomeStatement
);
router.get(
  '/reports/cash-flow',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getCashFlow
);
router.get(
  '/reports/balance-sheet',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getBalanceSheet
);

router.get(
  '/reports/academic-years',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.listAcademicYears
);
router.get(
  '/reports/classes',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.listClassGroups
);
router.get(
  '/reports/student-ledger/export/excel',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.exportClassStudentLedgerExcel
);
router.get(
  '/reports/student-ledger/export/pdf',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.exportClassStudentLedgerPdf
);
router.post(
  '/reports/student-ledger/:student_id/notify-overdue',
  verifyJwt,
  requirePermission('keuangan.bills.view'),
  controller.notifyOverdueBill
);
router.get(
  '/reports/student-ledger',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getClassStudentLedger
);
router.get(
  '/reports/student-ledger/:student_id',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getStudentLedger
);
router.get(
  '/reports/student-ledger/:student_id/pdf',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getStudentLedgerPdf
);

// 8. Laporan Eksekutif Manajerial (Non-Akuntan)
router.get(
  '/reports/executive-health',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getExecutiveHealth
);
router.get(
  '/reports/financial-projection',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getFinancialProjection
);
router.get(
  '/reports/fund-source-monthly-flow',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getFundSourceMonthlyFlow
);
router.get(
  '/reports/program-expenses-matrix',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getProgramExpensesMatrix
);

module.exports = router;
