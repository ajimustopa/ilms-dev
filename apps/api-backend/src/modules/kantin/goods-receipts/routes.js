const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/goods-receipts', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listReceipts);
router.get('/goods-receipts/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getReceiptById);
router.post('/goods-receipts', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createReceipt);
router.post('/goods-receipts/:id/items', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.addItem);

module.exports = router;
