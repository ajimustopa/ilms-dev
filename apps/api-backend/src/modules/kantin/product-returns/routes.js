const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/product-returns', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.listReturns);
router.post('/product-returns', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.createReturn);

module.exports = router;
