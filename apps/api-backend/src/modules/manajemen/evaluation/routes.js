/**
 * Evaluation Routes Implementation
 * Modul Manajemen - Fitur 12: Monitoring, Evaluasi & Tindak Lanjut
 */
const express = require('express');
const router = express.Router();
const evaluationController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/evaluation/dashboard',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getDashboardMetrics
);

router.get(
  '/evaluation/goals',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getMonitoringGoals
);

router.get(
  '/evaluation/programs',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getMonitoringPrograms
);

router.get(
  '/evaluation/kpis',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getMonitoringKPI
);

router.get(
  '/evaluation/findings',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getEvaluationFindings
);

// Follow-ups (RTL)
router.get(
  '/evaluation/follow-ups',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.listFollowUps
);

router.get(
  '/evaluation/follow-ups/:id',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.getFollowUpById
);

router.post(
  '/evaluation/follow-ups',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.createFollowUp
);

router.put(
  '/evaluation/follow-ups/:id',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.updateFollowUp
);

router.patch(
  '/evaluation/follow-ups/:id/verify',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.verifyFollowUp
);

router.delete(
  '/evaluation/follow-ups/:id',
  verifyJwt,
  requirePermission('manajemen.performance.view'),
  evaluationController.deleteFollowUp
);

module.exports = router;
