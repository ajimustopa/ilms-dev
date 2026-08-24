const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/canteen-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.listPayments);
router.post('/canteen-fee-payments', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.createPayment);

module.exports = router;
