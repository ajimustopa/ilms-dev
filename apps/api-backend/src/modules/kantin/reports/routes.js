const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/reports/products', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getProductsReport);
router.get('/reports/vendors', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getVendorsReport);
router.get('/reports/cash', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getCashReport);
router.get('/reports/monthly', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getMonthlyReport);
router.get('/reports/monthly-spending', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir', 'bendahara'), controller.getMonthlySpending);

module.exports = router;
