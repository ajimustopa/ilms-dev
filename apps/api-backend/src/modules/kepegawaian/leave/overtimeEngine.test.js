/**
 * Unit Test: Pure Overtime Calculation Engine
 * Modul Kepegawaian - Core Aldepos
 * Run with: node --test src/modules/kepegawaian/leave/overtimeEngine.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyDayType,
  getWeekRangeMondayToSunday,
  checkOvertimeLimits,
  timeToMinutes,
  computePayableHours,
  computeMultiplierBreakdown,
  estimateWage,
  checkLeaveOvertimeConflict
} = require('./overtimeEngine');

describe('OvertimeEngine - Pure Function Tests (SPEC §7 & §2 #18-22)', () => {
  describe('1. classifyDayType', () => {
    test('returns holiday when off holiday is present', () => {
      const dayType = classifyDayType('2026-10-14', 'WORKDAY', [{ id: 1, is_off_day: 1, name: 'Hari Libur Nasional' }]);
      assert.equal(dayType, 'holiday');
    });

    test('returns weekend when scheduleState is NONWORKDAY', () => {
      const dayType = classifyDayType('2026-10-10', 'NONWORKDAY', []);
      assert.equal(dayType, 'weekend');
    });

    test('returns workday when scheduleState is WORKDAY and no holiday', () => {
      const dayType = classifyDayType('2026-10-06', 'WORKDAY', []);
      assert.equal(dayType, 'workday');
    });

    test('returns weekend for unassigned Saturday or Sunday', () => {
      // 2026-10-11 is Sunday
      const dayTypeSun = classifyDayType('2026-10-11', 'NO_ASSIGNMENT', []);
      assert.equal(dayTypeSun, 'weekend');
      // 2026-10-07 is Wednesday
      const dayTypeWed = classifyDayType('2026-10-07', 'NO_ASSIGNMENT', []);
      assert.equal(dayTypeWed, 'workday');
    });
  });

  describe('2. getWeekRangeMondayToSunday & checkOvertimeLimits', () => {
    test('calculates correct Monday to Sunday weekly boundary', () => {
      // 2026-10-07 is Wednesday
      const range = getWeekRangeMondayToSunday('2026-10-07');
      assert.equal(range.monday, '2026-10-05');
      assert.equal(range.sunday, '2026-10-11');

      // 2026-10-11 is Sunday (same week)
      const rangeSun = getWeekRangeMondayToSunday('2026-10-11');
      assert.equal(rangeSun.monday, '2026-10-05');
      assert.equal(rangeSun.sunday, '2026-10-11');

      // 2026-10-12 is Monday (next week)
      const rangeNextMon = getWeekRangeMondayToSunday('2026-10-12');
      assert.equal(rangeNextMon.monday, '2026-10-12');
      assert.equal(rangeNextMon.sunday, '2026-10-18');
    });

    test('enforces daily limit (max 4.0 hours)', () => {
      const policy = { max_hours_per_day: 4.0, max_hours_per_week: 18.0, max_hours_per_month: 72.0 };
      
      // Requesting 4.5h on empty day
      const res1 = checkOvertimeLimits([], 4.5, policy, '2026-10-06');
      assert.equal(res1.valid, false);
      assert.equal(res1.daily.exceeded, true);
      assert.match(res1.errors[0], /Batas lembur harian/);

      // Existing 2h, requesting 2h -> total 4h (valid)
      const existing = [{ overtime_date: '2026-10-06', hours: 2.0, status: 'approved' }];
      const res2 = checkOvertimeLimits(existing, 2.0, policy, '2026-10-06');
      assert.equal(res2.valid, true);

      // Existing 2h, requesting 2.5h -> total 4.5h (exceeded)
      const res3 = checkOvertimeLimits(existing, 2.5, policy, '2026-10-06');
      assert.equal(res3.valid, false);
      assert.equal(res3.daily.exceeded, true);
    });

    test('enforces weekly limit (max 18.0 hours across Mon-Sun)', () => {
      const policy = { max_hours_per_day: 4.0, max_hours_per_week: 18.0, max_hours_per_month: 72.0 };
      const existing = [
        { overtime_date: '2026-10-05', hours: 4.0, status: 'approved' },
        { overtime_date: '2026-10-06', hours: 4.0, status: 'approved' },
        { overtime_date: '2026-10-07', hours: 4.0, status: 'approved' },
        { overtime_date: '2026-10-08', hours: 4.0, status: 'approved' }
      ]; // total 16h

      // Requesting 2h on Friday 2026-10-09 -> total 18h (valid)
      const res1 = checkOvertimeLimits(existing, 2.0, policy, '2026-10-09');
      assert.equal(res1.valid, true);

      // Requesting 3h on Friday 2026-10-09 -> total 19h (weekly exceeded)
      const res2 = checkOvertimeLimits(existing, 3.0, policy, '2026-10-09');
      assert.equal(res2.valid, false);
      assert.equal(res2.weekly.exceeded, true);

      // Overtime on previous Sunday 2026-10-04 is ignored for 2026-10-09 week
      const withPrevWeek = [
        ...existing,
        { overtime_date: '2026-10-04', hours: 4.0, status: 'approved' }
      ];
      const res3 = checkOvertimeLimits(withPrevWeek, 2.0, policy, '2026-10-09');
      assert.equal(res3.valid, true);
    });

    test('ignores cancelled and rejected overtimes', () => {
      const policy = { max_hours_per_day: 4.0, max_hours_per_week: 18.0, max_hours_per_month: 72.0 };
      const existing = [
        { overtime_date: '2026-10-06', hours: 3.5, status: 'rejected' },
        { overtime_date: '2026-10-06', hours: 4.0, status: 'cancelled' }
      ];
      const res = checkOvertimeLimits(existing, 3.0, policy, '2026-10-06');
      assert.equal(res.valid, true);
      assert.equal(res.daily.current, 0);
    });
  });

  describe('3. computePayableHours & Attendance Reconciliation', () => {
    test('computes planned hours directly when actual attendance is not required', () => {
      const res = computePayableHours({
        windowStart: '17:00',
        windowEnd: '20:00',
        requiresAttendance: false,
        policy: { rounding_minutes: 30, min_payable_minutes: 30 }
      });
      assert.equal(res.payableHours, 3.0);
      assert.equal(res.payableMinutes, 180);
      assert.equal(res.realizationStatus, 'matched');
    });

    test('reconciles workday overtime with schedule and checkout', () => {
      // Regular schedule ends at 16:00. Overtime window 17:00..20:00.
      // Actual checkout at 20:00.
      const res = computePayableHours({
        windowStart: '17:00',
        windowEnd: '20:00',
        scheduleEnd: '16:00',
        actualCheckIn: '07:30',
        actualCheckOut: '20:00',
        dayType: 'workday',
        requiresAttendance: true
      });
      assert.equal(res.payableHours, 3.0);
      assert.equal(res.realizationStatus, 'matched');
    });

    test('applies 15-minute tolerance for checkout before window end', () => {
      // Window ends 20:00, checkout at 19:48 (12 mins early -> within 15 min tolerance)
      const res = computePayableHours({
        windowStart: '17:00',
        windowEnd: '20:00',
        scheduleEnd: '16:00',
        actualCheckIn: '07:30',
        actualCheckOut: '19:48',
        dayType: 'workday',
        requiresAttendance: true
      });
      assert.equal(res.payableHours, 3.0);
      assert.equal(res.realizationStatus, 'matched');
    });

    test('handles partial checkout and 30-minute rounding', () => {
      // Window 17:00..20:00 (180 mins). Checkout at 18:40 (100 mins raw).
      // Rounded down to 30 mins -> 90 mins = 1.5h
      const res = computePayableHours({
        windowStart: '17:00',
        windowEnd: '20:00',
        scheduleEnd: '16:00',
        actualCheckIn: '07:30',
        actualCheckOut: '18:40',
        dayType: 'workday',
        requiresAttendance: true,
        policy: { rounding_minutes: 30, min_payable_minutes: 30 }
      });
      assert.equal(res.rawMinutes, 100);
      assert.equal(res.payableMinutes, 90);
      assert.equal(res.payableHours, 1.5);
      assert.equal(res.realizationStatus, 'partial');
    });

    test('enforces minimum 30-minute payable threshold', () => {
      // Window 17:00..20:00. Checkout at 17:20 (20 mins raw < 30 mins threshold)
      const res = computePayableHours({
        windowStart: '17:00',
        windowEnd: '20:00',
        scheduleEnd: '16:00',
        actualCheckIn: '07:30',
        actualCheckOut: '17:20',
        dayType: 'workday',
        requiresAttendance: true,
        policy: { rounding_minutes: 30, min_payable_minutes: 30 }
      });
      assert.equal(res.rawMinutes, 20);
      assert.equal(res.payableHours, 0);
    });

    test('reconciles weekend/holiday overtime based on presence overlap', () => {
      // Weekend overtime window: 08:00..12:00 (4h).
      // Actual presence: 08:30..11:30 (3h = 180 mins overlap).
      const res = computePayableHours({
        windowStart: '08:00',
        windowEnd: '12:00',
        actualCheckIn: '08:30',
        actualCheckOut: '11:30',
        dayType: 'weekend',
        requiresAttendance: true
      });
      assert.equal(res.payableHours, 3.0);
      assert.equal(res.realizationStatus, 'partial');
    });
  });

  describe('4. computeMultiplierBreakdown (SPEC §2 #19)', () => {
    test('computes workday tiered multipliers correctly (Jam 1 x1.5, Jam 2+ x2.0)', () => {
      // 3 hours on workday:
      // - 0..1h (1.0h) x 1.5 = 1.5
      // - 1..3h (2.0h) x 2.0 = 4.0
      // Total weighted = 5.5
      const res = computeMultiplierBreakdown(3.0, 'workday');
      assert.equal(res.totalHours, 3.0);
      assert.equal(res.totalWeightedHours, 5.5);
      assert.equal(res.breakdown.length, 2);
      assert.equal(res.breakdown[0].weighted_hours, 1.5);
      assert.equal(res.breakdown[1].weighted_hours, 4.0);
    });

    test('computes weekend/holiday tiered multipliers correctly (Jam 1-8 x2.0, Jam 9 x3.0, Jam 10+ x4.0)', () => {
      // 10 hours on weekend:
      // - 0..8h (8.0h) x 2.0 = 16.0
      // - 8..9h (1.0h) x 3.0 = 3.0
      // - 9..10h (1.0h) x 4.0 = 4.0
      // Total weighted = 23.0
      const res = computeMultiplierBreakdown(10.0, 'weekend');
      assert.equal(res.totalHours, 10.0);
      assert.equal(res.totalWeightedHours, 23.0);
      assert.equal(res.breakdown.length, 3);
      assert.equal(res.breakdown[0].weighted_hours, 16.0);
      assert.equal(res.breakdown[1].weighted_hours, 3.0);
      assert.equal(res.breakdown[2].weighted_hours, 4.0);
    });
  });

  describe('5. estimateWage (SPEC §7.4, §2 #19 - No Fake Wage)', () => {
    test('returns null when rate/wage is null, undefined, or empty', () => {
      const breakdown = computeMultiplierBreakdown(3.0, 'workday');
      assert.equal(estimateWage(breakdown, null), null);
      assert.equal(estimateWage(breakdown, undefined), null);
      assert.equal(estimateWage(breakdown, ''), null);
      assert.equal(estimateWage(breakdown, 0), null);
    });

    test('computes flat hourly wage when flat rate is configured', () => {
      const breakdown = computeMultiplierBreakdown(3.0, 'workday'); // 5.5 weighted hours
      const wage = estimateWage(breakdown, 25000); // 5.5 * 25,000 = 137,500
      assert.equal(wage, 137500);
    });

    test('computes monthly divisor wage when monthly wage is provided', () => {
      const breakdown = computeMultiplierBreakdown(3.0, 'workday'); // 5.5 weighted hours
      // Monthly 5,190,000 / 173 = 30,000 / hour
      // 5.5 * 30,000 = 165,000
      const wage = estimateWage(breakdown, null, 5190000, 'monthly_wage_divisor', 173);
      assert.equal(wage, 165000);
    });
  });

  describe('6. checkLeaveOvertimeConflict', () => {
    test('detects conflict with active full-day leave', () => {
      const leaves = [
        { start_date: '2026-10-06', end_date: '2026-10-06', start_portion: 'full', status: 'approved' }
      ];
      const res = checkLeaveOvertimeConflict(leaves, '2026-10-06');
      assert.equal(res.hasConflict, true);
      assert.equal(res.isFullDay, true);
      assert.match(res.message, /Konflik jadwal/);
    });

    test('allows overtime when leave is half-day with warning', () => {
      const leaves = [
        { start_date: '2026-10-06', end_date: '2026-10-06', start_portion: 'am', status: 'approved' }
      ];
      const res = checkLeaveOvertimeConflict(leaves, '2026-10-06');
      assert.equal(res.hasConflict, false);
      assert.equal(res.isFullDay, false);
    });

    test('ignores cancelled or rejected leaves', () => {
      const leaves = [
        { start_date: '2026-10-06', end_date: '2026-10-06', start_portion: 'full', status: 'cancelled' }
      ];
      const res = checkLeaveOvertimeConflict(leaves, '2026-10-06');
      assert.equal(res.hasConflict, false);
    });
  });
});
