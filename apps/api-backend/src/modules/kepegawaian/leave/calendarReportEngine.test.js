/**
 * Unit Tests for Calendar & Report Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #17, #36, §10.2, §11.2
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isLeaveActiveOnDate,
  applySickPrivacy,
  checkDailyThreshold,
  generateMonthDates,
  buildCalendarMatrix,
  calculateReportSummary,
  aggregateByType,
  calculateMonthlyTrend,
  calculateTopAbsent,
  calculateRecap
} = require('./calendarReportEngine');

describe('Calendar & Report Engine (Pure Functions)', () => {
  describe('1. generateMonthDates & isLeaveActiveOnDate', () => {
    it('generates 31 days for October 2026', () => {
      const dates = generateMonthDates('2026-10');
      assert.strictEqual(dates.length, 31);
      assert.strictEqual(dates[0].date, '2026-10-01');
      assert.strictEqual(dates[0].day_of_week, 'thursday');
      assert.strictEqual(dates[0].is_weekend, false);

      assert.strictEqual(dates[30].date, '2026-10-31');
      assert.strictEqual(dates[30].day_of_week, 'saturday');
      assert.strictEqual(dates[30].is_weekend, true);
    });

    it('generates 28 days for February 2026 (non leap year)', () => {
      const dates = generateMonthDates('2026-02');
      assert.strictEqual(dates.length, 28);
    });

    it('checks if leave is active on given date', () => {
      const leave = { start_date: '2026-10-12', end_date: '2026-10-16' };
      assert.strictEqual(isLeaveActiveOnDate(leave, '2026-10-11'), false);
      assert.strictEqual(isLeaveActiveOnDate(leave, '2026-10-12'), true);
      assert.strictEqual(isLeaveActiveOnDate(leave, '2026-10-14'), true);
      assert.strictEqual(isLeaveActiveOnDate(leave, '2026-10-16'), true);
      assert.strictEqual(isLeaveActiveOnDate(leave, '2026-10-17'), false);
    });
  });

  describe('2. applySickPrivacy (SPEC §2 #17, §9.4)', () => {
    const sickLeave = {
      id: 101,
      employee_id: 5,
      category: 'sick',
      reason: 'Diagnosa Demam Berdarah & Rawat Inap RS',
      attachment_url: 'uploads/surat_dokter_rahasia.pdf'
    };

    it('masks reason and attachment when viewer is non-HR and non-owner', () => {
      const masked = applySickPrivacy(sickLeave, false, 99); // employee 99 looking at employee 5
      assert.strictEqual(masked.id, 101);
      assert.strictEqual(masked.reason, null);
      assert.strictEqual(masked.attachment_url, null);
    });

    it('keeps reason and attachment when viewer is HR', () => {
      const hrView = applySickPrivacy(sickLeave, true, null);
      assert.strictEqual(hrView.reason, 'Diagnosa Demam Berdarah & Rawat Inap RS');
      assert.strictEqual(hrView.attachment_url, 'uploads/surat_dokter_rahasia.pdf');
    });

    it('keeps reason and attachment when viewer is the owner itself', () => {
      const ownerView = applySickPrivacy(sickLeave, false, 5);
      assert.strictEqual(ownerView.reason, 'Diagnosa Demam Berdarah & Rawat Inap RS');
      assert.strictEqual(ownerView.attachment_url, 'uploads/surat_dokter_rahasia.pdf');
    });

    it('does not mask non-sick categories (e.g. annual or official)', () => {
      const annualLeave = {
        id: 102,
        employee_id: 5,
        category: 'annual',
        reason: 'Cuti mudik keluarga',
        attachment_url: null
      };
      const view = applySickPrivacy(annualLeave, false, 99);
      assert.strictEqual(view.reason, 'Cuti mudik keluarga');
    });
  });

  describe('3. checkDailyThreshold (SPEC §2 #36, §10.2)', () => {
    const thresholds = [
      { id: 1, group_type: 'unit', max_absent_count: 3, max_absent_percent: 25.0, is_active: 1 }
    ];

    it('returns no warning when absent count is below threshold', () => {
      const res = checkDailyThreshold(2, 10, thresholds);
      assert.strictEqual(res.isWarning, false);
    });

    it('triggers warning when absent count reaches max_absent_count', () => {
      const res = checkDailyThreshold(3, 10, thresholds);
      assert.strictEqual(res.isWarning, true);
      assert.strictEqual(res.thresholdLimit, 3);
      assert.match(res.message, /ambang batas maks. 3 orang/);
    });

    it('triggers percentage warning when absent count exceeds percentage threshold', () => {
      const pctThreshold = [
        { id: 2, group_type: 'unit', max_absent_count: null, max_absent_percent: 20.0, is_active: 1 }
      ];
      const res = checkDailyThreshold(3, 10, pctThreshold); // 30% >= 20%
      assert.strictEqual(res.isWarning, true);
      assert.strictEqual(res.thresholdPercent, 20.0);
    });
  });

  describe('4. buildCalendarMatrix', () => {
    const employees = [
      { id: 1, full_name: 'Ahmad Fauzi', employee_number: '19800101', school_unit_id: 1, position_name: 'Guru PAI' },
      { id: 2, full_name: 'Siti Aminah', employee_number: '19880412', school_unit_id: 1, position_name: 'Laboran' }
    ];

    const leaves = [
      {
        id: 1,
        employee_id: 1,
        leave_type: 'cuti_tahunan',
        leave_type_name: 'Cuti Tahunan',
        category: 'annual',
        color: '#059669',
        start_date: '2026-10-05',
        end_date: '2026-10-07',
        duration_days: 3,
        status: 'approved'
      },
      {
        id: 2,
        employee_id: 2,
        leave_type: 'sakit',
        leave_type_name: 'Sakit',
        category: 'sick',
        color: '#ba1a1a',
        start_date: '2026-10-05',
        end_date: '2026-10-05',
        duration_days: 1,
        reason: 'Demam tinggi',
        status: 'approved'
      }
    ];

    const overtimes = [
      {
        id: 10,
        employee_id: 1,
        overtime_date: '2026-10-10',
        hours: 3.0,
        payable_hours: 3.0,
        status: 'approved',
        task_description: 'Piket malam',
        day_type: 'weekend'
      }
    ];

    const holidays = [
      { id: 1, name: 'Maulid Nabi', holiday_date: '2026-10-14', is_off: 1 }
    ];

    it('builds full monthly grid with leaves, overtimes, and holidays', () => {
      const matrix = buildCalendarMatrix({
        month: '2026-10',
        employees,
        leaves,
        overtimes,
        holidays,
        thresholds: [{ max_absent_count: 2, is_active: 1 }],
        isHr: true
      });

      assert.strictEqual(matrix.month, '2026-10');
      assert.strictEqual(matrix.total_employees, 2);
      assert.strictEqual(matrix.employees.length, 2);

      // Check employee 1 leaves on 2026-10-05
      const emp1Days = matrix.employees[0].days;
      assert.strictEqual(emp1Days['2026-10-05'].leaves.length, 1);
      assert.strictEqual(emp1Days['2026-10-05'].leaves[0].leave_type_code, 'cuti_tahunan');

      // Check holiday on 2026-10-14
      assert.strictEqual(emp1Days['2026-10-14'].holiday.name, 'Maulid Nabi');

      // Check overtime on 2026-10-10
      assert.strictEqual(emp1Days['2026-10-10'].overtimes.length, 1);
      assert.strictEqual(emp1Days['2026-10-10'].overtimes[0].hours, 3.0);

      // Check daily summary and threshold warning on 2026-10-05 (2 absent >= threshold 2)
      const day5Summary = matrix.daily_summary['2026-10-05'];
      assert.strictEqual(day5Summary.total_absent, 2);
      assert.ok(day5Summary.warning);
      assert.strictEqual(day5Summary.warning.isWarning, true);
    });

    it('enforces sick privacy inside calendar matrix for non-HR viewer', () => {
      const matrix = buildCalendarMatrix({
        month: '2026-10',
        employees,
        leaves,
        overtimes: [],
        holidays: [],
        isHr: false,
        currentEmployeeId: 1 // Employee 1 viewing
      });

      const emp2Day5 = matrix.employees[1].days['2026-10-05'];
      assert.strictEqual(emp2Day5.leaves[0].category, 'sick');
      assert.strictEqual(emp2Day5.leaves[0].reason, null); // Masked
    });
  });

  describe('5. calculateReportSummary & aggregateByType', () => {
    const leaves = [
      { id: 1, duration_days: 3, status: 'approved', leave_type: 'cuti_tahunan', category: 'annual' },
      { id: 2, duration_days: 2, status: 'approved', leave_type: 'sakit', category: 'sick' },
      { id: 3, duration_days: 1, status: 'pending', leave_type: 'izin_pribadi', category: 'permit' },
      { id: 4, duration_days: 1, status: 'rejected', leave_type: 'cuti_tahunan', category: 'annual' }
    ];

    const overtimes = [
      { id: 1, hours: 4.0, payable_hours: 4.0, estimated_wage: 140000, status: 'approved' }
    ];

    const employees = [{ id: 1 }, { id: 2 }, { id: 3 }];

    it('calculates summary KPIs accurately', () => {
      const summary = calculateReportSummary({
        leaves,
        overtimes,
        employees,
        startDate: '2026-07-01',
        endDate: '2026-12-31'
      });

      assert.strictEqual(summary.total_active_employees, 3);
      assert.strictEqual(summary.total_requests, 4);
      assert.strictEqual(summary.approved_requests, 2);
      assert.strictEqual(summary.pending_requests, 1);
      assert.strictEqual(summary.rejected_requests, 1);
      assert.strictEqual(summary.total_leave_days_taken, 5.0);
      assert.strictEqual(summary.approval_rate_percent, 50.0);
      assert.strictEqual(summary.overtime_total_hours, 4.0);
      assert.strictEqual(summary.overtime_total_estimated_wage, 140000);
    });

    it('aggregates requests by leave type with percentage calculation', () => {
      const byType = aggregateByType({
        leaves: leaves.filter(l => l.status === 'approved'),
        leaveTypes: [
          { code: 'cuti_tahunan', name: 'Cuti Tahunan', category: 'annual' },
          { code: 'sakit', name: 'Sakit', category: 'sick' }
        ]
      });

      assert.strictEqual(byType.grand_total_days, 5.0);
      assert.strictEqual(byType.items.length, 2);

      const annualItem = byType.items.find(i => i.code === 'cuti_tahunan');
      assert.strictEqual(annualItem.total_days, 3.0);
      assert.strictEqual(annualItem.percentage, 60.0); // 3 / 5 = 60%

      const sickItem = byType.items.find(i => i.code === 'sakit');
      assert.strictEqual(sickItem.total_days, 2.0);
      assert.strictEqual(sickItem.percentage, 40.0); // 2 / 5 = 40%
    });
  });

  describe('6. calculateMonthlyTrend & calculateTopAbsent & calculateRecap', () => {
    const leaves = [
      { employee_id: 1, start_date: '2026-07-10', duration_days: 2, category: 'annual', status: 'approved' },
      { employee_id: 1, start_date: '2026-10-15', duration_days: 5, category: 'annual', status: 'approved' },
      { employee_id: 2, start_date: '2026-10-20', duration_days: 3, category: 'sick', status: 'approved' }
    ];

    const employees = [
      { id: 1, full_name: 'Ahmad Fauzi', employee_number: '19800101', school_unit_id: 1, position_name: 'Guru' },
      { id: 2, full_name: 'Siti Aminah', employee_number: '19880412', school_unit_id: 1, position_name: 'Laboran' }
    ];

    const balances = [
      { employee_id: 1, available_balance: 5.0 },
      { employee_id: 2, available_balance: 12.0 }
    ];

    it('calculates monthly trend across multiple months', () => {
      const trend = calculateMonthlyTrend({
        leaves,
        overtimes: [],
        startDate: '2026-07-01',
        endDate: '2026-10-31'
      });

      assert.strictEqual(trend.length, 4); // Jul, Agu, Sep, Okt
      const jul = trend.find(t => t.month === '2026-07');
      assert.strictEqual(jul.total_days, 2.0);
      assert.strictEqual(jul.annual_days, 2.0);

      const okt = trend.find(t => t.month === '2026-10');
      assert.strictEqual(okt.total_days, 8.0); // 5 + 3
      assert.strictEqual(okt.annual_days, 5.0);
      assert.strictEqual(okt.sick_days, 3.0);
    });

    it('calculates top absent ranking', () => {
      const top = calculateTopAbsent({ leaves, employees, limit: 5 });
      assert.strictEqual(top.length, 2);
      assert.strictEqual(top[0].employee_id, 1);
      assert.strictEqual(top[0].total_days, 7.0);
      assert.strictEqual(top[1].employee_id, 2);
      assert.strictEqual(top[1].total_days, 3.0);
    });

    it('calculates detailed tabular recap per employee with balance integration', () => {
      const recap = calculateRecap({
        employees,
        leaves,
        overtimes: [{ employee_id: 1, hours: 6.0, payable_hours: 6.0, status: 'approved' }],
        balances
      });

      assert.strictEqual(recap.length, 2);

      const emp1 = recap.find(r => r.employee_id === 1);
      assert.strictEqual(emp1.annual_leave_days, 7.0);
      assert.strictEqual(emp1.sick_days, 0);
      assert.strictEqual(emp1.total_absent_days, 7.0);
      assert.strictEqual(emp1.overtime_payable_hours, 6.0);
      assert.strictEqual(emp1.remaining_annual_balance, 5.0);

      const emp2 = recap.find(r => r.employee_id === 2);
      assert.strictEqual(emp2.sick_days, 3.0);
      assert.strictEqual(emp2.remaining_annual_balance, 12.0);
    });
  });
});
