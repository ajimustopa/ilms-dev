const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/receivables/canteen-share', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getCanteenShare);
router.get('/receivables/canteen-share/detail', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getCanteenShareDetail);
router.get('/receivables/vendor-share', verifyJwt, requireRole('admin', 'kepala_kantin', 'bendahara'), controller.getVendorShare);

module.exports = router;
