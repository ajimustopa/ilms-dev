/**
 * Other Incomes (Penerimaan Kas Non-SPP / Sumber Lain RAPBS)
 * Status: Menu standalone deprecated, UI terintegrasi penuh ke dalam Pusat Penerimaan Kas (Tahap 6: Payments.jsx Tab 3 & 4)
 * Endpoint di bawah tetap aktif sebagai penyedia data servis untuk portal Penerimaan Terpadu.
 * Sesuai api-contract-keuangan.md §2 (Modul 5) & roles-keuangan.md §4.2
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
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.getOtherIncomeById
);
router.post(
  '/other-incomes',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.createOtherIncome
);
router.put(
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.updateOtherIncome
);
router.delete(
  '/other-incomes/:id',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.deleteOtherIncome
);

module.exports = router;
