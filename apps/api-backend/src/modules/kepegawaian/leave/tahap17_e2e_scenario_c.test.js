/**
 * Tahap 17: Scenario C - Full End-to-End Lifecycle Test Suite
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4, §5, §6, §7, §8, §10, §12
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../config/db/kepegawaian');
const leaveService = require('../leave/leaveService');
const overtimeService = require('../leave/overtimeService');
const leaveLedgerService = require('../leave/leaveLedgerService');
const leaveTypeService = require('../leave/leaveTypeService');
const attendanceService = require('../attendance/service');
const calendarService = require('../attendance/calendarService');

const HR_PERMISSIONS = [
  'kepegawaian.leave_requests.read',
  'kepegawaian.leave_requests.manage',
  'kepegawaian.leave_balances.read',
  'kepegawaian.leave_balances.manage',
  'kepegawaian.overtimes.manage',
  'kepegawaian.overtime_settings.manage',
  'kepegawaian.attendance.read',
  'kepegawaian.attendance.manage',
  'kepegawaian.attendance.lock',
  'kepegawaian.leave_reports.read'
];

const GURU_ACTOR = {
  userId: 101,
  refType: 'staff',
  refId: 3,
  employeeId: 3, // Budi Santoso (Guru Unit 1)
  roles: ['teacher', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const KS_ACTOR = {
  userId: 102,
  refType: 'staff',
  refId: 2,
  employeeId: 2, // Dr. H. Ahmad Dahlan (KS Unit 1)
  roles: ['kepala_sekolah', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const HRD_ACTOR = {
  userId: 1,
  refType: 'staff',
  refId: 1,
  employeeId: 1,
  roles: ['hrd', 'admin'],
  permissions: HR_PERMISSIONS,
  unitScope: 'all',
  isHR: true
};

test.before(async () => {
  const dbName = db.client.connectionSettings.database;
  console.log(`[TEST TAHAP 17 E2E SCENARIO C] Target database: ${dbName}`);
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Database ${dbName} bukan database _dev! Pengujian dihentikan demi keamanan.`);
  }

  // Ensure period unlock for test month (2027-05) and clean leftover requests
  await db('attendance_period_locks')
    .where({ period_year: 2027, period_month: 5 })
    .del();
  await db('employee_leave_requests')
    .where({ employee_id: GURU_ACTOR.employeeId })
    .where('start_date', '>=', '2027-05-01')
    .where('start_date', '<=', '2027-05-31')
    .del();
  await db('employee_overtimes')
    .where({ employee_id: GURU_ACTOR.employeeId })
    .where('overtime_date', '>=', '2027-05-01')
    .where('overtime_date', '<=', '2027-05-31')
    .del();
});

test('Scenario C: Full E2E Leave, Approval, Overtime, Lock Materialization, and Payroll Feed Lifecycle', async (t) => {
  let leaveRequestId = null;
  let overtimeId = null;

  await t.test('Step 1: Ensure employee has active entitlement & sufficient balance in 2026/2027', async () => {
    await leaveLedgerService.ensureEntitlement(GURU_ACTOR.employeeId, '2026/2027');
    const bal = await leaveLedgerService.getEmployeeBalance(GURU_ACTOR.employeeId);
    if (parseFloat(bal.available) < 5) {
      await leaveLedgerService.adjustBalance({
        employeeId: GURU_ACTOR.employeeId,
        deltaAvailable: 10,
        reason: 'Inisialisasi saldo untuk test E2E Scenario C',
        actor: HRD_ACTOR
      });
    }
    const freshBal = await leaveLedgerService.getEmployeeBalance(GURU_ACTOR.employeeId);
    assert.ok(parseFloat(freshBal.available) >= 3, 'Saldo cuti tahunan harus mencukupi (>= 3 hari)');
  });

  await t.test('Step 2: Guru submits 3 days annual leave (2027-05-10 s/d 2027-05-12)', async () => {
    const created = await leaveService.createLeaveRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2027-05-10',
      end_date: '2027-05-12',
      reason: 'Cuti keluarga E2E Scenario C'
    }, GURU_ACTOR);

    assert.ok(created.id);
    assert.equal(created.status, 'pending');
    assert.equal(created.current_step_no, 1);
    assert.equal(parseFloat(created.duration_days), 3.0);
    leaveRequestId = created.id;

    // Verify balance reservation
    const bal = await leaveLedgerService.getEmployeeBalance(GURU_ACTOR.employeeId);
    assert.ok(parseFloat(bal.reserved) >= 3.0, 'Reserved balance harus bertambah');
  });

  await t.test('Step 3: Step 1 (Kepala Sekolah) approves the leave request', async () => {
    const approvedStep1 = await leaveService.approveLeaveRequest(leaveRequestId, KS_ACTOR, 'Disetujui KS untuk E2E');
    assert.equal(approvedStep1.status, 'pending');
    // Step 2 is skipped because supervisor is unit head, so it advances to step 3 (HRD)
    assert.equal(approvedStep1.current_step_no, 3);
  });

  await t.test('Step 4: Final Step (HRD) approves the leave request -> status becomes approved and ledger committed', async () => {
    const approvedFinal = await leaveService.approveLeaveRequest(leaveRequestId, HRD_ACTOR, 'Disetujui HRD Final E2E');
    assert.equal(approvedFinal.status, 'approved');

    // Verify ledger entry commit
    const entries = await db('leave_ledger_entries')
      .where({ source_type: 'leave_request', source_id: leaveRequestId })
      .orderBy('id', 'asc');

    assert.ok(entries.some(e => e.entry_type === 'reserve'));
    assert.ok(entries.some(e => e.entry_type === 'commit'));

    const bal = await leaveLedgerService.getEmployeeBalance(GURU_ACTOR.employeeId);
    assert.ok(parseFloat(bal.used) >= 3.0, 'Used balance harus bertambah');
  });

  await t.test('Step 5: Overtime creation and approval (2027-05-15, 3 hours)', async () => {
    const createdOt = await overtimeService.createOvertime({
      employee_id: GURU_ACTOR.employeeId,
      overtime_date: '2027-05-15',
      hours: 3.0,
      task_description: 'Pengawasan Ujian Akhir Pekan E2E',
      requires_actual_attendance: false
    }, GURU_ACTOR);

    assert.ok(createdOt.id);
    overtimeId = createdOt.id;

    // HRD approves overtime
    const approvedOt = await overtimeService.approveOvertime(overtimeId, HRD_ACTOR, 'Disetujui HRD');
    assert.equal(approvedOt.status, 'approved');
    assert.equal(parseFloat(approvedOt.hours), 3.0);
    assert.ok(parseFloat(approvedOt.estimated_wage) > 0);
  });

  await t.test('Step 6: Lock attendance period (May 2027) and verify leave materialization', async () => {
    const lockResult = await attendanceService.lockPeriod({
      school_unit_id: 1,
      year: 2027,
      month: 5,
      notes: 'Locking period May 2027 for E2E testing',
      allow_override: true
    }, { id: 1, role: 'super_admin', employee_id: 1 });

    assert.ok(lockResult);
    assert.ok(lockResult.success);
    assert.equal(lockResult.data.status, 'locked');

    // Verify materialized records in employee_attendances
    const attendances = await db('employee_attendances')
      .where({ employee_id: GURU_ACTOR.employeeId })
      .whereIn('attendance_date', ['2027-05-10', '2027-05-11', '2027-05-12'])
      .orderBy('attendance_date', 'asc');

    assert.equal(attendances.length, 3, 'Harus ada 3 record presensi termaterialisasi');
    for (const att of attendances) {
      assert.equal(att.status, 'permitted');
      assert.equal(att.sub_status, 'cuti');
      assert.equal(att.leave_request_id, leaveRequestId);
    }
  });

  await t.test('Step 7: Locked Period Rejection Guard (HTTP 409/422 PERIOD_LOCKED)', async () => {
    // Attempt to submit new leave inside locked period
    await assert.rejects(
      async () => {
        await leaveService.createLeaveRequest({
          leave_type: 'sakit',
          start_date: '2027-05-20',
          end_date: '2027-05-20',
          reason: 'Sakit di periode terkunci'
        }, GURU_ACTOR);
      },
      (err) => {
        assert.equal(err.code, 'PERIOD_LOCKED');
        return true;
      }
    );

    // Attempt to claim overtime inside locked period
    await assert.rejects(
      async () => {
        await overtimeService.createOvertime({
          employee_id: GURU_ACTOR.employeeId,
          overtime_date: '2027-05-20',
          hours: 2.0,
          task_description: 'Lembur di periode terkunci'
        }, GURU_ACTOR);
      },
      (err) => {
        assert.equal(err.code, 'PERIOD_LOCKED');
        return true;
      }
    );
  });

  await t.test('Step 8: Payroll Feed Output Verification & Deterministic Snapshot Hash', async () => {
    const feed = await leaveService.getPayrollFeed({
      period: '2027-05',
      school_unit_id: 1
    }, HRD_ACTOR);

    assert.ok(feed);
    assert.equal(feed.period, '2027-05');
    assert.equal(feed.lock_status, 'locked');
    assert.ok(feed.snapshot_hash, 'Hash snapshot harus terbentuk');

    const guruFeed = feed.items.find(e => e.employee_id === GURU_ACTOR.employeeId);
    assert.ok(guruFeed, 'Guru harus ada di payroll feed');
    
    const cutiItem = guruFeed.leave_days_by_type.find(l => l.code === 'cuti_tahunan');
    assert.ok(cutiItem, 'Jenis cuti_tahunan harus ada di feed');
    assert.equal(cutiItem.days, 3.0);
    assert.equal(guruFeed.overtime.total_payable_hours, 3.0);
  });

  await t.test('Step 9: Ledger Balance Integrity Check (0 Discrepancy)', async () => {
    const period = await leaveLedgerService.getActivePeriod(1);
    const rec = await leaveLedgerService.reconcileBalances(period.id, { dry_run: true }, HRD_ACTOR);
    assert.equal(rec.discrepancies_count, 0, 'Reconcile ledger harus 0 selisih');
  });

  // Cleanup after test
  await db('attendance_period_locks').where({ period_year: 2027, period_month: 5 }).del();
  await db('employee_attendances').where({ leave_request_id: leaveRequestId }).del();
  await db('employee_leave_requests').where({ id: leaveRequestId }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: leaveRequestId }).del();
  await db('leave_ledger_entries').where({ source_type: 'leave_request', source_id: leaveRequestId }).del();
  await db('employee_overtimes').where({ id: overtimeId }).del();
});
