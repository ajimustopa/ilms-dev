/**
 * Pure Engine for Payroll Feed Aggregation and Deterministic Hashing
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §10.5, §2 #13, #19, #12
 */

const crypto = require('crypto');

/**
 * Generate deterministically sorted canonical JSON SHA-256 hash
 */
function generateDeterministicHash(data) {
  const canonicalString = JSON.stringify(sortKeysRecursively(data));
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Deep recursive key sorting for canonical JSON serialization
 */
function sortKeysRecursively(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeysRecursively);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = sortKeysRecursively(obj[key]);
  }
  return result;
}

/**
 * Hitung unpaid equivalent days (hari potong gaji dari cuti tidak bergaji atau bergaji sebagian)
 * Aturan SPEC §10.5 & §2 #13:
 * - pay_percent === null -> TIDAK dihitung ke unpaid_equivalent_days (tanda belum diputuskan oleh HRD)
 * - pay_percent === 100 -> 0 hari potong
 * - pay_percent === 0 -> 100% potong (days * 1.0)
 * - pay_percent 0 < p < 100 -> days * ((100 - p) / 100)
 */
function calculateUnpaidEquivalentDays(leaveDaysByType = []) {
  if (!Array.isArray(leaveDaysByType)) return 0;

  let totalUnpaidDays = 0;

  for (const item of leaveDaysByType) {
    const days = parseFloat(item.days) || 0;
    const payPercent = item.pay_percent;

    // Jika null -> belum diputuskan, jangan hitung potongan
    if (payPercent === null || payPercent === undefined) {
      continue;
    }

    const p = parseFloat(payPercent);
    if (p < 100) {
      const unpaidPortion = (100 - Math.max(0, p)) / 100;
      totalUnpaidDays += (days * unpaidPortion);
    }
  }

  return parseFloat(totalUnpaidDays.toFixed(2));
}

/**
 * Agregasi pengajuan cuti yang disetujui per jenis cuti
 * Mempertahankan pay_percent null sebagai null (SPEC §10.5)
 */
