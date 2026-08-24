/**
 * Performance Routes Implementation
 */
const express = require('express');
const router = express.Router();
const performanceController = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

router.get(
  '/employee-performance-evaluations',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.manage'),
  performanceController.listEvaluations
);

router.get(
  '/employee-performance-evaluations/:id',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.view_own'),
  performanceController.getEvaluationById
);

router.post(
  '/employee-performance-evaluations',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.manage'),
  performanceController.createEvaluation
);

router.put(
  '/employee-performance-evaluations/:id',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.manage'),
  performanceController.updateEvaluation
);

router.post(
  '/employee-performance-evaluations/:id/criteria',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.manage'),
  performanceController.addCriteria
);

router.patch(
  '/employee-performance-evaluations/:id/submit',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.manage'),
  performanceController.submitEvaluation
);

router.patch(
  '/employee-performance-evaluations/:id/approve',
  verifyJwt,
  requirePermission('manajemen.performance.evaluations.approve'),
  performanceController.approveEvaluation
);

// Service-to-Service Internal API for Kepegawaian
router.get(
  '/internal/employee-performance-evaluations',
  requireApiKey,
  performanceController.getInternalFinalEvaluations
);

module.exports = router;
