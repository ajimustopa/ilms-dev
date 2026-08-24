const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/dashboard/summary', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getSummary);
router.get('/dashboard/sales-chart', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getSalesChart);

module.exports = router;
