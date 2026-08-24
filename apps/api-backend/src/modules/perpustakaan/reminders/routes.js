/**
 * Reminders Routes Implementation
 */
const express = require('express');
const router = express.Router();
const remindersController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/loan-reminders',
  verifyJwt,
  requirePermission('perpustakaan.reminders.view'),
  remindersController.listReminders
);

router.post(
  '/loan-reminders/run',
  verifyJwt,
  requirePermission('perpustakaan.reminders.run'),
  remindersController.runReminderJob
);

module.exports = router;
