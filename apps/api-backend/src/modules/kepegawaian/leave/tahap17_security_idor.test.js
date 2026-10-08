/**
 * Tahap 17: Security & IDOR Hardening Test Suite
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §9, §11, §12
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../config/db/kepegawaian');
const leaveService = require('../leave/leaveService');
const overtimeService = require('../leave/overtimeService');
const leaveLedgerService = require('../leave/leaveLedgerService');
const leaveTypeService = require('../leave/leaveTypeService');

// Stub Actors
const STUDENT_ACTOR = {
  userId: 999,
  refType: 'student',
  refId: 10,
  employeeId: null, // Student is NOT employee
  roles: ['student'],
  permissions: [],
  unitScope: null,
  isHR: false
};

const GURU_A_ACTOR = {
  userId: 101,
  refType: 'staff',
  refId: 3,
  employeeId: 3, // Budi Santoso (Guru Unit 1)
  roles: ['teacher', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const GURU_B_ACTOR = {
  userId: 102,
  refType: 'staff',
  refId: 4,
  employeeId: 4, // Dewi Lestari (Guru Unit 1)
  roles: ['teacher', 'staff'],
  permissions: [],
  unitScope: [1],
  isHR: false
};

const HRD_UNIT2_ACTOR = {
  userId: 201,
  refType: 'staff',
  refId: 20,
  employeeId: 20,
  roles: ['hrd'],
  permissions: [
    'kepegawaian.leave_requests.read',
    'kepegawaian.leave_requests.manage',
    'kepegawaian.overtimes.manage'
  ],
  unitScope: [2], // Scoped ONLY to unit 2 (SMP)
  isHR: true
};

test.before(async () => {
  const dbName = db.client.connectionSettings.database;
  console.log(`[TEST TAHAP 17 SECURITY] Target database: ${dbName}`);
  if (!dbName.endsWith('_dev')) {
    throw new Error(`Database ${dbName} bukan database _dev! Pengujian dihentikan demi keamanan.`);
  }
});

test('1. Security: Siswa (ref_type=student) ditolak saat submit cuti, lembur, dan balance', async (t) => {
  await t.test('Siswa ditolak saat create leave request', async () => {
    await assert.rejects(
      async () => {
        await leaveService.createLeaveRequest({
          employee_id: 3, // Siswa mencoba inject ID pegawai
          leave_type: 'cuti_tahunan',
          start_date: '2027-01-11',
          end_date: '2027-01-11',
          reason: 'Cuti hacking'
        }, STUDENT_ACTOR);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
        return true;
      }
    );
  });

  await t.test('Siswa ditolak saat create overtime', async () => {
    await assert.rejects(
      async () => {
        await overtimeService.createOvertime({
          employee_id: 3,
          overtime_date: '2027-01-12',
          hours: 2,
          task_description: 'Lembur hacking'
        }, STUDENT_ACTOR);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
        return true;
      }
    );
  });
});

test('2. IDOR Prevention: Pegawai biasa tidak bisa mengajukan cuti/lembur atas nama pegawai lain', async (t) => {
  await t.test('Guru A mencoba submit cuti dengan employee_id Guru B -> Dipaksa ke ID Guru A', async () => {
    // Pastikan saldo Guru A cukup
    await leaveLedgerService.ensureEntitlement(GURU_A_ACTOR.employeeId, '2026/2027');

    const created = await leaveService.createLeaveRequest({
      employee_id: GURU_B_ACTOR.employeeId, // Mencoba memotong cuti Guru B
      leave_type: 'sakit',
      start_date: '2027-02-01',
      end_date: '2027-02-01',
      reason: 'Sakit kepala'
    }, GURU_A_ACTOR);

    assert.equal(created.employee_id, GURU_A_ACTOR.employeeId, 'employee_id HARUS dipaksa ke actor.employeeId');
    assert.notEqual(created.employee_id, GURU_B_ACTOR.employeeId);

    // Cleanup
    await db('employee_leave_requests').where({ id: created.id }).del();
    await db('approval_steps').where({ entity_type: 'leave', entity_id: created.id }).del();
  });

  await t.test('Guru A mencoba klaim lembur dengan employee_id Guru B -> Dipaksa ke ID Guru A', async () => {
    const created = await overtimeService.createOvertime({
      employee_id: GURU_B_ACTOR.employeeId,
      overtime_date: '2027-02-02',
      hours: 2.0,
      task_description: 'Koreksi tugas'
    }, GURU_A_ACTOR);

    assert.equal(created.employee_id, GURU_A_ACTOR.employeeId, 'employee_id HARUS dipaksa ke actor.employeeId');
    assert.notEqual(created.employee_id, GURU_B_ACTOR.employeeId);

    // Cleanup
    await db('employee_overtimes').where({ id: created.id }).del();
  });
});

test('3. Cross-Unit Scoping: HR Unit 2 tidak bisa submit/manage data pegawai Unit 1', async () => {
  await assert.rejects(
    async () => {
      // Pegawai ID 3 adalah Unit 1, HRD_UNIT2 memiliki unitScope = [2]
      await leaveService.createLeaveRequest({
        employee_id: 3,
        leave_type: 'cuti_tahunan',
        start_date: '2027-03-01',
        end_date: '2027-03-01',
        reason: 'HR unit 2 inject'
      }, HRD_UNIT2_ACTOR);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN_SCOPE');
      return true;
    }
  );
});

test('4. Anti Self-Approval: Pemohon tidak bisa menyetujui pengajuannya sendiri', async () => {
  // Pastikan saldo Guru A cukup
  await leaveLedgerService.ensureEntitlement(GURU_A_ACTOR.employeeId, '2026/2027');

  const request = await leaveService.createLeaveRequest({
    leave_type: 'cuti_tahunan',
    start_date: '2027-04-05',
    end_date: '2027-04-05',
    reason: 'Cuti Guru A'
  }, GURU_A_ACTOR);

  // Guru A mencoba menyetujui langkah approval pengajuannya sendiri
  await assert.rejects(
    async () => {
      await leaveService.approveLeaveRequest(request.id, GURU_A_ACTOR, 'Saya setujui sendiri');
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.ok(err.code === 'SELF_APPROVAL_FORBIDDEN' || err.code === 'FORBIDDEN');
      return true;
    }
  );

  // Cleanup
  await db('employee_leave_requests').where({ id: request.id }).del();
  await db('approval_steps').where({ entity_type: 'leave', entity_id: request.id }).del();
});
