/**
 * Tahap 15: Integration & Regression Test Suite
 * Integrasi Cuti & Lembur dengan Presensi, Resolusi Status Harian & Materialisasi Period Lock
 * Modul Kepegawaian - Core Aldepos
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../config/db/kepegawaian');
const calendarService = require('./calendarService');
const attendanceService = require('./service');
const leaveService = require('../leave/leaveService');

const HR_ACTOR = {
  userId: 1,
  employeeId: 1,
  permissions: [
    'kepegawaian.leave_requests.read',
    'kepegawaian.leave_requests.manage',
    'kepegawaian.leave_requests.override',
    'kepegawaian.attendances.read',
    'kepegawaian.attendances.manage'
  ],
  unitScope: 'all'
};

test.before(async () => {
  // Verifikasi database dev
  const dbName = db.client.connectionSettings.database;
  console.log(`[TEST TAHAP 15] Target database: ${dbName}`);
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Database ${dbName} bukan database _dev! Pengujian dihentikan demi keamanan.`);
  }

  // Bersihkan data uji terkait
  await db('attendance_period_locks').where({ period_year: 2028, period_month: 5 }).del();
  await db('attendance_period_locks').where({ period_year: 2028, period_month: 6 }).del();
  await db('employee_attendances').where('attendance_date', 'like', '2028-05%').del();
  await db('employee_attendances').where('attendance_date', 'like', '2028-06%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2028-05%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2028-06%').del();
});

test.after(async () => {
  // Cleanup setelah pengujian
  await db('attendance_period_locks').where({ period_year: 2028, period_month: 5 }).del();
  await db('attendance_period_locks').where({ period_year: 2028, period_month: 6 }).del();
  await db('employee_attendances').where('attendance_date', 'like', '2028-05%').del();
  await db('employee_attendances').where('attendance_date', 'like', '2028-06%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2028-05%').del();
  await db('employee_leave_requests').where('start_date', 'like', '2028-06%').del();
});

test('1. Uji Regresi Presensi: Data tanpa cuti menghasilkan rekap yang konsisten', async () => {
  // Ambil salah satu pegawai aktif
  const emp = await db('employees').where('account_status', 'active').first();
  assert.ok(emp, 'Pegawai aktif harus tersedia');

  const workDays = await calendarService.getEffectiveWorkDays(emp.id, emp.school_unit_id, '2028-05-01', '2028-05-05');
  assert.ok(Array.isArray(workDays));
  assert.equal(workDays.length, 5);

  // Pastikan field additive ada dan tidak merusak
  for (const day of workDays) {
    assert.equal(day.is_on_approved_leave, false);
    assert.equal(day.leave_request_id, null);
    assert.equal(day.leave_type_code, null);
    assert.ok(typeof day.holiday_off === 'boolean');
    assert.ok(day.schedule);
  }
});

test('2. Read-Time Derived Status: Cuti disetujui terbaca pada getEffectiveWorkDays dengan status yang sesuai', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // Insert approved leave request langsung
  const [leaveId] = await db('employee_leave_requests').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    leave_type: 'cuti_tahunan',
    start_date: '2028-05-08',
    end_date: '2028-05-09',
    duration_days: 2.0,
    start_portion: 'full',
    end_portion: 'full',
    status: 'approved',
    reason: 'Cuti Tahunan Uji Integrasi',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  });

  const workDays = await calendarService.getEffectiveWorkDays(emp.id, emp.school_unit_id, '2028-05-08', '2028-05-10');
  
  // 8 Mei 2028 (Senin) -> Cuti disetujui
  const day1 = workDays.find(d => d.date === '2028-05-08');
  assert.ok(day1, 'Hari 2028-05-08 harus ditemukan');
  assert.equal(day1.is_on_approved_leave, true);
  assert.equal(day1.leave_request_id, leaveId);
  assert.equal(day1.leave_type_code, 'cuti_tahunan');
  assert.equal(day1.attendance_status, 'permitted');
  assert.equal(day1.attendance_sub_status, 'cuti');

  // 9 Mei 2028 (Selasa) -> Cuti disetujui
  const day2 = workDays.find(d => d.date === '2028-05-09');
  assert.ok(day2, 'Hari 2028-05-09 harus ditemukan');
  assert.equal(day2.is_on_approved_leave, true);
  assert.equal(day2.leave_request_id, leaveId);

  // 10 Mei 2028 (Rabu) -> Hari kerja biasa
  const day3 = workDays.find(d => d.date === '2028-05-10');
  assert.ok(day3, 'Hari 2028-05-10 harus ditemukan');
  assert.equal(day3.is_on_approved_leave, false);
  assert.equal(day3.leave_request_id, null);
});

test('3. Rule Kehadiran: Cuti TIDAK PERNAH menimpa data presensi present yang sudah ada', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // Masukkan presensi hadir riil pada 2028-05-15
  await db('employee_attendances').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    attendance_date: '2028-05-15',
    check_in_time: '07:15:00',
    check_out_time: '16:00:00',
    status: 'present',
    is_late: 0,
    entry_type: 'rfid',
    created_at: new Date(),
    updated_at: new Date()
  });

  // Ada pengajuan cuti disetujui yang melingkupi tanggal tersebut
  const [leaveId] = await db('employee_leave_requests').insert({
    employee_id: emp.id,
    school_unit_id: emp.school_unit_id || 1,
    leave_type: 'sakit',
    start_date: '2028-05-15',
    end_date: '2028-05-16',
    duration_days: 2.0,
    status: 'approved',
    reason: 'Sakit flu',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Jalankan materialisasi
  const matRes = await attendanceService.materializeLeaveIntoAttendance({
    periodMonth: 5,
    periodYear: 2028,
    schoolUnitId: emp.school_unit_id
  });

  assert.ok(matRes.success);
  assert.ok(matRes.preserved_present_rows >= 1);

  // Periksa bahwa status 2028-05-15 TETAP 'present'
  const attRow15 = await db('employee_attendances')
    .where({ employee_id: emp.id, attendance_date: '2028-05-15' })
    .first();
  assert.equal(attRow15.status, 'present');
  assert.equal(attRow15.check_in_time, '07:15:00');
  assert.equal(attRow15.leave_request_id, leaveId); // Linked as cross-reference

  // Sedangkan 2028-05-16 termaterialisasi sebagai 'sick'
  const attRow16 = await db('employee_attendances')
    .where({ employee_id: emp.id, attendance_date: '2028-05-16' })
    .first();
  assert.ok(attRow16);
  assert.equal(attRow16.status, 'sick');
  assert.equal(attRow16.leave_request_id, leaveId);
});

test('4. Materialisasi Idempoten: Pemanggilan berulang tidak membuat data ganda', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  const matRes1 = await attendanceService.materializeLeaveIntoAttendance({
    periodMonth: 5,
    periodYear: 2028,
    schoolUnitId: emp.school_unit_id
  });

  const countBefore = await db('employee_attendances')
    .where('attendance_date', 'like', '2028-05%')
    .count('id as total')
    .first();

  // Panggil kedua kali
  const matRes2 = await attendanceService.materializeLeaveIntoAttendance({
    periodMonth: 5,
    periodYear: 2028,
    schoolUnitId: emp.school_unit_id
  });

  const countAfter = await db('employee_attendances')
    .where('attendance_date', 'like', '2028-05%')
    .count('id as total')
    .first();

  assert.equal(countBefore.total, countAfter.total, 'Jumlah record harus tetap sama persis (idempoten)');
});

test('5. Lock Period Integration: lockPeriod memicu materialisasi dan mengunci periode', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // Kunci periode 05/2028 dengan allow_override: true
  const lockRes = await attendanceService.lockPeriod({
    month: 5,
    year: 2028,
    school_unit_id: emp.school_unit_id,
    notes: 'Kunci periode uji integrasi tahap 15',
    allow_override: true
  }, { id: 1, role: 'super_admin' });

  assert.ok(lockRes.success);
  assert.equal(lockRes.data.status, 'locked');
  assert.ok(lockRes.data.summary_snapshot);

  // Periksa audit log
  const auditLogs = await db('attendance_audit_logs')
    .whereIn('action', ['LEAVE_MATERIALIZED_ON_PERIOD_LOCK', 'PERIOD_LOCKED'])
    .orderBy('id', 'desc');
  assert.ok(auditLogs.length > 0);
  assert.ok(auditLogs.some(l => l.action === 'LEAVE_MATERIALIZED_ON_PERIOD_LOCK'));
  assert.ok(auditLogs.some(l => l.action === 'PERIOD_LOCKED'));
});

test('6. Guard PERIOD_LOCKED: Pembatalan cuti disetujui pada periode locked ditolak 409', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  // Ambil cuti yang ada di periode 05/2028 yang sudah dikunci
  const leave = await db('employee_leave_requests')
    .where('start_date', 'like', '2028-05%')
    .where('status', 'approved')
    .first();
  assert.ok(leave);

  await assert.rejects(
    async () => {
      await leaveService.cancelLeaveRequest(leave.id, HR_ACTOR, 'Batal uji');
    },
    (err) => {
      assert.equal(err.code, 'PERIOD_LOCKED');
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test('7. Portal Guru / Today Status Compatibility: getTodayStatus tetap valid', async () => {
  const emp = await db('employees').where('account_status', 'active').first();

  const userStub = {
    id: 99,
    ref_type: 'staff',
    ref_id: emp.id,
    account_type: 'staff',
    roles: ['staff'],
    active_role: 'staff',
    active_school_unit_id: emp.school_unit_id
  };

  const todayStatus = await attendanceService.getTodayStatus(userStub, { date: '2028-05-15' });
  assert.ok(todayStatus);
  assert.equal(todayStatus.date, '2028-05-15');
  assert.ok(todayStatus.employee);
  assert.equal(todayStatus.employee.id, emp.id);
  assert.ok('has_checked_in' in todayStatus);
  assert.ok('has_checked_out' in todayStatus);
});
