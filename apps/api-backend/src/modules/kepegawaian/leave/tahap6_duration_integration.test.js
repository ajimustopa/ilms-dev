/**
 * Integration Tests for Tahap 6: Leave Duration Calculation Engine & Endpoint
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4, §9, §11.1, §12
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

test('Tahap 6 Integration: Duration Computation Engine & Preview Duration', async (t) => {
  // Safety assertions
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN');

  // Seed foundation & configurations
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Define actors
  const guruUser = {
    id: 3,
    username: 'guru_smp_1',
    account_type: 'teacher',
    ref_type: 'teacher',
    ref_id: 3,
    school_unit_id: 1,
    permissions: []
  };

  const hrdSmpUser = {
    id: 2,
    username: 'hrd_smp',
    account_type: 'staff',
    ref_type: 'staff',
    ref_id: 1,
    school_unit_id: 1,
    permissions: [
      'kepegawaian.leave_requests.read',
      'kepegawaian.leave_requests.manage',
      'kepegawaian.leave_types.manage',
      'kepegawaian.leave_balances.manage'
    ]
  };

  const siswaUser = {
    id: 99,
    username: 'siswa_smp_1',
    account_type: 'student',
    ref_type: 'student',
    ref_id: 99,
    school_unit_id: 1,
    permissions: []
  };

  await t.test('1. Siswa Uji (Student Account) is rejected with 403 ACTOR_NOT_EMPLOYEE', async () => {
    const actor = await leaveService.resolveActor(siswaUser);
    await assert.rejects(
      async () => {
        await leaveService.computeDurationForRequest({
          leave_type: 'cuti_tahunan',
          start_date: '2026-10-05',
          end_date: '2026-10-09'
        }, actor);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'ACTOR_NOT_EMPLOYEE');
        return true;
      }
    );
  });

  await t.test('2. Guru Uji self-service duration computation (5 HK full week)', async () => {
    const actor = await leaveService.resolveActor(guruUser);
    const res = await leaveService.computeDurationForRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-10-05',
      end_date: '2026-10-09',
      start_portion: 'full',
      end_portion: 'full'
    }, actor);

    assert.equal(res.employee_id, 3);
    assert.equal(res.leave_type, 'cuti_tahunan');
    assert.equal(res.count_mode, 'work_days');
    assert.equal(res.total_days, 5.0);
    assert.equal(res.breakdown.length, 5);
    assert.equal(res.by_period['2026/2027'], 5.0);
  });

  await t.test('3. Guru Uji IDOR Prevention: employee_id in payload is ignored for non-privileged actor', async () => {
    const actor = await leaveService.resolveActor(guruUser);
    // Guru attempts to pass employee_id = 4 (another teacher)
    const res = await leaveService.computeDurationForRequest({
      employee_id: 4,
      leave_type: 'cuti_tahunan',
      start_date: '2026-10-05',
      end_date: '2026-10-09'
    }, actor);

    // Must be forced to actor.employeeId (3)
    assert.equal(res.employee_id, 3);
  });

  await t.test('4. HRD SMP Scoping: can calculate for Unit 1 employee, forbidden for Unit 2 employee', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);

    // 4a. Unit 1 employee (emp id 3) -> SUCCESS
    const resUnit1 = await leaveService.computeDurationForRequest({
      employee_id: 3,
      leave_type: 'cuti_tahunan',
      start_date: '2026-10-05',
      end_date: '2026-10-09'
    }, actor);
    assert.equal(resUnit1.employee_id, 3);
    assert.equal(resUnit1.total_days, 5.0);

    // 4b. Unit 2 employee -> 403 FORBIDDEN_SCOPE
    await kepDb('employees').insert({
      id: 98,
      school_unit_id: 2,
      employee_number: 'EMP098',
      full_name: 'Guru Unit 2 SMA',
      account_status: 'active',
      employment_status: 'gty'
    });

    try {
      await assert.rejects(
        async () => {
          await leaveService.computeDurationForRequest({
            employee_id: 98,
            leave_type: 'cuti_tahunan',
            start_date: '2026-10-05',
            end_date: '2026-10-09'
          }, actor);
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.equal(err.code, 'FORBIDDEN_SCOPE');
          return true;
        }
      );
    } finally {
      await kepDb('employees').where({ id: 98 }).del();
    }
  });

  await t.test('5. Half-day calculation (Sen 05 pm -> Rab 07 am) -> 2.0 HK', async () => {
    const actor = await leaveService.resolveActor(guruUser);
    const res = await leaveService.computeDurationForRequest({
      leave_type: 'cuti_tahunan',
      start_date: '2026-10-05',
      end_date: '2026-10-07',
      start_portion: 'pm',
      end_portion: 'am'
    }, actor);

    assert.equal(res.total_days, 2.0);
    assert.equal(res.breakdown[0].weight, 0.5);
    assert.equal(res.breakdown[1].weight, 1.0);
    assert.equal(res.breakdown[2].weight, 0.5);
  });

  await t.test('6. Invariant Rejections: INVALID_RANGE and INVALID_PORTION', async () => {
    const actor = await leaveService.resolveActor(guruUser);

    // 6a. Reversed range
    await assert.rejects(
      async () => {
        await leaveService.computeDurationForRequest({
          leave_type: 'cuti_tahunan',
          start_date: '2026-10-10',
          end_date: '2026-10-05'
        }, actor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'INVALID_RANGE');
        return true;
      }
    );

    // 6b. Multi-day starting with am
    await assert.rejects(
      async () => {
        await leaveService.computeDurationForRequest({
          leave_type: 'cuti_tahunan',
          start_date: '2026-10-05',
          end_date: '2026-10-07',
          start_portion: 'am',
          end_portion: 'full'
        }, actor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'INVALID_PORTION');
        return true;
      }
    );
  });

  await t.test('7. Calendar Mode: Cuti Melahirkan 90 hari kalender across academic period', async () => {
    const actor = await leaveService.resolveActor(guruUser);
    const res = await leaveService.computeDurationForRequest({
      leave_type: 'cuti_melahirkan',
      start_date: '2026-12-01',
      end_date: '2027-02-28',
      start_portion: 'full',
      end_portion: 'full'
    }, actor);

    assert.equal(res.count_mode, 'calendar_days');
    assert.equal(res.total_days, 90.0);
    assert.equal(res.by_period['2026/2027'], 90.0);
  });

  t.after(async () => {
    await coreDb.destroy();
    await kepDb.destroy();
  });
});
