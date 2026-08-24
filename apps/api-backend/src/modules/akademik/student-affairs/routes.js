/**
 * Student Affairs Routes
 * Modul Akademik - Fitur 6: Kesiswaan
 */
const express = require('express');
const router = express.Router();
const studentAffairsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Disiplin & Pelanggaran
router.get('/disciplinary-records', authenticate, requirePermission('akademik.disciplinary.read'), studentAffairsController.listDisciplinaryRecords);
router.post('/disciplinary-records', authenticate, requirePermission('akademik.disciplinary.create'), studentAffairsController.createDisciplinaryRecord);

// 2. Prestasi
router.get('/achievements', authenticate, requirePermission('akademik.students.read'), studentAffairsController.listAchievements);
router.post('/achievements', authenticate, requirePermission('akademik.students.update'), studentAffairsController.createAchievement);

// 3. Bimbingan Konseling
router.get('/counseling-records', authenticate, requirePermission('akademik.counseling.read'), studentAffairsController.listCounselingRecords);
router.post('/counseling-records', authenticate, requirePermission('akademik.counseling.create'), studentAffairsController.createCounselingRecord);

// 4. Ekstrakurikuler
router.get('/extracurriculars', authenticate, studentAffairsController.listExtracurriculars);
router.post('/extracurriculars', authenticate, requirePermission('akademik.class_groups.manage'), studentAffairsController.createExtracurricular);
router.post('/extracurriculars/:id/members', authenticate, requirePermission('akademik.class_groups.manage'), studentAffairsController.addExtracurricularMember);

// 5. Kalender Akademik
router.get('/calendar-events', authenticate, studentAffairsController.listCalendarEvents);
router.post('/calendar-events', authenticate, requirePermission('akademik.academic_years.manage'), studentAffairsController.createCalendarEvent);

module.exports = router;
