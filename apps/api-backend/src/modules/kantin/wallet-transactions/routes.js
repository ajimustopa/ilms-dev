const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/wallet-transactions/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir', 'internal_service'), controller.getAccountingConfig);
router.post('/wallet-transactions/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);
router.put('/wallet-transactions/accounting-config', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.saveAccountingConfig);

router.get('/wallet-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'orangtua', 'internal_service'), controller.listTransactions);
router.get('/wallet-transactions/cash-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir', 'internal_service'), controller.listCashAccounts);
router.get('/wallet-transactions/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir', 'internal_service'), controller.listBankStatements);
router.get('/wallet-transactions/reconciliation', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'kasir', 'internal_service'), controller.getReconciliationSummary);
router.post('/wallet-transactions/top-up', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.topUp);
router.post('/wallet-transactions/opening-balance', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.setOpeningBalance);
router.post('/wallet-transactions/withdrawal', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.withdrawal);
router.put('/wallet-transactions/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.updateTransaction);
router.get('/wallet-transactions/:id/revisions', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'orangtua', 'internal_service'), controller.listRevisions);

module.exports = router;
