/**
 * Attendance Routes
 * Modul Kepegawaian - Fitur 3: Kehadiran (Presensi, Cuti & Izin, Lembur)
 */
const express = require('express');
const router = express.Router();
const attendanceController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Presensi / Absensi
router.get('/attendances', authenticate, attendanceController.listAttendances);
router.get('/attendances/today-status', authenticate, attendanceController.getTodayStatus);
router.post('/attendances/check-in', authenticate, attendanceController.checkIn);
router.patch('/attendances/:id/check-out', authenticate, attendanceController.checkOut);
router.patch('/attendances/:id', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.correctAttendance);

// 2. Cuti & Izin
router.get('/leave-requests', authenticate, attendanceController.listLeaveRequests);
router.get('/leave-requests/my', authenticate, attendanceController.getMyLeaveRequests);
router.get('/leave-requests/:id/attachment', authenticate, attendanceController.getLeaveAttachment);
router.post('/leave-requests', authenticate, attendanceController.createLeaveRequest);
router.patch('/leave-requests/:id/approve', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.approveLeaveRequest);
router.patch('/leave-requests/:id/reject', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.rejectLeaveRequest);

// 3. Lembur
router.get('/overtimes', authenticate, attendanceController.listOvertimes);
router.post('/overtimes', authenticate, attendanceController.createOvertime);
router.patch('/overtimes/:id/approve', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.approveOvertime);
router.patch('/overtimes/:id/reject', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.rejectOvertime);

// 4. Master Lokasi Absensi GPS (Multi-Titik)
router.get('/locations', authenticate, attendanceController.listLocations);
router.get('/locations/:id', authenticate, attendanceController.getLocationById);
router.post('/locations', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.createLocation);
router.put('/locations/:id', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.updateLocation);
router.delete('/locations/:id', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.deleteLocation);

// 5. Pengaturan Jam Kerja & Toleransi Shift
router.get('/work-schedules', authenticate, attendanceController.listWorkSchedules);
router.get('/work-schedules/:id', authenticate, attendanceController.getWorkScheduleById);
router.post('/work-schedules', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.createWorkSchedule);
router.put('/work-schedules/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.updateWorkSchedule);
router.delete('/work-schedules/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.deleteWorkSchedule);

module.exports = router;
