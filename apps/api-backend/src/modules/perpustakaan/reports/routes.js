/**
 * Reports Routes Implementation
 */
const express = require('express');
const router = express.Router();
const reportsController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/reports/circulation',
  verifyJwt,
  requirePermission('perpustakaan.reports.view'),
  reportsController.getCirculationReport
);

router.get(
  '/reports/popular-books',
  verifyJwt,
  requirePermission('perpustakaan.reports.view'),
  reportsController.getPopularBooks
);

router.get(
  '/reports/utilization',
  verifyJwt,
  requirePermission('perpustakaan.reports.view'),
  reportsController.getUtilizationReport
);

module.exports = router;
