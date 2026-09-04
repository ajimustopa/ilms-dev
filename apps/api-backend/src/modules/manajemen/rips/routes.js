/**
 * RIPS Routes
 * Prefix: /api/v1/manajemen/rips/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Master Domains & Subdomains
router.get(
  '/domains',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.listDomains
);

router.post(
  '/domains',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createDomain
);

router.put(
  '/domains/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateDomain
);

router.delete(
  '/domains/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteDomain
);

router.post(
  '/subdomains',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createSubdomain
);

router.put(
  '/subdomains/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateSubdomain
);

router.delete(
  '/subdomains/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteSubdomain
);

// Master BSC Aspects
router.get(
  '/bsc-aspects',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.listBscAspects
);

router.post(
  '/bsc-aspects',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createBscAspect
);

router.put(
  '/bsc-aspects/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateBscAspect
);

router.delete(
  '/bsc-aspects/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteBscAspect
);

// Master Program Categories
router.get(
  '/program-categories',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.listProgramCategories
);

router.post(
  '/program-categories',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createProgramCategory
);

router.put(
  '/program-categories/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateProgramCategory
);

router.delete(
  '/program-categories/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteProgramCategory
);

// RIPS Documents (Header Induk)
router.get(
  '/documents/current',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getRipsDocument
);

router.put(
  '/documents/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateRipsDocument
);

router.post(
  '/documents/:id/publish',
  verifyJwt,
  requirePermission('manajemen.planning.rips.publish'),
  controller.publishRipsDocument
);

router.get(
  '/documents/:id/publications',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getPublications
);

// RIPS Goals
router.get(
  '/goals',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.listGoals
);

router.post(
  '/goals',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createGoal
);

router.put(
  '/goals/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateGoal
);

router.delete(
  '/goals/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteGoal
);

// RIPS Goal Indicators
router.post(
  '/goals/:id/indicators',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.addIndicator
);

router.put(
  '/indicators/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateIndicator
);

router.delete(
  '/indicators/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteIndicator
);

// RIPS Programs & Links
router.get(
  '/programs',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.listPrograms
);

router.post(
  '/programs',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.createProgram
);

router.put(
  '/programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.updateProgram
);

router.delete(
  '/programs/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.deleteProgram
);

router.post(
  '/programs/:id/move',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.moveProgram
);

router.put(
  '/programs/:id/move',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.moveProgram
);

router.post(
  '/programs/:id/link-goals',
  verifyJwt,
  requirePermission('manajemen.planning.rips.manage'),
  controller.linkProgramGoals
);

// Impact Check for Safe Deletions
router.get(
  '/domains/:id/impact',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getDomainImpact
);

router.get(
  '/subdomains/:id/impact',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getSubdomainImpact
);

router.get(
  '/goals/:id/impact',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getGoalImpact
);

router.get(
  '/programs/:id/impact',
  verifyJwt,
  requirePermission('manajemen.planning.rips.view'),
  controller.getProgramImpact
);

module.exports = router;

