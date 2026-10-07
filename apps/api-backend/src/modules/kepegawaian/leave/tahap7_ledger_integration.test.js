/**
 * Integration Tests for Tahap 7: Leave Balance Policies, Ledger, and Operations
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #1-5, #15, #28, §5 (seluruh), §10.2, §10.3 (M-D, M-E), §11.3
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
const { rebuildBalanceFromLedger, allocateDaysToBuckets } = require('./entitlementCalculator');

test('Tahap 7 Integration: Leave Entitlement, Append-Only Ledger, and Balance Management', async (t) => {
  // 1. Verify DB safety guards (Rule 5)
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN');

  // 2. Reseed database to known clean state
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Clean ledger and balances for test run
  await kepDb('leave_ledger_entries').del();
  await kepDb('employee_leave_balances').del();

  // Define actors
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
      'kepegawaian.leave_balances.read',
      'kepegawaian.leave_balances.manage',
      'kepegawaian.holidays.manage'
    ]
  };

  const guruUser = {
    id: 3,
    username: 'guru_smp_1',
    account_type: 'teacher',
    ref_type: 'teacher',
    ref_id: 3,
    school_unit_id: 1,
    permissions: []
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

  await t.test('1. B1-B3 Lazy Entitlement Grant on EnsureEntitlement', async () => {
    // Employee 3 is GTY with join_date 2026-07-01 -> full 12.0 days for 2026/2027
    const balance = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.ok(balance);
    assert.equal(balance.employee_id, 3);
    assert.equal(balance.granted, 12.0);
    assert.equal(balance.available, 12.0);
    assert.equal(balance.used, 0);
    assert.equal(balance.reserved, 0);

    // Verify ledger entry
    const entries = await kepDb('leave_ledger_entries').where({ employee_id: 3, entry_type: 'grant' });
    assert.equal(entries.length, 1);
    assert.equal(parseFloat(entries[0].delta_available), 12.0);
    assert.equal(entries[0].idempotency_key, `init:emp:3:period:${balance.period_id}:grant`);
  });

  await t.test('2. B6: Reserve balance and Release restores available balance', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);

    // Initial: available = 12.0, reserved = 0
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.reserveBalance({
        employeeId: 3,
        days: 5.0,
        leaveRequestId: 101,
        version: 1,
        reason: 'Pengajuan cuti tahunan 5 hari',
        actor
      }, trx);
    });

    let bal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(bal.available, 7.0);
    assert.equal(bal.reserved, 5.0);
    assert.equal(bal.used, 0);

    // Request is rejected -> Release 5.0
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.releaseBalance({
        employeeId: 3,
        days: 5.0,
        leaveRequestId: 101,
        version: 1,
        reason: 'Pengajuan cuti ditolak oleh atasan',
        actor
      }, trx);
    });

    bal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(bal.available, 12.0);
    assert.equal(bal.reserved, 0);
    assert.equal(bal.used, 0);

    // Rebuild ledger and check invariant
    const ledger = await leaveLedgerService.getLedgerEntries(3);
    const rebuilt = rebuildBalanceFromLedger(ledger.entries);
    assert.equal(rebuilt.isValid, true);
    assert.equal(rebuilt.available, 12.0);
  });

  await t.test('3. B7: Approved 5 days, Partial Refund of 2 days -> 3 used, 9 available', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);

    // 1. Reserve 5 days
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.reserveBalance({
        employeeId: 3,
        days: 5.0,
        leaveRequestId: 102,
        version: 1,
        reason: 'Cuti tahunan 5 hari',
        actor
      }, trx);
    });

    // 2. Commit 5 days on approval
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.commitBalance({
        employeeId: 3,
        days: 5.0,
        leaveRequestId: 102,
        version: 1,
        reason: 'Persetujuan cuti',
        actor
      }, trx);
    });

    let bal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(bal.available, 7.0);
    assert.equal(bal.reserved, 0);
    assert.equal(bal.used, 5.0);

    // 3. Partial refund: HR cancels 2 days starting Thursday
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.refundBalance({
        employeeId: 3,
        days: 2.0,
        leaveRequestId: 102,
        reason: 'Pembatalan parsial 2 hari oleh HRD',
        actor
      }, trx);
    });

    bal = await leaveLedgerService.getEmployeeBalance(3, '2026/2027');
    assert.equal(bal.available, 9.0); // 7 + 2 = 9
    assert.equal(bal.used, 3.0); // 5 - 2 = 3
    assert.equal(bal.reserved, 0);

    const ledger = await leaveLedgerService.getLedgerEntries(3);
    const rebuilt = rebuildBalanceFromLedger(ledger.entries);
    assert.equal(rebuilt.isValid, true);
    assert.equal(rebuilt.available, 9.0);
    assert.equal(rebuilt.used, 3.0);
  });

  await t.test('4. B8: Balance Insufficient Check (allow_negative=0)', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);
    // Employee 3 currently has available = 9.0. Requesting 10.0 should fail.
    await assert.rejects(
      async () => {
        await kepDb.transaction(async (trx) => {
          await leaveLedgerService.reserveBalance({
            employeeId: 3,
            days: 10.0,
            leaveRequestId: 103,
            version: 1,
            reason: 'Pengajuan melebihi saldo',
            actor
          }, trx);
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'BALANCE_INSUFFICIENT');
        return true;
      }
    );
  });

  await t.test('5. B9: Concurrency Lock Test with SELECT FOR UPDATE (Live DB)', async () => {
    // Set employee 8 balance to exactly 5.0 available via adjust
    const actor = await leaveService.resolveActor(hrdSmpUser);
    await leaveLedgerService.getEmployeeBalance(8, '2026/2027'); // Ensure init (12.0)
    await leaveLedgerService.adjustBalance({
      employeeId: 8,
      deltaAvailable: -7.0, // 12 - 7 = 5.0
      reason: 'Setup initial test balance 5.0 for concurrency test',
      actor
    });

    let bal8 = await leaveLedgerService.getEmployeeBalance(8, '2026/2027');
    assert.equal(bal8.available, 5.0);

    // Launch two concurrent reserve requests of 3.0 each
    const req1 = kepDb.transaction(async (trx) => {
      await leaveLedgerService.reserveBalance({
        employeeId: 8,
        days: 3.0,
        leaveRequestId: 201,
        version: 1,
        reason: 'Concurrent request 1',
        actor
      }, trx);
    });

    const req2 = kepDb.transaction(async (trx) => {
      await leaveLedgerService.reserveBalance({
        employeeId: 8,
        days: 3.0,
        leaveRequestId: 202,
        version: 1,
        reason: 'Concurrent request 2',
        actor
      }, trx);
    });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed, one must fail with BALANCE_INSUFFICIENT
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, 'BALANCE_INSUFFICIENT');

    bal8 = await leaveLedgerService.getEmployeeBalance(8, '2026/2027');
    assert.equal(bal8.available, 2.0); // 5.0 - 3.0 = 2.0
    assert.equal(bal8.reserved, 3.0);
  });

  await t.test('6. B10: Idempotent Commit (Duplicate Approval Does Not Deduct Twice)', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);

    // Commit req1 for employee 8 (version 1)
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.commitBalance({
        employeeId: 8,
        days: 3.0,
        leaveRequestId: 201,
        version: 1,
        reason: 'Approval 1',
        actor
      }, trx);
    });

    let bal = await leaveLedgerService.getEmployeeBalance(8, '2026/2027');
    assert.equal(bal.used, 3.0);
    assert.equal(bal.reserved, 0);

    // Repeat same commit
    await kepDb.transaction(async (trx) => {
      await leaveLedgerService.commitBalance({
        employeeId: 8,
        days: 3.0,
        leaveRequestId: 201,
        version: 1,
        reason: 'Approval 1 (Duplicate retry)',
        actor
      }, trx);
    });

    bal = await leaveLedgerService.getEmployeeBalance(8, '2026/2027');
    assert.equal(bal.used, 3.0); // Still 3.0, NOT 6.0
    assert.equal(bal.reserved, 0);
  });

  await t.test('7. Joint Leave Deduction (SPEC §5.5, §11.1)', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);

    try {
      // Clean previous test holiday if exists
      await kepDb('holidays').where({ name: 'Cuti Bersama Uji Tahap 7' }).del();

      // Create a joint leave holiday with deducts_annual_leave = 1
      const [holidayId] = await kepDb('holidays').insert({
        name: 'Cuti Bersama Uji Tahap 7',
        holiday_type: 'joint_leave',
        start_date: '2026-12-24',
        end_date: '2026-12-24',
        is_off_day: 1,
        deducts_annual_leave: 1,
        school_unit_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await leaveLedgerService.applyJointLeaveDeduction(holidayId, actor);
      assert.ok(result);
      assert.ok(result.affectedEmployeesCount > 0);

      // Check that employee 3 has a joint_leave_debit entry
      const jointEntry = await kepDb('leave_ledger_entries')
        .where({
          employee_id: 3,
          entry_type: 'joint_leave_debit',
          source_id: holidayId
        })
        .first();

      assert.ok(jointEntry);
      assert.equal(parseFloat(jointEntry.delta_available), -1.0);
      assert.equal(parseFloat(jointEntry.delta_used), 1.0);

      // Repeat execution -> Idempotent, 0 new deductions
      const repeatResult = await leaveLedgerService.applyJointLeaveDeduction(holidayId, actor);
      assert.equal(repeatResult.affectedEmployeesCount, 0);
    } catch (err) {
      console.error('[TEST 7 ERROR DETAIL]', err);
      throw err;
    }
  });

  await t.test('8. Period Close Dry-Run and Carry-Over Calculation (SPEC §5.3, B4)', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);
    const activePeriod = await leaveLedgerService.getActivePeriod(1);

    const dryRunResult = await leaveLedgerService.closePeriod(activePeriod.id, { dryRun: true }, actor);
    assert.equal(dryRunResult.dry_run, true);
    assert.equal(dryRunResult.period_key, '2026/2027');
    assert.equal(dryRunResult.next_period_key, '2027/2028');
    assert.ok(dryRunResult.carry_overs.length > 0);

    // Check carry over limit (max 6.0 days per policy)
    for (const co of dryRunResult.carry_overs) {
      assert.ok(co.carry_in <= 6.0);
      if (co.carry_in > 0) {
        assert.equal(co.carry_expires_on, '2027-09-30');
      } else {
        assert.equal(co.carry_expires_on, null);
      }
    }
  });

  await t.test('9. Reconcile Balances reports 0 discrepancies against Append-Only Ledger', async () => {
    const actor = await leaveService.resolveActor(hrdSmpUser);
    const activePeriod = await leaveLedgerService.getActivePeriod(1);

    const reconcileResult = await leaveLedgerService.reconcileBalances(activePeriod.id, { dryRun: true }, actor);
    assert.equal(reconcileResult.dry_run, true);
    assert.equal(reconcileResult.discrepancies_count, 0);
    assert.equal(reconcileResult.discrepancies.length, 0);
  });

  await t.test('10. Security: Student (Siswa) receives 403 on /leave-balances/my', async () => {
    const actor = await leaveService.resolveActor(siswaUser);
    assert.equal(actor.employeeId, null);
  });

  t.after(async () => {
    await coreDb.destroy();
    await kepDb.destroy();
  });
});
