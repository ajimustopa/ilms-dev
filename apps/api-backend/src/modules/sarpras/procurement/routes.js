/**
 * Procurement Routes
 * Modul Sarpras: Pengadaan (Vendors, Procurements)
 */
const express = require('express');
const router = express.Router();
const procurementController = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// Vendors
router.get('/vendors', verifyJwt, requirePermission('sarpras.procurement.vendors.manage'), procurementController.listVendors);
router.post('/vendors', verifyJwt, requirePermission('sarpras.procurement.vendors.manage'), procurementController.createVendor);
router.get('/vendors/:id', verifyJwt, requirePermission('sarpras.procurement.vendors.manage'), procurementController.getVendorById);
router.put('/vendors/:id', verifyJwt, requirePermission('sarpras.procurement.vendors.manage'), procurementController.updateVendor);
router.delete('/vendors/:id', verifyJwt, requirePermission('sarpras.procurement.vendors.manage'), procurementController.deleteVendor);

// Procurements
router.get('/procurements', verifyJwt, requirePermission('sarpras.procurement.manage'), procurementController.listProcurements);
router.post('/procurements', verifyJwt, requirePermission('sarpras.procurement.manage'), procurementController.createProcurement);
router.get('/procurements/:id', verifyJwt, requirePermission('sarpras.procurement.manage'), procurementController.getProcurementById);
router.put('/procurements/:id/approve', verifyJwt, requirePermission('sarpras.procurement.manage'), procurementController.approveProcurement);
router.put('/procurements/:id/receive', verifyJwt, requirePermission('sarpras.procurement.manage'), procurementController.receiveProcurement);

// Internal Service-to-Service dari Keuangan (X-API-Key)
router.patch('/procurements/:id/finance-reference', requireApiKey, procurementController.updateFinanceReference);

module.exports = router;
