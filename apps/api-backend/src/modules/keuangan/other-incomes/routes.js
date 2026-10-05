/**
 * Other Incomes (Penerimaan Kas Non-Siswa / Penerimaan Lainnya)
 * Sesuai Modul Keuangan Enterprise Aldepos
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/other-incomes',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record', 'keuangan.reports.view'),
  controller.listOtherIncomes
);
router.get(
  '/other-incomes/rapbs-sources',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record', 'keuangan.reports.view'),
  controller.getRapbsIncomeSources
);
router.get(
  '/other-incomes/:id/receipt',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record', 'keuangan.reports.view'),
  controller.getOtherIncomeReceipt
);
router.get(
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record', 'keuangan.reports.view'),
  controller.getOtherIncomeById
);
router.post(
  '/other-incomes',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record'),
  controller.createOtherIncome
);
router.put(
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage', 'keuangan.payments.record'),
  controller.updateOtherIncome
);
router.delete(
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.deleteOtherIncome
);

module.exports = router;
