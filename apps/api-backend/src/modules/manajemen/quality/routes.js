/**
 * Quality Routes Implementation
 */
const express = require('express');
const router = express.Router();
const qualityController = require('./controller');
const { verifyJwt, requirePermission, requireApiKey } = require('../../../middlewares/auth');

// KPI (#193)
router.get(
  '/quality-indicators',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.listIndicators
);

router.get(
  '/quality-indicators/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.getIndicatorById
);

router.post(
  '/quality-indicators',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.createIndicator
);

router.put(
  '/quality-indicators/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.updateIndicator
);

router.delete(
  '/quality-indicators/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.deleteIndicator
);

router.get(
  '/quality-indicators/:id/achievements',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.listAchievements
);

router.post(
  '/quality-indicators/:id/achievements',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.recordAchievement
);

router.patch(
  '/quality-indicators/achievements/:id/verify',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.verifyAchievement
);

router.get(
  '/quality-indicators/dashboard',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.getKpiDashboard
);

// Sasaran Mutu (#8)
router.get(
  '/quality-goals',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.listQualityGoals
);

router.get(
  '/quality-goals/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.view'),
  qualityController.getQualityGoalById
);

router.post(
  '/quality-goals',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.createQualityGoal
);

router.put(
  '/quality-goals/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.updateQualityGoal
);

router.delete(
  '/quality-goals/:id',
  verifyJwt,
  requirePermission('manajemen.quality.kpi.manage'),
  qualityController.deleteQualityGoal
);

// Evadir (#195)
router.get(
  '/self-evaluations',
  verifyJwt,
  requirePermission('manajemen.quality.self_evaluation.view'),
  qualityController.listSelfEvaluations
);

router.post(
  '/self-evaluations',
  verifyJwt,
  requirePermission('manajemen.quality.self_evaluation.manage'),
  qualityController.createSelfEvaluation
);

router.put(
  '/self-evaluations/:id',
  verifyJwt,
  requirePermission('manajemen.quality.self_evaluation.manage'),
  qualityController.updateSelfEvaluation
);

router.patch(
  '/self-evaluations/:id/submit',
  verifyJwt,
  requirePermission('manajemen.quality.self_evaluation.manage'),
  qualityController.submitSelfEvaluation
);

// Akreditasi (#196)
router.get(
  '/accreditation-reports',
  verifyJwt,
  requirePermission('manajemen.quality.accreditation.view'),
  qualityController.listAccreditationReports
);

router.post(
  '/accreditation-reports',
  verifyJwt,
  requirePermission('manajemen.quality.accreditation.manage'),
  qualityController.createAccreditationReport
);

router.get(
  '/accreditation-reports/:id/evidences',
  verifyJwt,
  requirePermission('manajemen.quality.accreditation.view'),
  qualityController.listEvidences
);

router.post(
  '/accreditation-reports/:id/evidences',
  verifyJwt,
  requirePermission('manajemen.quality.accreditation.manage'),
  qualityController.uploadEvidence
);

router.get(
  '/accreditation-reports/:id/generate',
  verifyJwt,
  requirePermission('manajemen.quality.accreditation.view'),
  qualityController.generateSummary
);

// Dashboard Agregat Lintas Aplikasi (#201)
router.get(
  '/dashboard/cross-app',
  verifyJwt,
  requirePermission('manajemen.quality.dashboard_cross_app.view'),
  qualityController.getCrossAppDashboard
);

// Internal snapshot trigger
router.post(
  '/internal/dashboard/cross-app/snapshot',
  requireApiKey,
  qualityController.triggerSnapshot
);

// Manajemen Risiko (#202 & Fitur 9)
router.get(
  '/school-risks',
  verifyJwt,
  requirePermission('manajemen.quality.risks.view'),
  qualityController.listRisks
);

router.get(
  '/school-risks/heatmap',
  verifyJwt,
  requirePermission('manajemen.quality.risks.view'),
  qualityController.getRiskHeatmap
);

router.get(
  '/school-risks/:id',
  verifyJwt,
  requirePermission('manajemen.quality.risks.view'),
  qualityController.getRiskById
);

router.post(
  '/school-risks',
  verifyJwt,
  requirePermission('manajemen.quality.risks.manage'),
  qualityController.createRisk
);

router.put(
  '/school-risks/:id',
  verifyJwt,
  requirePermission('manajemen.quality.risks.manage'),
  qualityController.updateRisk
);

router.patch(
  '/school-risks/:id/mitigation',
  verifyJwt,
  requirePermission('manajemen.quality.risks.manage'),
  qualityController.updateRiskMitigation
);

router.patch(
  '/school-risks/:id/status',
  verifyJwt,
  requirePermission('manajemen.quality.risks.manage'),
  qualityController.updateRiskStatus
);

router.delete(
  '/school-risks/:id',
  verifyJwt,
  requirePermission('manajemen.quality.risks.manage'),
  qualityController.deleteRisk
);

module.exports = router;
