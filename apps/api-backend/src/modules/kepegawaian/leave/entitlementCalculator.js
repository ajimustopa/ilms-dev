/**
 * Pure Entitlement & Proration Calculator Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §5
 */

const { parseDate, formatDate, diffInDays, addDays } = require('./dateHelper');

function applyRounding(val, mode = 'floor_half') {
  if (mode === 'floor_half') {
    return Math.floor(val * 2) / 2;
  }
  if (mode === 'ceil_half') {
    return Math.ceil(val * 2) / 2;
  }
  if (mode === 'nearest_half') {
    return Math.round(val * 2) / 2;
  }
  return val;
}

/**
 * Calculates service months between joinDate and targetDate
 */
function calculateServiceMonths(joinDateStr, targetDateStr) {
  if (!joinDateStr || !targetDateStr) return 0;
  const j = parseDate(joinDateStr);
  const t = parseDate(targetDateStr);
  let months = (t.year - j.year) * 12 + (t.month - j.month);
  if (t.day < j.day) {
    months -= 1;
  }
  return Math.max(0, months);
}

/**
 * Computes period date range given period_start_month and reference year/key
 * Example: period_start_month = 7, period_key = '2026/2027' -> start: 2026-07-01, end: 2027-06-30
 * period_start_month = 1, period_key = '2026' -> start: 2026-01-01, end: 2026-12-31
 */
function resolvePeriodRange(periodKey, periodStartMonth = 7) {
  let startYear, endYear;
  if (periodKey.includes('/')) {
    const parts = periodKey.split('/');
    startYear = parseInt(parts[0], 10);
    endYear = parseInt(parts[1], 10);
  } else {
    startYear = parseInt(periodKey, 10);
    endYear = periodStartMonth === 1 ? startYear : startYear + 1;
  }

  const startMonth = periodStartMonth;
  const endMonth = periodStartMonth === 1 ? 12 : periodStartMonth - 1;
  const startDay = 1;
  // Last day of endMonth
  const lastDateOfEndMonth = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();

  return {
    startDate: formatDate(startYear, startMonth, startDay),
    endDate: formatDate(endYear, endMonth, lastDateOfEndMonth)
  };
}

/**
 * Pure function to compute leave entitlement for an employee in a given period
 */
