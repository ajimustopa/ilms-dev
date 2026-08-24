/**
 * Sarpras Master Router
 * Aggregates all submodules: facility, assets, bookings, maintenance, procurement, consumables, reports
 */
const express = require('express');
const router = express.Router();

const facilityRoutes = require('./facility/routes');
const assetsRoutes = require('./assets/routes');
const bookingsRoutes = require('./bookings/routes');
const maintenanceRoutes = require('./maintenance/routes');
const procurementRoutes = require('./procurement/routes');
const consumablesRoutes = require('./consumables/routes');
const reportsRoutes = require('./reports/routes');

// Submodule routers
router.use('/', facilityRoutes);
router.use('/', assetsRoutes);
router.use('/', bookingsRoutes);
router.use('/', maintenanceRoutes);
router.use('/', procurementRoutes);
router.use('/', consumablesRoutes);
router.use('/', reportsRoutes);

module.exports = router;
