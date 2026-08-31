/**
 * Planning Routes Implementation
 */
const express = require('express');
const router = express.Router();
const planningController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// ==========================================
// 0. EXECUTIVE DASHBOARD & MASTER REFERENCES (FITUR 14)
// ==========================================
router.get(
  '/dashboard/executive',
  verifyJwt,
  planningController.getExecutiveDashboard
);

router.get(
  '/planning-references',
  verifyJwt,
  planningController.getReferences
);

router.get(
  '/planning/traceability/:type/:id',
  verifyJwt,
  planningController.getTraceabilityChain
);

// ==========================================
// 1. RIPS / RENSTRA (#190)
// ==========================================
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

router.delete(
  '/institution-development-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.deleteRips
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

// ==========================================
// 2. SASARAN STRATEGIS (Strategic Goals)
// ==========================================
router.get(
  '/strategic-goals',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  planningController.listStrategicGoals
);

router.get(
  '/strategic-goals/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  planningController.getStrategicGoalById
);

router.post(
  '/strategic-goals',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.createStrategicGoal
);

router.put(
  '/strategic-goals/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.updateStrategicGoal
);

router.post(
  '/strategic-goals/reorder',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.reorderStrategicGoals
);

router.delete(
  '/strategic-goals/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  planningController.deleteStrategicGoal
);

// ==========================================
// 3. RKS / RPS / RJJP / RJM / RKT (#191)
// ==========================================
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

router.delete(
  '/school-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rks.manage'),
  planningController.deleteRks
);

// ==========================================
// 4. PROGRAM KERJA TAHUNAN (#192)
// ==========================================
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

router.patch(
  '/work-plan-programs/:id/priority',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_own'),
  planningController.setProgramPriority
);

router.delete(
  '/work-plan-programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.work_programs.manage_all'),
  planningController.deleteProgram
);

module.exports = router;