function aggregateLeaveDaysByType(approvedLeaves = []) {
  if (!Array.isArray(approvedLeaves)) return [];

  const map = new Map();

  for (const l of approvedLeaves) {
    const code = l.leave_code || l.leave_type;
    const name = l.leave_type_name || code;
    const category = l.leave_category || l.category || 'other';
    const days = parseFloat(l.duration_days) || 0;
    
    // Nilai pay_percent murni (null dipertahankan)
    let payPercent = null;
    if (l.payroll_pay_percent !== null && l.payroll_pay_percent !== undefined) {
      payPercent = parseFloat(l.payroll_pay_percent);
    }

    const affectsAllowance = Boolean(l.affects_attendance_allowance);

    if (!map.has(code)) {
      map.set(code, {
        code,
        name,
        category,
        days: 0,
        pay_percent: payPercent,
        affects_attendance_allowance: affectsAllowance
      });
    }

    const entry = map.get(code);
    entry.days = parseFloat((entry.days + days).toFixed(1));
  }

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Agregasi lembur per jenis hari (workday, weekend, holiday)
 */
function aggregateOvertime(approvedOvertimes = []) {
  if (!Array.isArray(approvedOvertimes)) {
    return {
      total_payable_hours: 0,
      total_estimated_wage: null,
      by_day_type: {
        workday: { payable_hours: 0, estimated_wage: null },
        weekend: { payable_hours: 0, estimated_wage: null },
        holiday: { payable_hours: 0, estimated_wage: null }
      },
      items: []
    };
  }

  let totalPayable = 0;
  let totalWage = 0;
  let hasWage = false;

  const byDayType = {
    workday: { payable_hours: 0, estimated_wage: null, has_wage: false },
    weekend: { payable_hours: 0, estimated_wage: null, has_wage: false },
    holiday: { payable_hours: 0, estimated_wage: null, has_wage: false }
  };

  const items = approvedOvertimes.map(o => {
    const hours = o.payable_hours !== null && o.payable_hours !== undefined
      ? parseFloat(o.payable_hours)
      : (parseFloat(o.hours) || 0);

    const wage = o.estimated_wage !== null && o.estimated_wage !== undefined
      ? parseFloat(o.estimated_wage)
      : null;

    const dayType = (o.day_type || 'workday').toLowerCase();
    const validDayType = byDayType[dayType] ? dayType : 'workday';

    totalPayable += hours;
    byDayType[validDayType].payable_hours += hours;

    if (wage !== null) {
      hasWage = true;
      totalWage += wage;
      byDayType[validDayType].has_wage = true;
      byDayType[validDayType].estimated_wage = (byDayType[validDayType].estimated_wage || 0) + wage;
    }

    let multiplierBreakdown = null;
    if (o.multiplier_breakdown) {
      multiplierBreakdown = typeof o.multiplier_breakdown === 'string'
        ? JSON.parse(o.multiplier_breakdown)
        : o.multiplier_breakdown;
    }

    return {
      id: o.id,
      overtime_date: typeof o.overtime_date === 'string' ? o.overtime_date.slice(0, 10) : o.overtime_date,
      day_type: validDayType,
      payable_hours: parseFloat(hours.toFixed(2)),
      multiplier_breakdown: multiplierBreakdown,
      estimated_wage: wage !== null ? parseFloat(wage.toFixed(2)) : null,
      realization_status: o.realization_status || 'pending'
    };
  });

  return {
    total_payable_hours: parseFloat(totalPayable.toFixed(2)),
    total_estimated_wage: hasWage ? parseFloat(totalWage.toFixed(2)) : null,
    by_day_type: {
      workday: {
        payable_hours: parseFloat(byDayType.workday.payable_hours.toFixed(2)),
        estimated_wage: byDayType.workday.has_wage ? parseFloat(byDayType.workday.estimated_wage.toFixed(2)) : null
      },
      weekend: {
        payable_hours: parseFloat(byDayType.weekend.payable_hours.toFixed(2)),
        estimated_wage: byDayType.weekend.has_wage ? parseFloat(byDayType.weekend.estimated_wage.toFixed(2)) : null
      },
      holiday: {
        payable_hours: parseFloat(byDayType.holiday.payable_hours.toFixed(2)),
        estimated_wage: byDayType.holiday.has_wage ? parseFloat(byDayType.holiday.estimated_wage.toFixed(2)) : null
      }
    },
    items
  };
}

/**
 * Membentuk satu entitas feed pegawai secara deterministik
 */
function buildEmployeePayrollFeedItem({
  employee,
  leaves = [],
  overtimes = [],
  attendanceSummary = null
}) {
  const leaveDaysByType = aggregateLeaveDaysByType(leaves);
  const unpaidEquivalentDays = calculateUnpaidEquivalentDays(leaveDaysByType);
  const overtimeSummary = aggregateOvertime(overtimes);

  const leaveRequestIds = leaves.map(l => l.id).sort((a, b) => a - b);
  const overtimeIds = overtimes.map(o => o.id).sort((a, b) => a - b);

  const rawItem = {
    employee_id: employee.id,
    employee_number: employee.employee_number || null,
    full_name: employee.full_name,
    school_unit_id: employee.school_unit_id || null,
    position_title: employee.position_title || 'Staf',
    employment_status: employee.employment_status || null,
    leave_days_by_type: leaveDaysByType,
    unpaid_equivalent_days: unpaidEquivalentDays,
    overtime: overtimeSummary,
    attendance: attendanceSummary || {
      effective_work_days: 0,
      present_count: 0,
      sick_count: 0,
      permission_count: 0,
      leave_count: 0,
      duty_travel_count: 0,
      absent_count: 0,
      late_count: 0,
      late_minutes: 0,
      total_work_hours: 0
    },
    source_ids: {
      leave_request_ids: leaveRequestIds,
      overtime_ids: overtimeIds
    }
  };

  const employeeSnapshotHash = generateDeterministicHash(rawItem);

  return {
    ...rawItem,
    snapshot_hash: employeeSnapshotHash
  };
}

/**
 * Membentuk response amplop payroll feed
 */
function buildPayrollFeedResponse({
  period,
  schoolUnitId = null,
  lockStatus = 'open',
  employeeFeedItems = [],
  asOf = null
}) {
  const isLocked = lockStatus === 'locked' || lockStatus === 'submitted_to_payroll';
  const provisional = !isLocked;
  const asOfTime = asOf || new Date().toISOString();

  const sortedItems = [...employeeFeedItems].sort((a, b) => a.employee_id - b.employee_id);
  const overallHash = generateDeterministicHash(sortedItems);

  return {
    period,
    school_unit_id: schoolUnitId ? Number(schoolUnitId) : null,
    lock_status: lockStatus,
    provisional,
    as_of: asOfTime,
    snapshot_hash: overallHash,
    total_employees: sortedItems.length,
    items: sortedItems
  };
}

module.exports = {
  generateDeterministicHash,
  sortKeysRecursively,
  calculateUnpaidEquivalentDays,
  aggregateLeaveDaysByType,
  aggregateOvertime,
  buildEmployeePayrollFeedItem,
  buildPayrollFeedResponse
};
