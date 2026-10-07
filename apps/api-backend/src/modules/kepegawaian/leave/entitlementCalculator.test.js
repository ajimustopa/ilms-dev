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
