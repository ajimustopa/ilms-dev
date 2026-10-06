/**
 * Student Affairs Routes
 * Modul Akademik - Fitur 6: Kesiswaan, Kejadian Siswa Terpadu, & BK
 */
const express = require('express');
const router = express.Router();
const studentAffairsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Master Kategori Kejadian Siswa (Incident Categories)
router.get('/incident-categories', authenticate, studentAffairsController.listIncidentCategories);
router.post('/incident-categories', authenticate, requirePermission('akademik.disciplinary.manage'), studentAffairsController.createIncidentCategory);
router.put('/incident-categories/:id', authenticate, requirePermission('akademik.disciplinary.manage'), studentAffairsController.updateIncidentCategory);

// 2. Buku Catatan Kejadian Siswa Terpadu (Student Incidents)
router.get('/incidents', authenticate, studentAffairsController.listIncidents);
router.get('/incidents/:id', authenticate, studentAffairsController.getIncidentById);
router.post('/incidents', authenticate, studentAffairsController.createIncident);
router.put('/incidents/:id', authenticate, studentAffairsController.updateIncident);
router.patch('/incidents/:id/handling-status', authenticate, studentAffairsController.updateHandlingStatus);
router.patch('/incidents/:id/verify-points', authenticate, requirePermission('akademik.disciplinary.manage'), studentAffairsController.verifyIncidentPoints);
router.get('/incidents/students/:student_id/summary', authenticate, studentAffairsController.getStudentIncidentSummary);

// 3. Disiplin & Pelanggaran (Legacy Compatibility)
router.get('/disciplinary-records', authenticate, requirePermission('akademik.disciplinary.read'), studentAffairsController.listDisciplinaryRecords);
router.post('/disciplinary-records', authenticate, requirePermission('akademik.disciplinary.create'), studentAffairsController.createDisciplinaryRecord);

// 4. Prestasi (Legacy Compatibility)
router.get('/achievements', authenticate, requirePermission('akademik.students.read'), studentAffairsController.listAchievements);
router.post('/achievements', authenticate, requirePermission('akademik.students.update'), studentAffairsController.createAchievement);

// 5. Bimbingan Konseling (Counseling Records)
router.get('/counseling-records', authenticate, requirePermission('akademik.counseling.read'), studentAffairsController.listCounselingRecords);
router.post('/counseling-records', authenticate, requirePermission('akademik.counseling.create'), studentAffairsController.createCounselingRecord);

// 6. Ekstrakurikuler
router.get('/extracurriculars', authenticate, studentAffairsController.listExtracurriculars);
router.post('/extracurriculars', authenticate, requirePermission('akademik.class_groups.manage'), studentAffairsController.createExtracurricular);
router.post('/extracurriculars/:id/members', authenticate, requirePermission('akademik.class_groups.manage'), studentAffairsController.addExtracurricularMember);

// 7. Kalender Akademik
router.get('/calendar-events', authenticate, studentAffairsController.listCalendarEvents);
router.post('/calendar-events', authenticate, requirePermission('akademik.academic_years.manage'), studentAffairsController.createCalendarEvent);

module.exports = router;
