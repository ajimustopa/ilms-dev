const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/vendor-products', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.listProducts);
router.get('/vendor-products/:id', verifyJwt, requireRole('admin', 'kepala_kantin', 'kasir'), controller.getProductById);
router.post('/vendor-products', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createProduct);
router.put('/vendor-products/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateProduct);
router.patch('/vendor-products/:id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);
router.post('/vendor-products/generate-barcode', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.generateBarcode);
router.put('/vendor-products/:id/barcode', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateBarcode);

module.exports = router;
