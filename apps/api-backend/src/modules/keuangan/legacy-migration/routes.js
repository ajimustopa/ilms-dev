/**
 * Legacy Migration Routes for Keuangan Module
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/legacy-migration/cutover-date',
  verifyJwt,
  requirePermission('keuangan.legacy_migration.view', 'keuangan.reports.view', 'keuangan.bills.view'),
  controller.getCutoverDate
);

router.post(
  '/legacy-migration/cutover-date',
  verifyJwt,
  requirePermission('keuangan.legacy_migration.manage', 'keuangan.bills.create', 'keuangan.master.manage'),
  controller.setCutoverDate
);

router.post(
  '/legacy-migration/bills',
  verifyJwt,
  requirePermission('keuangan.legacy_migration.manage', 'keuangan.bills.create'),
  controller.createLegacyBill
);

router.post(
  '/legacy-migration/bills/:id/legacy-payments',
  verifyJwt,
  requirePermission('keuangan.legacy_migration.manage', 'keuangan.payments.create'),
  controller.addLegacyPayment
);

router.get(
  '/legacy-migration/bills',
  verifyJwt,
  requirePermission('keuangan.legacy_migration.view', 'keuangan.bills.view'),
  controller.listLegacyBills
);

module.exports = router;
