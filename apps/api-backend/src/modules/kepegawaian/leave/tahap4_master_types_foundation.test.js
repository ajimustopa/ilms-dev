/**
 * Unit Tests for Tahap 4: Pure Master Leave Types, Unit Approvers, and Delegation Validation
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §3.2, §3.3, §6.1-6.3, §12
 * Pure functions: zero database access, zero system clock dependency
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateLeaveTypeConfig,
  checkUnitApproverOverlap,
  validateDelegationRules
} = require('./leaveTypeValidation');

test('Tahap 4 Pure Foundation: Leave Type Configuration Validation', async (t) => {
  await t.test('1. Valid configuration for standard annual leave', () => {
    const config = {
      code: 'cuti_tahunan',
      name: 'Cuti Tahunan',
      category: 'annual',
      count_mode: 'work_days',
      deducts_balance: true,
      balance_policy_id: 1,
      min_notice_days: 3,
      max_backdate_days: 0,
      payroll_pay_percent: 100,
      half_day_allowed: true,
      attachment_rule: 'none',
      gender_restriction: 'any',
      eligible_employment_statuses: ['gty', 'pty']
    };

    const res = validateLeaveTypeConfig(config);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.normalizedData.deducts_balance, true);
    assert.equal(res.normalizedData.balance_policy_id, 1);
  });

  await t.test('2. Invariant: Non-annual category CANNOT deduct balance', () => {
    const config = {
      code: 'izin_khusus',
      name: 'Izin Khusus',
      category: 'permit',
      count_mode: 'work_days',
      deducts_balance: true,
      balance_policy_id: 1
    };

    const res = validateLeaveTypeConfig(config);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.code === 'ANNUAL_ONLY_DEDUCTS_BALANCE'));
  });

  await t.test('3. Invariant: calendar_days count mode CANNOT deduct balance', () => {
    const config = {
      code: 'cuti_tahunan_kalender',
      name: 'Cuti Tahunan Kalender',
      category: 'annual',
      count_mode: 'calendar_days',
      deducts_balance: true,
      balance_policy_id: 1
    };

    const res = validateLeaveTypeConfig(config);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.code === 'CALENDAR_DAYS_CANNOT_DEDUCT_BALANCE'));
  });

  await t.test('4. Invariant: deducts_balance=true requires valid balance_policy_id', () => {
    const config = {
      code: 'cuti_tahunan',
      name: 'Cuti Tahunan',
      category: 'annual',
      count_mode: 'work_days',
      deducts_balance: true,
      balance_policy_id: null
    };

    const res = validateLeaveTypeConfig(config);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.code === 'BALANCE_POLICY_REQUIRED'));
  });

  await t.test('5. Invariant: is_system=1 cannot change code during update', () => {
    const existing = {
      id: 1,
      code: 'sakit',
      name: 'Sakit',
      category: 'sick',
      is_system: 1
    };

    const updatePayload = {
      code: 'sakit_karyawan',
      name: 'Sakit Karyawan'
    };

    const res = validateLeaveTypeConfig(updatePayload, existing);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.code === 'IMMUTABLE_SYSTEM_CODE'));
  });

  await t.test('6. Range and format validations: pay percent, notice days, backdate days', () => {
    const config = {
      code: 'cuti_invalid_num',
      name: 'Cuti Test',
      category: 'special',
      payroll_pay_percent: 120, // invalid (> 100)
      min_service_months: -2,  // invalid (< 0)
      min_notice_days: -1,     // invalid (< 0)
      max_backdate_days: -5,   // invalid (< 0)
      attachment_rule: 'required_after_days',
      attachment_required_after_days: 0 // invalid (must be >= 1)
    };

    const res = validateLeaveTypeConfig(config);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some(e => e.code === 'INVALID_PAY_PERCENT'));
    assert.ok(res.errors.some(e => e.code === 'INVALID_MIN_SERVICE_MONTHS'));
    assert.ok(res.errors.some(e => e.code === 'INVALID_MIN_NOTICE_DAYS'));
    assert.ok(res.errors.some(e => e.code === 'INVALID_MAX_BACKDATE_DAYS'));
    assert.ok(res.errors.some(e => e.code === 'INVALID_ATTACHMENT_AFTER_DAYS'));
  });
});

test('Tahap 4 Pure Foundation: School Unit Approver Overlap Validation', async (t) => {
  const existingApprovers = [
    { id: 1, school_unit_id: 1, approver_role: 'unit_head', employee_id: 2, valid_from: '2025-07-01', valid_to: '2026-06-30' },
    { id: 2, school_unit_id: 1, approver_role: 'unit_head', employee_id: 3, valid_from: '2026-07-01', valid_to: null }
  ];

  await t.test('1. Non-overlapping new period in another school unit succeeds', () => {
    const res = checkUnitApproverOverlap([], { valid_from: '2026-01-01', valid_to: '2026-12-31' });
    assert.equal(res.isValid, true);
    assert.equal(res.error, null);
  });

  await t.test('2. Overlapping date range with existing approver is rejected', () => {
    const newApprover = {
      valid_from: '2026-08-01',
      valid_to: '2027-07-31'
    };

    const res = checkUnitApproverOverlap(existingApprovers, newApprover);
    assert.equal(res.isValid, false);
    assert.ok(res.error.includes('tumpang tindih'));
    assert.equal(res.conflictingApprover.id, 2);
  });

  await t.test('3. Updating existing record with excludeId does not conflict with itself', () => {
    const editPayload = {
      valid_from: '2026-07-01',
      valid_to: '2027-06-30'
    };

    const res = checkUnitApproverOverlap(existingApprovers, editPayload, 2);
    assert.equal(res.isValid, true);
    assert.equal(res.error, null);
  });

  await t.test('4. Inverted date range (valid_to < valid_from) is rejected', () => {
    const res = checkUnitApproverOverlap(existingApprovers, { valid_from: '2026-07-01', valid_to: '2026-06-01' });
    assert.equal(res.isValid, false);
    assert.ok(res.error.includes('tidak boleh lebih awal'));
  });
});

test('Tahap 4 Pure Foundation: Approval Delegation Rules Validation', async (t) => {
  const activeDelegations = [
    { id: 1, school_unit_id: 1, delegator_employee_id: 2, delegate_employee_id: 3, scope: 'all', valid_from: '2026-10-01', valid_to: '2026-10-15', is_active: 1 }
  ];

  await t.test('1. Self-delegation (delegator == delegate) is forbidden', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 2,
      delegate_employee_id: 2,
      valid_from: '2026-10-01',
      valid_to: '2026-10-05'
    });

    assert.equal(res.isValid, false);
    assert.equal(res.code, 'SELF_DELEGATION_FORBIDDEN');
  });

  await t.test('2. Inverted dates (valid_to < valid_from) is rejected', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 2,
      delegate_employee_id: 4,
      valid_from: '2026-10-10',
      valid_to: '2026-10-05'
    });

    assert.equal(res.isValid, false);
    assert.equal(res.code, 'INVALID_DATE_RANGE');
  });

  await t.test('3. Depth-1: Delegate (emp 3) cannot delegate again to emp 4 during overlapping period', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 3,
      delegate_employee_id: 4,
      valid_from: '2026-10-05',
      valid_to: '2026-10-10'
    });

    assert.equal(res.isValid, false);
    assert.equal(res.code, 'RE_DELEGATION_FORBIDDEN');
  });

  await t.test('4. Depth-1: Cannot delegate to emp 2 who is already delegating to someone else', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 5,
      delegate_employee_id: 2,
      valid_from: '2026-10-05',
      valid_to: '2026-10-10'
    });

    assert.equal(res.isValid, false);
    assert.equal(res.code, 'DELEGATION_CHAIN_FORBIDDEN');
  });

  await t.test('5. Overlapping duplicate delegation for same delegator is rejected', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 2,
      delegate_employee_id: 5,
      valid_from: '2026-10-05',
      valid_to: '2026-10-12',
      scope: 'all'
    });

    assert.equal(res.isValid, false);
    assert.equal(res.code, 'OVERLAPPING_DELEGATION');
  });

  await t.test('6. Valid non-overlapping delegation succeeds', () => {
    const res = validateDelegationRules(activeDelegations, {
      delegator_employee_id: 5,
      delegate_employee_id: 4,
      valid_from: '2026-10-01',
      valid_to: '2026-10-10',
      scope: 'leave'
    });

    assert.equal(res.isValid, true);
    assert.equal(res.error, null);
  });
});
