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
router.post('/attendances/check-in', authenticate, attendanceController.checkIn);
router.patch('/attendances/:id/check-out', authenticate, attendanceController.checkOut);
router.patch('/attendances/:id', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.correctAttendance);

// 2. Cuti & Izin
router.get('/leave-requests', authenticate, attendanceController.listLeaveRequests);
router.post('/leave-requests', authenticate, attendanceController.createLeaveRequest);
router.patch('/leave-requests/:id/approve', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.approveLeaveRequest);
router.patch('/leave-requests/:id/reject', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.rejectLeaveRequest);

// 3. Lembur
router.get('/overtimes', authenticate, attendanceController.listOvertimes);
router.post('/overtimes', authenticate, attendanceController.createOvertime);
router.patch('/overtimes/:id/approve', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.approveOvertime);
router.patch('/overtimes/:id/reject', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.rejectOvertime);

module.exports = router;
