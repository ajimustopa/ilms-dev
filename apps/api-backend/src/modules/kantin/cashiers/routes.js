/**
 * Cashiers Management Routes for Kantin Module
 * Prefix: /api/v1/kantin
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/cashiers', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listCashiers);
router.get('/cashiers/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getCashierById);
router.post('/cashiers', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createCashier);
router.put('/cashiers/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateCashier);
router.patch('/cashiers/:id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.toggleStatus);
router.delete('/cashiers/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.deleteCashier);

module.exports = router;
