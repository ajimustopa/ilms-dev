/**
 * Facility Routes
 * Modul Sarpras: Lokasi & Denah (Sites, Buildings, Rooms)
 */
const express = require('express');
const router = express.Router();
const facilityController = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// Internal Endpoint untuk Akademik (X-API-Key)
router.get('/internal/rooms', requireApiKey, facilityController.listInternalRooms);

// Sites (Lahan)
router.get('/sites', verifyJwt, requirePermission('sarpras.facility.sites.manage'), facilityController.listSites);
router.post('/sites', verifyJwt, requirePermission('sarpras.facility.sites.manage'), facilityController.createSite);
router.get('/sites/:id', verifyJwt, requirePermission('sarpras.facility.sites.manage'), facilityController.getSiteById);
router.put('/sites/:id', verifyJwt, requirePermission('sarpras.facility.sites.manage'), facilityController.updateSite);
router.delete('/sites/:id', verifyJwt, requirePermission('sarpras.facility.sites.manage'), facilityController.deleteSite);

// Buildings (Bangunan)
router.get('/buildings', verifyJwt, requirePermission('sarpras.facility.buildings.manage'), facilityController.listBuildings);
router.post('/buildings', verifyJwt, requirePermission('sarpras.facility.buildings.manage'), facilityController.createBuilding);
router.get('/buildings/:id', verifyJwt, requirePermission('sarpras.facility.buildings.manage'), facilityController.getBuildingById);
router.put('/buildings/:id', verifyJwt, requirePermission('sarpras.facility.buildings.manage'), facilityController.updateBuilding);
router.delete('/buildings/:id', verifyJwt, requirePermission('sarpras.facility.buildings.manage'), facilityController.deleteBuilding);

// Rooms (Ruangan)
router.get('/rooms', verifyJwt, requirePermission('sarpras.facility.rooms.manage'), facilityController.listRooms);
router.post('/rooms', verifyJwt, requirePermission('sarpras.facility.rooms.manage'), facilityController.createRoom);
router.get('/rooms/:id', verifyJwt, requirePermission('sarpras.facility.rooms.manage'), facilityController.getRoomById);
router.put('/rooms/:id', verifyJwt, requirePermission('sarpras.facility.rooms.manage'), facilityController.updateRoom);
router.delete('/rooms/:id', verifyJwt, requirePermission('sarpras.facility.rooms.manage'), facilityController.deleteRoom);

module.exports = router;
