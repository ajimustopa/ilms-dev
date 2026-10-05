/**
 * Main Routes Aggregator for Kantin Module
 * Prefix: /api/v1/kantin
 */
const express = require('express');
const router = express.Router();

const accessMenusRoutes = require('./access-menus/routes');
const vendorsRoutes = require('./vendors/routes');
const productCategoriesRoutes = require('./product-categories/routes');
const vendorProductsRoutes = require('./vendor-products/routes');
const goodsReceiptsRoutes = require('./goods-receipts/routes');
const productReturnsRoutes = require('./product-returns/routes');
const canteenStudentsRoutes = require('./canteen-students/routes');
const dailySpendingLimitsRoutes = require('./daily-spending-limits/routes');
const walletTransactionsRoutes = require('./wallet-transactions/routes');
const salesTransactionsRoutes = require('./sales-transactions/routes');
const receivablesRoutes = require('./receivables/routes');
const canteenFeePaymentsRoutes = require('./canteen-fee-payments/routes');
const vendorFeePaymentsRoutes = require('./vendor-fee-payments/routes');
const operationalExpensesRoutes = require('./operational-expenses/routes');
const accountingRoutes = require('./accounting/routes');
const parentRoutes = require('./parent/routes');
const reportsRoutes = require('./reports/routes');
const dashboardRoutes = require('./dashboard/routes');
const cashiersRoutes = require('./cashiers/routes');

// Mount all submodules
router.use('/', accessMenusRoutes);
router.use('/', cashiersRoutes);
router.use('/', vendorsRoutes);
router.use('/', productCategoriesRoutes);
router.use('/', vendorProductsRoutes);
router.use('/', goodsReceiptsRoutes);
router.use('/', productReturnsRoutes);
router.use('/', canteenStudentsRoutes);
router.use('/', dailySpendingLimitsRoutes);
router.use('/', walletTransactionsRoutes);
router.use('/', salesTransactionsRoutes);
router.use('/', receivablesRoutes);
router.use('/', canteenFeePaymentsRoutes);
router.use('/', vendorFeePaymentsRoutes);
router.use('/', operationalExpensesRoutes);
router.use('/', accountingRoutes);
router.use('/', parentRoutes);
router.use('/', reportsRoutes);
router.use('/', dashboardRoutes);

module.exports = router;
