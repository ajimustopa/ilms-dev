/**
 * Leave & Overtime Routes
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §11
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, requirePermission } = require('../../../middlewares/auth');

// ==========================================
// 1. Master Cuti & Pengaturan
// ==========================================
router.get('/leave-types', authenticate, controller.getLeaveTypes);
router.get('/leave-types/:id', authenticate, controller.getLeaveTypeDetail);
router.post('/leave-types', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.createLeaveType);
router.put('/leave-types/:id', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.updateLeaveType);
router.patch('/leave-types/:id/active', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.toggleLeaveTypeActive);
router.delete('/leave-types/:id', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.deleteLeaveType);

router.get('/approval-profiles', authenticate, controller.getApprovalProfiles);
router.put('/approval-profiles/:id', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.updateApprovalProfile);

router.get('/unit-approvers/suggestions', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.getPrincipalSuggestions);
router.get('/unit-approvers', authenticate, controller.getUnitApprovers);
router.post('/unit-approvers', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.setUnitApprover);
router.put('/unit-approvers/:id', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.updateUnitApprover);
router.delete('/unit-approvers/:id', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.deleteUnitApprover);

router.get('/approval-delegations', authenticate, controller.getDelegations);
router.post('/approval-delegations', authenticate, controller.createDelegation);
router.delete('/approval-delegations/:id', authenticate, controller.deleteDelegation);

router.get('/leave-settings', authenticate, controller.getLeaveSettings);
router.put('/leave-settings', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.updateLeaveSettings);

router.get('/absence-thresholds', authenticate, controller.getAbsenceThresholds);
router.put('/absence-thresholds', authenticate, requirePermission('kepegawaian.leave_types.manage'), controller.updateAbsenceThresholds);

// ==========================================
// 1b. Kelengkapan Profil Pegawai (Join Date & Atasan Langsung) - SPEC §11.1
// ==========================================
router.get('/leave-employee-profile', authenticate, requirePermission('kepegawaian.leave_balances.read', 'kepegawaian.leave_balances.manage'), controller.getEmployeeProfiles);
router.patch('/leave-employee-profile/:employeeId', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.updateEmployeeProfile);

// ==========================================
// 2. Hari Libur (Holidays) - SPEC §11.1
// ==========================================
router.get('/holidays', authenticate, controller.getHolidays);
router.get('/holidays/effective', authenticate, controller.getEffectiveHolidays);
router.post('/holidays/import', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.importHolidays);
router.post('/holidays/copy-year', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.copyYearHolidays);
router.post('/holidays/sync-academic', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.syncAcademicHolidays);
router.post('/holidays/:id/apply-joint-leave-deduction', authenticate, requirePermission('kepegawaian.holidays.manage', 'kepegawaian.leave_balances.manage'), controller.applyJointLeaveDeduction);
router.post('/holidays', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.createHoliday);
router.put('/holidays/:id', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.updateHoliday);
router.delete('/holidays/:id', authenticate, requirePermission('kepegawaian.holidays.manage'), controller.deleteHoliday);

// ==========================================
// 3. Saldo Cuti & Ledger (SPEC §11.3 & §11.1)
// ==========================================
router.get('/leave-balance-policies', authenticate, requirePermission('kepegawaian.leave_balances.manage', 'kepegawaian.leave_balances.read'), controller.getBalancePolicies);
router.put('/leave-balance-policies/:id', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.updateBalancePolicy);
router.get('/leave-balances', authenticate, requirePermission('kepegawaian.leave_balances.read', 'kepegawaian.leave_balances.manage'), controller.getBalances);
router.get('/leave-balances/my', authenticate, controller.getMyBalance);
router.get('/leave-balances/:employeeId/ledger', authenticate, requirePermission('kepegawaian.leave_balances.read', 'kepegawaian.leave_balances.manage'), controller.getLedger);
router.post('/leave-balances/adjust', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.adjustBalance);
router.post('/leave-balances/bulk-assign', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.bulkAssignBalances);
router.post('/leave-balances/periods/:id/close', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.closePeriod);
router.post('/leave-balances/periods/:id/reconcile', authenticate, requirePermission('kepegawaian.leave_balances.manage'), controller.reconcilePeriod);

// ==========================================
// 4. Permohonan Cuti / Izin
// ==========================================
router.get('/leave-requests/calendar-matrix', authenticate, requirePermission('kepegawaian.leave_requests.read', 'kepegawaian.leave_requests.manage'), controller.getCalendarMatrix);
router.get('/leave-requests/reports/summary', authenticate, requirePermission('kepegawaian.leave_reports.read'), controller.getReportsSummary);
router.get('/payroll-feed', authenticate, controller.getPayrollFeed);

router.get('/leave-requests/my', authenticate, controller.getMyLeaveRequests);
router.get('/leave-requests/inbox', authenticate, controller.getLeaveInbox);
router.get('/leave-requests/needs-review', authenticate, requirePermission('kepegawaian.leave_requests.read', 'kepegawaian.leave_requests.manage'), controller.getLeaveNeedsReview);
router.get('/leave-requests', authenticate, requirePermission('kepegawaian.leave_requests.read', 'kepegawaian.leave_requests.manage'), controller.listLeaveRequests);

router.post('/leave-requests/preview-duration', authenticate, controller.previewDuration);
router.post('/leave-requests/preview', authenticate, controller.previewLeaveRequest);
router.post('/leave-requests/bulk-approve', authenticate, controller.bulkApproveLeaveRequests);
router.post('/leave-requests/bulk-reject', authenticate, controller.bulkRejectLeaveRequests);
router.post('/leave-requests', authenticate, controller.createLeaveRequest);

router.get('/leave-requests/:id/attachment', authenticate, controller.getLeaveAttachment);
router.get('/leave-requests/:id', authenticate, controller.getLeaveRequestDetail);

router.patch('/leave-requests/:id/approve', authenticate, controller.approveLeaveRequest);
router.patch('/leave-requests/:id/reject', authenticate, controller.rejectLeaveRequest);
router.patch('/leave-requests/:id/request-revision', authenticate, controller.requestRevision);
router.patch('/leave-requests/:id/resubmit', authenticate, controller.resubmitLeaveRequest);
router.patch('/leave-requests/:id/cancel', authenticate, controller.cancelLeaveRequest);
router.patch('/leave-requests/:id/reassign-approver', authenticate, requirePermission('kepegawaian.leave_requests.manage', 'kepegawaian.leave_requests.override'), controller.reassignApprover);
router.patch('/leave-requests/:id/reclassify', authenticate, requirePermission('kepegawaian.leave_requests.override'), controller.reclassifyLeaveRequest);
router.post('/leave-requests/:id/recalculate', authenticate, requirePermission('kepegawaian.leave_requests.manage', 'kepegawaian.leave_requests.override'), controller.recalculateLeaveRequest);

// ==========================================
// 5. Lembur (Overtime)
// ==========================================
router.get('/overtimes/my', authenticate, controller.getMyOvertimes);
router.get('/overtimes', authenticate, requirePermission('kepegawaian.leave_requests.read', 'kepegawaian.overtimes.manage'), controller.listOvertimes);
router.get('/overtimes/:id', authenticate, controller.getOvertimeDetail);
router.post('/overtimes', authenticate, controller.createOvertime);
router.patch('/overtimes/:id/approve', authenticate, requirePermission('kepegawaian.overtimes.manage'), controller.approveOvertime);
router.patch('/overtimes/:id/reject', authenticate, requirePermission('kepegawaian.overtimes.manage'), controller.rejectOvertime);
router.patch('/overtimes/:id/cancel', authenticate, controller.cancelOvertime);
router.patch('/overtimes/:id/reconcile', authenticate, requirePermission('kepegawaian.overtimes.manage'), controller.reconcileOvertime);

module.exports = router;
