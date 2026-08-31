/**
 * Manajemen Master Router
 * Aggregates all submodules:
 * - planning/     -> Fitur #190-192 (RIPS, RKS, Program Kerja)
 * - quality/      -> Fitur #193, #195, #196, #201, #202 (KPI, Evadir, Akreditasi, Dashboard Agregat, Risiko)
 * - performance/  -> Fitur #194 (Evaluasi Kinerja mendalam)
 * - supervision/  -> Fitur #197 (Supervisi)
 * - projects/     -> Fitur #198-200 (Task, Proyek, Approval Workflow)
 */
const express = require('express');
const router = express.Router();

const planningRoutes = require('./planning/routes');
const qualityRoutes = require('./quality/routes');
const performanceRoutes = require('./performance/routes');
const supervisionRoutes = require('./supervision/routes');
const projectsRoutes = require('./projects/routes');
const evaluationRoutes = require('./evaluation/routes');
const institutionProfileRoutes = require('./institution-profile/routes');
const ripsRoutes = require('./rips/routes');
const longTermPlanningRoutes = require('./long-term-planning/routes');
const annualWorkPlanRoutes = require('./annual-work-plan/routes');
const evadirRoutes = require('./evadir/routes');

// Submodule routers
router.use('/', planningRoutes);
router.use('/', qualityRoutes);
router.use('/', performanceRoutes);
router.use('/', supervisionRoutes);
router.use('/', projectsRoutes);
router.use('/', evaluationRoutes);
router.use('/institution-profile', institutionProfileRoutes);
router.use('/rips', ripsRoutes);
router.use('/', longTermPlanningRoutes);
router.use('/', annualWorkPlanRoutes);
router.use('/', evadirRoutes);

module.exports = router;
