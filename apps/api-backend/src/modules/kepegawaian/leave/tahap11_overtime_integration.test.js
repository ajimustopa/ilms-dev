/**
 * Integration Tests for Tahap 11: Complete Overtime Backend Service & Endpoints
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #18-22, §7 (seluruh), §8.3, §10.1, §10.2, §11.4, §12
 * Target: kepegawaian_dev, core_dev (127.0.0.1:3306)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const coreDb = require('../../../config/db/core');
const kepDb = require('../../../config/db/kepegawaian');
const { assertDevDatabase } = require('../../../config/db/dbGuard');
const { seedDataUji } = require('./seeds/seed_data_uji_hrd');
const { seedUsulanTerkunci } = require('./seeds/seed_usulan_terkunci');
const overtimeService = require('./overtimeService');
const leaveService = require('./leaveService');

test('Tahap 11 Integration: Overtime Assignment, Scoping, Approval, Limits, and Lifecycle', async (t) => {
  // 1. Guard check
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE_11');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN_11');

  // 2. Reseed DB
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Clean test tables
  await kepDb('approval_steps').where({ entity_type: 'overtime' }).del();
  await kepDb('employee_overtimes').del();
  await kepDb('attendance_period_locks').del();
  await kepDb('overtime_rate_policies').where({ id: 1 }).update({
    name: 'Kebijakan Lembur Standar Yayasan',
    calc_method: 'flat_hourly',
    flat_hourly_rate: null,
    max_hours_per_day: 4.0,
    max_hours_per_week: 18.0,
    max_hours_per_month: 72.0,
    eligible_employment_statuses: JSON.stringify(['GTY', 'PTY'])
  });

  // Define test actors
  const hrdActor = {
    userId: 2,
    employeeId: 1, // Dra. Hj. Siti Aminah (HRD SMP)
    username: 'hrd_smp',
    permissions: [
      'kepegawaian.overtimes.manage',
      'kepegawaian.leave_requests.read',
      'kepegawaian.leave_requests.manage',
      'kepegawaian.leave_requests.override',
      'kepegawaian.overtime_settings.manage'
    ],
    unitScope: [1]
  };

  const guruActor = {
    userId: 3,
    employeeId: 3, // Budi Santoso, S.Pd (Guru GTY SMP)
    username: 'guru_smp_1',
    permissions: [],
    unitScope: [1]
  };

  const nonEligibleActor = {
    userId: 5,
    employeeId: 4, // Pelatih Ekskul (non-GTY/PTY)
    username: 'pelatih_1',
    permissions: [],
    unitScope: [1]
  };

  const siswaActor = {
    userId: 10,
    employeeId: null,
    username: 'siswa_1',
    permissions: [],
    unitScope: [1]
  };

  // Helper to ensure employee 4 is marked as Pelatih Ekskul for eligibility testing
  await kepDb('employees').where({ id: 4 }).update({ employment_status: 'Pelatih Ekskul' });
  await kepDb('employees').where({ id: 3 }).update({ employment_status: 'GTY' });

  await t.test('1. Security & Scoping on GET /overtimes (SPEC §9.2)', async () => {
    // Create one overtime for employee 1 and one for employee 3
    await kepDb('employee_overtimes').insert([
      {
        school_unit_id: 1,
        employee_id: 1,
        origin: 'assigned',
        overtime_date: '2026-10-05',
        hours: 2.0,
        day_type: 'workday',
        status: 'approved',
        task_description: 'Lembur HRD 1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        school_unit_id: 1,
        employee_id: 3,
        origin: 'requested',
        overtime_date: '2026-10-06',
        hours: 3.0,
        day_type: 'workday',
        status: 'pending',
        task_description: 'Lembur Guru 3',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // HR sees both records in unit 1
    const hrList = await overtimeService.getOvertimes({}, hrdActor);
    assert.equal(hrList.data.length, 2);

    // Guru only sees their own record (employee 3)
    const guruList = await overtimeService.getOvertimes({}, guruActor);
    assert.equal(guruList.data.length, 1);
    assert.equal(guruList.data[0].employee_id, 3);

    // Non-employee user (siswa) receives empty list
    const siswaList = await overtimeService.getOvertimes({}, siswaActor);
    assert.equal(siswaList.data.length, 0);
  });

  await t.test('2. Preview Overtime with day classification, limit check, and no fake wage (SPEC §7.4, §2 #19)', async () => {
    // Preview a 3.0h workday overtime for Guru 3
    const preview = await overtimeService.previewOvertime({
      employee_id: 3,
      overtime_date: '2026-10-07', // Wednesday (workday)
      start_time: '17:00',
      end_time: '20:00',
      hours: 3.0,
      requires_actual_attendance: true
    }, hrdActor);

    assert.equal(preview.can_submit, true);
    assert.equal(preview.day_type, 'workday');
    assert.equal(preview.hours, 3.0);
    assert.equal(preview.multiplier_breakdown.totalWeightedHours, 5.5);
    // Estimated wage must be NULL because policy has no flat rate (SPEC §7.4)
    assert.equal(preview.estimated_wage, null);
    assert.equal(preview.limits.valid, true);
    assert.equal(preview.errors.length, 0);
  });

  await t.test('3. Eligibility check rejects non-eligible employment status (SPEC §7.1, §2 #22)', async () => {
    await assert.rejects(async () => {
      await overtimeService.createOvertime({
        employee_id: 4, // Pelatih Ekskul
        overtime_date: '2026-10-07',
        hours: 2.0,
        task_description: 'Lembur melatih'
      }, hrdActor);
    }, (err) => {
      assert.equal(err.code, 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE');
      return true;
    });
  });

  await t.test('4. Self-claim backdate limit enforcement (SPEC §7.1, §2 #18)', async () => {
    // Requesting overtime more than 7 days ago as requested
    await assert.rejects(async () => {
      await overtimeService.createOvertime({
        employee_id: 3,
        overtime_date: '2026-09-01', // more than 7 days in past
        hours: 2.0,
        origin: 'requested',
        task_description: 'Lembur mundur lewat batas'
      }, guruActor);
    }, (err) => {
      assert.equal(err.code, 'BACKDATE_EXCEEDED');
      return true;
    });
  });

  await t.test('5. Leave vs Overtime conflict prevention (SPEC §7.4)', async () => {
    // Create an approved full-day leave for employee 3 on 2026-10-08
    await kepDb('employee_leave_requests').insert({
      school_unit_id: 1,
      employee_id: 3,
      leave_type: 'cuti_tahunan',
      start_date: '2026-10-08',
      end_date: '2026-10-08',
      duration_days: 1.0,
      start_portion: 'full',
      end_portion: 'full',
      status: 'approved',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Attempt to submit overtime on the same date
    await assert.rejects(async () => {
      await overtimeService.createOvertime({
        employee_id: 3,
        overtime_date: '2026-10-08',
        hours: 3.0,
        task_description: 'Lembur di hari cuti'
      }, hrdActor);
    }, (err) => {
      assert.equal(err.code, 'OVERTIME_CONFLICT');
      return true;
    });
  });

  await t.test('6. Overtime limits enforcement & HR override bypass (SPEC §7.4)', async () => {
    // Requesting 4.5h (> 4.0h max daily) without bypass -> rejected
    await assert.rejects(async () => {
      await overtimeService.createOvertime({
        employee_id: 3,
        overtime_date: '2026-10-09',
        hours: 4.5,
        task_description: 'Lembur 4.5 jam tanpa bypass'
      }, hrdActor);
    }, (err) => {
      assert.equal(err.code, 'OVERTIME_LIMIT_EXCEEDED');
      return true;
    });

    // Requesting 4.5h with HR bypass_limits & reason -> successfully created
    const created = await overtimeService.createOvertime({
      employee_id: 3,
      overtime_date: '2026-10-09',
      hours: 4.5,
      task_description: 'Lembur persiapan akreditasi mendesak',
      bypass_limits: true,
      bypass_reason: 'Instruksi Yayasan menjelang visitasi akreditasi'
    }, hrdActor);

    assert.equal(created.status, 'pending');
    assert.equal(created.hours, 4.5);
    assert.equal(created.approval_steps.length, 1);
    assert.equal(created.approval_steps[0].status, 'pending');
  });

  await t.test('7. Lifecycle: Approve, Reject, Cancel, and Period Lock Guard (SPEC §6.5, §8 #3)', async () => {
    // 7a. Approve pending overtime
    const ot = await overtimeService.createOvertime({
      employee_id: 3,
      overtime_date: '2026-10-12',
      hours: 2.0,
      task_description: 'Lembur koreksi UTS'
    }, hrdActor);

    const approved = await overtimeService.approveOvertime(ot.id, hrdActor, 'Disetujui untuk koreksi');
    assert.equal(approved.status, 'approved');
    assert.equal(approved.approved_by, hrdActor.userId);
    assert.equal(approved.approval_steps[0].status, 'approved');

    // 7b. Reject another overtime
    const otReject = await overtimeService.createOvertime({
      employee_id: 3,
      overtime_date: '2026-10-13',
      hours: 2.0,
      task_description: 'Lembur tanpa izin'
    }, hrdActor);

    const rejected = await overtimeService.rejectOvertime(otReject.id, hrdActor, 'Kegiatan tidak mendesak');
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.rejection_reason, 'Kegiatan tidak mendesak');
    assert.equal(rejected.approval_steps[0].status, 'rejected');

    // 7c. Cancel by owner
    const otCancel = await overtimeService.createOvertime({
      employee_id: 3,
      overtime_date: '2026-10-14',
      hours: 2.0,
      origin: 'requested',
      task_description: 'Lembur dibatalkan sendiri'
    }, guruActor);

    const cancelled = await overtimeService.cancelOvertime(otCancel.id, guruActor, 'Tidak jadi lembur');
    assert.equal(cancelled.status, 'cancelled');

    // 7d. Period Lock blocks modification
    await kepDb('attendance_period_locks').insert({
      school_unit_id: 1,
      period_year: 2026,
      period_month: 10,
      status: 'locked',
      locked_by: 2,
      locked_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    const otLocked = await kepDb('employee_overtimes').insert({
      school_unit_id: 1,
      employee_id: 3,
      overtime_date: '2026-10-15',
      hours: 2.0,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    await assert.rejects(async () => {
      await overtimeService.approveOvertime(otLocked[0], hrdActor, 'Coba approve di periode terkunci');
    }, (err) => {
      assert.equal(err.code, 'PERIOD_LOCKED');
      return true;
    });

    // Remove lock for remaining tests
    await kepDb('attendance_period_locks').del();
  });

  await t.test('8. Bulk Create and Bulk Approve Overtimes (SPEC §11.4)', async () => {
    // Bulk assign to employee 1 and 3
    const bulkRes = await overtimeService.bulkCreateOvertime({
      employee_ids: [1, 3],
      overtime_date: '2026-10-16',
      start_time: '17:00',
      end_time: '19:00',
      hours: 2.0,
      task_description: 'Lembur Massal Rapat Kerja',
      spk_number: 'SPK-2026-10-001'
    }, hrdActor);

    assert.equal(bulkRes.total, 2);
    assert.equal(bulkRes.successful, 2);
    assert.ok(bulkRes.batch_id.startsWith('BATCH_'));

    const createdIds = bulkRes.items.map(i => i.data.id);

    // Bulk approve
    const bulkApproveRes = await overtimeService.bulkApproveOvertimes(createdIds, { comment: 'Disetujui massal' }, hrdActor);
    assert.equal(bulkApproveRes.total, 2);
    assert.equal(bulkApproveRes.processed.every(p => p.success), true);
  });

  await t.test('9. Reconcile Overtime with Attendance (SPEC §7.3, §11.4)', async () => {
    const ot = await overtimeService.createOvertime({
      employee_id: 3,
      overtime_date: '2026-10-19',
      start_time: '17:00',
      end_time: '20:00',
      hours: 3.0,
      task_description: 'Lembur rekonsiliasi'
    }, hrdActor);

    await overtimeService.approveOvertime(ot.id, hrdActor);

    // Reconcile: actual presence realized 2.0 hours
    const reconciled = await overtimeService.reconcileOvertime(ot.id, {
      payable_hours: 2.0,
      realization_status: 'partial',
      reason: 'Realisasi presensi checkout jam 19.00'
    }, hrdActor);

    assert.equal(reconciled.payable_hours, 2.0);
    assert.equal(reconciled.realization_status, 'partial');
  });

  await t.test('10. Overtime Settings Management (SPEC §11.1, §11.4)', async () => {
    try {
      const settings = await overtimeService.getOvertimeSettings(1);
      assert.ok(settings.policy);
      assert.ok(settings.tiers.length > 0);

      // Update settings with custom rate
      const updated = await overtimeService.updateOvertimeSettings({
        school_unit_id: null,
        name: 'Kebijakan Lembur Terkini Yayasan',
        calc_method: 'flat_hourly',
        flat_hourly_rate: 30000,
        max_hours_per_day: 4.0,
        max_hours_per_week: 18.0,
        max_hours_per_month: 72.0,
        eligible_employment_statuses: ['GTY', 'PTY'],
        tiers: [
          { day_type: 'workday', from_hour: 0, to_hour: 1, multiplier: 1.5 },
          { day_type: 'workday', from_hour: 1, to_hour: null, multiplier: 2.0 },
          { day_type: 'weekend', from_hour: 0, to_hour: 8, multiplier: 2.0 },
          { day_type: 'weekend', from_hour: 8, to_hour: null, multiplier: 3.0 },
          { day_type: 'holiday', from_hour: 0, to_hour: 8, multiplier: 2.0 },
          { day_type: 'holiday', from_hour: 8, to_hour: null, multiplier: 3.0 }
        ]
      }, hrdActor);

      assert.equal(updated.policy.name, 'Kebijakan Lembur Terkini Yayasan');
      assert.equal(parseFloat(updated.policy.flat_hourly_rate), 30000);
    } catch (err) {
      console.error('SUBTEST 10 ERROR:', err);
      throw err;
    }
  });

  await coreDb.destroy();
  await kepDb.destroy();
});

