/**
 * Attendance Routes
 * Modul Akademik - Fitur 5: Presensi & Izin Siswa
 */
const express = require('express');
const router = express.Router();
const attendanceController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// 1. Presensi Harian
router.get('/attendances', authenticate, requirePermission('akademik.attendances.read'), attendanceController.listAttendances);
router.post('/attendances', authenticate, requirePermission('akademik.attendances.create'), attendanceController.recordAttendance);
router.post('/attendances/bulk', authenticate, requirePermission('akademik.attendances.create'), attendanceController.recordAttendanceBulk);
router.get('/attendances/summary', authenticate, requirePermission('akademik.attendances.read'), attendanceController.getSummary);

// 2. Pengajuan Izin / Sakit
router.get('/leave-requests', authenticate, attendanceController.listLeaveRequests);
router.post('/leave-requests', authenticate, attendanceController.createLeaveRequest);
router.put('/leave-requests/:id/approve', authenticate, requirePermission('akademik.attendances.create'), attendanceController.approveLeaveRequest);

module.exports = router;
