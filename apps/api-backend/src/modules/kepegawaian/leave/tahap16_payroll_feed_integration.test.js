/**
 * Tahap 16: Payroll Feed Integration Test Suite
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §10.5, §2 #13, #19, #12
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../config/db/kepegawaian');
const leaveService = require('./leaveService');
const attendanceService = require('../attendance/service');

const HR_ACTOR = {
  userId: 1,
  employeeId: 1,
  permissions: [
    'kepegawaian.leave_reports.read',
    'kepegawaian.leave_requests.read',
    'kepegawaian.leave_requests.manage',
    'kepegawaian.attendances.read',
    'kepegawaian.attendances.manage'
  ],
  unitScope: 'all'
};

test.before(async () => {
  const dbName = db.client.connectionSettings.database;
  console.log(`[TEST TAHAP 16] Target database: ${dbName}`);
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Database ${dbName} bukan database _dev! Pengujian dihentikan demi keamanan.`);
  }

  // Bersihkan data uji terkait
  await db('attendance_period_locks').where({ period_year: 2029, period_month: 3 }).del();
  await db('employee_attendances').where('attendance_date', 'like', '2029-03%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2029-03%').del();
  await db('employee_overtimes').where('overtime_date', 'like', '2029-03%').del();
});

test.after(async () => {
  await db('attendance_period_locks').where({ period_year: 2029, period_month: 3 }).del();
  await db('employee_attendances').where('attendance_date', 'like', '2029-03%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2029-03%').del();
  await db('employee_overtimes').where('overtime_date', 'like', '2029-03%').del();
});

test('1. Payroll Feed Contract: Struktur response lengkap dan provisional true pada periode open', async () => {
  const feed = await leaveService.getPayrollFeed({ period: '2029-03' }, HR_ACTOR);

  assert.ok(feed);
  assert.equal(feed.period, '2029-03');
  assert.equal(feed.lock_status, 'open');
  assert.equal(feed.provisional, true, 'Periode belum dikunci harus berstatus provisional: true');
  assert.ok(feed.as_of);
  assert.ok(feed.snapshot_hash);
  assert.ok(Array.isArray(feed.items));
  assert.ok(feed.items.length > 0);

  const firstEmp = feed.items[0];
  assert.ok(firstEmp.employee_id);
  assert.ok(firstEmp.full_name);
  assert.ok('leave_days_by_type' in firstEmp);
  assert.ok('unpaid_equivalent_days' in firstEmp);
  assert.ok('overtime' in firstEmp);
  assert.ok('attendance' in firstEmp);
  assert.ok('source_ids' in firstEmp);
  assert.ok(firstEmp.snapshot_hash);
});

test('2. Aturan pay_percent null dipertahankan dan unpaid_equivalent_days dihitung tepat', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // 1. Cuti umrah (pay_percent = 0%) -> 100% potong gaji (2 hari)
  const [leaveId1] = await db('employee_leave_requests').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    leave_type: 'cuti_umrah',
    start_date: '2029-03-05',
    end_date: '2029-03-06',
    duration_days: 2.0,
    status: 'approved',
    reason: 'Umrah',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  });

  // 2. Cuti khusus legacy (pay_percent = null) -> null dipertahankan, tidak masuk potongan otomatis
  const [leaveId2] = await db('employee_leave_requests').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    leave_type: 'cuti_khusus',
    start_date: '2029-03-12',
    end_date: '2029-03-14',
    duration_days: 3.0,
    status: 'approved',
    reason: 'Khusus legacy',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  });

  // 3. Cuti tahunan (pay_percent = 100%) -> 0 hari potong gaji
  const [leaveId3] = await db('employee_leave_requests').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    leave_type: 'cuti_tahunan',
    start_date: '2029-03-19',
    end_date: '2029-03-20',
    duration_days: 2.0,
    status: 'approved',
    reason: 'Tahunan',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  });

  const feed = await leaveService.getPayrollFeed({ period: '2029-03', school_unit_id: emp.school_unit_id }, HR_ACTOR);
  const targetEmp = feed.items.find(it => it.employee_id === emp.id);

  assert.ok(targetEmp);
  assert.equal(targetEmp.unpaid_equivalent_days, 2.0, 'Hanya cuti ber-pay_percent 0% yang memotong 2 hari');

  const specialLeave = targetEmp.leave_days_by_type.find(l => l.code === 'cuti_khusus');
  assert.ok(specialLeave);
  assert.equal(specialLeave.pay_percent, null, 'pay_percent cuti_khusus harus tetap null');

  const umrahLeave = targetEmp.leave_days_by_type.find(l => l.code === 'cuti_umrah');
  assert.ok(umrahLeave);
  assert.equal(umrahLeave.pay_percent, 0);

  const annualLeave = targetEmp.leave_days_by_type.find(l => l.code === 'cuti_tahunan');
  assert.ok(annualLeave);
  assert.equal(annualLeave.pay_percent, 100);

  // Source IDs
  assert.ok(targetEmp.source_ids.leave_request_ids.includes(leaveId1));
  assert.ok(targetEmp.source_ids.leave_request_ids.includes(leaveId2));
  assert.ok(targetEmp.source_ids.leave_request_ids.includes(leaveId3));
});

test('3. Agregasi Lembur di Payroll Feed: Jam lembur terhitung dan estimasi upah null tanpa tarif', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  const [otId1] = await db('employee_overtimes').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    overtime_date: '2029-03-07',
    hours: 3.0,
    payable_hours: 3.0,
    day_type: 'workday',
    status: 'approved',
    task_description: 'Koreksi ujian',
    created_at: new Date(),
    updated_at: new Date()
  });

  const feed = await leaveService.getPayrollFeed({ period: '2029-03', school_unit_id: emp.school_unit_id }, HR_ACTOR);
  const targetEmp = feed.items.find(it => it.employee_id === emp.id);

  assert.ok(targetEmp);
  assert.equal(targetEmp.overtime.total_payable_hours, 3.0);
  assert.equal(targetEmp.overtime.total_estimated_wage, null, 'Tanpa tarif, estimasi upah tetap null');
  assert.ok(targetEmp.source_ids.overtime_ids.includes(otId1));
});

test('4. Lock Period Transition: provisional berubah menjadi false saat periode dikunci', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // Kunci periode 03/2029
  await attendanceService.lockPeriod({
    month: 3,
    year: 2029,
    school_unit_id: emp.school_unit_id,
    notes: 'Kunci periode uji tahap 16',
    allow_override: true
  }, { id: 1, role: 'super_admin' });

  const feed = await leaveService.getPayrollFeed({ period: '2029-03', school_unit_id: emp.school_unit_id }, HR_ACTOR);

  assert.equal(feed.lock_status, 'locked');
  assert.equal(feed.provisional, false, 'Periode terkunci harus provisional: false');
  assert.ok(feed.snapshot_hash);
});
