/**
 * Other Incomes Routes for Keuangan Module
 * 
 * Sesuai api-contract-keuangan.md §2 (Modul 5) & roles-keuangan.md §4.2
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/other-incomes',
  verifyJwt,
  requirePermission('keuangan.income.manage'),
  controller.listOtherIncomes
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
