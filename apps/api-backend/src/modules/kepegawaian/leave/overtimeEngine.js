/**
 * Pure Overtime Calculation Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #18-22, §7 (seluruh), §8.3, §10.1, §10.2, §11.4, §12
 * 
 * Rules:
 * - 100% Pure functions without database or system clock access
 * - Handles day classification, limits check, payable hours, tiered multiplier breakdown, and wage estimation
 */

const { parseDate, addDays, getDayOfWeek, isWeekend, formatDbDate } = require('./dateHelper');

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

/**
 * Default tier definitions if not supplied from DB
 * SPEC §2 #19:
 * - Hari kerja: jam ke-1 x1.5, jam ke-2+ x2.0
 * - Akhir pekan / libur: jam 1-8 x2.0, jam 9 x3.0, jam 10-11 x4.0
 */
const DEFAULT_TIERS = {
  workday: [
    { from_hour: 0.0, to_hour: 1.0, multiplier: 1.5 },
    { from_hour: 1.0, to_hour: null, multiplier: 2.0 }
  ],
  weekend: [
    { from_hour: 0.0, to_hour: 8.0, multiplier: 2.0 },
    { from_hour: 8.0, to_hour: 9.0, multiplier: 3.0 },
    { from_hour: 9.0, to_hour: null, multiplier: 4.0 }
  ],
  holiday: [
    { from_hour: 0.0, to_hour: 8.0, multiplier: 2.0 },
    { from_hour: 8.0, to_hour: 9.0, multiplier: 3.0 },
    { from_hour: 9.0, to_hour: null, multiplier: 4.0 }
  ]
};

/**
 * Classify Day Type
 * SPEC §7.2:
 * 'holiday' if off holiday matches employee; 'weekend' if non-workday; otherwise 'workday'
 */
function classifyDayType(dateStr, scheduleState = 'WORKDAY', offHolidays = []) {
  if (Array.isArray(offHolidays) && offHolidays.length > 0) {
    const hasOffDay = offHolidays.some(h => h.is_off_day !== false && h.is_off_day !== 0);
    if (hasOffDay) return 'holiday';
  } else if (offHolidays === true) {
    return 'holiday';
  }

  if (scheduleState === 'NONWORKDAY') {
    return 'weekend';
  }

  if (scheduleState === 'NO_ASSIGNMENT' || !scheduleState) {
    if (isWeekend(dateStr)) return 'weekend';
  }

  return 'workday';
}

/**
 * Get Monday and Sunday of the week for a given date
 * SPEC §7.4: Monday to Sunday weekly boundary
 */
