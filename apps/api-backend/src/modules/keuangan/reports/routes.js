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

module.exports = router;
