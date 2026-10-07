/**
 * Integration Tests for Tahap 13: Calendar Matrix, Absence Reports, and Excel/PDF Export
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #17, #36, §3.5, §10.2, §10.3, §11.2
 * Target: kepegawaian_dev, core_dev (127.0.0.1:3306)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const coreDb = require('../../../config/db/core');
const kepDb = require('../../../config/db/kepegawaian');
const { assertDevDatabase } = require('../../../config/db/dbGuard');
const { seedDataUji } = require('./seeds/seed_data_uji_hrd');
const { seedUsulanTerkunci } = require('./seeds/seed_usulan_terkunci');
const leaveReportService = require('./leaveReportService');

test('Tahap 13 Integration: Calendar Matrix, Analytics Reports, Sick Privacy, and Exports', async (t) => {
  // 1. Guard check
  assertDevDatabase(coreDb.client.connectionSettings, 'TEST_CORE_13');
  assertDevDatabase(kepDb.client.connectionSettings, 'TEST_KEPEGAWAIAN_13');

  // 2. Reseed DB with fresh baseline
  await seedDataUji(coreDb, kepDb);
  await seedUsulanTerkunci(kepDb);

  // Clean test tables
  await kepDb('employee_leave_requests').del();
  await kepDb('employee_overtimes').del();
  await kepDb('absence_thresholds').del();

  // Insert mock absence threshold (SPEC §2 #36, §10.2)
  await kepDb('absence_thresholds').insert({
    school_unit_id: 1, // SMP
    group_type: 'unit',
    group_ref_id: 1,
    max_absent_count: 2,
    max_absent_percent: 25.00,
    is_active: 1
  });

  // Define test actors
  const hrdActor = {
    userId: 2,
    employeeId: 1, // Dra. Hj. Siti Aminah (HRD SMP)
    username: 'hrd_smp',
    permissions: [
      'kepegawaian.leave_requests.manage',
      'kepegawaian.leave_requests.read',
      'kepegawaian.leave_reports.read',
      'kepegawaian.overtimes.manage'
    ],
    unitScope: [1]
  };

  const guruActor = {
    userId: 3,
    employeeId: 3, // Budi Santoso, S.Pd (Guru GTY SMP)
    username: 'guru_smp_1',
    permissions: ['kepegawaian.leave_requests.read'],
    unitScope: [1]
  };

  // Seed sample leave requests and overtimes for 2026-10
  // Employee 3 (Budi): Sakit 2026-10-05 s/d 2026-10-06 (2 hari)
  const [sickType] = await kepDb('leave_types').where({ code: 'sakit' }).select('id');
  const [annualType] = await kepDb('leave_types').where({ code: 'cuti_tahunan' }).select('id');
  const [permitType] = await kepDb('leave_types').where({ code: 'izin_pribadi' }).select('id');

  await kepDb('employee_leave_requests').insert([
    {
      employee_id: 3, // Budi
      leave_type_id: sickType.id,
      start_date: '2026-10-05',
      end_date: '2026-10-06',
      start_portion: 'full_day',
      end_portion: 'full_day',
      duration_days: 2.0,
      status: 'approved',
      reason: 'Sakit tipes opname di RS Hermina',
      attachment_url: 'sakit_budi_surat_dokter.pdf'
    },
    {
      employee_id: 4, // Hendra
      leave_type_id: annualType.id,
      start_date: '2026-10-05',
      end_date: '2026-10-07',
      start_portion: 'full_day',
      end_portion: 'full_day',
      duration_days: 3.0,
      status: 'approved',
      reason: 'Cuti mudik keluarga'
    },
    {
      employee_id: 5, // Dewi
      leave_type_id: permitType.id,
      start_date: '2026-10-05',
      end_date: '2026-10-05',
      start_portion: 'full_day',
      end_portion: 'full_day',
      duration_days: 1.0,
      status: 'approved',
      reason: 'Urusan keluarga mendadak'
    },
    {
      employee_id: 3, // Budi
      leave_type_id: annualType.id,
      start_date: '2026-10-20',
      end_date: '2026-10-21',
      start_portion: 'full_day',
      end_portion: 'full_day',
      duration_days: 2.0,
      status: 'pending',
      reason: 'Acara keluarga besar'
    }
  ]);

  // Seed sample approved overtimes
  await kepDb('employee_overtimes').insert([
    {
      employee_id: 3,
      school_unit_id: 1,
      overtime_date: '2026-10-10',
      start_time: '13:00:00',
      end_time: '16:00:00',
      hours: 3.0,
      payable_hours: 3.0,
      status: 'approved',
      task_description: 'Persiapan akreditasi sekolah',
      day_type: 'workday'
    }
  ]);

  await t.test('1. Calendar Matrix: Returns complete grid, dates, and aggregates', async () => {
    const startTime = Date.now();
    const matrix = await leaveReportService.getCalendarMatrix({
      month: '2026-10',
      school_unit_id: 1,
      include_overtime: true,
      include_pending: true
    }, hrdActor);
    const duration = Date.now() - startTime;

    assert.ok(matrix, 'Matrix returned');
    assert.equal(matrix.month, '2026-10');
    assert.equal(matrix.daysInMonth, 31);
    assert.ok(Array.isArray(matrix.dates) && matrix.dates.length === 31, 'Has 31 dates');
    assert.ok(Array.isArray(matrix.rows) && matrix.rows.length > 0, 'Has employee rows');
    assert.ok(duration < 500, `Performance batch query executed in ${duration}ms (< 500ms)`);

    // Verify day 2026-10-05 has 3 absent employees (Budi, Hendra, Dewi)
    const dateStatsOct5 = matrix.dateStats['2026-10-05'];
    assert.ok(dateStatsOct5, 'Date stats for 2026-10-05 exists');
    assert.equal(dateStatsOct5.totalAbsent, 3, '3 employees absent on 2026-10-05');

    // Verify Threshold Alert triggered on 2026-10-05 (limit was max_absent_count = 2, absent = 3)
    assert.ok(dateStatsOct5.thresholdAlert, 'Threshold alert exists on 2026-10-05');
    assert.equal(dateStatsOct5.thresholdAlert.isWarning, true, 'isWarning should be true');
    assert.match(dateStatsOct5.thresholdAlert.message, /Peringatan.*pegawai tidak hadir/, 'Alert message formatted correctly');
  });

  await t.test('2. Sick Privacy (SPEC §2 #17): Non-HR non-owner cannot see sick reason/attachments', async () => {
    // Other Guru Actor (Employee 4) requesting matrix
    const otherGuruActor = {
      userId: 4,
      employeeId: 4,
      username: 'guru_smp_2',
      permissions: ['kepegawaian.leave_requests.read'],
      unitScope: [1]
    };

    const matrixNonHr = await leaveReportService.getCalendarMatrix({
      month: '2026-10',
      school_unit_id: 1
    }, otherGuruActor);

    // Find row for Employee 3 (Budi) who had sick leave
    const budiRow = matrixNonHr.rows.find(r => r.employee_id === 3);
    assert.ok(budiRow, 'Budi row exists');
    const oct5Entry = budiRow.days['2026-10-05'];
    assert.ok(oct5Entry && oct5Entry.leave, 'Oct 5 has leave');
    assert.equal(oct5Entry.leave.category, 'sick', 'Is sick leave');
    assert.equal(oct5Entry.leave.reason, null, 'Sick reason MUST be masked for non-HR');
    assert.equal(oct5Entry.leave.attachment_url, null, 'Sick attachment MUST be masked for non-HR');

    // Owner (Employee 3) requesting matrix -> can see own sick reason
    const ownerMatrix = await leaveReportService.getCalendarMatrix({
      month: '2026-10',
      school_unit_id: 1
    }, guruActor);
    const ownerBudiRow = ownerMatrix.rows.find(r => r.employee_id === 3);
    assert.equal(ownerBudiRow.days['2026-10-05'].leave.reason, 'Sakit tipes opname di RS Hermina', 'Owner can see own sick reason');

    // HR Actor -> can see sick reason
    const hrMatrix = await leaveReportService.getCalendarMatrix({
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);
    const hrBudiRow = hrMatrix.rows.find(r => r.employee_id === 3);
    assert.equal(hrBudiRow.days['2026-10-05'].leave.reason, 'Sakit tipes opname di RS Hermina', 'HR can see sick reason');
  });

  await t.test('3. Analytics Reports: Summary, By-Type, Trend, Top, Recap', async () => {
    // 3a. Summary Report
    const summary = await leaveReportService.getReportsSummary({
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);
    assert.equal(summary.total_requests, 4, '4 total requests');
    assert.equal(summary.approved_requests, 3, '3 approved requests');
    assert.equal(summary.pending_requests, 1, '1 pending request');
    assert.equal(summary.total_leave_days_taken, 6.0, '6 total approved days taken (2 sick + 3 annual + 1 permit)');
    assert.equal(summary.overtime_total_hours, 3.0, '3 approved overtime hours');

    // 3b. By-Type Report
    const byType = await leaveReportService.getReportsByType({
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);
    assert.ok(Array.isArray(byType.items), 'By-type items is array');
    const annualItem = byType.items.find(t => t.category === 'annual' || t.code === 'cuti_tahunan');
    assert.ok(annualItem, 'Annual item found');
    assert.equal(annualItem.total_days, 3.0, '3 annual leave days');

    // 3c. Trend Report
    const trend = await leaveReportService.getReportsTrend({
      from: '2026-09-01',
      to: '2026-10-31',
      school_unit_id: 1
    }, hrdActor);
    assert.ok(Array.isArray(trend) && trend.length === 2, '2 monthly buckets in trend');
    const octTrend = trend.find(m => m.month === '2026-10');
    assert.equal(octTrend.total_days, 6.0, '6 leave days in Oct');
    assert.equal(octTrend.overtime_hours, 3.0, '3 overtime hours in Oct');

    // 3d. Top Absent Report
    const top = await leaveReportService.getReportsTop({
      month: '2026-10',
      school_unit_id: 1,
      limit: 3
    }, hrdActor);
    assert.ok(Array.isArray(top), 'Top absent is array');
    assert.equal(top[0].employee_id, 4, 'Hendra is top with 3 days');
    assert.equal(top[0].total_days, 3.0, 'Hendra took 3 days');
    assert.equal(top[1].employee_id, 3, 'Budi is second with 2 days');
    assert.equal(top[1].total_days, 2.0, 'Budi took 2 days');

    // 3e. Tabular Recap Report
    const recap = await leaveReportService.getReportsRecap({
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);
    assert.ok(Array.isArray(recap) && recap.length > 0, 'Recap is array');
    const budiRecap = recap.find(r => r.employee_id === 3);
    assert.equal(budiRecap.sick_days, 2.0, 'Budi sick days = 2.0');
    assert.equal(budiRecap.total_absent_days, 2.0, 'Budi total absent = 2.0');
    assert.equal(budiRecap.overtime_payable_hours, 3.0, 'Budi overtime payable = 3.0');
  });

  await t.test('4. Export Report to XLSX & PDF', async () => {
    // 4a. Excel Export
    const xlsxResult = await leaveReportService.exportReport({
      format: 'xlsx',
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);

    assert.ok(xlsxResult.buffer, 'Excel buffer generated');
    assert.match(xlsxResult.filename, /Rekap_Ketidakhadiran_Pegawai_2026-10\.xlsx/, 'Filename format');
    assert.equal(xlsxResult.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Verify workbook structure using xlsx read
    const wb = XLSX.read(xlsxResult.buffer, { type: 'buffer' });
    assert.ok(wb.SheetNames.includes('Rekapitulasi Pegawai'), 'Sheet Rekapitulasi Pegawai exists');
    assert.ok(wb.SheetNames.includes('Ringkasan Eksekutif'), 'Sheet Ringkasan Eksekutif exists');

    // 4b. PDF Export
    const pdfResult = await leaveReportService.exportReport({
      format: 'pdf',
      month: '2026-10',
      school_unit_id: 1
    }, hrdActor);

    assert.ok(pdfResult.buffer, 'PDF buffer generated');
    assert.match(pdfResult.filename, /Rekap_Ketidakhadiran_Pegawai_2026-10\.pdf/, 'PDF filename format');
    assert.equal(pdfResult.contentType, 'application/pdf');

    // Check PDF magic bytes (%PDF-)
    const pdfHeader = pdfResult.buffer.slice(0, 5).toString('ascii');
    assert.equal(pdfHeader, '%PDF-', 'Buffer starts with valid PDF header');
    assert.ok(pdfResult.buffer.length > 1000, 'PDF buffer has content');
  });
});
