/**
 * Integration Routes (Parent-Facing) for Alquran Module
 * Sesuai api-contract-alquran.md §2.6 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { requireApiKey } = require('../../../middlewares/auth');

router.get(
  '/internal/students/:student_ref_id/achievements',
  requireApiKey,
  controller.getStudentAchievements
);

module.exports = router;
