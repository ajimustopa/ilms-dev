/**
 * Long Term Planning Routes
 * Prefix: /api/v1/manajemen/long-term-planning/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.post(
  '/long-term-work-plans',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.manage'),
  controller.createPlan
);

router.get(
  '/long-term-work-plans',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.view'),
  controller.listPlans
);

router.get(
  '/long-term-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.view'),
  controller.getPlanById
);

router.put(
  '/long-term-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.manage'),
  controller.updatePlan
);

router.delete(
  '/long-term-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.manage'),
  controller.deletePlan
);

router.get(
  '/long-term-work-plans/:id/targets',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.view'),
  controller.getPlanTargets
);

router.put(
  '/annual-program-targets/bulk',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.manage'),
  controller.bulkUpsertTargets
);

router.post(
  '/long-term-work-plans/:id/publish',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.publish'),
  controller.publishPlan
);

router.get(
  '/long-term-work-plans/:id/publications',
  verifyJwt,
  requirePermission('manajemen.planning.long_term.view'),
  controller.getPublications
);

module.exports = router;
