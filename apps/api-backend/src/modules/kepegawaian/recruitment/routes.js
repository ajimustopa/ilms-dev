/**
 * Recruitment Routes
 * Modul Kepegawaian - Fitur 1.6: Rekrutmen & Onboarding Pegawai Lengkap
 */
const express = require('express');
const router = express.Router();
const recruitmentController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Kandidat Pelamar (Candidates)
router.get('/recruitment-candidates', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.list);
router.post('/recruitment-candidates', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.create);
router.get('/recruitment-candidates/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.getById);
router.put('/recruitment-candidates/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.update);
router.delete('/recruitment-candidates/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.delete);
router.patch('/recruitment-candidates/:id/stage', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.updateStage);
router.post('/recruitment-candidates/:id/stages', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.addStageHistory);
router.post('/recruitment-candidates/:id/activate', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.activate);

// 2. Evaluasi Wawancara (Interview)
router.post('/recruitment-candidates/:id/interviews', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.addInterview);
router.delete('/recruitment/interviews/:interviewId', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.deleteInterview);

// 3. Bank Soal & Instrumen Tes (Psikotes & Wawancara)
router.get('/recruitment-instruments', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.listInstruments);
router.post('/recruitment-instruments', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.createInstrument);
router.get('/recruitment-instruments/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.getInstrumentById);
router.put('/recruitment-instruments/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.updateInstrument);
router.delete('/recruitment-instruments/:id', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.deleteInstrument);

// 4. Hasil & Koreksi Otomatis Tes Psikotes
router.post('/recruitment-candidates/:id/test-results', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.submitTestResult);

// 5. Evaluasi Microteaching (Khusus Guru)
router.post('/recruitment-candidates/:id/microteachings', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.addMicroteaching);
router.delete('/recruitment/microteachings/:microteachingId', authenticate, requirePermission('kepegawaian.recruitment.manage'), recruitmentController.deleteMicroteaching);

module.exports = router;
