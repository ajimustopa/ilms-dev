/**
 * Leave & Overtime Backend Integration Tests
 * Runs against local dev DB (127.0.0.1:3306)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '.env.dev') });

const db = require('../../../config/db/kepegawaian');
const leaveService = require('./leaveService');
const leaveLedgerService = require('./leaveLedgerService');
const leaveTypeService = require('./leaveTypeService');
const overtimeService = require('./overtimeService');

test.before(async () => {
  await db('employee_leave_requests').del();
  await db('leave_ledger_entries').del();
  await db('employee_leave_balances').del();
  await db('employee_overtimes').del();
  await db('approval_steps').del();
});

test.after(async () => {
  await db.destroy();
});

test('Integration: Get leave types', async () => {
  const actor = {
    userId: 2,
    employeeId: 1,
    permissions: ['kepegawaian.leave_types.manage', 'kepegawaian.leave_requests.read'],
    unitScope: [1]
  };
  const types = await leaveTypeService.getLeaveTypes({}, actor);
  assert.ok(Array.isArray(types));
  assert.ok(types.length >= 18);
  const annual = types.find(t => t.code === 'cuti_tahunan');
  assert.ok(annual);
  assert.equal(annual.deducts_balance, 1);
});

test('Integration: Ensure entitlement for employee 3 (Budi - GTY full 12.0) and employee 4 (Dewi - PTY prorated 9.0)', async () => {
  const balBudi = await leaveLedgerService.ensureEntitlement(3, '2026/2027');
  assert.equal(parseFloat(balBudi.granted), 12.0);
  assert.equal(parseFloat(balBudi.available), 12.0);

  const balDewi = await leaveLedgerService.ensureEntitlement(4, '2026/2027');
  assert.equal(parseFloat(balDewi.granted), 9.0);
  assert.equal(parseFloat(balDewi.available), 9.0);
});

test('Integration: Preview and Create Leave Request for Budi (3 days cuti tahunan)', async () => {
  const actor = {
    userId: 4,
    employeeId: 3,
    permissions: [],
    unitScope: [1]
  };

  // Preview
  const preview = await leaveService.previewLeaveRequest({
    employee_id: 3,
    leave_type: 'cuti_tahunan',
    start_date: '2026-11-02', // Monday
    end_date: '2026-11-04',   // Wednesday
    start_portion: 'full',
    end_portion: 'full'
  }, actor);

  assert.equal(preview.duration_days, 3.0);
  assert.equal(preview.balance_impact.isSufficient, true);
  assert.equal(preview.balance_impact.availableAfter, 9.0);

  // Submit
  const req = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2026-11-02',
    end_date: '2026-11-04',
    reason: 'Keperluan keluarga'
  }, actor);

  assert.ok(req.id);
  assert.equal(req.status, 'pending');
  assert.equal(req.duration_days, 3.0);

  // Check balance reserved
  const balAfter = await leaveLedgerService.getEmployeeBalance(3);
  assert.equal(balAfter.available, 9.0);
  assert.equal(balAfter.reserved, 3.0);

  // Approve step 1 by Supervisor (emp 2, user 3)
  const ksActor = {
    userId: 3,
    employeeId: 2,
    permissions: ['admin_satuan_pendidikan'],
    unitScope: [1]
  };
  const step1Res = await leaveService.approveLeaveRequest(req.id, ksActor, 'Disetujui Atasan');
  assert.equal(step1Res.current_step_no, 2);

  // Approve step 2 by KS (emp 2, user 3)
  const step2Res = await leaveService.approveLeaveRequest(req.id, ksActor, 'Disetujui KS');
  assert.equal(step2Res.current_step_no, 3);

  // Approve final step 3 by HRD (user 2)
  const hrdActor = {
    userId: 2,
    employeeId: 1,
    permissions: ['kepegawaian.leave_requests.manage'],
    unitScope: [1]
  };
  const finalRes = await leaveService.approveLeaveRequest(req.id, hrdActor, 'Disetujui HRD');
  assert.equal(finalRes.status, 'approved');

  // Check balance used
  const balFinal = await leaveLedgerService.getEmployeeBalance(3);
  assert.equal(balFinal.available, 9.0);
  assert.equal(balFinal.reserved, 0.0);
  assert.equal(balFinal.used, 3.0);
});

test('Integration: Submit and Approve Overtime Request', async () => {
  const actor = {
    userId: 4,
    employeeId: 3,
    permissions: [],
    unitScope: [1]
  };

  const ot = await overtimeService.createOvertime({
    employee_id: 3,
    overtime_date: '2026-11-07', // Saturday (weekend)
    hours: 4.0,
    task_description: 'Persiapan akreditasi sekolah'
  }, actor);

  assert.ok(ot.id);
  assert.equal(ot.status, 'pending');
  assert.equal(ot.day_type, 'weekend');

  // Approve
  const hrdActor = {
    userId: 2,
    employeeId: 1,
    permissions: ['kepegawaian.overtimes.manage'],
    unitScope: [1]
  };
  const approvedOt = await overtimeService.approveOvertime(ot.id, hrdActor, 'Lembur disetujui');
  assert.equal(approvedOt.status, 'approved');
});

test('Integration: Payroll Feed Contract', async () => {
  const feed = await leaveService.getPayrollFeed({ period: '2026-11' });
  assert.ok(feed.data);
  const budiData = feed.data.find(d => d.employee_id === 3);
  assert.ok(budiData);
  assert.equal(budiData.leave_days_by_type.length, 1);
  assert.equal(budiData.leave_days_by_type[0].code, 'cuti_tahunan');
  assert.equal(budiData.leave_days_by_type[0].days, 3.0);
  assert.equal(budiData.overtime.length, 1);
  assert.equal(budiData.overtime[0].payable_hours, 4.0);
});
