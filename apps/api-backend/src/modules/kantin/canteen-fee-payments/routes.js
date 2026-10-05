const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/canteen-fee-payments/cash-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.getCashAccounts);
router.get('/canteen-fee-payments/coa-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.getCoaAccounts);
router.get('/canteen-fee-payments/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.getBankStatements);
router.get('/canteen-fee-payments/undisbursed-sales', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.getUndisbursedSales);
router.get('/canteen-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.listPayments);
router.post('/canteen-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.createPayment);

module.exports = router;
