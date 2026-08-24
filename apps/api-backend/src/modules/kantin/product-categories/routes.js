const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/product-categories', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listCategories);
router.get('/product-categories/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getCategoryById);
router.post('/product-categories', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createCategory);
router.put('/product-categories/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateCategory);
router.patch('/product-categories/:id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);

module.exports = router;
