const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/vendor-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.listPayments);
router.post('/vendor-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.createPayment);

router.get('/vendor-fee-payments/cash-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getCashAccounts);
router.get('/vendor-fee-payments/coa-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getCoaAccounts);
router.get('/vendor-fee-payments/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getBankStatements);
router.get('/vendor-fee-payments/undisbursed-items', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getUndisbursedItems);

module.exports = router;
