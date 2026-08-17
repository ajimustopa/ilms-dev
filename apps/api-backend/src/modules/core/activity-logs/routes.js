/**
 * Activity Logs Routes
 */
const express = require('express');
const router = express.Router();
const activityLogsController = require('./controller');
const { authenticate, requireApiKey } = require('../../../middlewares/auth');

// Login & General Activity Logs Endpoints (Fitur #5)
router.get('/login', authenticate, activityLogsController.listLoginLogs);

// Internal Ingest Log Endpoint (Fitur #13 - Dipanggil 13 aplikasi satelit)
router.post('/internal/activity-logs', requireApiKey, activityLogsController.internalRecord);

// Admin Action Logs Lintas Aplikasi Endpoints (Fitur #13)
router.get('/admin', authenticate, activityLogsController.listAdminActionLogs);
router.get('/admin/:id', authenticate, activityLogsController.getAdminActionLogById);

module.exports = router;
