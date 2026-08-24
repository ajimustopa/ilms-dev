/**
 * Supervision Routes Implementation
 */
const express = require('express');
const router = express.Router();
const supervisionController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/supervision-schedules',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.manage'),
  supervisionController.listSchedules
);

router.get(
  '/supervision-schedules/:id',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.view_own'),
  supervisionController.getScheduleById
);

router.post(
  '/supervision-schedules',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.manage'),
  supervisionController.createSchedule
);

router.patch(
  '/supervision-schedules/:id/status',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.manage'),
  supervisionController.updateScheduleStatus
);

router.post(
  '/supervision-schedules/:id/results',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.manage'),
  supervisionController.addResult
);

router.get(
  '/supervision-schedules/:id/results',
  verifyJwt,
  requirePermission('manajemen.supervision.schedules.view_own'),
  supervisionController.getResults
);

module.exports = router;
