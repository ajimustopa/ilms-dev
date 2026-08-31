/**
 * PSB Candidate Portal Routes
 * Modul Akademik
 * Prefix: /api/v1/akademik/psb-portal/...
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate } = require('../../../../middlewares/auth');

// Seluruh route di bawah ini terotentikasi via JWT akun calon murid
router.use(authenticate);

// 1. Profil & Data Lengkap Calon Murid
router.get('/me', controller.getProfile);
router.put('/me/data-lengkap', controller.updateDataLengkap);

// 2. Berkas & Dokumen Pendaftaran
router.get('/me/documents', controller.listDocuments);
router.post('/me/documents', controller.uploadDocument);
router.delete('/me/documents/:docId', controller.deleteDocument);

// 3. Sesi Ujian & Pengerjaan Tes Online
router.get('/me/test-sessions', controller.listTestSessions);
router.get('/me/test-sessions/:sessionId', controller.getTestSessionDetail);
router.post('/me/test-sessions/:sessionId/submit', controller.submitTestSession);

module.exports = router;
