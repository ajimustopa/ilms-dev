const test = require('node:test');
const assert = require('node:assert/strict');
const attendanceService = require('./service');

test('Attendance Security: Siswa (ref_type=student) ditolak 403 saat check-in', async () => {
  const userStudent = {
    id: 101,
    username: 'siswa_andi',
    ref_type: 'student',
    ref_id: 3,
    permissions: []
  };

  await assert.rejects(
    async () => {
      await attendanceService.checkIn({ employee_id: 3, attendance_date: '2026-10-07' }, userStudent);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
      return true;
    }
  );
});

test('Attendance Security: Siswa (ref_type=student) ditolak 403 saat getTodayStatus', async () => {
  const userStudent = {
    id: 101,
    username: 'siswa_andi',
    ref_type: 'student',
    ref_id: 3,
    permissions: []
  };

  await assert.rejects(
    async () => {
      await attendanceService.getTodayStatus(userStudent);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
      return true;
    }
  );
});

test('Attendance Security: Siswa (ref_type=student) ditolak 403 saat submitClarification', async () => {
  const userStudent = {
    id: 101,
    username: 'siswa_andi',
    ref_type: 'student',
    ref_id: 3,
    permissions: []
  };

  await assert.rejects(
    async () => {
      await attendanceService.submitClarification({ attendance_date: '2026-10-07', reason: 'Lupa absen' }, userStudent);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
      return true;
    }
  );
});

test('Attendance Security: Guru aktif (ref_type=staff, ref_id=3) berhasil memanggil today-status', async () => {
  const userTeacher = {
    id: 5,
    username: 'guru_budi',
    ref_type: 'staff',
    ref_id: 3,
    school_unit_id: 1,
    permissions: []
  };

  const status = await attendanceService.getTodayStatus(userTeacher);
  assert.ok(status);
  assert.equal(typeof status.date, 'string');
  assert.equal(typeof status.has_checked_in, 'boolean');
});

test('Attendance Security: Non-HR memanggil listAttendances hanya mendapatkan record miliknya', async () => {
  const userTeacher = {
    id: 5,
    username: 'guru_budi',
    ref_type: 'staff',
    ref_id: 3,
    school_unit_id: 1,
    permissions: []
  };

  // Mencoba query employee_id=4 yang bukan miliknya
  const res = await attendanceService.listAttendances({ employee_id: 4 }, userTeacher);
  assert.ok(res);
  assert.ok(Array.isArray(res.items));
  // Setiap item yang dikembalikan harus milik employee_id 3
  for (const item of res.items) {
    assert.equal(Number(item.employee_id), 3);
  }
});

test('Attendance Security: HRD / SuperAdmin dapat mengakses dashboard-summary', async () => {
  const userSuperAdmin = {
    id: 1,
    username: 'superadmin',
    ref_type: null,
    ref_id: null,
    is_super_admin: true,
    permissions: ['superadmin']
  };

  const summary = await attendanceService.getDashboardSummary({}, userSuperAdmin);
  assert.ok(summary);
  assert.equal(typeof summary.total_active_employees, 'number');
  assert.equal(typeof summary.present_count, 'number');
});

test.after(() => {
  setTimeout(() => process.exit(0), 100).unref();
});
