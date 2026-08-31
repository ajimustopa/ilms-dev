/**
 * EVADIR Routes
 * Prefix: /api/v1/manajemen/evadir/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/evadir-reports',
  verifyJwt,
  requirePermission('manajemen.evadir.view'),
  controller.listReports
);

router.post(
  '/evadir-reports',
  verifyJwt,
  requirePermission('manajemen.evadir.manage'),
  controller.createReport
);

router.get(
  '/evadir-reports/:id',
  verifyJwt,
  requirePermission('manajemen.evadir.view'),
  controller.getReportById
);

router.put(
  '/evadir-reports/:id',
  verifyJwt,
  requirePermission('manajemen.evadir.manage'),
  controller.updateReport
);

router.delete(
  '/evadir-reports/:id',
  verifyJwt,
  requirePermission('manajemen.evadir.manage'),
  controller.deleteReport
);

router.get(
  '/evadir-reports/:id/goal-results',
  verifyJwt,
  requirePermission('manajemen.evadir.view'),
  controller.getGoalResults
);

router.put(
  '/evadir-reports/:id/goal-results/bulk',
  verifyJwt,
  requirePermission('manajemen.evadir.manage'),
  controller.bulkUpsertGoalResults
);

router.post(
  '/evadir-reports/:id/publish',
  verifyJwt,
  requirePermission('manajemen.evadir.publish'),
  controller.publishReport
);

router.get(
  '/evadir-reports/:id/publications',
  verifyJwt,
  requirePermission('manajemen.evadir.view'),
  controller.getPublications
);

// Balanced Scorecard (BSC)
router.get(
  '/bsc/dashboard',
  verifyJwt,
  requirePermission('manajemen.bsc.view'),
  controller.getBscDashboard
);

router.get(
  '/bsc/trend',
  verifyJwt,
  requirePermission('manajemen.bsc.view'),
  controller.getBscTrend
);

module.exports = router;
