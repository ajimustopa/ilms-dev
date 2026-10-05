const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/goods-receipts/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.getAccountingConfig);
router.post('/goods-receipts/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);
router.put('/goods-receipts/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);

router.get('/goods-receipts/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.listBankStatements);

router.get('/goods-receipts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.listReceipts);
router.get('/goods-receipts/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir'), controller.getReceiptById);
router.post('/goods-receipts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.createReceipt);
router.post('/goods-receipts/:id/items', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.addItem);

module.exports = router;
