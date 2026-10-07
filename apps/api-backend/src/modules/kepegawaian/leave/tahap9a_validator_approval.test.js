/**
 * Unit Tests for Tahap 9A: Pure Leave Request Validator & Approval Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §3.2, §4.4, §6 (seluruh), §10.1, §10.2, §12
 * 
 * PURE UNIT TESTS - NO DB CONNECTION REQUIRED
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateLeaveRequest } = require('./leaveRequestValidator');
const {
  buildApprovalSteps,
  canActOnStep,
  applyAction,
  nextOvertimeStatus
} = require('./approvalEngine');

// -------------------------------------------------------------
// SECTION 1: PURE VALIDATOR TESTS (§4.4)
// -------------------------------------------------------------

test('Validator: Order 1 - INVALID_RANGE when start_date > end_date', () => {
  const res = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-10' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.code === 'INVALID_RANGE'));
});

test('Validator: Order 1 - INVALID_PORTION for invalid combinations', () => {
  // Single day with different portions
  const res1 = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-15', start_portion: 'am', end_portion: 'pm' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res1.isValid, false);
  assert.ok(res1.errors.some(e => e.code === 'INVALID_PORTION'));

  // Multi-day with start_portion = am
  const res2 = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-17', start_portion: 'am', end_portion: 'full' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res2.isValid, false);
  assert.ok(res2.errors.some(e => e.code === 'INVALID_PORTION'));

  // Half day not allowed on leave type
  const res3 = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-15', start_portion: 'am', end_portion: 'am' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_melahirkan', is_active: 1, half_day_allowed: 0 }
  });
  assert.equal(res3.isValid, false);
  assert.ok(res3.errors.some(e => e.code === 'INVALID_PORTION'));
});

test('Validator: Order 1 - EMPLOYEE_INACTIVE', () => {
  const res = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'resigned' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.code === 'EMPLOYEE_INACTIVE'));
});

test('Validator: Order 1 - ACTOR_NOT_EMPLOYEE and FORBIDDEN_SCOPE', () => {
  // Actor without employeeId and non-privileged
  const res1 = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 10, employeeId: null, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res1.isValid, false);
  assert.ok(res1.errors.some(e => e.code === 'ACTOR_NOT_EMPLOYEE'));

  // Privileged actor submitting on behalf outside unitScope
  const res2 = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 2, employeeId: 2, permissions: ['kepegawaian.leave_requests.manage'], unitScope: [1] },
    employee: { id: 5, account_status: 'active', school_unit_id: 2 },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 }
  });
  assert.equal(res2.isValid, false);
  assert.ok(res2.errors.some(e => e.code === 'FORBIDDEN_SCOPE'));
});

test('Validator: Order 2 - TYPE_INACTIVE', () => {
  const res = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', school_unit_id: 1 },
    leaveType: { code: 'cuti_tanpa_gaji', is_active: 0, name: 'Cuti Tanpa Gaji', half_day_allowed: 1 },
    duration: { total: 2 }
  });
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.code === 'TYPE_INACTIVE'));
});

test('Validator: Order 2 - TYPE_NOT_ALLOWED_FOR_EMPLOYEE (gender, employment_status, marital, tenure)', () => {
  // Gender mismatch (maternity requested by male)
  const resGender = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', gender: 'male', employment_status: 'GTY', marital_status: 'married' },
    leaveType: { code: 'cuti_melahirkan', is_active: 1, gender_restriction: 'female', half_day_allowed: 0, name: 'Cuti Melahirkan' },
    duration: { total: 2 }
  });
  assert.equal(resGender.isValid, false);
  assert.ok(resGender.errors.some(e => e.code === 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE'));

  // Employment status mismatch
  const resStatus = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', gender: 'female', employment_status: 'Pelatih Ekskul', marital_status: 'single' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, eligible_employment_statuses: ['GTY', 'PTY'], half_day_allowed: 1, name: 'Cuti Tahunan' },
    duration: { total: 2 }
  });
  assert.equal(resStatus.isValid, false);
  assert.ok(resStatus.errors.some(e => e.code === 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE'));

  // Marital status mismatch (cuti menikah requested by married employee)
  const resMarital = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', gender: 'male', employment_status: 'GTY', marital_status: 'married' },
    leaveType: { code: 'cuti_menikah', is_active: 1, eligible_marital_statuses: ['single'], half_day_allowed: 0, name: 'Cuti Menikah' },
    duration: { total: 2 }
  });
  assert.equal(resMarital.isValid, false);
  assert.ok(resMarital.errors.some(e => e.code === 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE'));

  // Minimum service months mismatch
  const resTenure = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', gender: 'male', employment_status: 'GTY', marital_status: 'single', join_date: '2026-08-01' },
    leaveType: { code: 'cuti_khusus', is_active: 1, min_service_months: 6, half_day_allowed: 1, name: 'Cuti Khusus' },
    duration: { total: 2 }
  });
  assert.equal(resTenure.isValid, false);
  assert.ok(resTenure.errors.some(e => e.code === 'TYPE_NOT_ALLOWED_FOR_EMPLOYEE'));
});

test('Validator: Order 3 - NO_SCHEDULE_ASSIGNMENT and NO_WORKING_DAYS', () => {
  // Schedule assignment missing
  const resNoSchedule = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { error: { code: 'NO_SCHEDULE_ASSIGNMENT', message: 'No schedule' }, total: 0 }
  });
  assert.equal(resNoSchedule.isValid, false);
  assert.ok(resNoSchedule.errors.some(e => e.code === 'NO_SCHEDULE_ASSIGNMENT'));

  // Zero working days (all holiday / off)
  const resNoWork = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { total: 0 }
  });
  assert.equal(resNoWork.isValid, false);
  assert.ok(resNoWork.errors.some(e => e.code === 'NO_WORKING_DAYS'));
});

test('Validator: Order 4 - BACKDATE_EXCEEDED, NOTICE_TOO_SHORT, and PERIOD_LOCKED', () => {
  const today = '2026-10-10';

  // Backdate exceeded (max 3 days, submitting for 6 days ago)
  const resBackdate = validateLeaveRequest({
    request: { start_date: '2026-10-04', end_date: '2026-10-05' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'izin_pribadi', is_active: 1, max_backdate_days: 3, name: 'Izin Pribadi', half_day_allowed: 1 },
    duration: { total: 2 },
    today
  });
  assert.equal(resBackdate.isValid, false);
  assert.ok(resBackdate.errors.some(e => e.code === 'BACKDATE_EXCEEDED'));

  // Notice too short (requires 7 days notice, submitting for 2 days ahead)
  const resNotice = validateLeaveRequest({
    request: { start_date: '2026-10-12', end_date: '2026-10-13' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_menikah', is_active: 1, min_notice_days: 7, name: 'Cuti Menikah', half_day_allowed: 1 },
    duration: { total: 2 },
    today
  });
  assert.equal(resNotice.isValid, false);
  assert.ok(resNotice.errors.some(e => e.code === 'NOTICE_TOO_SHORT'));

  // Period locked
  const resLocked = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-16' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'sakit', is_active: 1, max_backdate_days: 7, half_day_allowed: 1 },
    duration: { total: 2 },
    lockedPeriodDates: ['2026-10-15'],
    today: '2026-10-16'
  });
  assert.equal(resLocked.isValid, false);
  assert.ok(resLocked.errors.some(e => e.code === 'PERIOD_LOCKED'));
});

test('Validator: Order 5 - MAX_DAYS_PER_REQUEST, MAX_DAYS_PER_YEAR, and MAX_OCCURRENCES', () => {
  // Single request exceeds limit (e.g. izin_pribadi max 2 HK, requesting 3 HK)
  const resMaxReq = validateLeaveRequest({
    request: { start_date: '2026-10-15', end_date: '2026-10-17' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { id: 3, code: 'izin_pribadi', is_active: 1, max_days_per_request: 2, name: 'Izin Pribadi', half_day_allowed: 1 },
    duration: { total: 3 },
    today: '2026-10-15'
  });
  assert.equal(resMaxReq.isValid, false);
  assert.ok(resMaxReq.errors.some(e => e.code === 'MAX_DAYS_PER_REQUEST'));

  // Chained contiguous requests exceed limit (2 HK today + 2 HK yesterday contiguous = 4 HK > 2 HK max)
  const resChained = validateLeaveRequest({
    request: { start_date: '2026-10-16', end_date: '2026-10-17' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { id: 3, code: 'izin_pribadi', is_active: 1, max_days_per_request: 2, name: 'Izin Pribadi', half_day_allowed: 1 },
    duration: { total: 2 },
    existingRequests: [
      { id: 101, leave_type_id: 3, start_date: '2026-10-14', end_date: '2026-10-15', duration_days: 2, status: 'approved' }
    ],
    today: '2026-10-16'
  });
  assert.equal(resChained.isValid, false);
  assert.ok(resChained.errors.some(e => e.code === 'MAX_DAYS_PER_REQUEST'));

  // Max days per year exceeded (limit 6 HK/year, already used 5 HK, requesting 2 HK = 7 HK)
  const resMaxYear = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-21' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { id: 3, code: 'izin_pribadi', is_active: 1, max_days_per_year: 6, name: 'Izin Pribadi', half_day_allowed: 1 },
    duration: { total: 2 },
    existingRequests: [
      { id: 102, leave_type_id: 3, start_date: '2026-08-10', end_date: '2026-08-14', duration_days: 5, status: 'approved' }
    ],
    today: '2026-10-20'
  });
  assert.equal(resMaxYear.isValid, false);
  assert.ok(resMaxYear.errors.some(e => e.code === 'MAX_DAYS_PER_YEAR'));

  // Max occurrences lifetime exceeded (limit 1, already taken 1)
  const resLifetime = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-22' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { id: 7, code: 'cuti_menikah', is_active: 1, max_occurrences_lifetime: 1, name: 'Cuti Menikah', half_day_allowed: 1 },
    duration: { total: 3 },
    existingRequests: [
      { id: 103, leave_type_id: 7, start_date: '2025-05-10', end_date: '2025-05-12', duration_days: 3, status: 'approved' }
    ],
    today: '2026-10-20'
  });
  assert.equal(resLifetime.isValid, false);
  assert.ok(resLifetime.errors.some(e => e.code === 'MAX_OCCURRENCES'));
});

test('Validator: Order 6 - ATTACHMENT_REQUIRED and REASON_REQUIRED', () => {
  // Required attachment
  const resAtt1 = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-20' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'dinas_luar', is_active: 1, attachment_rule: 'required', name: 'Dinas Luar', half_day_allowed: 1 },
    duration: { total: 1 },
    today: '2026-10-20'
  });
  assert.equal(resAtt1.isValid, false);
  assert.ok(resAtt1.errors.some(e => e.code === 'ATTACHMENT_REQUIRED'));

  // Required after 2 days (duration 2 HK without attachment -> error)
  const resAtt2 = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-21' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'sakit', is_active: 1, attachment_rule: 'required_after_days', attachment_required_after_days: 2, name: 'Sakit', half_day_allowed: 1 },
    duration: { total: 2 },
    today: '2026-10-20'
  });
  assert.equal(resAtt2.isValid, false);
  assert.ok(resAtt2.errors.some(e => e.code === 'ATTACHMENT_REQUIRED'));

  // Reason required
  const resReason = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-20', reason: '' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'lainnya', is_active: 1, reason_required: 1, name: 'Lainnya', half_day_allowed: 1 },
    duration: { total: 1 },
    today: '2026-10-20'
  });
  assert.equal(resReason.isValid, false);
  assert.ok(resReason.errors.some(e => e.code === 'REASON_REQUIRED'));
});

test('Validator: Order 7 - OVERLAP_APPROVED, OVERLAP_PENDING, ATTENDANCE_PRESENT_CONFLICT, and OVERTIME_CONFLICT', () => {
  // Overlap approved
  const resOverApp = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-22' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { total: 3 },
    existingRequests: [
      { id: 201, start_date: '2026-10-21', end_date: '2026-10-23', status: 'approved' }
    ],
    today: '2026-10-10'
  });
  assert.equal(resOverApp.isValid, false);
  assert.ok(resOverApp.errors.some(e => e.code === 'OVERLAP_APPROVED'));

  // Overlap pending
  const resOverPend = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-22' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { total: 3 },
    existingRequests: [
      { id: 202, start_date: '2026-10-20', end_date: '2026-10-20', status: 'pending' }
    ],
    today: '2026-10-10'
  });
  assert.equal(resOverPend.isValid, false);
  assert.ok(resOverPend.errors.some(e => e.code === 'OVERLAP_PENDING'));

  // Attendance present conflict
  const resAttPres = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-22' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { total: 3 },
    attendanceRecords: [{ attendance_date: '2026-10-21', status: 'present' }],
    today: '2026-10-10'
  });
  assert.equal(resAttPres.isValid, false);
  assert.ok(resAttPres.errors.some(e => e.code === 'ATTENDANCE_PRESENT_CONFLICT'));

  // Overtime conflict on full leave day
  const resOtConflict = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-20', start_portion: 'full', end_portion: 'full' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, half_day_allowed: 1 },
    duration: { total: 1 },
    overtimeRecords: [{ overtime_date: '2026-10-20', status: 'approved' }],
    today: '2026-10-10'
  });
  assert.equal(resOtConflict.isValid, false);
  assert.ok(resOtConflict.errors.some(e => e.code === 'OVERTIME_CONFLICT'));
});

test('Validator: Order 8 - UNKNOWN_JOIN_DATE, ENTITLEMENT_NOT_ELIGIBLE, and BALANCE_INSUFFICIENT', () => {
  // Missing join_date when leave type deducts_balance
  const resNoJoin = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-21' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', join_date: null },
    leaveType: { code: 'cuti_tahunan', is_active: 1, deducts_balance: 1, half_day_allowed: 1 },
    duration: { total: 2 },
    today: '2026-10-10'
  });
  assert.equal(resNoJoin.isValid, false);
  assert.ok(resNoJoin.errors.some(e => e.code === 'UNKNOWN_JOIN_DATE'));

  // Entitlement not eligible (balance is null)
  const resNoBal = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-21' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', join_date: '2025-01-01' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, deducts_balance: 1, half_day_allowed: 1 },
    duration: { total: 2 },
    balance: null,
    today: '2026-10-10'
  });
  assert.equal(resNoBal.isValid, false);
  assert.ok(resNoBal.errors.some(e => e.code === 'ENTITLEMENT_NOT_ELIGIBLE'));

  // Insufficient balance (available 3, requesting 5, allow_negative = 0)
  const resBalInsuff = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-24' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', join_date: '2025-01-01' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, deducts_balance: 1, half_day_allowed: 1 },
    duration: { total: 5 },
    balance: { available: 3, allow_negative: 0 },
    today: '2026-10-10'
  });
  assert.equal(resBalInsuff.isValid, false);
  assert.ok(resBalInsuff.errors.some(e => e.code === 'BALANCE_INSUFFICIENT'));
});

test('Validator: Warnings (ABSENCE_THRESHOLD_EXCEEDED, COLLEAGUE_CONCURRENT_LEAVE, FLEXIBLE_SCHEDULE_RULE_APPLIED)', () => {
  const res = validateLeaveRequest({
    request: { start_date: '2026-10-20', end_date: '2026-10-21' },
    actor: { userId: 1, employeeId: 1, permissions: [] },
    employee: { id: 1, account_status: 'active', join_date: '2025-01-01' },
    leaveType: { code: 'cuti_tahunan', is_active: 1, deducts_balance: 1, half_day_allowed: 1 },
    duration: { total: 2, warnings: [{ code: 'FLEXIBLE_SCHEDULE_RULE_APPLIED', message: 'Flexible applied' }] },
    balance: { available: 10, allow_negative: 0 },
    colleagueAbsenceStats: {
      maxAbsentCountExceeded: true,
      colleaguesOnLeaveCount: 2,
      colleagueNames: ['Budi Santoso', 'Siti Rahma']
    },
    today: '2026-10-10'
  });
  assert.equal(res.isValid, true);
  assert.ok(res.warnings.some(w => w.code === 'FLEXIBLE_SCHEDULE_RULE_APPLIED'));
  assert.ok(res.warnings.some(w => w.code === 'ABSENCE_THRESHOLD_EXCEEDED'));
  assert.ok(res.warnings.some(w => w.code === 'COLLEAGUE_CONCURRENT_LEAVE'));
});

// -------------------------------------------------------------
// SECTION 2: APPROVAL ENGINE TESTS (§6)
// -------------------------------------------------------------

test('ApprovalEngine: buildApprovalSteps standard 3-tier profile', () => {
  const profile = {
    id: 1,
    code: 'std_3',
    steps: [
      { step_no: 1, step_name: 'Atasan Langsung', approver_source: 'direct_supervisor', is_required: 0 },
      { step_no: 2, step_name: 'Kepala Sekolah', approver_source: 'unit_head', is_required: 1 },
      { step_no: 3, step_name: 'HRD', approver_source: 'hrd_pool', is_required: 1 }
    ]
  };

  const employee = { id: 10, school_unit_id: 1, direct_supervisor_employee_id: 5 };
  const resolvers = {
    getUnitHead: (unitId) => ({ employeeId: 2, name: 'Drs. Ahmad (KS)' }),
    isApplicantOnlyHrd: () => false
  };

  const { steps, initialStepNo } = buildApprovalSteps(profile, employee, 3, resolvers);
  assert.equal(steps.length, 3);
  assert.equal(initialStepNo, 1);
  assert.equal(steps[0].assigned_employee_id, 5);
  assert.equal(steps[0].status, 'pending');
  assert.equal(steps[1].assigned_employee_id, 2);
  assert.equal(steps[1].status, 'pending');
  assert.equal(steps[2].approver_source, 'hrd_pool');
});

test('ApprovalEngine: Applicant = KS (unit_head step skipped, advances to HRD)', () => {
  const profile = {
    id: 2,
    code: 'head_hrd',
    steps: [
      { step_no: 1, step_name: 'Kepala Sekolah', approver_source: 'unit_head', is_required: 1 },
      { step_no: 2, step_name: 'HRD', approver_source: 'hrd_pool', is_required: 1 }
    ]
  };

  // KS is employee 2
  const employee = { id: 2, school_unit_id: 1, direct_supervisor_employee_id: null };
  const resolvers = {
    getUnitHead: (unitId) => ({ employeeId: 2, name: 'Drs. Ahmad (KS)' }),
    isApplicantOnlyHrd: () => false
  };

  const { steps, initialStepNo } = buildApprovalSteps(profile, employee, 3, resolvers);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].status, 'skipped');
  assert.equal(steps[0].skip_reason, 'skipped:applicant_is_unit_head');
  assert.equal(initialStepNo, 2); // starts directly at step 2 (HRD)
});

test('ApprovalEngine: Applicant is the ONLY HRD (escalates to yayasan_pool)', () => {
  const profile = {
    id: 3,
    code: 'light_hrd',
    steps: [
      { step_no: 1, step_name: 'HRD', approver_source: 'hrd_pool', is_required: 1 }
    ]
  };

  const employee = { id: 1, school_unit_id: 1 };
  const resolvers = {
    isApplicantOnlyHrd: (empId) => empId === 1
  };

  const { steps, initialStepNo } = buildApprovalSteps(profile, employee, 1, resolvers);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].approver_source, 'yayasan_pool');
  assert.equal(initialStepNo, 1);
});

test('ApprovalEngine: Direct supervisor missing (optional -> skipped, required -> unassigned)', () => {
  // Optional supervisor
  const profileOpt = {
    steps: [
      { step_no: 1, step_name: 'Atasan', approver_source: 'direct_supervisor', is_required: 0 },
      { step_no: 2, step_name: 'KS', approver_source: 'unit_head', is_required: 1 }
    ]
  };
  const employee = { id: 10, school_unit_id: 1, direct_supervisor_employee_id: null };
  const resolvers = { getUnitHead: () => ({ employeeId: 2 }) };

  const resOpt = buildApprovalSteps(profileOpt, employee, 1, resolvers);
  assert.equal(resOpt.steps[0].status, 'skipped');
  assert.equal(resOpt.steps[0].skip_reason, 'skipped:no_supervisor');
  assert.equal(resOpt.initialStepNo, 2);

  // Required supervisor
  const profileReq = {
    steps: [
      { step_no: 1, step_name: 'Atasan', approver_source: 'direct_supervisor', is_required: 1 }
    ]
  };
  const resReq = buildApprovalSteps(profileReq, employee, 1, resolvers);
  assert.equal(resReq.steps[0].status, 'pending');
  assert.equal(resReq.steps[0].assigned_employee_id, null);
});

test('ApprovalEngine: Unit Head missing -> unassigned step', () => {
  const profile = {
    steps: [
      { step_no: 1, step_name: 'KS', approver_source: 'unit_head', is_required: 1 }
    ]
  };
  const employee = { id: 10, school_unit_id: 1 };
  const resolvers = { getUnitHead: () => null };

  const { steps } = buildApprovalSteps(profile, employee, 1, resolvers);
  assert.equal(steps[0].status, 'pending');
  assert.equal(steps[0].assigned_employee_id, null);
});

test('ApprovalEngine: Step with min_days_threshold filtered out for short duration', () => {
  const profile = {
    steps: [
      { step_no: 1, step_name: 'Atasan', approver_source: 'direct_supervisor', is_required: 1 },
      { step_no: 2, step_name: 'KS (jika >= 3 hari)', approver_source: 'unit_head', is_required: 1, min_days_threshold: 3 },
      { step_no: 3, step_name: 'HRD', approver_source: 'hrd_pool', is_required: 1 }
    ]
  };
  const employee = { id: 10, school_unit_id: 1, direct_supervisor_employee_id: 5 };
  const resolvers = { getUnitHead: () => ({ employeeId: 2 }) };

  // Duration 2 days (< 3) -> step 2 excluded
  const res2Days = buildApprovalSteps(profile, employee, 2, resolvers);
  assert.equal(res2Days.steps.length, 2);
  assert.equal(res2Days.steps[0].step_no, 1);
  assert.equal(res2Days.steps[1].step_no, 3);

  // Duration 3 days (>= 3) -> step 2 included
  const res3Days = buildApprovalSteps(profile, employee, 3, resolvers);
  assert.equal(res3Days.steps.length, 3);
});

// -------------------------------------------------------------
// SECTION 3: canActOnStep & DELEGATION RULES (§6.3, §6.4)
// -------------------------------------------------------------

test('ApprovalEngine: canActOnStep anti self-approval', () => {
  const actor = { userId: 10, employeeId: 10, permissions: ['kepegawaian.leave_requests.manage'] };
  const step = { step_no: 1, approver_source: 'hrd_pool' };

  // Actor is applicant (requestEmployeeId = 10) -> rejected
  const resSelf = canActOnStep(actor, step, [], '2026-10-10', 10);
  assert.equal(resSelf.canAct, false);
  assert.equal(resSelf.reason, 'SELF_APPROVAL_FORBIDDEN');

  // Actor with override permission -> allowed
  const actorOverride = { userId: 10, employeeId: 10, permissions: ['kepegawaian.leave_requests.override'] };
  const resOverride = canActOnStep(actorOverride, step, [], '2026-10-10', 10);
  assert.equal(resOverride.canAct, true);
  assert.equal(resOverride.isOverride, true);
});

test('ApprovalEngine: canActOnStep delegation active, expired, wrong scope, and re-delegation', () => {
  const step = { step_no: 1, approver_source: 'direct_supervisor', assigned_employee_id: 5 };
  const today = '2026-10-15';

  // 1. Active valid delegation
  const activeDelegations = [
    {
      delegator_employee_id: 5,
      delegate_employee_id: 8,
      scope: 'leave',
      valid_from: '2026-10-01',
      valid_to: '2026-10-31',
      is_active: 1
    }
  ];
  const actorDelegate = { userId: 8, employeeId: 8, permissions: [] };
  const resActive = canActOnStep(actorDelegate, step, activeDelegations, today, 10);
  assert.equal(resActive.canAct, true);
  assert.equal(resActive.isDelegate, true);
  assert.equal(resActive.onBehalfOfEmployeeId, 5);

  // 2. Expired delegation
  const expiredDelegations = [
    {
      delegator_employee_id: 5,
      delegate_employee_id: 8,
      scope: 'leave',
      valid_from: '2026-10-01',
      valid_to: '2026-10-10', // expired before today 2026-10-15
      is_active: 1
    }
  ];
  const resExpired = canActOnStep(actorDelegate, step, expiredDelegations, today, 10);
  assert.equal(resExpired.canAct, false);

  // 3. Wrong scope (overtime only)
  const wrongScopeDelegations = [
    {
      delegator_employee_id: 5,
      delegate_employee_id: 8,
      scope: 'overtime',
      valid_from: '2026-10-01',
      valid_to: '2026-10-31',
      is_active: 1
    }
  ];
  const resScope = canActOnStep(actorDelegate, step, wrongScopeDelegations, today, 10);
  assert.equal(resScope.canAct, false);

  // 4. Re-delegation attempt (depth 2: 5 delegated to 8, 8 tried to delegate to 9)
  const redelegationList = [
    {
      delegator_employee_id: 8, // delegator is 8, but step assigned to 5!
      delegate_employee_id: 9,
      scope: 'leave',
      valid_from: '2026-10-01',
      valid_to: '2026-10-31',
      is_active: 1
    }
  ];
  const actorSecondLevel = { userId: 9, employeeId: 9, permissions: [] };
  const resRedelegation = canActOnStep(actorSecondLevel, step, redelegationList, today, 10);
  assert.equal(resRedelegation.canAct, false);
});

// -------------------------------------------------------------
// SECTION 4: STATE TRANSITION MACHINE (§6.5)
// -------------------------------------------------------------

test('ApprovalEngine: Full legal transition chain (pending -> approved step 1 -> approved step 2)', () => {
  const initialState = {
    currentStatus: 'pending',
    currentStepNo: 1,
    version: 1,
    steps: [
      { step_no: 1, status: 'pending' },
      { step_no: 2, status: 'pending' }
    ]
  };

  // Step 1 approves
  const stateAfter1 = applyAction(initialState, {
    type: 'approve',
    actor: { userId: 5, employeeId: 5 },
    comment: 'Disetujui atasan'
  });
  assert.equal(stateAfter1.currentStatus, 'pending');
  assert.equal(stateAfter1.currentStepNo, 2);
  assert.equal(stateAfter1.steps[0].status, 'approved');

  // Step 2 approves (Final)
  const finalState = applyAction(stateAfter1, {
    type: 'approve',
    actor: { userId: 2, employeeId: 2 },
    comment: 'Disetujui HRD'
  });
  assert.equal(finalState.currentStatus, 'approved');
  assert.equal(finalState.currentStepNo, null);
  assert.equal(finalState.steps[1].status, 'approved');
});

test('ApprovalEngine: Request-Revision -> Resubmit (starts from step 1, version + 1)', () => {
  const pendingState = {
    currentStatus: 'pending',
    currentStepNo: 2,
    version: 1,
    steps: [
      { step_no: 1, status: 'approved' },
      { step_no: 2, status: 'pending' }
    ]
  };

  // Step 2 requests revision
  const revState = applyAction(pendingState, {
    type: 'request-revision',
    actor: { userId: 2, employeeId: 2 },
    comment: 'Mohon lampirkan surat tugas resmi'
  });
  assert.equal(revState.currentStatus, 'revision_requested');
  assert.equal(revState.steps[1].status, 'revision_requested');

  // Applicant resubmits
  const resubmitState = applyAction(revState, {
    type: 'resubmit',
    actor: { userId: 10, employeeId: 10 }
  });
  assert.equal(resubmitState.currentStatus, 'pending');
  assert.equal(resubmitState.version, 2);
  assert.equal(resubmitState.currentStepNo, 1);
  assert.equal(resubmitState.steps[0].status, 'pending'); // reset to pending from step 1
  assert.equal(resubmitState.steps[1].status, 'pending');
});

test('ApprovalEngine: Bypass approval requires override permission and reason', () => {
  const pendingState = {
    currentStatus: 'pending',
    currentStepNo: 1,
    version: 1,
    steps: [
      { step_no: 1, status: 'pending' },
      { step_no: 2, status: 'pending' }
    ]
  };

  // Missing override permission -> throws error
  assert.throws(() => {
    applyAction(pendingState, {
      type: 'bypass',
      actor: { userId: 1, permissions: [] },
      bypassReason: 'Darurat dinas'
    });
  }, (err) => err.code === 'OVERRIDE_PERMISSION_REQUIRED');

  // Missing bypass reason -> throws error
  assert.throws(() => {
    applyAction(pendingState, {
      type: 'bypass',
      actor: { userId: 1, permissions: ['kepegawaian.leave_requests.override'] },
      bypassReason: ''
    });
  }, (err) => err.code === 'BYPASS_REASON_REQUIRED');

  // Successful bypass
  const bypassState = applyAction(pendingState, {
    type: 'bypass',
    actor: { userId: 1, permissions: ['kepegawaian.leave_requests.override'] },
    bypassReason: 'Persetujuan langsung direksi untuk penugasan mendadak',
    isOverride: true
  });
  assert.equal(bypassState.currentStatus, 'approved');
  assert.equal(bypassState.currentStepNo, null);
  assert.equal(bypassState.steps[0].status, 'bypassed');
  assert.equal(bypassState.steps[1].status, 'bypassed');
});

test('ApprovalEngine: All illegal transitions throw ILLEGAL_TRANSITION', () => {
  // Action on already rejected
  const rejectedState = { currentStatus: 'rejected', steps: [] };
  assert.throws(() => {
    applyAction(rejectedState, { type: 'approve', actor: { userId: 1 } });
  }, (err) => err.code === 'ILLEGAL_TRANSITION');

  // Action on already cancelled
  const cancelledState = { currentStatus: 'cancelled', steps: [] };
  assert.throws(() => {
    applyAction(cancelledState, { type: 'resubmit', actor: { userId: 1 } });
  }, (err) => err.code === 'ILLEGAL_TRANSITION');

  // Approve on already approved state
  const approvedState = { currentStatus: 'approved', steps: [] };
  assert.throws(() => {
    applyAction(approvedState, { type: 'approve', actor: { userId: 1 } });
  }, (err) => err.code === 'ILLEGAL_TRANSITION');
});

test('ApprovalEngine: nextOvertimeStatus legal and illegal transitions', () => {
  assert.equal(nextOvertimeStatus('pending', 'approve'), 'approved');
  assert.equal(nextOvertimeStatus('pending', 'reject'), 'rejected');
  assert.equal(nextOvertimeStatus('pending', 'cancel'), 'cancelled');
  assert.equal(nextOvertimeStatus('approved', 'cancel'), 'cancelled');

  assert.throws(() => {
    nextOvertimeStatus('rejected', 'approve');
  }, (err) => err.code === 'ILLEGAL_TRANSITION');

  assert.throws(() => {
    nextOvertimeStatus('cancelled', 'approve');
  }, (err) => err.code === 'ILLEGAL_TRANSITION');
});
