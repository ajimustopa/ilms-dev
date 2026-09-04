/**
 * Fee Schemes & Student Fee Assignments Routes for Keuangan Module
 * apps/api-backend/src/modules/keuangan/schemes/routes.js
 */
const express = require('express');
const router = express.Router();
const feeSchemesController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// 1. Fee Schemes Endpoints
router.get(
  '/fee-schemes',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.listFeeSchemes
);

router.get(
  '/fee-schemes/:id',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.getFeeSchemeById
);

router.post(
  '/fee-schemes',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.createFeeScheme
);

router.put(
  '/fee-schemes/:id',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.updateFeeScheme
);

router.patch(
  '/fee-schemes/:id/status',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.toggleFeeSchemeStatus
);

router.post(
  '/fee-schemes/duplicate',
  verifyJwt,
  requirePermission('keuangan.master.fee_types.manage'),
  feeSchemesController.duplicateFeeSchemes
);

// 2. Student Fee Assignments Endpoints
router.get(
  '/student-fee-assignments',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  feeSchemesController.listStudentAssignments
);

router.post(
  '/student-fee-assignments',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  feeSchemesController.assignSchemeToStudent
);

router.post(
  '/student-fee-assignments/bulk',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  feeSchemesController.bulkAssignScheme
);

router.post(
  '/student-fee-assignments/custom',
  verifyJwt,
  requirePermission('keuangan.master.fee_adjustments.submit'),
  feeSchemesController.assignCustomStudentFee
);

module.exports = router;
