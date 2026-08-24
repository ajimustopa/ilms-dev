/**
 * Dapur Master Router
 * Aggregates all submodules of Dapur: master-data, menu, recipes, planning, budget, procurement, receipts, stock, production, distribution, qc, waste, reports, workflow
 */
const express = require('express');
const router = express.Router();

const masterDataRoutes = require('./master-data/routes');
const reportsRoutes = require('./reports/routes');

// Submodule routers
router.use('/', masterDataRoutes);
router.use('/', reportsRoutes);

module.exports = router;
