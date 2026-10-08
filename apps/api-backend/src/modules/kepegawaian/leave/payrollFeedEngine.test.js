const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateDeterministicHash,
  calculateUnpaidEquivalentDays,
  aggregateLeaveDaysByType,
  aggregateOvertime,
  buildEmployeePayrollFeedItem,
  buildPayrollFeedResponse
} = require('./payrollFeedEngine');

test('1. Deterministic Hashing: Key ordering invariant & stability', () => {
  const obj1 = { b: 2, a: 1, c: { y: 'hello', x: [1, 2, 3] } };
  const obj2 = { c: { x: [1, 2, 3], y: 'hello' }, a: 1, b: 2 };

  const hash1 = generateDeterministicHash(obj1);
  const hash2 = generateDeterministicHash(obj2);

  assert.equal(hash1, hash2, 'Hash harus identik terlepas dari urutan key objek');
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
});

test('2. calculateUnpaidEquivalentDays: Aturan persentase gaji dan null', (t) => {
  // Gaji 100% (cuti tahunan / sakit) -> 0 potong
  const items1 = [
    { code: 'cuti_tahunan', days: 3, pay_percent: 100 },
    { code: 'sakit', days: 2, pay_percent: 100 }
  ];
  assert.equal(calculateUnpaidEquivalentDays(items1), 0);

  // Gaji 0% (haji / umrah / cuti tanpa gaji) -> 100% potong
  const items2 = [
    { code: 'cuti_umrah', days: 14, pay_percent: 0 },
    { code: 'cuti_tanpa_gaji', days: 5, pay_percent: 0 }
  ];
  assert.equal(calculateUnpaidEquivalentDays(items2), 19);

  // Gaji sebagian (misal 60% gaji -> 40% potong)
  const items3 = [
    { code: 'cuti_khusus_sebagian', days: 10, pay_percent: 60 }
  ];
  assert.equal(calculateUnpaidEquivalentDays(items3), 4.0);

  // Gaji null (legacy cuti khusus / lainnya - belum diputuskan) -> TIDAK dipotong
  const items4 = [
    { code: 'cuti_khusus', days: 3, pay_percent: null },
    { code: 'lainnya', days: 2, pay_percent: null }
  ];
  assert.equal(calculateUnpaidEquivalentDays(items4), 0);
});

test('3. aggregateLeaveDaysByType: Agregasi dan preservasi pay_percent null', () => {
  const leaves = [
    { leave_type: 'cuti_tahunan', leave_type_name: 'Cuti Tahunan', category: 'annual', duration_days: 2.0, payroll_pay_percent: 100, affects_attendance_allowance: 0 },
    { leave_type: 'cuti_tahunan', leave_type_name: 'Cuti Tahunan', category: 'annual', duration_days: 1.0, payroll_pay_percent: 100, affects_attendance_allowance: 0 },
    { leave_type: 'cuti_khusus', leave_type_name: 'Cuti Khusus', category: 'special', duration_days: 3.0, payroll_pay_percent: null, affects_attendance_allowance: 0 }
  ];

  const aggregated = aggregateLeaveDaysByType(leaves);
  assert.equal(aggregated.length, 2);

  const annual = aggregated.find(a => a.code === 'cuti_tahunan');
  assert.ok(annual);
  assert.equal(annual.days, 3.0);
  assert.equal(annual.pay_percent, 100);

  const special = aggregated.find(a => a.code === 'cuti_khusus');
  assert.ok(special);
  assert.equal(special.days, 3.0);
  assert.equal(special.pay_percent, null, 'pay_percent null harus tetap null');
});

test('4. aggregateOvertime: Pengelompokan jenis hari dan estimasi upah', () => {
  const overtimes = [
    { id: 1, overtime_date: '2026-10-05', day_type: 'workday', payable_hours: 2.0, estimated_wage: null, multiplier_breakdown: null, realization_status: 'matched' },
    { id: 2, overtime_date: '2026-10-06', day_type: 'workday', payable_hours: 1.5, estimated_wage: null, multiplier_breakdown: null, realization_status: 'matched' },
    { id: 3, overtime_date: '2026-10-10', day_type: 'weekend', payable_hours: 4.0, estimated_wage: null, multiplier_breakdown: null, realization_status: 'manual' }
  ];

  const otRes = aggregateOvertime(overtimes);
  assert.equal(otRes.total_payable_hours, 7.5);
  assert.equal(otRes.total_estimated_wage, null, 'Tanpa tarif, total estimasi upah tetap null');
  assert.equal(otRes.by_day_type.workday.payable_hours, 3.5);
  assert.equal(otRes.by_day_type.weekend.payable_hours, 4.0);
  assert.equal(otRes.items.length, 3);
});

test('5. buildPayrollFeedResponse: Provisional flag dan envelope status', () => {
  const item = buildEmployeePayrollFeedItem({
    employee: { id: 1, full_name: 'Guru Test', employee_number: 'NIP001', school_unit_id: 1, position_title: 'Guru' },
    leaves: [],
    overtimes: [],
    attendanceSummary: { effective_work_days: 22, present_count: 22 }
  });

  // Periode open -> provisional: true
  const resOpen = buildPayrollFeedResponse({
    period: '2026-10',
    schoolUnitId: 1,
    lockStatus: 'open',
    employeeFeedItems: [item]
  });
  assert.equal(resOpen.provisional, true);
  assert.equal(resOpen.lock_status, 'open');
  assert.ok(resOpen.snapshot_hash);

  // Periode locked -> provisional: false
  const resLocked = buildPayrollFeedResponse({
    period: '2026-10',
    schoolUnitId: 1,
    lockStatus: 'locked',
    employeeFeedItems: [item]
  });
  assert.equal(resLocked.provisional, false);
  assert.equal(resLocked.lock_status, 'locked');
});
