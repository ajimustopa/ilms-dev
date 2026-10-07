/**
 * Tahap 2: Pure Unit Tests for Holiday Filtering, Import Parsing, and Year Copying
 * Modul Kepegawaian - Core Aldepos
 * Uses Node.js native test runner (node:test)
 * Pure functions: Zero DB / Zero Network / Zero System Clock dependency
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const holidayService = require('./holidayService');
const {
  filterOffHolidaysForDate,
  parseImportFile,
  computeCopyYearHolidays,
  formatDbDate
} = holidayService;

describe('Tahap 2: Pure Filter Off-Holidays For Employee', () => {
  const sampleHolidays = [
    {
      id: 1,
      name: 'Tahun Baru Masehi',
      holiday_type: 'national',
      start_date: '2027-01-01',
      end_date: '2027-01-01',
      school_unit_id: null, // Global
      is_off_day: 1,
      applies_to: 'all_employees',
      review_status: 'confirmed',
      deleted_at: null
    },
    {
      id: 2,
      name: 'Libur Khusus Unit SMA',
      holiday_type: 'unit_special',
      start_date: '2027-01-15',
      end_date: '2027-01-15',
      school_unit_id: 2, // Only SMA (unit 2)
      is_off_day: 1,
      applies_to: 'all_employees',
      review_status: 'confirmed',
      deleted_at: null
    },
    {
      id: 3,
      name: 'Libur Semester Guru Pengajar',
      holiday_type: 'school_semester',
      start_date: '2027-01-20',
      end_date: '2027-01-22',
      school_unit_id: 1, // SMP (unit 1)
      is_off_day: 1,
      applies_to: 'schedules',
      target_schedule_ids: [10, 11], // Only schedules 10 and 11
      review_status: 'confirmed',
      deleted_at: null
    },
    {
      id: 4,
      name: 'Usulan Libur Ramadhan (Draft)',
      holiday_type: 'school_ramadan',
      start_date: '2027-02-01',
      end_date: '2027-02-03',
      school_unit_id: 1,
      is_off_day: 1,
      applies_to: 'all_employees',
      review_status: 'draft_needs_review', // Draft should NOT apply
      deleted_at: null
    },
    {
      id: 5,
      name: 'Libur Dihapus (Soft Deleted)',
      holiday_type: 'national',
      start_date: '2027-02-10',
      end_date: '2027-02-10',
      school_unit_id: null,
      is_off_day: 1,
      applies_to: 'all_employees',
      review_status: 'confirmed',
      deleted_at: '2027-01-05T00:00:00.000Z' // Deleted
    },
    {
      id: 6,
      name: 'Peringatan Hari Guru (Bukan Hari Libur)',
      holiday_type: 'foundation',
      start_date: '2027-02-15',
      end_date: '2027-02-15',
      school_unit_id: null,
      is_off_day: 0, // is_off_day = false
      applies_to: 'all_employees',
      review_status: 'confirmed',
      deleted_at: null
    }
  ];

  it('1. Global national holiday applies to employee of any unit', () => {
    const res = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-01-01');
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 1);
    assert.equal(res[0].name, 'Tahun Baru Masehi');
  });

  it('2. Unit-specific holiday does not apply to employees of other units', () => {
    // Employee in unit 1 checking unit 2 holiday
    const resUnit1 = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-01-15');
    assert.equal(resUnit1.length, 0);

    // Employee in unit 2 checking unit 2 holiday
    const resUnit2 = filterOffHolidaysForDate(sampleHolidays, 2, 20, '2027-01-15');
    assert.equal(resUnit2.length, 1);
    assert.equal(resUnit2[0].id, 2);
  });

  it('3. Schedule-targeted holiday applies only to targeted work schedule', () => {
    // Guru with schedule 10 (targeted)
    const resTargeted = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-01-21');
    assert.equal(resTargeted.length, 1);
    assert.equal(resTargeted[0].id, 3);

    // Satpam with schedule 99 (not targeted)
    const resNotTargeted = filterOffHolidaysForDate(sampleHolidays, 1, 99, '2027-01-21');
    assert.equal(resNotTargeted.length, 0);
  });

  it('4. Draft holidays (draft_needs_review) are ignored', () => {
    const res = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-02-02');
    assert.equal(res.length, 0);
  });

  it('5. Soft-deleted holidays are ignored', () => {
    const res = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-02-10');
    assert.equal(res.length, 0);
  });

  it('6. Non-off-day events (is_off_day = 0) are ignored', () => {
    const res = filterOffHolidaysForDate(sampleHolidays, 1, 10, '2027-02-15');
    assert.equal(res.length, 0);
  });

  it('7. Multiple holidays on same date are returned as array', () => {
    const multiHolidays = [
      ...sampleHolidays,
      {
        id: 7,
        name: 'Milad Yayasan',
        holiday_type: 'foundation',
        start_date: '2027-01-01',
        end_date: '2027-01-01',
        school_unit_id: null,
        is_off_day: 1,
        applies_to: 'all_employees',
        review_status: 'confirmed',
        deleted_at: null
      }
    ];

    const res = filterOffHolidaysForDate(multiHolidays, 1, 10, '2027-01-01');
    assert.equal(res.length, 2);
    assert.equal(res[0].name, 'Tahun Baru Masehi');
    assert.equal(res[1].name, 'Milad Yayasan');
  });
});

describe('Tahap 2: Pure Import File Parser (CSV & JSON)', () => {
  it('1. Parses valid CSV content with English headers', () => {
    const csvContent = `name,holiday_type,start_date,end_date,is_off_day,applies_to,deducts_annual_leave,date_rule,notes
Tahun Baru 2027,national,2027-01-01,2027-01-01,true,all_employees,false,fixed_date,Tahun Baru
Cuti Bersama Imlek,joint_leave,2027-01-28,2027-01-29,true,all_employees,true,floating,Cuti bersama`;

    const parsed = parseImportFile(csvContent, 'csv');
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid_rows.length, 2);
    assert.equal(parsed.valid_rows[0].name, 'Tahun Baru 2027');
    assert.equal(parsed.valid_rows[0].holiday_type, 'national');
    assert.equal(parsed.valid_rows[0].date_rule, 'fixed_date');
    assert.equal(parsed.valid_rows[1].deducts_annual_leave, true);
  });

  it('2. Parses valid CSV with Indonesian headers and semicolon delimiter', () => {
    const csvIndo = `nama;jenis;tanggal_mulai;tanggal_selesai;libur;potong_cuti;aturan_tanggal;catatan
Hari Raya Idul Fitri;nasional;2027-03-31;2027-04-01;ya;tidak;floating;Hari Raya
Cuti Bersama Idul Fitri;cuti_bersama;2027-04-02;2027-04-05;1;1;floating;Cuti Lebaran`;

    const parsed = parseImportFile(csvIndo, 'csv');
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid_rows.length, 2);
    assert.equal(parsed.valid_rows[0].name, 'Hari Raya Idul Fitri');
    assert.equal(parsed.valid_rows[0].holiday_type, 'national');
    assert.equal(parsed.valid_rows[1].holiday_type, 'joint_leave');
    assert.equal(parsed.valid_rows[1].deducts_annual_leave, true);
  });

  it('3. Parses valid JSON array', () => {
    const jsonList = [
      {
        name: 'Hari Kemerdekaan RI',
        holiday_type: 'national',
        start_date: '2027-08-17',
        end_date: '2027-08-17',
        is_off_day: true,
        date_rule: 'fixed_date'
      }
    ];

    const parsed = parseImportFile(jsonList, 'json');
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid_rows.length, 1);
    assert.equal(parsed.valid_rows[0].name, 'Hari Kemerdekaan RI');
    assert.equal(parsed.valid_rows[0].date_rule, 'fixed_date');
  });

  it('4. Rejects invalid date format and reports exact line number', () => {
    const badCsv = `name,holiday_type,start_date,end_date
Libur Normal,national,2027-05-01,2027-05-01
Libur Rusak,national,tanggal-salah,2027-05-02`;

    const parsed = parseImportFile(badCsv, 'csv');
    assert.equal(parsed.valid_rows.length, 1);
    assert.equal(parsed.errors.length, 1);
    assert.equal(parsed.errors[0].line, 3);
    assert.equal(parsed.errors[0].field, 'start_date');
  });

  it('5. Rejects end_date earlier than start_date with exact line number', () => {
    const reversedDatesCsv = `name,holiday_type,start_date,end_date
Libur Terbalik,national,2027-06-10,2027-06-05`;

    const parsed = parseImportFile(reversedDatesCsv, 'csv');
    assert.equal(parsed.valid_rows.length, 0);
    assert.equal(parsed.errors.length, 1);
    assert.equal(parsed.errors[0].line, 2);
    assert.equal(parsed.errors[0].field, 'end_date');
  });

  it('6. Rejects duplicate holidays within same import payload', () => {
    const duplicateCsv = `name,holiday_type,start_date,end_date
Tahun Baru,national,2027-01-01,2027-01-01
Tahun Baru,national,2027-01-01,2027-01-01`;

    const parsed = parseImportFile(duplicateCsv, 'csv');
    assert.equal(parsed.valid_rows.length, 1);
    assert.equal(parsed.errors.length, 1);
    assert.equal(parsed.errors[0].line, 3);
    assert.equal(parsed.errors[0].field, 'duplicate');
  });
});

describe('Tahap 2: Pure Copy Year Transformer (SPEC §10.4)', () => {
  const source2026 = [
    {
      id: 101,
      name: 'Hari Kemerdekaan RI',
      holiday_type: 'national',
      start_date: '2026-08-17',
      end_date: '2026-08-17',
      school_unit_id: null,
      is_off_day: 1,
      date_rule: 'fixed_date', // Fixed date
      deducts_annual_leave: 0,
      applies_to: 'all_employees'
    },
    {
      id: 102,
      name: 'Hari Raya Idul Fitri (Estimasi)',
      holiday_type: 'national',
      start_date: '2026-03-20',
      end_date: '2026-03-21',
      school_unit_id: null,
      is_off_day: 1,
      date_rule: 'floating', // Floating date
      deducts_annual_leave: 0,
      applies_to: 'all_employees'
    },
    {
      id: 103,
      name: 'Libur Akhir Semester Guru',
      holiday_type: 'school_semester',
      start_date: '2026-12-21',
      end_date: '2026-12-25',
      school_unit_id: 1,
      is_off_day: 1,
      date_rule: 'floating',
      deducts_annual_leave: 0,
      applies_to: 'schedules',
      target_schedule_ids: [1, 2]
    }
  ];

  it('1. Copies fixed_date holiday with same calendar day as confirmed', () => {
    const copied = computeCopyYearHolidays(source2026, 2026, 2027);
    const fixedItem = copied.find(h => h.name === 'Hari Kemerdekaan RI');

    assert.ok(fixedItem);
    assert.equal(fixedItem.start_date, '2027-08-17');
    assert.equal(fixedItem.end_date, '2027-08-17');
    assert.equal(fixedItem.date_rule, 'fixed_date');
    assert.equal(fixedItem.review_status, 'confirmed'); // SPEC: fixed_date is confirmed
    assert.equal(fixedItem.source, 'copied');
  });

  it('2. Copies floating holiday as draft_needs_review', () => {
    const copied = computeCopyYearHolidays(source2026, 2026, 2027);
    const floatingItem = copied.find(h => h.name === 'Hari Raya Idul Fitri (Estimasi)');

    assert.ok(floatingItem);
    assert.equal(floatingItem.start_date, '2027-03-20');
    assert.equal(floatingItem.end_date, '2027-03-21');
    assert.equal(floatingItem.date_rule, 'floating');
    assert.equal(floatingItem.review_status, 'draft_needs_review'); // SPEC: floating is draft
  });

  it('3. Preserves schedule targets and school unit assignment on copy', () => {
    const copied = computeCopyYearHolidays(source2026, 2026, 2027);
    const targetedItem = copied.find(h => h.name === 'Libur Akhir Semester Guru');

    assert.ok(targetedItem);
    assert.equal(targetedItem.school_unit_id, 1);
    assert.equal(targetedItem.applies_to, 'schedules');
    assert.deepEqual(targetedItem.target_schedule_ids, [1, 2]);
    assert.equal(targetedItem.review_status, 'draft_needs_review');
  });

  it('4. Handles leap day 29 Feb gracefully on non-leap target years', () => {
    const leapHoliday = [
      {
        id: 999,
        name: 'Hari Kabisat',
        holiday_type: 'national',
        start_date: '2024-02-29',
        end_date: '2024-02-29',
        date_rule: 'fixed_date',
        is_off_day: 1
      }
    ];

    const copiedTo2025 = computeCopyYearHolidays(leapHoliday, 2024, 2025);
    assert.equal(copiedTo2025[0].start_date, '2025-02-28');
    assert.equal(copiedTo2025[0].end_date, '2025-02-28');
  });
});
