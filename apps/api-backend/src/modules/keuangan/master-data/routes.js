/**
 * Master Data Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 1) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// ============================================================
// 1. CASH ACCOUNTS (Fitur #1)
// ============================================================
router.get(
  '/cash-accounts',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.listCashAccounts
);
router.get(
  '/cash-accounts/:id',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.getCashAccountById
);
router.post(
  '/cash-accounts',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.createCashAccount
);
router.put(
  '/cash-accounts/:id',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.updateCashAccount
);
router.patch(
  '/cash-accounts/:id/status',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.updateCashAccountStatus
);
router.get(
  '/cash-accounts/:id/balance',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.getCashAccountBalance
);

// ============================================================
// 2. CASH ACCOUNT OPENING BALANCES (Fitur #2)
// ============================================================
router.get(
  '/cash-account-opening-balances',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.listOpeningBalances
);
router.post(
  '/cash-account-opening-balances',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.createOpeningBalance
);
router.put(
  '/cash-account-opening-balances/:id',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.updateOpeningBalance
);

// ============================================================
// 3. CHART OF ACCOUNTS (Fitur #3)
// ============================================================
router.get(
  '/chart-of-accounts',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.listChartOfAccounts
);
router.get(
  '/chart-of-accounts/:id',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.getChartOfAccountById
);
router.post(
  '/chart-of-accounts',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.createChartOfAccount
);
router.put(
  '/chart-of-accounts/:id',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.updateChartOfAccount
);
router.patch(
  '/chart-of-accounts/:id/status',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.updateChartOfAccountStatus
);

// ============================================================
// 4. TRANSACTION ACCOUNT MAPPINGS (Fitur #4)
// ============================================================
router.get(
  '/transaction-account-mappings',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.listAccountMappings
);
router.post(
  '/transaction-account-mappings',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.createAccountMapping
);
router.put(
  '/transaction-account-mappings/:id',
  verifyJwt,
  requirePermission('keuangan.master.coa.manage'),
  controller.updateAccountMapping
);

// ============================================================
// 5. FEE TYPES (Fitur #5)
// ============================================================
router.get(
  '/fee-types',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.listFeeTypes
);
router.post(
  '/fee-types',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.createFeeType
);
router.put(
  '/fee-types/:id',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.updateFeeType
);
router.patch(
  '/fee-types/:id/status',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.updateFeeTypeStatus
);

// ============================================================
// 6. FEE GROUPS & REFERENCE AMOUNTS (Fitur #6)
// ============================================================
router.get(
  '/fee-groups',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.listFeeGroups
);
router.post(
  '/fee-groups',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.createFeeGroup
);
router.put(
  '/fee-groups/:id',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.updateFeeGroup
);

router.get(
  '/fee-reference-amounts',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.listFeeReferenceAmounts
);
router.post(
  '/fee-reference-amounts',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.createFeeReferenceAmount
);
router.put(
  '/fee-reference-amounts/:id',
  verifyJwt,
  requirePermission('keuangan.master.fees.manage'),
  controller.updateFeeReferenceAmount
);

// ============================================================
// 7. TRANSACTION CATEGORIES (Fitur #7)
// ============================================================
router.get(
  '/transaction-categories',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.listTransactionCategories
);
router.post(
  '/transaction-categories',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.createTransactionCategory
);
router.put(
  '/transaction-categories/:id',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.updateTransactionCategory
);

// ============================================================
// 8. BUDGET PROGRAMS & CATALOG ITEMS (Fitur #8)
// ============================================================
router.get(
  '/budget-programs',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.listBudgetPrograms
);
router.post(
  '/budget-programs',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.createBudgetProgram
);
router.put(
  '/budget-programs/:id',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.updateBudgetProgram
);

router.get(
  '/catalog-items',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.listCatalogItems
);
router.post(
  '/catalog-items',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.createCatalogItem
);
router.put(
  '/catalog-items/:id',
  verifyJwt,
  requirePermission('keuangan.master.categories.manage'),
  controller.updateCatalogItem
);

// ============================================================
// 9. STUDENT FEE ADJUSTMENTS & WAIVERS (Fitur #9)
// ============================================================
router.get(
  '/student-fee-adjustments',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  controller.listStudentFeeAdjustments
);
router.post(
  '/student-fee-adjustments',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  controller.createStudentFeeAdjustment
);
router.patch(
  '/student-fee-adjustments/:id/submit',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  controller.submitStudentFeeAdjustment
);
router.patch(
  '/student-fee-adjustments/:id/approve',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.approve'),
  controller.approveStudentFeeAdjustment
);
router.patch(
  '/student-fee-adjustments/:id/reject',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.approve'),
  controller.rejectStudentFeeAdjustment
);

module.exports = router;