function computeEntitlement({
  joinDate,
  employmentStatus,
  policy = {},
  rules = [],
  period = {}
}) {
  if (!joinDate) {
    return {
      eligible: false,
      code: 'UNKNOWN_JOIN_DATE',
      grantedDays: 0,
      reason: 'Tanggal masuk pegawai belum diisi'
    };
  }

  const periodStartMonth = policy.period_start_month || 7;
  let periodStart = period.start_date;
  let periodEnd = period.end_date;

  if (!periodStart || !periodEnd) {
    const resolved = resolvePeriodRange(period.period_key || '2026/2027', periodStartMonth);
    periodStart = resolved.startDate;
    periodEnd = resolved.endDate;
  }

  // Calculate service months as of period start (or joinDate if joined after)
  const refDate = joinDate > periodStart ? joinDate : periodStart;
  const serviceMonths = calculateServiceMonths(joinDate, refDate);

  if (policy.min_service_months_for_eligibility && serviceMonths < policy.min_service_months_for_eligibility) {
    return {
      eligible: false,
      code: 'ENTITLEMENT_NOT_ELIGIBLE',
      grantedDays: 0,
      reason: 'Masa kerja belum memenuhi syarat minimum kebijakan'
    };
  }

  // Match rule by employmentStatus and serviceMonths
  const empStatusNorm = (employmentStatus || '').trim().toUpperCase();
  const matchingRules = rules.filter(r => {
    const ruleStatus = (r.employment_status || '').trim().toUpperCase();
    const statusMatch = !ruleStatus || ruleStatus === empStatusNorm;
    const minMatch = r.min_service_months == null || serviceMonths >= r.min_service_months;
    const maxMatch = r.max_service_months == null || serviceMonths <= r.max_service_months;
    return statusMatch && minMatch && maxMatch;
  });

  if (matchingRules.length === 0) {
    return {
      eligible: false,
      code: 'ENTITLEMENT_NOT_ELIGIBLE',
      grantedDays: 0,
      reason: `Status kepegawaian ${employmentStatus} tidak memiliki jatah cuti otomatis`
    };
  }

  // Highest priority rule wins
  matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const rule = matchingRules[0];
  const baseDays = parseFloat(rule.days) || 0;

  if (baseDays <= 0) {
    return {
      eligible: false,
      code: 'ENTITLEMENT_NOT_ELIGIBLE',
      grantedDays: 0,
      reason: 'Jatah cuti 0 hari'
    };
  }

  // If joined before period start -> full entitlement
  if (joinDate <= periodStart) {
    return {
      eligible: true,
      code: 'FULL_ENTITLEMENT',
      grantedDays: baseDays,
      activeMonths: 12,
      baseDays,
      ruleId: rule.id
    };
  }

  // If joined after period end -> 0 entitlement for this period
  if (joinDate > periodEnd) {
    return {
      eligible: false,
      code: 'JOINED_AFTER_PERIOD',
      grantedDays: 0,
      reason: 'Pegawai masuk setelah periode berakhir'
    };
  }

  // Proration when joined within period
  const prorationMode = policy.proration_mode || 'monthly';
  if (prorationMode === 'none') {
    return {
      eligible: true,
      code: 'FULL_ENTITLEMENT_NO_PRORATION',
      grantedDays: baseDays,
      activeMonths: 12,
      baseDays,
      ruleId: rule.id
    };
  }

  const { year: jYear, month: jMonth, day: jDay } = parseDate(joinDate);
  const cutoff = policy.proration_join_day_cutoff !== undefined ? policy.proration_join_day_cutoff : 15;

  // Calculate active months remaining in the period
  // Period end date
  const { year: eYear, month: eMonth } = parseDate(periodEnd);

  let startCountMonth = jMonth;
  let startCountYear = jYear;

  if (jDay > cutoff) {
    startCountMonth += 1;
    if (startCountMonth > 12) {
      startCountMonth = 1;
      startCountYear += 1;
    }
  }

  const activeMonths = Math.max(0, (eYear - startCountYear) * 12 + (eMonth - startCountMonth) + 1);
  const rawDays = (baseDays * activeMonths) / 12;
  const roundingMode = policy.rounding || 'floor_half';
  const grantedDays = applyRounding(rawDays, roundingMode);

  return {
    eligible: true,
    code: 'PRORATED_ENTITLEMENT',
    grantedDays,
    activeMonths,
    baseDays,
    ruleId: rule.id
  };
}

/**
 * Computes carry over days and expiry date
 */
function computeCarryOver({
  remainingCurrentBalance,
  policy = {},
  newPeriodStartDate
}) {
  const enabled = policy.carry_over_enabled === 1 || policy.carry_over_enabled === true;
  if (!enabled || remainingCurrentBalance <= 0) {
    return {
      carryIn: 0,
      carryExpiresOn: null
    };
  }

  const maxDays = parseFloat(policy.carry_over_max_days) || 6;
  const carryIn = Math.min(remainingCurrentBalance, maxDays);
  const expiryMonths = policy.carry_over_expiry_months !== undefined ? policy.carry_over_expiry_months : 3;

  const { year, month } = parseDate(newPeriodStartDate);
  // Calculate target month
  let targetMonth = month + expiryMonths - 1;
  let targetYear = year;
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const carryExpiresOn = formatDate(targetYear, targetMonth, lastDay);

  return {
    carryIn,
    carryExpiresOn
  };
}

module.exports = {
  computeEntitlement,
  computeCarryOver,
  calculateServiceMonths,
  resolvePeriodRange,
  applyRounding
};
