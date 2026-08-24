/**
 * Dashboard Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 10) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/dashboard',
  verifyJwt,
  requirePermission('keuangan.reports.view'),
  controller.getDashboardSummary
);

module.exports = router;
