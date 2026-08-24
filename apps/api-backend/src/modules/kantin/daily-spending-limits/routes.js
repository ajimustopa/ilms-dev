const express = require('express');
const router = express.Router();
const controller = require('./controller');
const verifyJwt = require('../../../middlewares/verifyJwt');
const requireRole = require('../middlewares/requireRole');

router.get('/daily-spending-limits', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.listLimits);
router.get('/daily-spending-limits/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.getLimitById);
router.post('/daily-spending-limits', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.createLimit);
router.put('/daily-spending-limits/:id', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateLimit);
router.patch('/daily-spending-limits/:id/status', verifyJwt, requireRole('admin', 'kepala_kantin'), controller.updateStatus);

module.exports = router;
