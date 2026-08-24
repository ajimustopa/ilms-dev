/**
 * Exams Routes for Alquran Module
 * Sesuai api-contract-alquran.md §2.3 & roles-alquran.md §4 & §5
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyJwt, requirePermission } = require('../../../middlewares/auth');

router.get(
  '/exams',
  verifyJwt,
  requirePermission('alquran.exams.view'),
  controller.listExams
);

router.post(
  '/exams',
  verifyJwt,
  requirePermission('alquran.exams.schedule'),
  controller.createExam
);

router.patch(
  '/exams/:id/result',
  verifyJwt,
  requirePermission('alquran.exams.record_result'),
  controller.recordResult
);

module.exports = router;
