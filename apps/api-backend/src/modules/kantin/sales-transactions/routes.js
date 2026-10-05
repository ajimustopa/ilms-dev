const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/sales-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.listTransactions);
router.get('/pos/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getAccountingConfig);
router.put('/pos/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);
router.get('/pos/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getBankStatements);
router.get('/sales-transactions/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getTransactionById);
router.post('/sales-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.createTransaction);
router.put('/sales-transactions/:id/revise', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.reviseTransaction);
router.get('/sales-transactions/:id/revisions', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getRevisionHistory);

module.exports = router;
