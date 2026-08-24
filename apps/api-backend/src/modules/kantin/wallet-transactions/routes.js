const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/wallet-transactions', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'orangtua', 'internal_service'), controller.listTransactions);
router.post('/wallet-transactions/top-up', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara', 'internal_service'), controller.topUp);
router.post('/wallet-transactions/withdrawal', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.withdrawal);

module.exports = router;
