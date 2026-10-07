/**
 * Integration Tests for Tahap 4: Master Leave Types, Approval Profiles, Unit Approvers, Delegations, Settings, and Thresholds
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §3, §6.1-6.3, §10.2, §10.3 (M-C), §11.1, §12
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
const leaveTypeService = require('./leaveTypeService');

test('Tahap 4 Integration: Master Types and Configurations', async (t) => {
  // Safety checks
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN');

  // Seed foundation test data & configuration
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Define actors
  const hrdUser = {
    id: 2,
    username: 'hrd_smp',
    account_type: 'staff',
    ref_type: 'staff',
    ref_id: 1,
    school_unit_id: 1,
    permissions: [
      'kepegawaian.leave_types.manage',
      'kepegawaian.leave_requests.read',
      'kepegawaian.leave_requests.manage',
      'kepegawaian.leave_balances.manage'
    ]
  };

  const guruUser = {
    id: 4,
    username: 'guru_uji',
    account_type: 'teacher',
    ref_type: 'staff',
    ref_id: 3,
    school_unit_id: 1,
    permissions: ['guru.portal.access']
  };

  const hrdActor = await leaveService.resolveActor(hrdUser);
  const guruActor = await leaveService.resolveActor(guruUser);

  await t.test('1. Configuration Seed [USULAN-TERKUNCI] Idempotency', async () => {
    const countTypesBefore = await kepDb('leave_types').count('id as count').first();
    const countProfilesBefore = await kepDb('leave_approval_profiles').count('id as count').first();
    const countStepsBefore = await kepDb('leave_approval_profile_steps').count('id as count').first();

    // Re-run seed
    await seedUsulanTerkunci(kepDb);

    const countTypesAfter = await kepDb('leave_types').count('id as count').first();
    const countProfilesAfter = await kepDb('leave_approval_profiles').count('id as count').first();
    const countStepsAfter = await kepDb('leave_approval_profile_steps').count('id as count').first();

    assert.equal(countTypesAfter.count, countTypesBefore.count);
    assert.equal(countProfilesAfter.count, countProfilesBefore.count);
    assert.equal(countStepsAfter.count, countStepsBefore.count);
  });

  await t.test('2. 7 Legacy Types & System Flag Verification', async () => {
    const legacyCodes = ['sakit', 'izin_pribadi', 'cuti_tahunan', 'cuti_melahirkan', 'cuti_khusus', 'dinas_luar', 'lainnya'];
    const types = await kepDb('leave_types').whereIn('code', legacyCodes);

    assert.equal(types.length, 7);
    types.forEach(t => {
      assert.equal(t.is_system, 1, `Legacy type ${t.code} must have is_system=1`);
    });

    const unpaidType = await kepDb('leave_types').where({ code: 'cuti_tanpa_gaji' }).first();
    assert.ok(unpaidType);
    assert.equal(unpaidType.is_active, 0, 'cuti_tanpa_gaji should be inactive by default');
  });

  await t.test('3. Scoping on GET /leave-types (Non-HR vs HR)', async () => {
    // Non-HR actor (Guru)
    const guruTypes = await leaveTypeService.getLeaveTypes({}, guruActor);
    assert.ok(guruTypes.length > 0);
    // Guru should NOT see cuti_tanpa_gaji because is_active=0
    assert.equal(guruTypes.some(t => t.code === 'cuti_tanpa_gaji'), false);
    guruTypes.forEach(t => {
      assert.equal(t.is_active, true);
      assert.equal(t.visible_in_self_service, true);
    });

    // HR actor
    const allTypes = await leaveTypeService.getLeaveTypes({}, hrdActor);
    assert.ok(allTypes.some(t => t.code === 'cuti_tanpa_gaji'));
  });

  await t.test('4. CRUD Custom Leave Type + Invariant Rejections + Audit Log', async () => {
    // Clean up any test leave type from previous runs
    await kepDb('leave_types').where({ code: 'cuti_studi_lanjut' }).del();

    // 4a. Invariant rejection: permit category with deducts_balance=true
    await assert.rejects(
      async () => {
        await leaveTypeService.createLeaveType({
          code: 'izin_khusus_test',
          name: 'Izin Khusus Test',
          category: 'permit',
          deducts_balance: true,
          balance_policy_id: 1
        }, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        return true;
      }
    );

    // 4b. Create valid custom leave type
    const newType = await leaveTypeService.createLeaveType({
      code: 'cuti_studi_lanjut',
      name: 'Cuti Studi Lanjut',
      category: 'special',
      count_mode: 'work_days',
      deducts_balance: false,
      max_days_per_request: 30,
      attachment_rule: 'required',
      gender_restriction: 'any',
      min_notice_days: 14,
      payroll_pay_percent: 50,
      approval_profile_id: 2
    }, hrdActor);

    assert.ok(newType.id);
    assert.equal(newType.code, 'cuti_studi_lanjut');
    assert.equal(newType.is_system, false);

    // Verify audit log
    const createLog = await kepDb('leave_audit_logs')
      .where({ entity_type: 'leave_type', entity_id: newType.id, action: 'create' })
      .first();
    assert.ok(createLog);

    // 4c. Update custom leave type
    const updated = await leaveTypeService.updateLeaveType(newType.id, {
      name: 'Cuti Studi Lanjut (S2/S3)',
      color: '#10b981',
      max_days_per_request: 60
    }, hrdActor);

    assert.equal(updated.name, 'Cuti Studi Lanjut (S2/S3)');
    assert.equal(updated.color, '#10b981');
    assert.equal(Number(updated.max_days_per_request), 60);

    // 4d. Invariant rejection on is_system type code modification
    const sakitType = await kepDb('leave_types').where({ code: 'sakit' }).first();
    await assert.rejects(
      async () => {
        await leaveTypeService.updateLeaveType(sakitType.id, {
          code: 'sakit_diubah'
        }, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        return true;
      }
    );

    // 4e. Toggle active
    const toggled = await leaveTypeService.toggleLeaveTypeActive(newType.id, false, hrdActor);
    assert.equal(toggled.is_active, false);

    // 4f. Delete custom leave type
    const delRes = await leaveTypeService.deleteLeaveType(newType.id, hrdActor);
    assert.equal(delRes.success, true);

    const checkDel = await kepDb('leave_types').where({ id: newType.id }).first();
    assert.equal(checkDel, undefined);

    // 4g. Attempt to delete system type throws 409
    await assert.rejects(
      async () => {
        await leaveTypeService.deleteLeaveType(sakitType.id, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'SYSTEM_TYPE_CANNOT_BE_DELETED');
        return true;
      }
    );
  });

  await t.test('5. Approval Profiles & Steps', async () => {
    const profiles = await leaveTypeService.getApprovalProfiles();
    assert.equal(profiles.length, 3);

    const std3 = profiles.find(p => p.code === 'std_3');
    assert.ok(std3);
    assert.equal(std3.steps.length, 3);
    assert.equal(std3.steps[0].approver_source, 'direct_supervisor');
    assert.equal(std3.steps[1].approver_source, 'unit_head');
    assert.equal(std3.steps[2].approver_source, 'hrd_pool');

    // Update profile
    const updatedProfile = await leaveTypeService.updateApprovalProfile(std3.id, {
      name: 'Standar 3 Tingkat Aldepos (Updated)',
      description: 'Alur persetujuan 3 tingkat dengan SLA diperketat',
      steps: [
        { step_no: 1, step_name: 'Persetujuan Atasan Langsung', approver_source: 'direct_supervisor', is_required: 0, sla_hours: 24 },
        { step_no: 2, step_name: 'Persetujuan Kepala Sekolah', approver_source: 'unit_head', is_required: 1, sla_hours: 24 },
        { step_no: 3, step_name: 'Persetujuan Akhir HRD', approver_source: 'hrd_pool', is_required: 1, sla_hours: 48 }
      ]
    }, hrdActor);

    assert.equal(updatedProfile.name, 'Standar 3 Tingkat Aldepos (Updated)');
    assert.equal(updatedProfile.steps[0].sla_hours, 24);
  });

  await t.test('6. Principal Suggestions using job_positions.level = 1', async () => {
    const suggestions = await leaveTypeService.getPrincipalSuggestions(1, hrdActor);
    assert.ok(suggestions.length > 0);
    // Employee 2 (Dr. H. Ahmad Dahlan, M.Pd) has current_position_id=1 (Kepala Sekolah, level=1)
    const ks = suggestions.find(s => s.employee_id === 2);
    assert.ok(ks);
    assert.equal(ks.position_level, 1);
  });

  await t.test('7. School Unit Approvers CRUD & Non-Overlapping Validation', async () => {
    // Clean any prior unit approvers
    await kepDb('school_unit_approvers').where({ school_unit_id: 1 }).del();

    // 7a. Set Dr. Ahmad Dahlan as Kepala Sekolah for 2026/2027
    const approver = await leaveTypeService.setUnitApprover({
      school_unit_id: 1,
      approver_role: 'unit_head',
      employee_id: 2,
      valid_from: '2026-07-01',
      valid_to: '2027-06-30'
    }, hrdActor);

    assert.ok(approver.id);
    assert.equal(approver.employee_id, 2);

    // 7b. Attempt to assign another approver in overlapping period throws 409
    await assert.rejects(
      async () => {
        await leaveTypeService.setUnitApprover({
          school_unit_id: 1,
          approver_role: 'unit_head',
          employee_id: 3,
          valid_from: '2026-10-01',
          valid_to: '2027-09-30'
        }, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'OVERLAP_CONFLICT');
        return true;
      }
    );

    // 7c. Update approver
    const updatedApprover = await leaveTypeService.updateUnitApprover(approver.id, {
      valid_to: '2027-12-31'
    }, hrdActor);
    const { formatDbDate } = require('./dateHelper');
    assert.equal(formatDbDate(updatedApprover.valid_to), '2027-12-31');

    // 7d. Delete approver
    const delRes = await leaveTypeService.deleteUnitApprover(approver.id, hrdActor);
    assert.equal(delRes.success, true);
  });

  await t.test('8. Approval Delegations: Rules, Depth-1, and Revocation', async () => {
    await kepDb('approval_delegations').where({ school_unit_id: 1 }).del();

    // 8a. Self-delegation rejection (emp 2 -> emp 2)
    await assert.rejects(
      async () => {
        await leaveTypeService.createDelegation({
          school_unit_id: 1,
          delegator_employee_id: 2,
          delegate_employee_id: 2,
          valid_from: '2026-11-01',
          valid_to: '2026-11-10'
        }, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'SELF_DELEGATION_FORBIDDEN');
        return true;
      }
    );

    // 8b. Create valid delegation: Emp 2 (KS) -> Emp 3 (Guru)
    const del1 = await leaveTypeService.createDelegation({
      school_unit_id: 1,
      delegator_employee_id: 2,
      delegate_employee_id: 3,
      scope: 'all',
      valid_from: '2026-11-01',
      valid_to: '2026-11-10',
      reason: 'Cuti ibadah umrah'
    }, hrdActor);

    assert.ok(del1.id);
    assert.equal(del1.delegator_employee_id, 2);
    assert.equal(del1.delegate_employee_id, 3);
    assert.equal(Boolean(del1.is_active), true);

    // 8c. Chaining / Depth-1 rejection: Emp 3 attempting to re-delegate to Emp 4 during overlapping period
    await assert.rejects(
      async () => {
        await leaveTypeService.createDelegation({
          school_unit_id: 1,
          delegator_employee_id: 3,
          delegate_employee_id: 4,
          scope: 'all',
          valid_from: '2026-11-05',
          valid_to: '2026-11-08'
        }, hrdActor);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'RE_DELEGATION_FORBIDDEN');
        return true;
      }
    );

    // 8d. Revoke delegation
    const revokeRes = await leaveTypeService.deleteDelegation(del1.id, hrdActor);
    assert.equal(revokeRes.success, true);

    const revokedCheck = await kepDb('approval_delegations').where({ id: del1.id }).first();
    assert.equal(Boolean(revokedCheck.is_active), false);
    assert.ok(revokedCheck.revoked_at);
  });

  await t.test('9. Leave Module Settings & Absence Thresholds', async () => {
    // 9a. Settings
    const settings = await leaveTypeService.getLeaveSettings(1);
    assert.ok(settings);

    const updatedSettings = await leaveTypeService.updateLeaveSettings(1, {
      flexible_employee_day_rule: 'mon_sat',
      approval_overdue_hours: 48
    }, hrdActor);

    assert.equal(updatedSettings.flexible_employee_day_rule, 'mon_sat');
    assert.equal(updatedSettings.approval_overdue_hours, 48);

    // 9b. Absence Thresholds
    const thresholds = await leaveTypeService.getAbsenceThresholds(1);
    assert.ok(thresholds.length > 0);

    const updatedThresholds = await leaveTypeService.updateAbsenceThresholds(1, [
      { id: thresholds[0].id, max_absent_count: 8, max_absent_percent: 25.0 }
    ], hrdActor);

    const checkThresh = updatedThresholds.find(t => t.id === thresholds[0].id);
    assert.equal(checkThresh.max_absent_count, 8);
    assert.equal(Number(checkThresh.max_absent_percent), 25.0);
  });

  t.after(async () => {
    await coreDb.destroy();
    await kepDb.destroy();
  });
});
