const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateActor, assertEmployeeActor } = require('./actorHelper');

test('evaluateActor: Akun Siswa (ref_type=student) -> employeeId null & bukan HR', () => {
  const userStudent = {
    id: 10,
    username: 'siswa_andi',
    ref_type: 'student',
    ref_id: 3,
    permissions: ['akademik.student.view']
  };

  const activeEmployee3 = {
    id: 3,
    full_name: 'Budi Santoso',
    school_unit_id: 1,
    account_status: 'active',
    status: 'active'
  };

  // Walaupun ada employee ID 3 di DB, akun siswa dengan ref_type='student' tidak boleh diakui
  const actor = evaluateActor(userStudent, activeEmployee3);
  assert.equal(actor.employeeId, null);
  assert.equal(actor.isHR, false);
  assert.equal(actor.employee, null);

  assert.throws(
    () => assertEmployeeActor(actor),
    (err) => err.statusCode === 403 && err.code === 'ACTOR_NOT_EMPLOYEE'
  );
});

test('evaluateActor: Akun dengan ref_type NULL -> employeeId null', () => {
  const userNullRef = {
    id: 20,
    username: 'user_tamu',
    ref_type: null,
    ref_id: null,
    permissions: []
  };

  const actor = evaluateActor(userNullRef, null);
  assert.equal(actor.employeeId, null);
  assert.equal(actor.isHR, false);

  assert.throws(
    () => assertEmployeeActor(actor),
    (err) => err.statusCode === 403 && err.code === 'ACTOR_NOT_EMPLOYEE'
  );
});

test('evaluateActor: Akun Guru/Staff Valid Aktif -> employeeId sesuai ref_id', () => {
  const userTeacher = {
    id: 5,
    username: 'guru_budi',
    ref_type: 'staff',
    ref_id: 3,
    school_unit_id: 1,
    permissions: ['kepegawaian.attendances.create']
  };

  const activeEmployee3 = {
    id: 3,
    full_name: 'Budi Santoso',
    school_unit_id: 1,
    account_status: 'active',
    status: 'active'
  };

  const actor = evaluateActor(userTeacher, activeEmployee3);
  assert.equal(actor.employeeId, 3);
  assert.equal(actor.unitScope, 1);
  assert.equal(actor.isHR, false);
  assert.equal(actor.isInactive, false);
  assert.notEqual(actor.employee, null);

  // Tidak melempar error
  assert.doesNotThrow(() => assertEmployeeActor(actor));
});

test('evaluateActor: Akun Pegawai Nonaktif -> employeeId null & isInactive true', () => {
  const userInactiveStaff = {
    id: 8,
    username: 'staff_keluar',
    ref_type: 'staff',
    ref_id: 12,
    permissions: []
  };

  const inactiveEmployee12 = {
    id: 12,
    full_name: 'Pegawai Resign',
    school_unit_id: 1,
    account_status: 'inactive',
    status: 'inactive'
  };

  const actor = evaluateActor(userInactiveStaff, inactiveEmployee12);
  assert.equal(actor.employeeId, null);
  assert.equal(actor.isInactive, true);

  assert.throws(
    () => assertEmployeeActor(actor),
    (err) => err.statusCode === 403 && err.code === 'ACTOR_NOT_EMPLOYEE'
  );
});

test('evaluateActor: Akun Staff dengan ref_id tidak ada di DB Kepegawaian', () => {
  const userStaffMissingDB = {
    id: 9,
    username: 'staff_hantu',
    ref_type: 'staff',
    ref_id: 9999,
    permissions: []
  };

  const actor = evaluateActor(userStaffMissingDB, null);
  assert.equal(actor.employeeId, null);

  assert.throws(
    () => assertEmployeeActor(actor),
    (err) => err.statusCode === 403 && err.code === 'ACTOR_NOT_EMPLOYEE'
  );
});

test('evaluateActor: Akun HRD / SuperAdmin memiliki isHR=true dan lolos assertEmployeeActor', () => {
  const userHRD = {
    id: 1,
    username: 'admin_hrd',
    ref_type: null,
    ref_id: null,
    permissions: ['kepegawaian.attendances.manage']
  };

  const actor = evaluateActor(userHRD, null);
  assert.equal(actor.employeeId, null);
  assert.equal(actor.isHR, true);

  // Lolos karena isHR = true
  assert.doesNotThrow(() => assertEmployeeActor(actor));
});
