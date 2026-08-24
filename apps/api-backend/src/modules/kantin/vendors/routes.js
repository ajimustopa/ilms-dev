const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/vendors', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listVendors);
router.get('/vendors/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getVendorById);
router.post('/vendors', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createVendor);
router.put('/vendors/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateVendor);
router.patch('/vendors/:id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);

module.exports = router;
