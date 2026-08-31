/**
 * Timetable Routes
 */
const express = require('express');
const router = express.Router();
const timetableController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Time Slots & Structure
router.get('/time-slots', authenticate, timetableController.listTimeSlots);
router.post('/time-slots', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.saveTimeSlot);
router.post('/time-slots/copy', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.copyTimeSlots);
router.delete('/time-slots/:id', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.deleteTimeSlot);

// 2. Teacher & Class Availabilities
router.get('/availabilities/teachers', authenticate, timetableController.getTeacherAvailabilities);
router.post('/availabilities/teachers/bulk', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.bulkSaveTeacherAvailabilities);
router.get('/availabilities/classes', authenticate, timetableController.getClassAvailabilities);
router.post('/availabilities/classes/bulk', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.bulkSaveClassAvailabilities);

// 3. Lessons & Workloads
router.get('/lessons', authenticate, timetableController.listLessons);
router.post('/lessons', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.saveLesson);
router.delete('/lessons/:id', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.deleteLesson);
router.post('/lessons/sync', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.syncLessons);

// 4. Non-Lesson Activities
router.get('/activities', authenticate, timetableController.listActivities);
router.post('/activities', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.saveActivity);
router.delete('/activities/:id', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.deleteActivity);

// 5. Timetable Generator Engine
router.post('/generate', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.runGenerator);

// 6. Timetable Runs & Entries
router.get('/runs', authenticate, timetableController.listRuns);
router.get('/runs/:id', authenticate, timetableController.getRunById);
router.post('/runs/:id/publish', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.publishRun);
router.post('/entries/swap', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.swapEntries);
router.put('/entries/:id', authenticate, requirePermission('akademik.class_groups.manage'), timetableController.updateEntry);

module.exports = router;
