/**
 * Students Routes
 * Modul Akademik - Fitur: Data Master Siswa, Orang Tua / Wali, Mutasi, Onboarding,
 * Rekap Rapor DIK/DIN, Fisik Periodik & Dapodik Standard Lengkap
 */
const express = require('express');
const router = express.Router();
const studentsController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Data Induk Siswa CRUD
router.get('/students', authenticate, requirePermission('akademik.students.read'), studentsController.listStudents);
router.post('/students', authenticate, requirePermission('akademik.students.create'), studentsController.createStudent);
router.get('/students/:id', authenticate, requirePermission('akademik.students.read'), studentsController.getStudentById);
router.put('/students/:id', authenticate, requirePermission('akademik.students.update'), studentsController.updateStudent);
router.delete('/students/:id', authenticate, requirePermission('akademik.students.delete'), studentsController.deleteStudent);

// 2. Data Fisik Periodik
router.post('/students/:id/periodic-physical', authenticate, requirePermission('akademik.students.update'), studentsController.savePeriodicPhysical);
router.delete('/students/:id/periodic-physical/:recordId', authenticate, requirePermission('akademik.students.update'), studentsController.deletePeriodicPhysical);

// 3. Kelengkapan Rekap Rapor DIK/DIN
router.put('/students/:id/report-card-recaps', authenticate, requirePermission('akademik.students.update'), studentsController.saveReportCardRecaps);

// 4. Checklist Berkas Pendaftaran & Kelengkapan
router.put('/students/:id/document-checklist', authenticate, requirePermission('akademik.students.update'), studentsController.updateDocumentChecklist);

// 5. Relasi & Data Orang Tua / Wali
router.post('/students/:id/guardians', authenticate, requirePermission('akademik.students.update'), studentsController.saveGuardian);
router.delete('/students/:id/guardians/:guardianId', authenticate, requirePermission('akademik.students.update'), studentsController.deleteGuardian);

// 6. Riwayat Mutasi Siswa & Kelulusan
router.get('/student-mutations', authenticate, requirePermission('akademik.students.read'), studentsController.listMutations);
router.post('/student-mutations', authenticate, requirePermission('akademik.students.update'), studentsController.createMutation);

// 7. Kenaikan Kelas & Roll-over Tahun Ajaran (Data Periodik)
router.post('/students/promote', authenticate, requirePermission('akademik.students.update'), studentsController.promoteStudents);

module.exports = router;
