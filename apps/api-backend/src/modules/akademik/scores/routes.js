/**
 * Scores Routes
 * Modul Akademik - Fitur 3: Penilaian (Assessment Types, Sessions, Scores & Report Cards)
 */
const express = require('express');
const router = express.Router();
const scoresController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Jenis Pengujian & Bobot Nilai Rapor
router.get('/assessment-types', authenticate, requirePermission('akademik.scores.read'), scoresController.listAssessmentTypes);
router.post('/assessment-types', authenticate, requirePermission('akademik.scores.create'), scoresController.createAssessmentType);
router.put('/assessment-types/:id', authenticate, requirePermission('akademik.scores.update'), scoresController.updateAssessmentType);
router.delete('/assessment-types/:id', authenticate, requirePermission('akademik.scores.delete'), scoresController.deleteAssessmentType);

// 2. Sesi Penilaian (Assessment Sessions)
router.get('/assessment-sessions', authenticate, requirePermission('akademik.scores.read'), scoresController.listAssessmentSessions);
router.post('/assessment-sessions', authenticate, requirePermission('akademik.scores.create'), scoresController.createAssessmentSession);
router.put('/assessment-sessions/:id', authenticate, requirePermission('akademik.scores.update'), scoresController.updateAssessmentSession);
router.delete('/assessment-sessions/:id', authenticate, requirePermission('akademik.scores.delete'), scoresController.deleteAssessmentSession);

// 3. Nilai Siswa per Sesi
router.get('/assessment-sessions/:id/scores', authenticate, requirePermission('akademik.scores.read'), scoresController.getSessionScores);
router.post('/assessment-sessions/:id/scores', authenticate, requirePermission('akademik.scores.create'), scoresController.saveSessionScoresBulk);

// 4. Rekap Matriks Nilai & Pengolahan Nilai Rapor
router.get('/scores/recap-matrix', authenticate, requirePermission('akademik.scores.read'), scoresController.getRecapMatrix);
router.post('/scores/process-report', authenticate, requirePermission('akademik.scores.create'), scoresController.processReportScores);
router.get('/scores/report-history', authenticate, requirePermission('akademik.scores.read'), scoresController.getReportScoreHistory);
router.post('/scores/report-history/:id/activate', authenticate, requirePermission('akademik.scores.update'), scoresController.activateReportScoreVersion);
router.patch('/scores/report-history/:id/toggle', authenticate, requirePermission('akademik.scores.update'), scoresController.toggleReportScoreVersion);
router.delete('/scores/report-history/:id', authenticate, requirePermission('akademik.scores.delete'), scoresController.deleteReportScoreVersion);
router.get('/scores/leger', authenticate, requirePermission('akademik.scores.read'), scoresController.getLegerData);

// 5. Nilai Akademik (Legacy / Standard)
router.get('/scores', authenticate, requirePermission('akademik.scores.read'), scoresController.listScores);
router.post('/scores', authenticate, requirePermission('akademik.scores.create'), scoresController.createScore);
router.post('/scores/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.createScoresBulk);
router.post('/scores/calculate-final', authenticate, requirePermission('akademik.scores.create'), scoresController.calculateFinalScore);

// 6. Nilai per Tujuan Pembelajaran (TP)
router.get('/tp-scores', authenticate, requirePermission('akademik.scores.read'), scoresController.listTpScores);
router.post('/tp-scores/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.saveTpScoresBulk);

// 7. Dimensi Sikap & Nilai Sikap
router.get('/attitude-dimensions', authenticate, requirePermission('akademik.scores.read'), scoresController.listAttitudeDimensions);
router.post('/attitude-dimensions', authenticate, requirePermission('akademik.scores.create'), scoresController.createAttitudeDimension);
router.put('/attitude-dimensions/:id', authenticate, requirePermission('akademik.scores.update'), scoresController.updateAttitudeDimension);
router.delete('/attitude-dimensions/:id', authenticate, requirePermission('akademik.scores.delete'), scoresController.deleteAttitudeDimension);

router.get('/attitude-scores', authenticate, requirePermission('akademik.scores.read'), scoresController.listAttitudeScores);
router.get('/attitude-scores/matrix', authenticate, requirePermission('akademik.scores.read'), scoresController.getAttitudeScoresMatrix);
router.post('/attitude-scores', authenticate, requirePermission('akademik.scores.create'), scoresController.createAttitudeScore);
router.post('/attitude-scores/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.saveAttitudeScoresBulk);

// 8. Nilai Ekstrakurikuler Wajib Pramuka
router.get('/scout-scores', authenticate, requirePermission('akademik.scores.read'), scoresController.getScoutScores);
router.post('/scout-scores/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.saveScoutScoresBulk);

// 9. Catatan Wali Kelas
router.get('/homeroom-notes', authenticate, requirePermission('akademik.scores.read'), scoresController.getHomeroomNotes);
router.post('/homeroom-notes/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.saveHomeroomNotesBulk);

// 10. Penilaian Ekstrakurikuler
router.get('/extracurricular-scores', authenticate, requirePermission('akademik.scores.read'), scoresController.listExtracurricularScores);
router.get('/extracurricular-scores/sheet', authenticate, requirePermission('akademik.scores.read'), scoresController.getExtracurricularScoringSheet);
router.post('/extracurricular-scores/bulk', authenticate, requirePermission('akademik.scores.create'), scoresController.saveExtracurricularScoresBulk);

module.exports = router;
