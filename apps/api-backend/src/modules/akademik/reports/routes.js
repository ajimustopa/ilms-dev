/**
 * Reports Routes
 * Modul Akademik - Fitur 7: Laporan
 */
const express = require('express');
const router = express.Router();
const reportsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

router.get('/reports/academic-summary', authenticate, requirePermission('akademik.students.read'), reportsController.getSummary);
router.get('/reports/export', authenticate, requirePermission('akademik.students.read'), reportsController.exportReport);

module.exports = router;
