/**
 * Main Routes Aggregator for Tahfidz & Al-Quran (Alquran) Module
 * Prefix: /api/v1/alquran
 */
const express = require('express');
const router = express.Router();

const targetsRoutes = require('./targets/routes');
const recordsRoutes = require('./records/routes');
const examsRoutes = require('./exams/routes');
const booksRoutes = require('./books/routes');
const reportsRoutes = require('./reports/routes');
const integrationRoutes = require('./integration/routes');

// Mount all submodules
router.use('/', targetsRoutes);
router.use('/', recordsRoutes);
router.use('/', examsRoutes);
router.use('/', booksRoutes);
router.use('/', reportsRoutes);
router.use('/', integrationRoutes);

module.exports = router;
