/**
 * Reports Routes
 * Modul Sarpras: Laporan & Dashboard
 */
const express = require('express');
const router = express.Router();
const reportsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get('/reports/dashboard', verifyJwt, requirePermission('sarpras.reports.view'), reportsController.getDashboardSummary);
router.get('/reports/asset-condition', verifyJwt, requirePermission('sarpras.reports.view'), reportsController.getAssetConditionReport);
router.get('/reports/asset-depreciation', verifyJwt, requirePermission('sarpras.reports.view'), reportsController.getAssetDepreciationReport);

module.exports = router;
