/**
 * Psychotest Routes
 * Modul Kepegawaian - Fitur Tes Psikologi (MBTI & Big Five OCEAN)
 * 
 * 4 Kelompok Endpoint:
 * 1. Bank Soal & Tipe Tes (Admin - requirePermission('kepegawaian.psychotest_bank.manage'))
 * 2. Sesi & Laporan HRD (HRD - requirePermission('kepegawaian.psychotest_sessions.manage'))
 * 3. Self-Service Karyawan (Pegawai - authenticate)
 * 4. Publik Token-Based (Kandidat Pelamar - validatePublicToken tanpa JWT)
 */
const express = require('express');
const router = express.Router();
const psychotestController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');
const { validatePublicToken } = require('./publicTokenMiddleware');

// =========================================================================
// 6.4 PUBLIK TOKEN-BASED (Kandidat Pelamar / Eksternal - Tanpa JWT)
// =========================================================================
router.get('/public/:token', validatePublicToken, psychotestController.verifyPublicToken);
router.get('/public/:token/questions', validatePublicToken, psychotestController.getPublicQuestions);
router.post('/public/:token/answers', validatePublicToken, psychotestController.savePublicAnswers);
router.post('/public/:token/submit', validatePublicToken, psychotestController.submitPublicTest);
router.get('/public/:token/result', validatePublicToken, psychotestController.getPublicResult);

// =========================================================================
// 6.3 SELF-SERVICE KARYAWAN (Pegawai Aktif - JWT Authenticated)
// =========================================================================
router.get('/my-tests', authenticate, psychotestController.getMyTests);
router.get('/my-tests/:session_id/take', authenticate, psychotestController.takeMyTest);
router.post('/my-tests/:session_id/answer', authenticate, psychotestController.answerMyTest);
router.post('/my-tests/:session_id/submit', authenticate, psychotestController.submitMyTest);
router.get('/my-tests/:session_id/result', authenticate, psychotestController.getMyTestResult);

// =========================================================================
// 6.1 BANK SOAL & TIPE INSTRUMEN (Admin - kepegawaian.psychotest_bank.manage)
// =========================================================================
// Types
router.get('/types', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.listTypes);
router.post('/types', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.createType);
router.get('/types/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.getTypeById);
router.put('/types/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.updateType);
router.delete('/types/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.deleteType);

// Dimensions
router.get('/dimensions', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.listDimensions);
router.post('/dimensions', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.createDimension);
router.put('/dimensions/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.updateDimension);
router.delete('/dimensions/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.deleteDimension);

// Questions
router.get('/questions', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.listQuestions);
router.post('/questions', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.createQuestion);
router.get('/questions/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.getQuestionById);
router.put('/questions/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.updateQuestion);
router.delete('/questions/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.deleteQuestion);

// Profiles & Interpretation
router.get('/profiles', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.listProfiles);
router.put('/profiles/:id', authenticate, requirePermission('kepegawaian.psychotest_bank.manage'), psychotestController.updateProfile);

// =========================================================================
// 6.2 SESI & LAPORAN HRD (Admin HRD - kepegawaian.psychotest_sessions.manage)
// =========================================================================
router.get('/reports/summary', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.getReportsSummary);
router.get('/sessions', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.listSessions);
router.post('/sessions', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.createSession);
router.get('/sessions/:id', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.getSessionById);
router.delete('/sessions/:id', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.deleteSession);
router.get('/sessions/:id/result', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.getSessionById);
router.post('/sessions/:id/evaluate', authenticate, requirePermission('kepegawaian.psychotest_sessions.manage'), psychotestController.evaluateSession);

module.exports = router;
