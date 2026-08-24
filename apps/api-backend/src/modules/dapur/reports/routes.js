/**
 * Dapur Reports & Dashboard Routes
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Dashboard summary
router.get('/dashboard', verifyJwt, requirePermission('dapur.master.view'), controller.getDashboardSummary);

module.exports = router;
