/**
 * Parent-Facing Routes Implementation
 * Menggunakan middleware requireApiKey (Internal Service-to-Service)
 */
const express = require('express');
const router = express.Router();
const parentFacingController = require('./controller');
const { requireApiKey } = require('../../../middlewares/auth');

router.get(
  '/parent-facing/students/:student_ref_id/loan-history',
  requireApiKey,
  parentFacingController.getStudentLoanHistory
);

module.exports = router;
