const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/product-returns/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.getAccountingConfig);
router.post('/product-returns/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);
router.put('/product-returns/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);

router.get('/product-returns/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.listBankStatements);

router.get('/product-returns', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.listReturns);
router.get('/product-returns/eligible-items', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.getEligibleReceiptItems);
router.post('/product-returns', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.createReturn);

module.exports = router;
