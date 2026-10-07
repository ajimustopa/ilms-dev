/**
 * Pure Duration Calculator Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §4
 */

const { dateRange, addDays, getDayOfWeek, diffInDays } = require('./dateHelper');

const PORTION_WEIGHTS = {
  full: 1.0,
  am: 0.5,
  pm: 0.5
};

function isPortionValid(portion) {
  return portion === 'full' || portion === 'am' || portion === 'pm';
}

function isFlexibleWorkDay(dateStr, rule = 'mon_fri') {
  const dow = getDayOfWeek(dateStr);
  if (rule === 'mon_fri') {
    return dow !== 'saturday' && dow !== 'sunday';
  }
  return dow !== 'sunday';
}

/**
 * Pure calculation of leave duration & day-by-day breakdown
 */
function computeDuration({
  startDate,
  endDate,
  startPortion = 'full',
  endPortion = 'full',
  countMode = 'work_days',
  dayFacts = {},
  flexibleDayRule = 'mon_fri',
  periodOf = (d) => d.slice(0, 4),
  holidayInsideCalendarCounted = true
}) {
  if (!startDate || !endDate) {
    const err = new Error('Tanggal mulai dan selesai wajib diisi');
    err.code = 'INVALID_RANGE';
    throw err;
  }

  if (diffInDays(startDate, endDate) < 0) {
    const err = new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
    err.code = 'INVALID_RANGE';
    throw err;
  }

  if (!isPortionValid(startPortion) || !isPortionValid(endPortion)) {
    const err = new Error('Porsi cuti harus full, am, atau pm');
    err.code = 'INVALID_PORTION';
    throw err;
  }

  const isSingleDay = startDate === endDate;

  if (isSingleDay) {
    if (startPortion !== endPortion) {
      const err = new Error('Untuk pengajuan 1 hari, porsi mulai dan selesai harus sama');
      err.code = 'INVALID_PORTION';
      throw err;
    }
  } else {
    if (startPortion === 'am') {
      const err = new Error('Pengajuan multi-hari tidak boleh mulai dari porsi am (pagi saja)');
      err.code = 'INVALID_PORTION';
      throw err;
    }
    if (endPortion === 'pm') {
      const err = new Error('Pengajuan multi-hari tidak boleh berakhir di porsi pm (siang saja)');
      err.code = 'INVALID_PORTION';
      throw err;
    }
  }

  const allDates = dateRange(startDate, endDate);
  const breakdown = [];
  const byPeriod = {};
  const warnings = [];

  let hasFlexibleWarning = false;
  let total = 0;

  for (const d of allDates) {
    let weight = 1.0;
    if (isSingleDay) {
      weight = PORTION_WEIGHTS[startPortion];
    } else {
      if (d === startDate) {
        weight = startPortion === 'pm' ? 0.5 : 1.0;
      } else if (d === endDate) {
        weight = endPortion === 'am' ? 0.5 : 1.0;
      } else {
        weight = 1.0;
      }
    }

    const fact = dayFacts[d] || { scheduleState: 'NO_ASSIGNMENT', offHolidays: [] };
    const offHolidays = fact.offHolidays || [];
    const hasOffHoliday = offHolidays.length > 0;
    const holidayName = hasOffHoliday ? offHolidays[0].name : null;

    let state = 'COUNTED';

    if (countMode === 'calendar_days') {
      if (hasOffHoliday && !holidayInsideCalendarCounted) {
        state = 'HOLIDAY_OFF';
      } else {
        state = 'COUNTED';
      }
    } else {
      // work_days
      const s = fact.scheduleState || 'NO_ASSIGNMENT';
      if (s === 'NO_ASSIGNMENT') {
        state = 'NO_SCHEDULE';
      } else {
        let isWork = false;
        if (s === 'WORKDAY') {
          isWork = true;
        } else if (s === 'FLEXIBLE') {
          isWork = isFlexibleWorkDay(d, flexibleDayRule);
          if (!hasFlexibleWarning) {
            warnings.push('FLEXIBLE_SCHEDULE_RULE_APPLIED');
            hasFlexibleWarning = true;
          }
        }

        if (!isWork) {
          // Weekend / non-workday takes precedence over holiday
          state = 'WEEKEND_OFF';
        } else if (hasOffHoliday) {
          state = 'HOLIDAY_OFF';
        } else {
          state = 'COUNTED';
        }
      }
    }

    const contribution = state === 'COUNTED' ? weight : 0;
    const periodKey = typeof periodOf === 'function' ? periodOf(d) : String(periodOf);

    total += contribution;

    if (contribution > 0) {
      byPeriod[periodKey] = (byPeriod[periodKey] || 0) + contribution;
    }

    breakdown.push({
      date: d,
      state,
      weight: contribution,
      period: periodKey,
      holiday_name: holidayName
    });
  }

  const allNoSchedule = breakdown.length > 0 && breakdown.every(b => b.state === 'NO_SCHEDULE');
  if (allNoSchedule) {
    const err = new Error('Tidak ada penugasan jadwal kerja pada rentang tanggal yang dipilih');
    err.code = 'NO_SCHEDULE_ASSIGNMENT';
    throw err;
  }

  if (total === 0) {
    const err = new Error('Tidak ada hari kerja efektif yang dapat dihitung dalam rentang tanggal ini');
    err.code = 'NO_WORKING_DAYS';
    throw err;
  }

  // Round total to 1 decimal place to prevent floating point inaccuracies
  total = Math.round(total * 10) / 10;
  for (const k of Object.keys(byPeriod)) {
    byPeriod[k] = Math.round(byPeriod[k] * 10) / 10;
  }

  return {
    total,
    breakdown,
    byPeriod,
    warnings
  };
}

/**
 * Pure helper to compute end date given start date and target number of counted days
 */
function computeEndDate({
  startDate,
  targetDays,
  countMode = 'work_days',
  dayFacts = {},
  flexibleDayRule = 'mon_fri',
  holidayInsideCalendarCounted = true
}) {
  if (!startDate || targetDays <= 0) {
    throw new Error('startDate and positive targetDays are required');
  }

  if (countMode === 'calendar_days') {
    return addDays(startDate, Math.ceil(targetDays) - 1);
  }

  // For work_days: find the date that reaches targetDays
  let accumulated = 0;
  let curr = startDate;
  let maxLoop = 500; // safety ceiling

  while (maxLoop-- > 0) {
    const fact = dayFacts[curr] || { scheduleState: 'WORKDAY', offHolidays: [] };
    const s = fact.scheduleState || 'WORKDAY';
    const hasOffHoliday = (fact.offHolidays || []).length > 0;

    let isWork = false;
    if (s === 'WORKDAY') isWork = true;
    else if (s === 'FLEXIBLE') isWork = isFlexibleWorkDay(curr, flexibleDayRule);

    if (isWork && !hasOffHoliday) {
      accumulated += 1.0;
      if (accumulated >= targetDays) {
        return curr;
      }
    }
    curr = addDays(curr, 1);
  }

  return curr;
}

module.exports = {
  computeDuration,
  computeEndDate,
  PORTION_WEIGHTS,
  isFlexibleWorkDay
};