function getWeekRangeMondayToSunday(dateStr) {
  const { year, month, day } = parseDate(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  
  const mondayDate = new Date(d);
  mondayDate.setUTCDate(d.getUTCDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);

  const formatUtc = (dt) => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;

  return {
    monday: formatUtc(mondayDate),
    sunday: formatUtc(sundayDate)
  };
}

/**
 * Check Overtime Limits
 * SPEC §7.4:
 * - Harian: max 4.0 jam
 * - Mingguan (Senin–Minggu): max 18.0 jam
 * - Bulanan: max 72.0 jam
 */
function checkOvertimeLimits(existingOvertimes = [], newHours = 0, policy = {}, targetDateStr = '') {
  const maxDaily = parseFloat(policy.max_hours_per_day) || 4.0;
  const maxWeekly = parseFloat(policy.max_hours_per_week) || 18.0;
  const maxMonthly = parseFloat(policy.max_hours_per_month) || 72.0;

  const addedHours = parseFloat(newHours) || 0;

  const { monday, sunday } = getWeekRangeMondayToSunday(targetDateStr);
  const targetYearMonth = targetDateStr.slice(0, 7); // 'YYYY-MM'

  let currentDaily = 0;
  let currentWeekly = 0;
  let currentMonthly = 0;

  for (const ot of existingOvertimes) {
    if (['cancelled', 'rejected'].includes(ot.status)) continue;
    const otDate = typeof ot.overtime_date === 'string' ? ot.overtime_date.slice(0, 10) : '';
    const hours = parseFloat(ot.payable_hours != null ? ot.payable_hours : ot.hours) || 0;

    if (otDate === targetDateStr) {
      currentDaily += hours;
    }
    if (otDate >= monday && otDate <= sunday) {
      currentWeekly += hours;
    }
    if (otDate.startsWith(targetYearMonth)) {
      currentMonthly += hours;
    }
  }

  const totalDaily = currentDaily + addedHours;
  const totalWeekly = currentWeekly + addedHours;
  const totalMonthly = currentMonthly + addedHours;

  const dailyExceeded = totalDaily > maxDaily;
  const weeklyExceeded = totalWeekly > maxWeekly;
  const monthlyExceeded = totalMonthly > maxMonthly;

  const errors = [];
  if (dailyExceeded) {
    errors.push(`Batas lembur harian (${maxDaily} jam) terlampaui: total menjadi ${totalDaily.toFixed(1)} jam`);
  }
  if (weeklyExceeded) {
    errors.push(`Batas lembur mingguan (${maxWeekly} jam) terlampaui: total minggu ini menjadi ${totalWeekly.toFixed(1)} jam`);
  }
  if (monthlyExceeded) {
    errors.push(`Batas lembur bulanan (${maxMonthly} jam) terlampaui: total bulan ini menjadi ${totalMonthly.toFixed(1)} jam`);
  }

  return {
    valid: errors.length === 0,
    daily: { current: currentDaily, requested: addedHours, total: totalDaily, limit: maxDaily, exceeded: dailyExceeded },
    weekly: { current: currentWeekly, requested: addedHours, total: totalWeekly, limit: maxWeekly, exceeded: weeklyExceeded },
    monthly: { current: currentMonthly, requested: addedHours, total: totalMonthly, limit: maxMonthly, exceeded: monthlyExceeded },
    errors
  };
}

/**
 * Convert time string HH:mm or HH:mm:ss to minutes from 00:00
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Compute Payable Hours with actual attendance reconciliation
 * SPEC §7.3, §2 #20:
 * - Hari kerja: lembur nyata = check_out - MAX(akhir jam kerja terjadwal, awal jendela), dibatasi jendela disetujui.
 * - Hari non-kerja/libur: irisan check_in…check_out dengan jendela.
 * - Pembulatan 30 menit, minimum 30 menit, toleransi 15 menit.
 */
function computePayableHours({
  windowStart,
  windowEnd,
  actualCheckIn = null,
  actualCheckOut = null,
  scheduleStart = null,
  scheduleEnd = null,
  dayType = 'workday',
  requiresAttendance = true,
  policy = {}
}) {
  const winStartMin = timeToMinutes(windowStart);
  const winEndMin = timeToMinutes(windowEnd);

  const roundingMin = parseInt(policy.rounding_minutes, 10) || 30;
  const minPayableMin = parseInt(policy.min_payable_minutes, 10) || 30;

  if (winStartMin == null || winEndMin == null || winEndMin <= winStartMin) {
    return {
      rawMinutes: 0,
      payableMinutes: 0,
      payableHours: 0,
      realizationStatus: 'no_attendance'
    };
  }

  const plannedMinutes = winEndMin - winStartMin;

  if (!requiresAttendance) {
    const payableMin = Math.floor(plannedMinutes / roundingMin) * roundingMin;
    return {
      rawMinutes: plannedMinutes,
      payableMinutes: payableMin,
      payableHours: payableMin >= minPayableMin ? payableMin / 60 : 0,
      realizationStatus: 'matched'
    };
  }

  const actInMin = timeToMinutes(actualCheckIn);
  const actOutMin = timeToMinutes(actualCheckOut);

  if (actInMin == null && actOutMin == null) {
    return {
      rawMinutes: 0,
      payableMinutes: 0,
      payableHours: 0,
      realizationStatus: 'no_attendance'
    };
  }

  let rawMinutes = 0;
  let realizationStatus = 'matched';

  if (dayType === 'workday') {
    const schedEndMin = timeToMinutes(scheduleEnd);
    const effectiveStartMin = Math.max(schedEndMin || 0, winStartMin);
    
    if (actOutMin == null || actOutMin <= effectiveStartMin) {
      rawMinutes = 0;
      realizationStatus = 'no_attendance';
    } else {
      // Tolerance: if checked out within 15 minutes before window end, count full to window end
      let effectiveActOut = actOutMin;
      if (winEndMin - actOutMin <= 15 && actOutMin <= winEndMin) {
        effectiveActOut = winEndMin;
      }
      const cappedOut = Math.min(effectiveActOut, winEndMin);
      
      // If check-in happened after effective start, consider that
      const cappedIn = actInMin != null ? Math.max(actInMin, effectiveStartMin) : effectiveStartMin;
      rawMinutes = Math.max(0, cappedOut - cappedIn);

      if (rawMinutes < plannedMinutes) {
        realizationStatus = rawMinutes > 0 ? 'partial' : 'no_attendance';
      } else {
        realizationStatus = 'matched';
      }
    }
  } else {
    // Weekend / Holiday: intersection of [actIn, actOut] with [winStart, winEnd]
    if (actInMin == null || actOutMin == null || actOutMin <= actInMin) {
      rawMinutes = 0;
      realizationStatus = 'no_attendance';
    } else {
      let effectiveActOut = actOutMin;
      if (winEndMin - actOutMin <= 15 && actOutMin <= winEndMin) {
        effectiveActOut = winEndMin;
      }
      const overlapStart = Math.max(actInMin, winStartMin);
      const overlapEnd = Math.min(effectiveActOut, winEndMin);
      rawMinutes = Math.max(0, overlapEnd - overlapStart);

      if (rawMinutes < plannedMinutes) {
        realizationStatus = rawMinutes > 0 ? 'partial' : 'no_attendance';
      } else {
        realizationStatus = 'matched';
      }
    }
  }

  // Rounding & Minimum Payable
  let payableMin = 0;
  if (rawMinutes >= minPayableMin) {
    payableMin = Math.floor(rawMinutes / roundingMin) * roundingMin;
  }

  return {
    rawMinutes,
    payableMinutes: payableMin,
    payableHours: payableMin / 60,
    realizationStatus
  };
}

/**
 * Compute Multiplier Breakdown based on Tiered Rules
 * SPEC §7.4, §2 #19
 */
function computeMultiplierBreakdown(payableHours = 0, dayType = 'workday', customTiers = []) {
  const hours = parseFloat(payableHours) || 0;
  if (hours <= 0) {
    return {
      totalHours: 0,
      totalWeightedHours: 0,
      breakdown: []
    };
  }

  let tiers = [];
  if (Array.isArray(customTiers) && customTiers.length > 0) {
    tiers = customTiers
      .filter(t => t.day_type === dayType)
      .sort((a, b) => parseFloat(a.from_hour) - parseFloat(b.from_hour));
  }

  if (tiers.length === 0) {
    tiers = DEFAULT_TIERS[dayType] || DEFAULT_TIERS.workday;
  }

  const breakdown = [];
  let totalWeighted = 0;

  for (const tier of tiers) {
    const fromH = parseFloat(tier.from_hour) || 0;
    const toH = tier.to_hour != null ? parseFloat(tier.to_hour) : Infinity;
    const mult = parseFloat(tier.multiplier) || 1.0;

    if (hours > fromH) {
      const tierCapacity = toH - fromH;
      const hoursInTier = Math.min(hours - fromH, tierCapacity);
      const weighted = hoursInTier * mult;

      breakdown.push({
        tier: `${fromH.toFixed(1)}-${toH === Infinity ? '+' : toH.toFixed(1)}h`,
        from_hour: fromH,
        to_hour: toH === Infinity ? null : toH,
        hours: Math.round(hoursInTier * 100) / 100,
        multiplier: mult,
        weighted_hours: Math.round(weighted * 100) / 100
      });

      totalWeighted += weighted;
    }
  }

  return {
    totalHours: Math.round(hours * 100) / 100,
    totalWeightedHours: Math.round(totalWeighted * 100) / 100,
    breakdown
  };
}

/**
 * Estimate Overtime Wage
 * SPEC §7.4, §2 #19:
 * - If no rate or wage source provided -> returns null.
 * - NEVER invent wage rate or default numbers.
 */
function estimateWage(multiplierBreakdown, flatHourlyRate = null, monthlyWage = null, calcMethod = 'flat_hourly', wageDivisor = 173) {
  if (!multiplierBreakdown || multiplierBreakdown.totalWeightedHours <= 0) {
    return null;
  }

  const weightedHours = multiplierBreakdown.totalWeightedHours;

  if (calcMethod === 'flat_hourly') {
    if (flatHourlyRate == null || flatHourlyRate === '' || isNaN(flatHourlyRate) || parseFloat(flatHourlyRate) <= 0) {
      return null;
    }
    const rate = parseFloat(flatHourlyRate);
    return Math.round(weightedHours * rate * 100) / 100;
  }

  if (calcMethod === 'monthly_wage_divisor') {
    if (monthlyWage == null || monthlyWage === '' || isNaN(monthlyWage) || parseFloat(monthlyWage) <= 0) {
      return null;
    }
    const divisor = parseInt(wageDivisor, 10) || 173;
    const hourlyBase = parseFloat(monthlyWage) / divisor;
    return Math.round(weightedHours * hourlyBase * 100) / 100;
  }

  return null;
}

/**
 * Check Leave vs Overtime Conflict
 * SPEC §7.4: Overtime on a full day leave is rejected (OVERTIME_CONFLICT)
 */
function checkLeaveOvertimeConflict(leaveRequests = [], overtimeDateStr = '') {
  const activeLeaves = leaveRequests.filter(l => {
    if (['rejected', 'cancelled'].includes(l.status)) return false;
    const s = formatDbDate(l.start_date);
    const e = formatDbDate(l.end_date);
    return overtimeDateStr >= s && overtimeDateStr <= e;
  });

  if (activeLeaves.length === 0) {
    return { hasConflict: false, isFullDay: false, conflictingLeave: null };
  }

  const isFullDay = activeLeaves.some(l => {
    // If leave spans more than 1 day or has portion full
    if (l.start_portion === 'full' || !l.start_portion) return true;
    return false;
  });

  return {
    hasConflict: isFullDay,
    isFullDay,
    conflictingLeave: activeLeaves[0],
    message: isFullDay 
      ? `Konflik jadwal: Pegawai memiliki cuti/izin aktif pada tanggal ${overtimeDateStr}`
      : `Peringatan: Pegawai memiliki izin setengah hari pada tanggal ${overtimeDateStr}`
  };
}

module.exports = {
  DEFAULT_TIERS,
  classifyDayType,
  getWeekRangeMondayToSunday,
  checkOvertimeLimits,
  timeToMinutes,
  computePayableHours,
  computeMultiplierBreakdown,
  estimateWage,
  checkLeaveOvertimeConflict
};
