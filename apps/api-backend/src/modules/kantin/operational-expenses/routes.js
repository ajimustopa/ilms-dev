const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/operational-expenses/summary', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.getSummary);
router.get('/operational-expenses/cash-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.getCashAccounts);
router.get('/operational-expenses/coa-accounts', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.getCoaAccounts);
router.get('/operational-expenses/bank-statements', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.getBankStatements);
router.get('/operational-expenses/accounting-ledger', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.getAccountingLedger);
router.get('/operational-expenses', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.listExpenses);
router.post('/operational-expenses', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.createExpense);
router.delete('/operational-expenses/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'pengelola_kantin'), controller.deleteExpense);

module.exports = router;
