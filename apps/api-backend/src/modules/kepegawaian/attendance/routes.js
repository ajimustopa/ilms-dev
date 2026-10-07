/**
 * Attendance Routes
 * Modul Kepegawaian - Fitur 3: Kehadiran (Presensi, Cuti & Izin, Lembur, Rekapitulasi & Mutasi)
 */
const express = require('express');
const router = express.Router();
const attendanceController = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// ==========================================
// 1. Presensi / Absensi HRD & Guru
// ==========================================
// Specific sub-paths first (avoiding parameter collision with :id)
router.get('/attendances/dashboard-summary', authenticate, attendanceController.getDashboardSummary);
router.get('/attendances/today-status', authenticate, attendanceController.getTodayStatus);
router.get('/attendances/absent-candidates', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.listAbsentCandidates);
router.post('/attendances/quick-mark', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.quickMarkAttendance);
router.get('/attendances/anomalies', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.listAnomalies);
router.post('/attendances/anomalies/:id/resolve', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.resolveAnomaly);
router.patch('/attendances/anomalies/:id/resolve', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.resolveAnomaly);

router.get('/attendances/monthly-summary', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.getMonthlySummary);
router.get('/attendances/monthly-matrix', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.getMonthlyMatrix);
router.get('/attendances/monthly-trends', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.getMonthlyTrends);
router.get('/attendances/export-excel', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.exportMonthlyExcel);
router.get('/attendances/export-pdf', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.exportMonthlyPdf);

router.post('/attendances/manual-entry', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.manualEntry);
router.post('/attendances/bulk-manual-entry', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.bulkManualEntry);

router.get('/attendances/period-lock-status', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.getPeriodLockStatus);
router.get('/attendances/period-readiness', authenticate, requirePermission('kepegawaian.attendances.read'), attendanceController.getPeriodReadiness);
router.post('/attendances/lock-period', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.lockPeriod);
router.post('/attendances/unlock-period', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.unlockPeriod);
router.post('/attendances/submit-to-payroll', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.submitPeriodToPayroll);

// General list & actions
router.get('/attendances', authenticate, attendanceController.listAttendances);
router.get('/attendances/:id/detail', authenticate, attendanceController.getAttendanceDetail);
router.post('/attendances/check-in', authenticate, attendanceController.checkIn);
router.patch('/attendances/:id/check-out', authenticate, attendanceController.checkOut);
router.patch('/attendances/:id', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.correctAttendance);

// Klarifikasi Lupa Absen / Antrean Koreksi
router.post('/attendances/clarifications', authenticate, attendanceController.submitClarification);
router.get('/attendances/clarifications', authenticate, attendanceController.listClarifications);
router.get('/attendances/clarifications/:id', authenticate, attendanceController.getClarificationDetail);
router.patch('/attendances/clarifications/:id/review', authenticate, requirePermission('kepegawaian.attendances.manage'), attendanceController.reviewClarification);

// ==========================================
// 2. Cuti & Izin
// ==========================================
router.get('/leave-requests', authenticate, attendanceController.listLeaveRequests);
router.get('/leave-requests/my', authenticate, attendanceController.getMyLeaveRequests);
router.get('/leave-requests/:id/attachment', authenticate, attendanceController.getLeaveAttachment);
router.post('/leave-requests', authenticate, attendanceController.createLeaveRequest);
router.patch('/leave-requests/:id/approve', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.approveLeaveRequest);
router.patch('/leave-requests/:id/reject', authenticate, requirePermission('kepegawaian.leave_requests.manage'), attendanceController.rejectLeaveRequest);

// ==========================================
// 3. Lembur
// ==========================================
router.get('/overtimes', authenticate, attendanceController.listOvertimes);
router.get('/overtimes/my', authenticate, attendanceController.getMyOvertimes);
router.post('/overtimes', authenticate, attendanceController.createOvertime);
router.patch('/overtimes/:id/approve', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.approveOvertime);
router.patch('/overtimes/:id/reject', authenticate, requirePermission('kepegawaian.overtimes.manage'), attendanceController.rejectOvertime);

// ==========================================
// 4. Penugasan Jadwal Kerja
// ==========================================
router.get('/schedule-assignments', authenticate, attendanceController.listScheduleAssignments);
router.get('/schedule-assignments/:id', authenticate, attendanceController.getScheduleAssignmentById);
router.post('/schedule-assignments', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.createScheduleAssignment);
router.post('/schedule-assignments/set-all-default-location', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.setAllEmployeesDefaultLocation);
router.put('/schedule-assignments/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.updateScheduleAssignment);
router.delete('/schedule-assignments/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.deleteScheduleAssignment);

// ==========================================
// 5. Master Lokasi Absensi GPS
// ==========================================
router.get('/locations', authenticate, attendanceController.listLocations);
router.get('/locations/:id', authenticate, attendanceController.getLocationById);
router.post('/locations', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.createLocation);
router.put('/locations/:id', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.updateLocation);
router.patch('/locations/:id/set-default', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.setDefaultLocation);
router.delete('/locations/:id', authenticate, requirePermission('kepegawaian.attendance_locations.manage'), attendanceController.deleteLocation);

// ==========================================
// 6. Pengaturan Jam Kerja & Shift
// ==========================================
router.get('/work-schedules', authenticate, attendanceController.listWorkSchedules);
router.get('/work-schedules/:id', authenticate, attendanceController.getWorkScheduleById);
router.post('/work-schedules', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.createWorkSchedule);
router.put('/work-schedules/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.updateWorkSchedule);
router.delete('/work-schedules/:id', authenticate, requirePermission('kepegawaian.work_schedules.manage'), attendanceController.deleteWorkSchedule);

module.exports = router;
