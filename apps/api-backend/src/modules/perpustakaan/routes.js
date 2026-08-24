/**
 * Perpustakaan Master Router
 * Aggregates all submodules: catalog, members, circulation, reminders, opac, reports, parent-facing
 */
const express = require('express');
const router = express.Router();

const catalogRoutes = require('./catalog/routes');
const membersRoutes = require('./members/routes');
const circulationRoutes = require('./circulation/routes');
const remindersRoutes = require('./reminders/routes');
const opacRoutes = require('./opac/routes');
const reportsRoutes = require('./reports/routes');
const parentFacingRoutes = require('./parent-facing/routes');

// Submodule routers
router.use('/', opacRoutes); // Publik (tanpa auth)
router.use('/', parentFacingRoutes); // Service-to-service (via X-API-Key)
router.use('/', catalogRoutes);
router.use('/', membersRoutes);
router.use('/', circulationRoutes);
router.use('/', remindersRoutes);
router.use('/', reportsRoutes);

module.exports = router;
