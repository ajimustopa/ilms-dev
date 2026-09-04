/**
 * Cash Transfers Routes for Keuangan Module
 * apps/api-backend/src/modules/keuangan/cash-transfers/routes.js
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/cash-transfers',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.listTransfers
);

router.post(
  '/cash-transfers',
  verifyJwt,
  requirePermission('keuangan.master.cash_accounts.manage'),
  controller.createTransfer
);

module.exports = router;
