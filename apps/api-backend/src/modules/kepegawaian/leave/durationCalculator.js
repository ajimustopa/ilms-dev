/**
 * Pure Duration Calculator Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms strictly to SPEC-CUTI-LEMBUR.md §4, §2 #6-7, #32, §8.1
 * Zero database, clock, or process timezone dependencies
 */

const { dateRange, addDays, getDayOfWeek, diffInDays, parseDate } = require('./dateHelper');

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
 * Resolves period key for a given date string and period start month.
 * e.g., periodStartMonth = 7 (basis Jul-Jun):
 * '2026-10-05' -> '2026/2027'
 * '2027-02-28' -> '2026/2027'
 * '2026-04-10' -> '2025/2026'
 *
 * e.g., periodStartMonth = 1 (basis kalender):
 * '2026-10-05' -> '2026'
 * '2027-02-28' -> '2027'
 */
function periodOf(dateStr, periodStartMonth = 7) {
  const { year, month } = parseDate(dateStr);
  const startM = Number(periodStartMonth) || 1;

  if (startM === 1) {
    return String(year);
  }

  if (month >= startM) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

/**
 * Pure calculation of leave duration & day-by-day breakdown (SPEC §4.2)
 *
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate - YYYY-MM-DD
 * @param {string} [params.startPortion='full'] - 'full' | 'am' | 'pm'
 * @param {string} [params.endPortion='full'] - 'full' | 'am' | 'pm'
 * @param {string} [params.countMode='work_days'] - 'work_days' | 'calendar_days'
 * @param {Object} [params.dayFacts={}] - Map of dateStr -> { scheduleState: 'WORKDAY'|'NONWORKDAY'|'NO_ASSIGNMENT'|'FLEXIBLE', offHolidays: [...] }
 * @param {string} [params.flexibleDayRule='mon_fri'] - 'mon_fri' | 'mon_sat'
 * @param {number|Function} [params.periodStartMonth=7] - Period start month or periodOf function
 * @param {boolean} [params.holidayInsideCalendarCounted=true] - Whether off holidays are counted in calendar_days mode
 * @returns {{ total: number, breakdown: Array, byPeriod: Object, warnings: Array<string> }}
 */
function computeDuration({
  startDate,
  endDate,
  startPortion = 'full',
  endPortion = 'full',
  countMode = 'work_days',
  dayFacts = {},
  flexibleDayRule = 'mon_fri',
  periodStartMonth = 7,
  periodOf: customPeriodOf = null,
  holidayInsideCalendarCounted = true
}) {
  if (!startDate || !endDate) {
    const err = new Error('Tanggal mulai dan selesai wajib diisi');
    err.code = 'INVALID_RANGE';
    err.statusCode = 422;
    throw err;
  }

  if (diffInDays(startDate, endDate) < 0) {
    const err = new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
    err.code = 'INVALID_RANGE';
    err.statusCode = 422;
    throw err;
  }

  if (!isPortionValid(startPortion) || !isPortionValid(endPortion)) {
    const err = new Error('Porsi cuti harus bernilai full, am, atau pm');
    err.code = 'INVALID_PORTION';
    err.statusCode = 422;
    throw err;
  }

  const isSingleDay = startDate === endDate;

  if (isSingleDay) {
    if (startPortion !== endPortion) {
      const err = new Error('Untuk pengajuan 1 hari, porsi mulai dan selesai harus sama');
      err.code = 'INVALID_PORTION';
      err.statusCode = 422;
      throw err;
    }
  } else {
    if (startPortion === 'am') {
      const err = new Error('Pengajuan multi-hari tidak boleh mulai dari porsi am (pagi saja)');
      err.code = 'INVALID_PORTION';
      err.statusCode = 422;
      throw err;
    }
    if (endPortion === 'pm') {
      const err = new Error('Pengajuan multi-hari tidak boleh berakhir di porsi pm (siang saja)');
      err.code = 'INVALID_PORTION';
      err.statusCode = 422;
      throw err;
    }
  }

  const allDates = dateRange(startDate, endDate);
  const breakdown = [];
  const byPeriod = {};
  const warnings = [];

  let hasFlexibleWarning = false;
  let total = 0;

  const resolvePeriod = typeof customPeriodOf === 'function'
    ? customPeriodOf
    : (d) => periodOf(d, periodStartMonth);

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
    const holidayName = hasOffHoliday ? offHolidays.map(h => h.name).join('; ') : null;

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
          // Weekend / non-workday takes precedence over holiday (no double deduction)
          state = 'WEEKEND_OFF';
        } else if (hasOffHoliday) {
          state = 'HOLIDAY_OFF';
        } else {
          state = 'COUNTED';
        }
      }
    }

    const contribution = state === 'COUNTED' ? weight : 0;
    const periodKey = resolvePeriod(d);

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

  const allNoSchedule = breakdown.length > 0 && breakdown.every((b) => b.state === 'NO_SCHEDULE');
  if (allNoSchedule) {
    const err = new Error('Tidak ada penugasan jadwal kerja pada rentang tanggal yang dipilih');
    err.code = 'NO_SCHEDULE_ASSIGNMENT';
    err.statusCode = 422;
    throw err;
  }

  if (total === 0) {
    const err = new Error('Tidak ada hari kerja efektif yang dapat dihitung dalam rentang tanggal ini');
    err.code = 'NO_WORKING_DAYS';
    err.statusCode = 422;
    throw err;
  }

  // Round numbers to 1 decimal place to prevent floating point inaccuracies
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
 * Pure helper to compute end date given start date and target number of counted days (SPEC §4.2)
 *
 * @param {Object} params
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {number} params.targetDays - Number of days to reach
 * @param {string} [params.countMode='work_days'] - 'work_days' | 'calendar_days'
 * @param {Object} [params.dayFacts={}] - Map of dateStr -> { scheduleState, offHolidays }
 * @param {string} [params.flexibleDayRule='mon_fri']
 * @param {boolean} [params.holidayInsideCalendarCounted=true]
 * @returns {string} - Computed end date string YYYY-MM-DD
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
    // Exact calendar days calculation: start + targetDays - 1
    return addDays(startDate, Math.ceil(targetDays) - 1);
  }

  // For work_days: iterate date by date until accumulated COUNTED days >= targetDays
  let accumulated = 0;
  let curr = startDate;
  let maxLoop = 1000; // safety ceiling

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
  computeLeaveDuration: computeDuration,
  computeEndDate,
  periodOf,
  PORTION_WEIGHTS,
  isFlexibleWorkDay
};
