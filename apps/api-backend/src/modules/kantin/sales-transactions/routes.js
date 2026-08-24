const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/sales-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.listTransactions);
router.get('/sales-transactions/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getTransactionById);
router.post('/sales-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.createTransaction);

module.exports = router;
