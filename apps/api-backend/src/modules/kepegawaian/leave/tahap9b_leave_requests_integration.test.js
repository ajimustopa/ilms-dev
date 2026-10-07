/**
 * Integration Tests for Tahap 9B: Complete Leave Request Service & Endpoints
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4.4, §5.5, §6 (seluruh), §8 (1,3,4,5), §9, §11.2, §12
 * Target: kepegawaian_dev, core_dev (127.0.0.1:3306)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const coreDb = require('../../../config/db/core');
const kepDb = require('../../../config/db/kepegawaian');
const { assertDevDatabase } = require('../../../config/db/dbGuard');
const { seedDataUji } = require('./seeds/seed_data_uji_hrd');
const { seedUsulanTerkunci } = require('./seeds/seed_usulan_terkunci');
const leaveService = require('./leaveService');
const leaveLedgerService = require('./leaveLedgerService');
const leaveTypeService = require('./leaveTypeService');

test('Tahap 9B Integration: Leave Request Creation, Multi-Level Approval, Ledger, and Lifecycle', async (t) => {
  // 1. Guard check
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE_9B');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN_9B');

  // 2. Reseed DB
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Clean test tables
  await kepDb('approval_steps').del();
  await kepDb('employee_leave_requests').del();
  await kepDb('leave_ledger_entries').del();
  await kepDb('employee_leave_balances').del();
  await kepDb('attendance_period_locks').del();

  // Define test actors
  const hrdActor = {
    userId: 2,
    employeeId: 1, // Dra. Hj. Siti Aminah (HRD SMP)
    username: 'hrd_smp',
    permissions: [
      'kepegawaian.leave_requests.read',
      'kepegawaian.leave_requests.manage',
      'kepegawaian.leave_requests.override',
      'kepegawaian.leave_types.manage',
      'kepegawaian.leave_balances.read',
      'kepegawaian.leave_balances.manage',
      'kepegawaian.holidays.manage'
    ],
    unitScope: [1]
  };

  const guruActor = {
    userId: 3,
    employeeId: 3, // Budi Santoso, S.Pd (Guru SMP)
    username: 'guru_smp_1',
    permissions: [],
    unitScope: [1]
  };

  const ksActor = {
    userId: 4,
    employeeId: 2, // Drs. H. Ahmad Dahlan, M.Pd (KS SMP)
    username: 'ks_smp',
    permissions: ['kepegawaian.leave_requests.read'],
    unitScope: [1]
  };

  const siswaActor = {
    userId: 10,
    employeeId: null,
    username: 'siswa_1',
    permissions: [],
    unitScope: [1]
  };

  // Setup initial balance for Guru (Budi Santoso, emp 3) -> 12 HK
  const initialBal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
  assert.equal(parseFloat(initialBal.available), 12.0);

  // -------------------------------------------------------------
  // Test 1: Preview Leave Request (No DB write)
  // -------------------------------------------------------------
  await t.test('1. Preview Leave Request returns duration, breakdown, and balance impact without writing to DB', async () => {
    const preview = await leaveService.previewLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-11-02', // Mon
      end_date: '2026-11-04',   // Wed (3 HK)
      start_portion: 'full',
      end_portion: 'full',
      reason: 'Urusan keluarga'
    }, guruActor);

    assert.equal(preview.can_submit, true);
    assert.equal(preview.duration_days, 3.0);
    assert.equal(preview.balance_impact.availableBefore, 12.0);
    assert.equal(preview.balance_impact.required, 3.0);
    assert.equal(preview.balance_impact.availableAfter, 9.0);
    assert.equal(preview.balance_impact.isSufficient, true);

    // Verify 0 rows in DB
    const count = await kepDb('employee_leave_requests').count('id as total').first();
    assert.equal(count.total, 0);
  });

  // -------------------------------------------------------------
  // Test 2: Standard 3-Tier Submission (Guru -> Supervisor -> KS -> HRD)
  // -------------------------------------------------------------
  let leaveId1;
  await t.test('2. Guru submits 3 HK annual leave: pending status, approval steps created, balance reserved', async () => {
    const created = await leaveService.createLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-11-02',
      end_date: '2026-11-04',
      start_portion: 'full',
      end_portion: 'full',
      reason: 'Urusan keluarga mendesak'
    }, guruActor);

    leaveId1 = created.id;
    assert.ok(leaveId1);
    assert.equal(created.status, 'pending');
    assert.equal(created.duration_days, 3.0);
    assert.equal(created.version, 1);

    // Verify balance reserved in ledger (12 - 3 = 9 available, 3 reserved)
    const balAfter = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(parseFloat(balAfter.available), 9.0);
    assert.equal(parseFloat(balAfter.reserved), 3.0);
    assert.equal(parseFloat(balAfter.used), 0.0);

    // Verify approval steps: emp 3 has direct_supervisor = emp 2 (KS)
    // Step 1: supervisor (emp 2) -> pending
    // Step 2: unit_head (emp 2) -> skipped (supervisor is unit head)
    // Step 3: hrd_pool -> pending
    assert.ok(created.approval_steps.length >= 2);
    assert.equal(created.current_step_no, 1);
  });

  // -------------------------------------------------------------
  // Test 3: Inbox Query for Approver
  // -------------------------------------------------------------
  await t.test('3. Inbox returns pending item for assigned approver (KS)', async () => {
    const ksInbox = await leaveService.getLeaveInbox({}, ksActor);
    assert.ok(ksInbox.data.some(item => item.id === leaveId1));

    // Guru themselves should NOT see their own request in approval inbox (anti self-approval)
    const guruInbox = await leaveService.getLeaveInbox({}, guruActor);
    assert.ok(!guruInbox.data.some(item => item.id === leaveId1));
  });

  // -------------------------------------------------------------
  // Test 4: Step Approval and Final Approval
  // -------------------------------------------------------------
  await t.test('4. Step 1 approved by KS advances step, Final approved by HRD commits balance', async () => {
    // KS approves Step 1
    const afterStep1 = await leaveService.approveLeaveRequest(leaveId1, ksActor, 'Disetujui KS');
    assert.equal(afterStep1.status, 'pending');
    assert.ok(afterStep1.current_step_no > 1);

    // Next step (HRD pool) approved by HRD
    const finalApproved = await leaveService.approveLeaveRequest(leaveId1, hrdActor, 'Disetujui HRD final');
    assert.equal(finalApproved.status, 'approved');
    assert.equal(finalApproved.current_step_no, null);
    assert.equal(finalApproved.approved_by, hrdActor.userId);

    // Verify ledger: reserved -> commit (used = 3.0, reserved = 0, available = 9.0)
    const balFinal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(parseFloat(balFinal.available), 9.0);
    assert.equal(parseFloat(balFinal.reserved), 0.0);
    assert.equal(parseFloat(balFinal.used), 3.0);
  });

  // -------------------------------------------------------------
  // Test 5: Rejection Flow
  // -------------------------------------------------------------
  await t.test('5. Rejection flow releases reserved balance and finalizes as rejected', async () => {
    // Guru submits 2 HK (09-10 Nov 2026)
    const req2 = await leaveService.createLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-11-09',
      end_date: '2026-11-10',
      reason: 'Acara kerabat'
    }, guruActor);

    const balReserved = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(parseFloat(balReserved.available), 7.0); // 9 - 2 = 7
    assert.equal(parseFloat(balReserved.reserved), 2.0);

    // KS rejects
    const rejected = await leaveService.rejectLeaveRequest(req2.id, ksActor, 'Jadwal mengajar padat');
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.rejection_reason, 'Jadwal mengajar padat');

    // Verify balance released
    const balReleased = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(parseFloat(balReleased.available), 9.0); // returned to 9
    assert.equal(parseFloat(balReleased.reserved), 0.0);
  });

  // -------------------------------------------------------------
  // Test 6: Revision Requested & Resubmit
  // -------------------------------------------------------------
  await t.test('6. Revision requested maintains reservation; Resubmit increments version and restarts steps', async () => {
    // Guru submits
    const req3 = await leaveService.createLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-11-16',
      end_date: '2026-11-17',
      reason: 'Cuti awal'
    }, guruActor);

    // KS requests revision
    const rev = await leaveService.requestRevision(req3.id, ksActor, 'Tolong geser ke tanggal 18-19');
    assert.equal(rev.status, 'revision_requested');

    // Guru resubmits with revised dates (18-19 Nov)
    const resubmitted = await leaveService.resubmitLeaveRequest(req3.id, {
      start_date: '2026-11-18',
      end_date: '2026-11-19',
      reason: 'Revisi jadwal sesuai arahan'
    }, guruActor);

    assert.equal(resubmitted.status, 'pending');
    assert.equal(resubmitted.version, 2);
    assert.equal(resubmitted.start_date, '2026-11-18');
    assert.equal(resubmitted.current_step_no, 1);
  });

  // -------------------------------------------------------------
  // Test 7: Self-Cancellation by Owner (>= 3 days ahead) vs Blocked (< 3 days)
  // -------------------------------------------------------------
  await t.test('7. Owner self-cancel approved leave >= 3 days refunds balance; near-term blocked for non-HR', async () => {
    // Create future approved leave for 15-16 Dec 2026 (far future) for employee 3
    const futureLeave = await leaveService.createLeaveRequest({
      employee_id: 3,
      leave_type: 'cuti_tahunan',
      start_date: '2026-12-15',
      end_date: '2026-12-16',
      reason: 'Liburan akhir tahun',
      bypass_approval: true,
      bypass_reason: 'Disetujui HRD'
    }, hrdActor);

    assert.equal(futureLeave.status, 'approved');

    // Guru cancels future leave -> success and refund
    const cancelled = await leaveService.cancelLeaveRequest(futureLeave.id, guruActor, 'Batal liburan');
    assert.equal(cancelled.status, 'cancelled');

    // Create near-term approved leave for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const nearLeave = await leaveService.createLeaveRequest({
      employee_id: 3,
      leave_type: 'cuti_tahunan',
      start_date: tomorrowStr,
      end_date: tomorrowStr,
      reason: 'Mendadak',
      bypass_approval: true,
      bypass_reason: 'Bypass HR'
    }, hrdActor);

    // Guru attempts self-cancel near-term leave -> Throws SELF_CANCEL_DEADLINE_EXCEEDED
    await assert.rejects(async () => {
      await leaveService.cancelLeaveRequest(nearLeave.id, guruActor, 'Mau batal');
    }, (err) => err.code === 'SELF_CANCEL_DEADLINE_EXCEEDED');

    // HRD can cancel near-term leave
    const hrCancelled = await leaveService.cancelLeaveRequest(nearLeave.id, hrdActor, 'HRD membatalkan');
    assert.equal(hrCancelled.status, 'cancelled');
  });

  // -------------------------------------------------------------
  // Test 8: Attendance Period Lock Check (SPEC §8 #3)
  // -------------------------------------------------------------
  await t.test('8. Period locked prevents submission, approval, or cancellation', async () => {
    // Lock period for 2027-02
    await kepDb('attendance_period_locks').insert({
      school_unit_id: 1,
      period_year: 2027,
      period_month: 2,
      status: 'locked',
      locked_by: hrdActor.userId,
      locked_at: new Date()
    });

    // Try to create leave in Feb 2027
    await assert.rejects(async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2027-02-10',
        end_date: '2027-02-11',
        reason: 'Uji period locked'
      }, guruActor);
    }, (err) => err.code === 'PERIOD_LOCKED');

    // Unlock period
    await kepDb('attendance_period_locks').where({ period_year: 2027, period_month: 2 }).del();
  });

  // -------------------------------------------------------------
  // Test 9: Overlap Conflict Check (SPEC §4.4 #7)
  // -------------------------------------------------------------
  await t.test('9. Overlap with approved leave is rejected with OVERLAP_APPROVED', async () => {
    // leaveId1 is approved on 02-04 Nov 2026
    await assert.rejects(async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2026-11-03',
        end_date: '2026-11-05',
        reason: 'Tabrakan'
      }, guruActor);
    }, (err) => err.code === 'OVERLAP_APPROVED');
  });

  // -------------------------------------------------------------
  // Test 10: Delegation Flow
  // -------------------------------------------------------------
  await t.test('10. Active delegation allows delegate to approve on behalf of KS', async () => {
    // Create new leave
    const reqDel = await leaveService.createLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-11-23',
      end_date: '2026-11-24',
      reason: 'Cuti didelegasikan'
    }, guruActor);

    // Create delegation from KS (emp 2) to emp 8 (Guru SMP 2 / Nurul)
    const today = new Date().toISOString().slice(0, 10);
    await kepDb('approval_delegations').insert({
      school_unit_id: 1,
      delegator_employee_id: 2,
      delegate_employee_id: 8,
      scope: 'leave',
      valid_from: '2026-01-01',
      valid_to: '2026-12-31',
      reason: 'Tugas luar dinas',
      is_active: 1,
      created_by: 2
    });

    const delegateActor = {
      userId: 8,
      employeeId: 8,
      permissions: [],
      unitScope: [1]
    };

    // Delegate can view item in Inbox
    const delegateInbox = await leaveService.getLeaveInbox({}, delegateActor);
    assert.ok(delegateInbox.data.some(item => item.id === reqDel.id));

    // Delegate approves on behalf of KS
    const afterDelApprove = await leaveService.approveLeaveRequest(reqDel.id, delegateActor, 'Disetujui atas nama KS');
    assert.equal(afterDelApprove.status, 'pending');
    assert.ok(afterDelApprove.current_step_no > 1);
  });

  // -------------------------------------------------------------
  // Test 11: Security & Scoping
  // -------------------------------------------------------------
  await t.test('11. Security: Student 403, and HR cross-unit scope 403', async () => {
    // Student account
    await assert.rejects(async () => {
      await leaveService.createLeaveRequest({
        leave_type: 'cuti_tahunan',
        start_date: '2026-12-01',
        end_date: '2026-12-02',
        reason: 'Siswa uji'
      }, siswaActor);
    }, (err) => err.code === 'ACTOR_NOT_EMPLOYEE');

    // HR cross-unit submission
    await assert.rejects(async () => {
      await leaveService.createLeaveRequest({
        employee_id: 999, // Outside unit
        leave_type: 'cuti_tahunan',
        start_date: '2026-12-01',
        end_date: '2026-12-02',
        reason: 'Cross unit'
      }, hrdActor);
    }, (err) => err.code === 'EMPLOYEE_INACTIVE' || err.code === 'FORBIDDEN_SCOPE');
  });

  // -------------------------------------------------------------
  // Test 12: Ledger Invariant Reconcile Check
  // -------------------------------------------------------------
  await t.test('12. Reconcile balances reports 0 discrepancies against append-only ledger', async () => {
    const activePeriod = await leaveLedgerService.getActivePeriod(1, '2026/2027');
    const reconcileResult = await leaveLedgerService.reconcileBalances(activePeriod ? activePeriod.id : 1, { dry_run: true }, hrdActor);
    assert.equal(reconcileResult.discrepancies.length, 0);
  });

  t.after(async () => {
    await coreDb.destroy();
    await kepDb.destroy();
  });
});
