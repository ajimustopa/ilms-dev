/**
 * Budget (RAPBS) Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 2) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// List & Detail RAPBS
router.get(
  '/budget-plans',
  verifyJwt,
  requirePermission('keuangan.budget.view'),
  controller.listBudgetPlans
);
router.get(
  '/budget-plans/:id',
  verifyJwt,
  requirePermission('keuangan.budget.view'),
  controller.getBudgetPlanById
);

// Realisasi Anggaran (Real-Time Agregat - Fitur #12)
router.get(
  '/budget-plans/:id/realization',
  verifyJwt,
  requirePermission('keuangan.budget.view'),
  controller.getBudgetRealization
);

// Buat Draft Baru & Versi Revisi (Fitur #10)
router.post(
  '/budget-plans',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.createBudgetPlanDraft
);
router.post(
  '/budget-plans/:id/new-version',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.createNewVersionFromPublished
);

router.patch(
  '/budget-plans/:id/title',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.updateBudgetPlanTitle
);

// Publish RAPBS (Fitur #11)
router.patch(
  '/budget-plans/:id/publish',
  verifyJwt,
  requirePermission('keuangan.budget.publish'),
  controller.publishBudgetPlan
);

// Item Rencana Pendapatan
router.post(
  '/budget-plans/:id/generate-income-from-fees',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.generateIncomeFromFeeAssignments
);
router.post(
  '/budget-plans/:id/income-items',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.addIncomeItem
);
router.put(
  '/budget-plans/:id/income-items/:item_id',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.updateIncomeItem
);
router.delete(
  '/budget-plans/:id/income-items/:item_id',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.deleteIncomeItem
);

// Item Rencana Pengeluaran
router.post(
  '/budget-plans/:id/expense-items',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.addExpenseItem
);
router.put(
  '/budget-plans/:id/expense-items/:item_id',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.updateExpenseItem
);
router.delete(
  '/budget-plans/:id/expense-items/:item_id',
  verifyJwt,
  requirePermission('keuangan.budget.manage'),
  controller.deleteExpenseItem
);

module.exports = router;
