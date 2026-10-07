/**
 * Pure Date Helper for Core Aldepos Leave & Attendance Engine
 * Rules:
 * - Operates purely on YYYY-MM-DD strings to avoid UTC/timezone skew
 * - "Today" is resolved via todayWIB(overrideTime)
 */

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function todayWIB(overrideTime = null) {
  if (overrideTime) {
    if (typeof overrideTime === 'string') {
      if (overrideTime.length === 10) return overrideTime;
      const d = new Date(overrideTime);
      return formatDateParts(d, 'Asia/Jakarta');
    }
    if (overrideTime instanceof Date) {
      return formatDateParts(overrideTime, 'Asia/Jakarta');
    }
  }
  return formatDateParts(new Date(), 'Asia/Jakarta');
}

function formatDateParts(dateObj, timeZone = 'Asia/Jakarta') {
  // Use Intl.DateTimeFormat to reliably extract year, month, day in target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj); // Returns YYYY-MM-DD
}

function parseDate(dateInput) {
  if (!dateInput) {
    throw new Error(`Invalid date string: ${dateInput}`);
  }
  let dateStr = dateInput;
  if (dateInput instanceof Date) {
    dateStr = formatDateParts(dateInput, 'Asia/Jakarta');
  } else if (typeof dateInput === 'string' && dateInput.length > 10) {
    dateStr = dateInput.slice(0, 10);
  }
  if (typeof dateStr !== 'string') {
    throw new Error(`Invalid date string: ${dateInput}`);
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Date must be in YYYY-MM-DD format: ${dateStr}`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return { year, month, day };
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDays(dateStr, days) {
  const { year, month, day } = parseDate(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function diffInDays(startDateStr, endDateStr) {
  const { year: y1, month: m1, day: d1 } = parseDate(startDateStr);
  const { year: y2, month: m2, day: d2 } = parseDate(endDateStr);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function dateRange(startDateStr, endDateStr) {
  const diff = diffInDays(startDateStr, endDateStr);
  if (diff < 0) return [];
  const result = [];
  for (let i = 0; i <= diff; i++) {
    result.push(addDays(startDateStr, i));
  }
  return result;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayOfWeek(dateStr) {
  const { year, month, day } = parseDate(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return DAY_NAMES[d.getUTCDay()];
}

function isWeekend(dateStr) {
  const dow = getDayOfWeek(dateStr);
  return dow === 'saturday' || dow === 'sunday';
}

function formatDbDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return formatDateParts(val, 'Asia/Jakarta');
  }
  if (typeof val === 'string') {
    return val.substring(0, 10);
  }
  return String(val);
}

module.exports = {
  todayWIB,
  parseDate,
  formatDate,
  formatDbDate,
  formatDateParts,
  addDays,
  diffInDays,
  dateRange,
  getDayOfWeek,
  isWeekend
};
