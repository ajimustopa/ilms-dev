/**
 * Bank Statements (Rekening Koran) Routes for Keuangan Module
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

// Template & Export (Placed before dynamic :id)
router.get(
  '/bank-statements/template',
  verifyJwt,
  requirePermission('keuangan.bank_statement.view', 'keuangan.reports.view', 'keuangan.payments.view'),
  controller.getTemplateExcel
);

router.get(
  '/bank-statements/export',
  verifyJwt,
  requirePermission('keuangan.bank_statement.view', 'keuangan.reports.view', 'keuangan.payments.view'),
  controller.exportBankStatementsExcel
);

router.post(
  '/bank-statements/import',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.create', 'keuangan.master.manage'),
  controller.importBankStatements
);

router.post(
  '/bank-statements/bulk-delete',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.delete', 'keuangan.master.manage'),
  controller.bulkDeleteBankStatements
);

router.get(
  '/bank-statements/:id/reconcile-candidates',
  verifyJwt,
  requirePermission('keuangan.bank_statement.view', 'keuangan.payments.view'),
  controller.getReconcileCandidates
);

router.post(
  '/bank-statements/:id/reconcile',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.create'),
  controller.reconcileStatement
);

router.post(
  '/bank-statements/:id/unreconcile',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.create'),
  controller.unreconcileStatement
);

// Standard CRUD
router.get(
  '/bank-statements',
  verifyJwt,
  requirePermission('keuangan.bank_statement.view', 'keuangan.reports.view', 'keuangan.payments.view'),
  controller.listBankStatements
);

router.post(
  '/bank-statements',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.create', 'keuangan.master.manage'),
  controller.createBankStatement
);

router.get(
  '/bank-statements/:id',
  verifyJwt,
  requirePermission('keuangan.bank_statement.view', 'keuangan.reports.view', 'keuangan.payments.view'),
  controller.getBankStatementById
);

router.put(
  '/bank-statements/:id',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.create', 'keuangan.master.manage'),
  controller.updateBankStatement
);

router.delete(
  '/bank-statements/:id',
  verifyJwt,
  requirePermission('keuangan.bank_statement.manage', 'keuangan.payments.delete', 'keuangan.master.manage'),
  controller.deleteBankStatement
);

module.exports = router;
