/**
 * Expenses (Pengeluaran) Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 6) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/expenses/summary',
  verifyJwt,
  requirePermission('keuangan.expenses.manage', 'keuangan.reports.view'),
  controller.getExpenseSummary
);
router.get(
  '/expenses/:id/voucher',
  verifyJwt,
  requirePermission('keuangan.expenses.manage', 'keuangan.reports.view'),
  controller.getExpenseVoucher
);
router.get(
  '/expenses',
  verifyJwt,
  requirePermission('keuangan.expenses.manage', 'keuangan.reports.view'),
  controller.listExpenses
);
router.get(
  '/expenses/:id',
  verifyJwt,
  requirePermission('keuangan.expenses.manage', 'keuangan.reports.view'),
  controller.getExpenseById
);
router.post(
  '/expenses',
  verifyJwt,
  requirePermission('keuangan.expenses.manage'),
  controller.createExpense
);
router.put(
  '/expenses/:id',
  verifyJwt,
  requirePermission('keuangan.expenses.manage'),
  controller.updateExpense
);
router.delete(
  '/expenses/:id',
  verifyJwt,
  requirePermission('keuangan.expenses.manage'),
  controller.deleteExpense
);
router.patch(
  '/expenses/:id/fund-source',
  verifyJwt,
  requirePermission('keuangan.expenses.manage'),
  controller.reassignFundSource
);

module.exports = router;
