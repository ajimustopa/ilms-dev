/**
 * Reports Routes for Alquran Module
 * Sesuai api-contract-alquran.md §2.5 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/reports/students/:student_ref_id',
  verifyJwt,
  requirePermission('alquran.reports.view'),
  controller.getStudentReport
);

router.get(
  '/reports/classes/:class_ref_id',
  verifyJwt,
  requirePermission('alquran.reports.view'),
  controller.getClassReport
);

router.get(
  '/reports/classes/:class_ref_id/export',
  verifyJwt,
  requirePermission('alquran.reports.export'),
  controller.exportClassReport
);

module.exports = router;
