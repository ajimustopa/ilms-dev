/**
 * Security Routes
 * Modul Akademik - Fitur 8: Audit Log Aktivitas
 */
const express = require('express');
const router = express.Router();
const securityController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

router.get('/activity-logs', authenticate, requirePermission('akademik.students.read'), securityController.listActivityLogs);

module.exports = router;
