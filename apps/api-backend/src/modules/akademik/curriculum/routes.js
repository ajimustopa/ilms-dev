/**
 * Curriculum Routes
 * Modul Akademik - Fitur Master Data: Tahun Ajaran, Angkatan (Cohorts),
 * Tingkat Kelas (Grade Levels), Rombongan Belajar (Class Groups), Anggota Rombel,
 * Mapel, dan Jadwal Ajar.
 */
const express = require('express');
const router = express.Router();
const curriculumController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Tahun Ajaran & Semester
router.get('/academic-years', authenticate, curriculumController.listAcademicYears);
router.post('/academic-years', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.createAcademicYear);
router.put('/academic-years/:id', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.updateAcademicYear);
router.delete('/academic-years/:id', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.deleteAcademicYear);
router.put('/academic-years/:id/activate', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.activateAcademicYear);

router.get('/semesters', authenticate, curriculumController.listSemesters);
router.post('/semesters', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.createSemester);
router.put('/semesters/:id', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.updateSemester);
router.delete('/semesters/:id', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.deleteSemester);
router.put('/semesters/:id/activate', authenticate, requirePermission('akademik.academic_years.manage'), curriculumController.activateSemester);

// 2. Angkatan (Cohorts)
router.get('/cohorts', authenticate, curriculumController.listCohorts);
router.post('/cohorts', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createCohort);
router.put('/cohorts/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.updateCohort);
router.delete('/cohorts/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.deleteCohort);

// 3. Tingkat Kelas (Grade Levels)
router.get('/grade-levels', authenticate, curriculumController.listGradeLevels);
router.post('/grade-levels', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createGradeLevel);
router.put('/grade-levels/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.updateGradeLevel);
router.delete('/grade-levels/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.deleteGradeLevel);

// 4. Rombongan Belajar (Class Groups)
router.get('/class-groups', authenticate, curriculumController.listClassGroups);
router.get('/class-groups/:id', authenticate, curriculumController.getClassGroupById);
router.post('/class-groups', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createClassGroup);
router.put('/class-groups/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.updateClassGroup);
router.delete('/class-groups/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.deleteClassGroup);

// 5. Anggota Rombel & Siswa Belum Masuk Rombel (Unassigned Picker)
router.get('/unassigned-students', authenticate, curriculumController.listUnassignedStudents);
router.get('/class-groups/removal-logs', authenticate, curriculumController.listClassRemovalLogs);
router.get('/class-groups/:id/members', authenticate, curriculumController.listClassGroupMembers);
router.post('/class-groups/:id/members', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.addStudentsToClassGroup);
router.delete('/enrollments/:enrollmentId', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.removeStudentFromClassGroup);
router.put('/enrollments/:enrollmentId/transfer', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.transferStudentClassGroup);

// 6. Mata Pelajaran
router.get('/subjects/logs', authenticate, curriculumController.listSubjectLogs);
router.get('/subjects', authenticate, curriculumController.listSubjects);
router.post('/subjects', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.createSubject);
router.put('/subjects/:id', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.updateSubject);
router.put('/subjects/:id/toggle-status', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.toggleSubjectStatus);
router.delete('/subjects/:id', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.deleteSubject);

// 7. Pembagian Tugas Mengajar & Ekskul (Multi-Teacher & Audit Logs)
router.get('/my-teaching-assignments', authenticate, curriculumController.getMyTeachingAssignments);
router.get('/curriculum/my-teaching-assignments', authenticate, curriculumController.getMyTeachingAssignments);
router.get('/teaching-duties', authenticate, curriculumController.listTeachingDuties);
router.post('/teaching-duties', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.assignTeacherDuty);
router.delete('/teaching-duties/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.removeTeacherDuty);
router.get('/teaching-duties/logs', authenticate, curriculumController.listTeachingDutyLogs);

// 8. Opsi / Preset Jadwal Pelajaran
router.get('/schedule-presets', authenticate, curriculumController.listSchedulePresets);
router.post('/schedule-presets', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createSchedulePreset);
router.put('/schedule-presets/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.updateSchedulePreset);
router.put('/schedule-presets/:id/activate', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.activateSchedulePreset);
router.delete('/schedule-presets/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.deleteSchedulePreset);

// 9. Jadwal Pelajaran (Schedules & Anti-Bentrok & Audit Logs)
router.get('/my-schedules', authenticate, curriculumController.getMySchedules);
router.get('/curriculum/my-schedules', authenticate, curriculumController.getMySchedules);
router.get('/schedules/logs', authenticate, curriculumController.listScheduleLogs);
router.get('/schedules', authenticate, curriculumController.listSchedules);
router.post('/schedules', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createSchedule);
router.put('/schedules/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.updateSchedule);
router.delete('/schedules/:id', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.deleteSchedule);
router.put('/schedules/:id/toggle-status', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.toggleScheduleStatus);

// 10. Jadwal Ajar Legacy
router.get('/teaching-assignments', authenticate, curriculumController.listTeachingAssignments);
router.post('/teaching-assignments', authenticate, requirePermission('akademik.class_groups.manage'), curriculumController.createTeachingAssignment);


// 10. Tujuan Pembelajaran (Learning Objectives)
router.get('/learning-objectives', authenticate, curriculumController.listLearningObjectives);
router.post('/learning-objectives/bulk', authenticate, requirePermission('akademik.subjects.manage', 'akademik.scores.manage', 'akademik.view'), curriculumController.createLearningObjectivesBulk);
router.post('/learning-objectives', authenticate, requirePermission('akademik.subjects.manage', 'akademik.scores.manage', 'akademik.view'), curriculumController.createLearningObjective);
router.put('/learning-objectives/:id', authenticate, requirePermission('akademik.subjects.manage', 'akademik.scores.manage', 'akademik.view'), curriculumController.updateLearningObjective);
router.delete('/learning-objectives/:id', authenticate, requirePermission('akademik.subjects.manage', 'akademik.scores.manage', 'akademik.view'), curriculumController.deleteLearningObjective);


// 11. KKM / KKTP Per Kelas & Tahun Ajaran
router.get('/subject-grade-kkms', authenticate, curriculumController.listSubjectGradeKkms);
router.post('/subject-grade-kkms', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.batchUpsertSubjectGradeKkms);
router.delete('/subject-grade-kkms/:id', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.deleteSubjectGradeKkm);

// 12. Struktur Kurikulum (Alokasi JP per Mapel per Jenjang Kelas per Pekan)
router.get('/curriculum-structures', authenticate, curriculumController.listCurriculumStructures);
router.post('/curriculum-structures', authenticate, requirePermission('akademik.subjects.manage'), curriculumController.saveCurriculumStructures);

// 13. Jurnal Mengajar Guru (Teaching Journals)
router.get('/teaching-journals/today-status', authenticate, curriculumController.getTeachingJournalTodayStatus);
router.get('/teaching-journals', authenticate, curriculumController.listTeachingJournals);
router.get('/teaching-journals/:id', authenticate, curriculumController.getTeachingJournalById);
router.post('/teaching-journals', authenticate, curriculumController.createTeachingJournal);
router.put('/teaching-journals/:id', authenticate, curriculumController.updateTeachingJournal);
router.delete('/teaching-journals/:id', authenticate, curriculumController.deleteTeachingJournal);

module.exports = router;


