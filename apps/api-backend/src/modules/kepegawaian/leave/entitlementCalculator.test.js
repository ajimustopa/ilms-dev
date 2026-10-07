/**
 * Unit Tests for Pure Entitlement & Proration Calculator
 * Conforms to SPEC-CUTI-LEMBUR.md §5.6 (B1–B10)
 * Executed via node:test without database access
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeEntitlement, computeCarryOver } = require('./entitlementCalculator');

const defaultPolicy = {
  period_start_month: 7,
  proration_mode: 'monthly',
  proration_join_day_cutoff: 15,
  rounding: 'floor_half',
  min_service_months_for_eligibility: 0,
  carry_over_enabled: 1,
  carry_over_max_days: 6,
  carry_over_expiry_months: 3,
  allow_negative: 0
};

const defaultRules = [
  { id: 1, employment_status: 'GTY', min_service_months: 0, days: 12, priority: 10 },
  { id: 2, employment_status: 'PTY', min_service_months: 0, days: 12, priority: 10 }
];

const period2026_2027 = {
  period_key: '2026/2027',
  start_date: '2026-07-01',
  end_date: '2027-06-30'
};

test('B1: Basis Jul-Jun, 12 hari, cutoff 15. Masuk 10 Okt 2026 -> 9.0', () => {
  const res = computeEntitlement({
    joinDate: '2026-10-10',
    employmentStatus: 'GTY',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, true);
  assert.equal(res.grantedDays, 9.0);
  assert.equal(res.activeMonths, 9);
});

test('B2: Masuk 16 Okt 2026 (lewat cutoff 15) -> 8.0', () => {
  const res = computeEntitlement({
    joinDate: '2026-10-16',
    employmentStatus: 'GTY',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, true);
  assert.equal(res.grantedDays, 8.0);
  assert.equal(res.activeMonths, 8);
});

test('B3: Masuk 1 Jul 2026 -> 12.0', () => {
  const res = computeEntitlement({
    joinDate: '2026-07-01',
    employmentStatus: 'PTY',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, true);
  assert.equal(res.grantedDays, 12.0);
  assert.equal(res.activeMonths, 12);
});

test('B1c: Basis kalender (konfigurasi), masuk 10 Apr 2026 -> 9.0', () => {
  const calendarPolicy = {
    ...defaultPolicy,
    period_start_month: 1
  };
  const calendarPeriod = {
    period_key: '2026',
    start_date: '2026-01-01',
    end_date: '2026-12-31'
  };
  const res = computeEntitlement({
    joinDate: '2026-04-10',
    employmentStatus: 'GTY',
    policy: calendarPolicy,
    rules: defaultRules,
    period: calendarPeriod
  });
  assert.equal(res.eligible, true);
  assert.equal(res.grantedDays, 9.0);
  assert.equal(res.activeMonths, 9);
});

test('B4: Sisa 9.0 saat tutup periode 2026/2027, carry max 6 -> carry_in=6.0 ke 2027/2028, carry_expires_on=2027-09-30', () => {
  const res = computeCarryOver({
    remainingCurrentBalance: 9.0,
    policy: defaultPolicy,
    newPeriodStartDate: '2027-07-01'
  });
  assert.equal(res.carryIn, 6.0);
  assert.equal(res.carryExpiresOn, '2027-09-30');
});

test('Entitlement unknown join date -> UNKNOWN_JOIN_DATE', () => {
  const res = computeEntitlement({
    joinDate: null,
    employmentStatus: 'GTY',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, false);
  assert.equal(res.code, 'UNKNOWN_JOIN_DATE');
  assert.equal(res.grantedDays, 0);
});

test('Entitlement ineligible status (e.g. PNS or Pelatih Ekskul) -> ENTITLEMENT_NOT_ELIGIBLE', () => {
  const res = computeEntitlement({
    joinDate: '2020-01-01',
    employmentStatus: 'Pelatih Ekskul',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, false);
  assert.equal(res.code, 'ENTITLEMENT_NOT_ELIGIBLE');
  assert.equal(res.grantedDays, 0);
});

test('Joined before period start -> full entitlement 12.0', () => {
  const res = computeEntitlement({
    joinDate: '2023-03-01',
    employmentStatus: 'GTY',
    policy: defaultPolicy,
    rules: defaultRules,
    period: period2026_2027
  });
  assert.equal(res.eligible, true);
  assert.equal(res.grantedDays, 12.0);
});

test('B5: Carry 2.0, cuti Kam 30 Sep 2027 -> Sel 5 Okt 2027 (4 HK)', () => {
  const { allocateDaysToBuckets } = require('./entitlementCalculator');
  const days = [
    { date: '2027-09-30', weight: 1.0 },
    { date: '2027-10-01', weight: 1.0 },
    { date: '2027-10-04', weight: 1.0 },
    { date: '2027-10-05', weight: 1.0 }
  ];

  const result = allocateDaysToBuckets({
    days,
    carryRemaining: 2.0,
    carryExpiresOn: '2027-09-30'
  });

  // 30 Sep is <= carryExpiresOn -> takes 1.0 from carry
  // Remaining 3 days are > carryExpiresOn -> take from current
  assert.equal(result.carryDeduction, 1.0);
  assert.equal(result.currentDeduction, 3.0);
  assert.equal(result.totalDeduction, 4.0);
  assert.equal(result.remainingCarryAfterDeduction, 1.0); // 1.0 remains to be expired
  assert.equal(result.allocations.length, 4);
  assert.equal(result.allocations[0].bucket, 'carry_over');
  assert.equal(result.allocations[1].bucket, 'current');
  assert.equal(result.allocations[2].bucket, 'current');
  assert.equal(result.allocations[3].bucket, 'current');
});

test('Ledger Invariant check: grant 12, reserve 3, commit 3, adjust +2, expire 1 -> valid', () => {
  const { rebuildBalanceFromLedger } = require('./entitlementCalculator');
  const entries = [
    { entry_type: 'grant', delta_available: 12.0, delta_reserved: 0, delta_used: 0 },
    { entry_type: 'reserve', delta_available: -3.0, delta_reserved: 3.0, delta_used: 0 },
    { entry_type: 'commit', delta_available: 0, delta_reserved: -3.0, delta_used: 3.0 },
    { entry_type: 'adjust', delta_available: 2.0, delta_reserved: 0, delta_used: 0 },
    { entry_type: 'expire', delta_available: -1.0, delta_reserved: 0, delta_used: 0 }
  ];

  const bal = rebuildBalanceFromLedger(entries);
  assert.equal(bal.granted, 12.0);
  assert.equal(bal.carry_in, 0);
  assert.equal(bal.adjusted, 2.0);
  assert.equal(bal.used, 3.0);
  assert.equal(bal.reserved, 0);
  assert.equal(bal.expired, 1.0);
  assert.equal(bal.available, 10.0); // 12 + 2 - 1 - 3 = 10
  assert.equal(bal.isValid, true);
  assert.equal(bal.invariantDiff, 0);
});

test('Ledger Invariant check with refund and joint leave debit', () => {
  const { rebuildBalanceFromLedger } = require('./entitlementCalculator');
  const entries = [
    { entry_type: 'grant', delta_available: 12.0, delta_reserved: 0, delta_used: 0 },
    { entry_type: 'carry_in', delta_available: 4.0, delta_reserved: 0, delta_used: 0 },
    // Reserve 5
    { entry_type: 'reserve', delta_available: -5.0, delta_reserved: 5.0, delta_used: 0 },
    // Commit 5
    { entry_type: 'commit', delta_available: 0, delta_reserved: -5.0, delta_used: 5.0 },
    // Refund 2.0 (B7)
    { entry_type: 'refund', delta_available: 2.0, delta_reserved: 0, delta_used: -2.0 },
    // Joint leave debit 1.0
    { entry_type: 'joint_leave_debit', delta_available: -1.0, delta_reserved: 0, delta_used: 1.0 }
  ];

  const bal = rebuildBalanceFromLedger(entries);
  assert.equal(bal.granted, 12.0);
  assert.equal(bal.carry_in, 4.0);
  assert.equal(bal.used, 4.0); // 5 - 2 + 1 = 4.0
  assert.equal(bal.available, 12.0); // 12 + 4 - 4 = 12.0
  assert.equal(bal.isValid, true);
});
