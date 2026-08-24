/**
 * Internal Routes (Service-to-Service via X-API-Key)
 * Modul Akademik - Fitur 9: Integrasi Antar-Layanan
 */
const express = require('express');
const router = express.Router();
const internalController = require('./controller');
const { requireApiKey } = require('../../../middlewares/auth');

router.get('/internal/students/:id', requireApiKey, internalController.getStudentBrief);
router.get('/internal/students', requireApiKey, internalController.listActiveStudents);
router.get('/internal/students/:id/guardians', requireApiKey, internalController.getStudentGuardians);
router.get('/internal/class-groups/:id', requireApiKey, internalController.getClassGroupDetail);
router.post('/internal/scores/exam-result', requireApiKey, internalController.receiveExamResult);

module.exports = router;
