/**
 * Annual Work Plan (RKT) Routes
 * Prefix: /api/v1/manajemen/annual-work-plan/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Master Committee Position Types
router.get(
  '/committee-position-types',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.listCommitteePositionTypes
);

router.post(
  '/committee-position-types',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.createCommitteePositionType
);

router.put(
  '/committee-position-types/:id',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.updateCommitteePositionType
);

router.delete(
  '/committee-position-types/:id',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.deleteCommitteePositionType
);

// Annual Work Plans (RKT)
router.get(
  '/annual-work-plans/current',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getOrInitAnnualWorkPlan
);

router.get(
  '/annual-work-plans',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.listAnnualWorkPlans
);

router.get(
  '/annual-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getAnnualWorkPlanById
);

router.put(
  '/annual-work-plans/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.updateAnnualWorkPlan
);

router.get(
  '/annual-work-plans/:id/matrix',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getRktProgramMatrix
);

router.post(
  '/annual-work-plans/:id/publish',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.publish'),
  controller.publishAnnualWorkPlan
);

router.get(
  '/annual-work-plans/:id/publications',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getPublications
);

// Program Management in RKT
router.get(
  '/annual-work-plans/:id/available-programs',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getAvailableRipsPrograms
);

router.post(
  '/annual-work-plans/:id/programs',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.addProgramToRkt
);

router.post(
  '/annual-work-plans/:id/programs/new',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.createAndAttachProgramToRkt
);

router.delete(
  '/annual-work-plans/:id/programs/:programId',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.removeProgramFromRkt
);

// Work Plan Activities
router.get(
  '/work-plan-activities',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.listActivities
);

router.post(
  '/work-plan-activities',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.createActivity
);

router.put(
  '/work-plan-activities/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.updateActivity
);

router.delete(
  '/work-plan-activities/:id',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.manage'),
  controller.deleteActivity
);

// Program Committees & Members
router.get(
  '/program-committees/current',
  verifyJwt,
  requirePermission('manajemen.planning.rkt.view'),
  controller.getOrCreateCommittee
);

router.post(
  '/program-committees/:id/members',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.addCommitteeMember
);

router.delete(
  '/program-committees/members/:memberId',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.removeCommitteeMember
);

router.post(
  '/program-committees/:id/sahkan',
  verifyJwt,
  requirePermission('manajemen.planning.committee.manage'),
  controller.sahkanCommittee
);

module.exports = router;
