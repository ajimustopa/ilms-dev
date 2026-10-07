/**
 * Tahap 2: Integration Test Suite for Layered Holidays & Calendar Backend
 * Modul Kepegawaian - Core Aldepos
 * Uses Node.js native test runner (node:test)
 * Tests against dev databases (kepegawaian_dev, core_dev) on localhost
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const coreDb = require('../../../config/db/core');
const kepDb = require('../../../config/db/kepegawaian');
const holidayService = require('./holidayService');
const leaveService = require('./leaveService');
const { seedDataUji } = require('./seeds/seed_data_uji_hrd');
const { cleanDataUji } = require('./seeds/clean_data_uji_hrd');

describe('Tahap 2: Layered Holidays Backend Integration', () => {
  let hrdSmpActor;
  let adminPusatActor;
  let guruActor;

  before(async () => {
    // Enforce dev database safety
    const kepCfg = kepDb.client.connectionSettings;
    const coreCfg = coreDb.client.connectionSettings;
    if (!['127.0.0.1', 'localhost'].includes(kepCfg.host) || !kepCfg.database.endsWith('_dev')) {
      throw new Error(`SAFETY ERROR: kepegawaian DB is not dev DB (${kepCfg.host}:${kepCfg.database})`);
    }
    if (!['127.0.0.1', 'localhost'].includes(coreCfg.host) || !coreCfg.database.endsWith('_dev')) {
      throw new Error(`SAFETY ERROR: core DB is not dev DB (${coreCfg.host}:${coreCfg.database})`);
    }

    // Clean & Seed fixture accounts
    await cleanDataUji(coreDb, kepDb);
    await seedDataUji(coreDb, kepDb);

    // Clean any previous test holidays
    await kepDb('holiday_schedule_targets').del();
    await kepDb('holidays').del();

    // Setup actors
    // HRD SMP (Unit 1 only)
    const hrdUser = {
      id: 2,
      username: 'hrd_smp',
      account_type: 'staff',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: 1,
      permissions: ['kepegawaian.holidays.manage', 'kepegawaian.leave_requests.read']
    };
    hrdSmpActor = await leaveService.resolveActor(hrdUser);

    // Admin Pusat (Global / All units)
    const adminUser = {
      id: 1,
      username: 'admin_pusat',
      account_type: 'admin_yayasan',
      ref_type: 'staff',
      ref_id: 1,
      school_unit_id: null,
      permissions: ['kepegawaian.holidays.manage', 'kepegawaian.leave_requests.manage']
    };
    adminPusatActor = await leaveService.resolveActor(adminUser);

    // Guru (Regular staff, no holidays.manage)
    const guruUser = {
      id: 4,
      username: 'guru_uji',
      account_type: 'teacher',
      ref_type: 'staff',
      ref_id: 3,
      school_unit_id: 1,
      permissions: ['guru.portal.access']
    };
    guruActor = await leaveService.resolveActor(guruUser);
  });

  after(async () => {
    // Clean test data after tests
    await kepDb('holiday_schedule_targets').del();
    await kepDb('holidays').del();
    await cleanDataUji(coreDb, kepDb);
  });

  it('1. Scoping Enforcement: HRD SMP cannot create or manage holidays for another unit (SMA / Unit 2)', async () => {
    try {
      await holidayService.createHoliday({
        name: 'Libur SMA Khusus',
        holiday_type: 'unit_special',
        start_date: '2026-11-10',
        end_date: '2026-11-10',
        school_unit_id: 2 // SMA (Forbidden for HRD SMP unit 1)
      }, hrdSmpActor);
      assert.fail('Should have failed with 403 FORBIDDEN_SCOPE');
    } catch (err) {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN_SCOPE');
    }
  });

  it('2. Holiday CRUD Flow with Schedule Targets & Audit Logging', async () => {
    // 1. Create Holiday with target schedule
    const created = await holidayService.createHoliday({
      name: 'Libur Akhir Semester Gasal Uji',
      holiday_type: 'school_semester',
      start_date: '2026-12-21',
      end_date: '2026-12-24',
      school_unit_id: 1,
      applies_to: 'schedules',
      target_schedule_ids: [1], // Target schedule 1
      is_off_day: true,
      deducts_annual_leave: false,
      date_rule: 'floating',
      notes: 'Libur semester pengajar SMP'
    }, hrdSmpActor);

    assert.ok(created.id);
    assert.equal(created.name, 'Libur Akhir Semester Gasal Uji');
    assert.equal(created.applies_to, 'schedules');
    assert.deepEqual(created.target_schedule_ids, [1]);

    // Verify DB
    const dbHoliday = await kepDb('holidays').where({ id: created.id }).first();
    assert.ok(dbHoliday);
    assert.equal(dbHoliday.review_status, 'confirmed');

    // Verify audit log
    const auditLog = await kepDb('leave_audit_logs')
      .where({ entity_type: 'holiday', entity_id: created.id, action: 'create' })
      .first();
    assert.ok(auditLog);
    assert.equal(Number(auditLog.actor_user_id), 2);

    // 2. Update Holiday
    const updated = await holidayService.updateHoliday(created.id, {
      name: 'Libur Akhir Semester Gasal Uji (Revisi)',
      notes: 'Catatan diperbarui'
    }, hrdSmpActor);

    assert.equal(updated.name, 'Libur Akhir Semester Gasal Uji (Revisi)');
    assert.equal(updated.notes, 'Catatan diperbarui');

    // 3. Delete (Soft Delete)
    const deleteRes = await holidayService.deleteHoliday(created.id, hrdSmpActor);
    assert.equal(deleteRes.success, true);

    const deletedRow = await kepDb('holidays').where({ id: created.id }).first();
    assert.ok(deletedRow.deleted_at);

    // List should not include soft deleted
    const listRes = await holidayService.getHolidays({ school_unit_id: 1 }, hrdSmpActor);
    assert.ok(!listRes.data.some(h => h.id === created.id));
  });

  it('3. Import CSV/JSON workflow (Preview vs Commit) and duplicate protection', async () => {
    const csvContent = `name,holiday_type,start_date,end_date,is_off_day,applies_to,deducts_annual_leave,date_rule,notes
Hari Kemerdekaan RI,national,2026-08-17,2026-08-17,true,all_employees,false,fixed_date,HUT RI
Tahun Baru Hijriah,national,2026-07-07,2026-07-07,true,all_employees,false,floating,Tahun Baru Islam`;

    // 1. Preview mode
    const previewRes = await holidayService.importHolidays({
      mode: 'preview',
      format: 'csv',
      content: csvContent,
      school_unit_id: 1
    }, hrdSmpActor);

    assert.equal(previewRes.mode, 'preview');
    assert.equal(previewRes.valid_count, 2);
    assert.equal(previewRes.invalid_count, 0);
    assert.equal(previewRes.preview_rows.length, 2);

    // 2. Commit mode
    const commitRes = await holidayService.importHolidays({
      mode: 'commit',
      format: 'csv',
      content: csvContent,
      school_unit_id: 1
    }, hrdSmpActor);

    assert.equal(commitRes.success, true);
    assert.equal(commitRes.data.inserted_count, 2);

    // 3. Re-importing same file updates rather than failing
    const reimportRes = await holidayService.importHolidays({
      mode: 'commit',
      format: 'csv',
      content: csvContent,
      school_unit_id: 1
    }, hrdSmpActor);

    assert.equal(reimportRes.success, true);
    assert.equal(reimportRes.data.updated_count, 2);
  });

  it('4. Copy Year workflow (fixed_date -> confirmed, floating -> draft_needs_review)', async () => {
    // Copy from 2026 to 2027
    const copyRes = await holidayService.copyYear({
      from_year: 2026,
      to_year: 2027,
      school_unit_id: 1
    }, hrdSmpActor);

    assert.equal(copyRes.success, true);
    assert.equal(copyRes.data.created_count, 2);

    // Verify 2027 holidays
    const holidays2027 = await holidayService.getHolidays({ year: 2027, school_unit_id: 1 }, hrdSmpActor);
    assert.equal(holidays2027.data.length, 2);

    const fixedItem = holidays2027.data.find(h => h.name === 'Hari Kemerdekaan RI');
    assert.ok(fixedItem);
    assert.equal(fixedItem.start_date, '2027-08-17');
    assert.equal(fixedItem.review_status, 'confirmed');

    const floatingItem = holidays2027.data.find(h => h.name === 'Tahun Baru Hijriah');
    assert.ok(floatingItem);
    assert.equal(floatingItem.start_date, '2027-07-07');
    assert.equal(floatingItem.review_status, 'draft_needs_review');

    // Idempotency check: copy again skips existing
    const reCopyRes = await holidayService.copyYear({
      from_year: 2026,
      to_year: 2027,
      school_unit_id: 1
    }, hrdSmpActor);
    assert.equal(reCopyRes.data.skipped_count, 2);
    assert.equal(reCopyRes.data.created_count, 0);
  });

  it('5. Effective Off-Days Resolver per Employee (getOffDaysForEmployee)', async () => {
    // Teacher (employee_id: 3 in Unit 1)
    const offDays = await holidayService.getOffDaysForEmployee(3, 1, '2026-08-15', '2026-08-18');
    assert.ok(offDays['2026-08-17']);
    assert.equal(offDays['2026-08-17'].length, 1);
    assert.equal(offDays['2026-08-17'][0].name, 'Hari Kemerdekaan RI');
    assert.equal(offDays['2026-08-15'].length, 0); // No holiday
  });

  it('6. Joint leave skeleton returns 501 Not Implemented', async () => {
    try {
      await holidayService.applyJointLeaveDeduction(1, hrdSmpActor);
      assert.fail('Should have failed with 501');
    } catch (err) {
      assert.equal(err.statusCode, 501);
      assert.equal(err.code, 'NOT_IMPLEMENTED');
    }
  });

  it('7. Sync Academic Calendar returns clean structured response', async () => {
    const syncRes = await holidayService.syncAcademicCalendar({ school_unit_id: 1 }, hrdSmpActor);
    assert.equal(syncRes.success, true);
    assert.ok(syncRes.data);
    assert.equal(typeof syncRes.data.synced_count, 'number');
  });

  after(async () => {
    const academicDb = require('../../../config/db/akademik');
    await coreDb.destroy();
    await kepDb.destroy();
    await academicDb.destroy();
  });
});
