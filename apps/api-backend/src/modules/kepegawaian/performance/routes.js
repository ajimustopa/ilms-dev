/**
 * Performance Routes
 * Modul Kepegawaian - Fitur 5: Penilaian Kinerja & Statistik
 */
const express = require('express');
const router = express.Router();
const performanceController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Penilaian Kinerja
router.get('/performance-reviews', authenticate, performanceController.listReviews);
router.post('/performance-reviews', authenticate, requirePermission('kepegawaian.performance_reviews.manage'), performanceController.createReview);
router.put('/performance-reviews/:id', authenticate, requirePermission('kepegawaian.performance_reviews.manage'), performanceController.updateReview);

// 2. Statistik Kepegawaian
router.get('/statistics', authenticate, requirePermission('kepegawaian.statistics.view'), performanceController.getStatistics);

module.exports = router;
