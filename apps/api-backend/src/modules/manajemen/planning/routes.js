/**
 * Planning Routes Implementation
 */
const express = require('express');
const router = express.Router();
const planningController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// RIPS (#190)
router.get(
  '/institution-development-plans',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  planningController.listRips
);

router.get(
  '/institution-development-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  planningController.getRipsById
);

router.post(
  '/institution-development-plans',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.createRips
);

router.put(
  '/institution-development-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.updateRips
);

router.patch(
  '/institution-development-plans/:id/approve',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.approveRips
);

router.patch(
  '/institution-development-plans/:id/archive',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.archiveRips
);

// RKS (#191)
router.get(
  '/school-work-plans',
  verifyJwt,
  requirePermission('manajemen.planning.rks.view'),
  planningController.listRks
);

router.get(
  '/school-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rks.view'),
  planningController.getRksById
);

router.post(
  '/school-work-plans',
  verifyJwt,
  requirePermission('manajemen.planning.rks.manage'),
  planningController.createRks
);

router.put(
  '/school-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rks.manage'),
  planningController.updateRks
);

router.patch(
  '/school-work-plans/:id/submit',
  verifyJwt,
  requirePermission('manajemen.planning.rks.manage'),
  planningController.submitRks
);

router.patch(
  '/school-work-plans/:id/approve',
  verifyJwt,
  requirePermission('manajemen.planning.rks.manage'),
  planningController.approveRks
);

// Program Kerja Unit (#192)
router.get(
  '/work-plan-programs',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.view'),
  planningController.listPrograms
);

router.get(
  '/work-plan-programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.view'),
  planningController.getProgramById
);

router.post(
  '/work-plan-programs',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_own'),
  planningController.createProgram
);

router.put(
  '/work-plan-programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_own'),
  planningController.updateProgram
);

router.patch(
  '/work-plan-programs/:id/status',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_own'),
  planningController.updateProgramStatus
);

router.delete(
  '/work-plan-programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_all'),
  planningController.deleteProgram
);

module.exports = router;
