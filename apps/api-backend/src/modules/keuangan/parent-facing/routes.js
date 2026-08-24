/**
 * Parent-Facing Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 11) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/parent-facing/bills',
  verifyJwt,
  requirePermission('keuangan.parent.self_service'),
  controller.listBills
);
router.get(
  '/parent-facing/bills/:id',
  verifyJwt,
  requirePermission('keuangan.parent.self_service'),
  controller.getBillDetail
);
router.get(
  '/parent-facing/payments',
  verifyJwt,
  requirePermission('keuangan.parent.self_service'),
  controller.listPayments
);
router.get(
  '/parent-facing/savings',
  verifyJwt,
  requirePermission('keuangan.parent.self_service'),
  controller.getSavings
);

module.exports = router;
