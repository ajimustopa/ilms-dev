/**
 * Unit Tests for Pure Duration Calculator Engine
 * Conforms to SPEC-CUTI-LEMBUR.md §4.3 (T1–T21)
 * Executed via node:test without database access
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeDuration, computeEndDate } = require('./durationCalculator');

// Helper to build dayFacts fixture for S1 (Sen-Jum kerja, Sab-Min libur)
function buildS1Facts(dates, holidayMap = {}) {
  const facts = {};
  for (const d of dates) {
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    const isWeekend = dow === 0 || dow === 6; // 0=Sun, 6=Sat
    facts[d] = {
      scheduleState: isWeekend ? 'NONWORKDAY' : 'WORKDAY',
      offHolidays: holidayMap[d] ? [holidayMap[d]] : []
    };
  }
  return facts;
}

// Helper for S2 (Sen-Sab kerja, Min libur)
function buildS2Facts(dates, holidayMap = {}) {
  const facts = {};
  for (const d of dates) {
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    const isSun = dow === 0;
    facts[d] = {
      scheduleState: isSun ? 'NONWORKDAY' : 'WORKDAY',
      offHolidays: holidayMap[d] ? [holidayMap[d]] : []
    };
  }
  return facts;
}

test('T1: Minggu penuh (S1, HK, 05-09 Okt 2026, full) -> 5.0', () => {
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
  const dayFacts = buildS1Facts(dates);
  const res = computeDuration({
    startDate: '2026-10-05',
    endDate: '2026-10-09',
    startPortion: 'full',
    endPortion: 'full',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 5.0);
  assert.equal(res.breakdown.length, 5);
  assert.equal(res.breakdown.every(b => b.state === 'COUNTED' && b.weight === 1.0), true);
});

test('T2: Lewat akhir pekan (S1, HK, Jum 09 -> Sen 12 Okt 2026) -> 2.0', () => {
  const dates = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
  const dayFacts = buildS1Facts(dates);
  const res = computeDuration({
    startDate: '2026-10-09',
    endDate: '2026-10-12',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 2.0);
  assert.equal(res.breakdown[1].state, 'WEEKEND_OFF');
  assert.equal(res.breakdown[2].state, 'WEEKEND_OFF');
});

test('T3: Sama T2, mode kalender -> 4.0', () => {
  const dates = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
  const dayFacts = buildS1Facts(dates);
  const res = computeDuration({
    startDate: '2026-10-09',
    endDate: '2026-10-12',
    countMode: 'calendar_days',
    dayFacts
  });
  assert.equal(res.total, 4.0);
});

test('T4: Setengah hari tunggal (S1, HK, Rab 07 Okt, am) -> 0.5', () => {
  const dayFacts = buildS1Facts(['2026-10-07']);
  const res = computeDuration({
    startDate: '2026-10-07',
    endDate: '2026-10-07',
    startPortion: 'am',
    endPortion: 'am',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 0.5);
  assert.equal(res.breakdown[0].weight, 0.5);
});

test('T5: Setengah hari di ujung (S1, HK, Sen 05 pm -> Rab 07 am) -> 2.0 (0.5+1+0.5)', () => {
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07'];
  const dayFacts = buildS1Facts(dates);
  const res = computeDuration({
    startDate: '2026-10-05',
    endDate: '2026-10-07',
    startPortion: 'pm',
    endPortion: 'am',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 2.0);
  assert.equal(res.breakdown[0].weight, 0.5);
  assert.equal(res.breakdown[1].weight, 1.0);
  assert.equal(res.breakdown[2].weight, 0.5);
});

test('T6: Hari non-kerja tunggal (S1, HK, Sab 10 Okt) -> error NO_WORKING_DAYS', () => {
  const dayFacts = buildS1Facts(['2026-10-10']);
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-10',
      endDate: '2026-10-10',
      countMode: 'work_days',
      dayFacts
    });
  }, { code: 'NO_WORKING_DAYS' });
});

test('T7: Libur di tengah (libur nasional Rab 14, rentang 12-16) -> 4.0', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
  const holidayMap = { '2026-10-14': { name: 'Libur Nasional Uji' } };
  const dayFacts = buildS1Facts(dates, holidayMap);
  const res = computeDuration({
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 4.0);
  assert.equal(res.breakdown[2].state, 'HOLIDAY_OFF');
});

test('T8a: Libur semester 12-16 Okt menarget S1, rentang 12-17, pegawai S1 -> error NO_WORKING_DAYS', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
  const holidayMap = {};
  for (const d of ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']) {
    holidayMap[d] = { name: 'Libur Semester' };
  }
  const dayFacts = buildS1Facts(dates, holidayMap);
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-12',
      endDate: '2026-10-17',
      countMode: 'work_days',
      dayFacts
    });
  }, { code: 'NO_WORKING_DAYS' });
});

test('T8b: Sama T8a, pegawai S2 (tidak ditarget libur) -> 6.0', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
  // For S2, holiday is NOT applicable, so offHolidays is empty
  const dayFacts = buildS2Facts(dates, {});
  const res = computeDuration({
    startDate: '2026-10-12',
    endDate: '2026-10-17',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 6.0);
});

test('T9: Libur nasional jatuh Sabtu 10, rentang Jum 09 -> Sen 12, S1 -> 2.0 (tidak dikurangi ganda)', () => {
  const dates = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
  const holidayMap = { '2026-10-10': { name: 'Libur Sabtu' } };
  const dayFacts = buildS1Facts(dates, holidayMap);
  const res = computeDuration({
    startDate: '2026-10-09',
    endDate: '2026-10-12',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 2.0);
  assert.equal(res.breakdown[1].state, 'WEEKEND_OFF'); // Non-workday wins over holiday
});

test('T10: Melahirkan kalender (mulai 1 Des 2026, 90 hari) -> computeEndDate = 2027-02-28, total 90.0', () => {
  const endDate = computeEndDate({
    startDate: '2026-12-01',
    targetDays: 90,
    countMode: 'calendar_days'
  });
  assert.equal(endDate, '2027-02-28');

  // Build calendar dates
  const dates = [];
  let cur = '2026-12-01';
  while (cur <= '2027-02-28') {
    dates.push(cur);
    const d = new Date(cur + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  const dayFacts = {};
  for (const d of dates) {
    dayFacts[d] = { scheduleState: 'WORKDAY', offHolidays: [] };
  }

  const res = computeDuration({
    startDate: '2026-12-01',
    endDate: '2027-02-28',
    countMode: 'calendar_days',
    periodOf: (d) => d.slice(0, 4), // Year based
    dayFacts
  });
  assert.equal(res.total, 90.0);
  assert.equal(res.byPeriod['2026'], 31.0);
  assert.equal(res.byPeriod['2027'], 59.0);
});

test('T11: Lintas tahun HK + libur 1 Jan 2027 (28 Des 2026 -> 5 Jan 2027, S1) -> 6.0', () => {
  const dates = [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'
  ];
  const holidayMap = { '2027-01-01': { name: 'Tahun Baru' } };
  const dayFacts = buildS1Facts(dates, holidayMap);

  const res = computeDuration({
    startDate: '2026-12-28',
    endDate: '2027-01-05',
    countMode: 'work_days',
    periodOf: (d) => d.slice(0, 4),
    dayFacts
  });
  assert.equal(res.total, 6.0);
  assert.equal(res.byPeriod['2026'], 4.0); // 28, 29, 30, 31 Dec
  assert.equal(res.byPeriod['2027'], 2.0); // 4, 5 Jan (1 Jan holiday, 2-3 weekend)
});

test('T12: Pegawai flexible (FLEXIBLE, mon_fri, 05-11 Okt 2026) -> 5.0 + warning', () => {
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
  const dayFacts = {};
  for (const d of dates) {
    dayFacts[d] = { scheduleState: 'FLEXIBLE', offHolidays: [] };
  }
  const res = computeDuration({
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    countMode: 'work_days',
    flexibleDayRule: 'mon_fri',
    dayFacts
  });
  assert.equal(res.total, 5.0);
  assert.ok(res.warnings.includes('FLEXIBLE_SCHEDULE_RULE_APPLIED'));
});

test('T13: Setengah hari pada hari libur (am pada 14 Okt, S1) -> error NO_WORKING_DAYS', () => {
  const dayFacts = buildS1Facts(['2026-10-14'], { '2026-10-14': { name: 'Libur' } });
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-14',
      endDate: '2026-10-14',
      startPortion: 'am',
      endPortion: 'am',
      countMode: 'work_days',
      dayFacts
    });
  }, { code: 'NO_WORKING_DAYS' });
});

test('T14: Setengah hari lewat akhir pekan (S1, Jum 09 pm -> Sen 12 am) -> 1.0', () => {
  const dates = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
  const dayFacts = buildS1Facts(dates);
  const res = computeDuration({
    startDate: '2026-10-09',
    endDate: '2026-10-12',
    startPortion: 'pm',
    endPortion: 'am',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 1.0);
  assert.equal(res.breakdown[0].weight, 0.5);
  assert.equal(res.breakdown[1].weight, 0.0);
  assert.equal(res.breakdown[2].weight, 0.0);
  assert.equal(res.breakdown[3].weight, 0.5);
});

test('T15: Rentang terbalik -> error INVALID_RANGE', () => {
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-10',
      endDate: '2026-10-05'
    });
  }, { code: 'INVALID_RANGE' });
});

test('T16: Porsi tak sah (>1 hari dengan start_portion=am) -> error INVALID_PORTION', () => {
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      startPortion: 'am',
      endPortion: 'full'
    });
  }, { code: 'INVALID_PORTION' });
});

test('T17: Tanpa penugasan jadwal -> error NO_SCHEDULE_ASSIGNMENT', () => {
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07'];
  const dayFacts = {};
  for (const d of dates) {
    dayFacts[d] = { scheduleState: 'NO_ASSIGNMENT', offHolidays: [] };
  }
  assert.throws(() => {
    computeDuration({
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      dayFacts
    });
  }, { code: 'NO_SCHEDULE_ASSIGNMENT' });
});

test('T18: Libur satuan lain (libur khusus unit 2 pada Rab 14, pegawai unit 1, 12-16) -> 5.0', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
  // For unit 1 employee, holiday is filtered out by adapter
  const dayFacts = buildS1Facts(dates, {});
  const res = computeDuration({
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 5.0);
});

test('T19: Jadwal Jumat libur (Sen-Kam+Sab kerja), HK, Kam 08 -> Sen 12 -> 3.0', () => {
  const dates = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
  // 08=Thu(WORK), 09=Fri(NONWORK), 10=Sat(WORK), 11=Sun(NONWORK), 12=Mon(WORK)
  const dayFacts = {
    '2026-10-08': { scheduleState: 'WORKDAY', offHolidays: [] },
    '2026-10-09': { scheduleState: 'NONWORKDAY', offHolidays: [] },
    '2026-10-10': { scheduleState: 'WORKDAY', offHolidays: [] },
    '2026-10-11': { scheduleState: 'NONWORKDAY', offHolidays: [] },
    '2026-10-12': { scheduleState: 'WORKDAY', offHolidays: [] }
  };
  const res = computeDuration({
    startDate: '2026-10-08',
    endDate: '2026-10-12',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 3.0);
});

test('T20: Kalender mencakup libur (kalender, libur Rab 14, 12-16) -> 5.0', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
  const holidayMap = { '2026-10-14': { name: 'Libur Nasional' } };
  const dayFacts = buildS1Facts(dates, holidayMap);
  const res = computeDuration({
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    countMode: 'calendar_days',
    holidayInsideCalendarCounted: true,
    dayFacts
  });
  assert.equal(res.total, 5.0);
});

test('T21: Dua libur satu tanggal (nasional + semester pada Rab 14, S1, 12-16) -> 4.0', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
  const dayFacts = buildS1Facts(dates);
  dayFacts['2026-10-14'].offHolidays = [
    { name: 'Libur Nasional' },
    { name: 'Libur Semester' }
  ];
  const res = computeDuration({
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    countMode: 'work_days',
    dayFacts
  });
  assert.equal(res.total, 4.0);
  assert.equal(res.breakdown[2].state, 'HOLIDAY_OFF');
  assert.equal(res.breakdown[2].weight, 0.0);
});
