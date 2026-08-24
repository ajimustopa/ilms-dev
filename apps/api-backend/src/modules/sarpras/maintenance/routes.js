/**
 * Maintenance Routes
 * Modul Sarpras: Pemeliharaan & Perbaikan
 */
const express = require('express');
const router = express.Router();
const maintenanceController = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get('/maintenance-requests', verifyJwt, maintenanceController.listRequests);
router.post('/maintenance-requests', verifyJwt, requirePermission('sarpras.maintenance.report'), maintenanceController.createRequest);
router.get('/maintenance-requests/:id', verifyJwt, maintenanceController.getRequestById);
router.put('/maintenance-requests/:id', verifyJwt, requirePermission('sarpras.maintenance.manage'), maintenanceController.updateRequest);
router.post('/maintenance-requests/:id/close', verifyJwt, requirePermission('sarpras.maintenance.manage'), maintenanceController.closeRequest);

module.exports = router;
