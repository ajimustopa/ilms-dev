/**
 * Calendar & Report Pure Function Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §2 #17, #36, §3.5, §10.2, §11.2
 *
 * PURE FUNCTIONS ONLY: Zero DB access, zero process timezone or clock dependencies.
 */

const { formatDbDate, dateRange, getDaysInMonthCount } = require('./dateHelper');

/**
 * Checks if a specific leave item is active on a given date (YYYY-MM-DD)
 */
function isLeaveActiveOnDate(leave, dateStr) {
  if (!leave.start_date || !leave.end_date) return false;
  const start = formatDbDate(leave.start_date);
  const end = formatDbDate(leave.end_date);
  return dateStr >= start && dateStr <= end;
}

/**
 * Mask sensitive medical data for sick category if viewer is non-HR and non-owner (SPEC §2 #17, §9.4)
 */
function applySickPrivacy(leave, isHr, currentEmployeeId) {
  const isOwner = currentEmployeeId && Number(leave.employee_id) === Number(currentEmployeeId);
  const isSick = leave.leave_category === 'sick' || leave.category === 'sick' || leave.leave_type_code === 'sakit';

  if (isSick && !isHr && !isOwner) {
    return {
      ...leave,
      reason: null,
      notes: null,
      attachment_url: null,
      attachment_name: null,
      rejection_reason: null
    };
  }
  return leave;
}

/**
 * Check if a date has exceeded absence threshold (SPEC §2 #36, §10.2)
 */
function checkDailyThreshold(absentCount, totalEmployees, thresholds = []) {
  if (!thresholds || thresholds.length === 0 || absentCount === 0) {
    return { isWarning: false, thresholdLimit: null, message: null };
  }

  for (const th of thresholds) {
    if (!th.is_active) continue;

    if (th.max_absent_count != null && absentCount >= th.max_absent_count) {
      return {
        isWarning: true,
        thresholdLimit: th.max_absent_count,
        absentCount,
        message: `Peringatan: ${absentCount} pegawai tidak hadir (ambang batas maks. ${th.max_absent_count} orang)`
      };
    }

    if (th.max_absent_percent != null && totalEmployees > 0) {
      const pct = (absentCount / totalEmployees) * 100;
      if (pct >= parseFloat(th.max_absent_percent)) {
        return {
          isWarning: true,
          thresholdPercent: parseFloat(th.max_absent_percent),
          absentCount,
          message: `Peringatan: ${pct.toFixed(1)}% pegawai tidak hadir (ambang batas maks. ${th.max_absent_percent}%)`
        };
      }
    }
  }

  return { isWarning: false, thresholdLimit: null, message: null };
}

/**
 * Generate dates array for a month YYYY-MM
 */
function generateMonthDates(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const numDays = new Date(y, m, 0).getDate();
  const dates = [];
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  for (let d = 1; d <= numDays; d++) {
    const dayStr = String(d).padStart(2, '0');
    const fullDate = `${monthStr}-${dayStr}`;
    const dt = new Date(y, m - 1, d);
    const dayIdx = dt.getDay(); // 0 is Sunday
    const isWeekend = dayIdx === 0 || dayIdx === 6;

    dates.push({
      date: fullDate,
      day: d,
      day_of_week: DAY_NAMES[dayIdx],
      day_name_id: DAY_NAMES_ID[dayIdx],
      is_weekend: isWeekend
    });
  }

  return dates;
}

/**
 * 1. Build Calendar Matrix (SPEC §11.2)
 */
function buildCalendarMatrix({
  month,
  employees = [],
  leaves = [],
  overtimes = [],
  holidays = [],
  thresholds = [],
  isHr = false,
  currentEmployeeId = null,
  includeOvertime = true
}) {
  const monthDates = generateMonthDates(month);
  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);
  const holidayList = Array.isArray(holidays) ? holidays : (holidays?.data || []);
  const leaveList = Array.isArray(leaves) ? leaves : (leaves?.data || []);
  const overtimeList = Array.isArray(overtimes) ? overtimes : (overtimes?.data || []);
  const totalEmployees = employeeList.length;

  // Index holidays by date
  const holidayByDate = {};
  holidayList.forEach(h => {
    const dStr = formatDbDate(h.holiday_date);
    holidayByDate[dStr] = h;
  });

  // Index leaves by employee
  const leavesByEmp = {};
  leaveList.forEach(l => {
    const empId = l.employee_id;
    if (!leavesByEmp[empId]) leavesByEmp[empId] = [];
    leavesByEmp[empId].push(l);
  });

  // Index overtimes by employee
  const overtimesByEmp = {};
  if (includeOvertime) {
    overtimeList.forEach(o => {
      const empId = o.employee_id;
      if (!overtimesByEmp[empId]) overtimesByEmp[empId] = [];
      overtimesByEmp[empId].push(o);
    });
  }

  // Track daily absent counts
  const dailyAbsentSet = {};
  const dailyOvertimeSet = {};
  monthDates.forEach(md => {
    dailyAbsentSet[md.date] = new Set();
    dailyOvertimeSet[md.date] = new Set();
  });

  // Build rows for each employee
  const matrixEmployees = employeeList.map(emp => {
    const empLeaves = leavesByEmp[emp.id] || [];
    const empOvertimes = overtimesByEmp[emp.id] || [];
    const daysMap = {};

    monthDates.forEach(md => {
      const dStr = md.date;
      const holiday = holidayByDate[dStr] || null;

      // Find active leaves on this date
      const activeLeaves = empLeaves
        .filter(l => isLeaveActiveOnDate(l, dStr))
        .map(l => applySickPrivacy({
          id: l.id,
          employee_id: l.employee_id || emp.id,
          leave_type_code: l.leave_type || l.leave_code,
          leave_type_name: l.leave_type_name || l.leave_type,
          category: l.leave_category || l.category || 'annual',
          color: l.leave_type_color || l.color || '#059669',
          start_portion: l.start_portion || 'full',
          end_portion: l.end_portion || 'full',
          duration_days: parseFloat(l.duration_days) || 1,
          status: l.status,
          reason: l.reason,
          attachment_url: l.attachment_url
        }, isHr, currentEmployeeId));

      // Find active overtimes on this date
      const activeOvertimes = empOvertimes
        .filter(o => formatDbDate(o.overtime_date) === dStr)
        .map(o => ({
          id: o.id,
          hours: parseFloat(o.hours) || 0,
          payable_hours: o.payable_hours != null ? parseFloat(o.payable_hours) : null,
          status: o.status,
          task_description: o.task_description,
          day_type: o.day_type
        }));

      if (activeLeaves.length > 0) {
        dailyAbsentSet[dStr].add(emp.id);
      }
      if (activeOvertimes.length > 0) {
        dailyOvertimeSet[dStr].add(emp.id);
      }

      const primaryLeave = activeLeaves[0] || null;
      daysMap[dStr] = {
        date: dStr,
        is_weekend: md.is_weekend,
        holiday: holiday ? { name: holiday.name, is_off: Boolean(holiday.is_off) } : null,
        leaves: activeLeaves,
        leave: primaryLeave,
        overtimes: activeOvertimes
      };
    });

    return {
      id: emp.id,
      employee_id: emp.id,
      name: emp.full_name || emp.name,
      employee_name: emp.full_name || emp.name,
      nip: emp.employee_number || emp.nip || '',
      school_unit_id: emp.school_unit_id,
      position_name: emp.position_name || emp.current_position || '',
      days: daysMap
    };
  });

  // Build daily summary & threshold check
  const dailySummary = {};
  monthDates.forEach(md => {
    const dStr = md.date;
    const absentCount = dailyAbsentSet[dStr].size;
    const otCount = dailyOvertimeSet[dStr].size;
    const thresholdRes = checkDailyThreshold(absentCount, totalEmployees, thresholds);

    dailySummary[dStr] = {
      date: dStr,
      total_absent: absentCount,
      totalAbsent: absentCount,
      total_overtime: otCount,
      totalOvertime: otCount,
      is_holiday: Boolean(holidayByDate[dStr]),
      holiday_name: holidayByDate[dStr]?.name || null,
      warning: thresholdRes.isWarning ? thresholdRes : null,
      thresholdAlert: thresholdRes
    };
  });

  return {
    month,
    days_in_month: monthDates,
    dates: monthDates,
    daysInMonth: monthDates.length,
    total_employees: totalEmployees,
    employees: matrixEmployees,
    rows: matrixEmployees,
    daily_summary: dailySummary,
    dateStats: dailySummary,
    thresholds
  };
}

/**
 * 2. Calculate Report Summary (SPEC §11.2)
 */
function calculateReportSummary({
  leaves = [],
  overtimes = [],
  employees = [],
  startDate,
  endDate
}) {
  const totalEmployees = employees.length;
  const totalRequests = leaves.length;

  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let revisionCount = 0;
  let cancelledCount = 0;
  let totalDaysTaken = 0;

  leaves.forEach(l => {
    const status = l.status;
    const days = parseFloat(l.duration_days) || 0;

    if (status === 'approved') {
      approvedCount++;
      totalDaysTaken += days;
    } else if (status === 'pending') {
      pendingCount++;
    } else if (status === 'rejected') {
      rejectedCount++;
    } else if (status === 'revision_requested') {
      revisionCount++;
    } else if (status === 'cancelled') {
      cancelledCount++;
    }
  });

  // Calculate distinct months in range for monthly average
  let numMonths = 1;
  if (startDate && endDate) {
    const startYm = startDate.slice(0, 7).split('-').map(Number);
    const endYm = endDate.slice(0, 7).split('-').map(Number);
    numMonths = Math.max(1, (endYm[0] - startYm[0]) * 12 + (endYm[1] - startYm[1]) + 1);
  }

  const avgMonthlyDays = parseFloat((totalDaysTaken / numMonths).toFixed(1));
  const approvalRatePercent = totalRequests > 0
    ? parseFloat(((approvedCount / totalRequests) * 100).toFixed(1))
    : 0;

  // Overtime aggregates
  const approvedOvertimes = overtimes.filter(o => o.status === 'approved');
  const overtimeTotalHours = approvedOvertimes.reduce((acc, curr) => {
    const h = parseFloat(curr.payable_hours != null ? curr.payable_hours : curr.hours) || 0;
    return acc + h;
  }, 0);

  const overtimeTotalWage = approvedOvertimes.reduce((acc, curr) => {
    return acc + (parseFloat(curr.estimated_wage) || 0);
  }, 0);

  return {
    total_active_employees: totalEmployees,
    total_requests: totalRequests,
    approved_requests: approvedCount,
    pending_requests: pendingCount,
    rejected_requests: rejectedCount,
    revision_requests: revisionCount,
    cancelled_requests: cancelledCount,
    total_leave_days_taken: parseFloat(totalDaysTaken.toFixed(1)),
    avg_monthly_days: avgMonthlyDays,
    approval_rate_percent: approvalRatePercent,
    overtime_total_requests: overtimes.length,
    overtime_approved_requests: approvedOvertimes.length,
    overtime_total_hours: parseFloat(overtimeTotalHours.toFixed(1)),
    overtime_total_estimated_wage: overtimeTotalWage > 0 ? overtimeTotalWage : null
  };
}

/**
 * 3. Aggregate Leave by Type / Category (SPEC §11.2)
 */
function aggregateByType({ leaves = [], leaveTypes = [] }) {
  const typeMap = {};

  // Initialize from master leave types if available
  leaveTypes.forEach(lt => {
    typeMap[lt.code] = {
      code: lt.code,
      name: lt.name,
      category: lt.category,
      color: lt.color || '#059669',
      request_count: 0,
      total_days: 0,
      percentage: 0
    };
  });

  let grandTotalDays = 0;

  leaves.forEach(l => {
    const code = l.leave_type || l.leave_code || 'lainnya';
    const days = parseFloat(l.duration_days) || 0;

    if (!typeMap[code]) {
      typeMap[code] = {
        code,
        name: l.leave_type_name || code,
        category: l.leave_category || l.category || 'other',
        color: l.leave_type_color || '#6e7486',
        request_count: 0,
        total_days: 0,
        percentage: 0
      };
    }

    typeMap[code].request_count++;
    typeMap[code].total_days += days;
    grandTotalDays += days;
  });

  const result = Object.values(typeMap)
    .filter(t => t.request_count > 0 || t.total_days > 0)
    .map(t => ({
      ...t,
      total_days: parseFloat(t.total_days.toFixed(1)),
      percentage: grandTotalDays > 0 ? parseFloat(((t.total_days / grandTotalDays) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.total_days - a.total_days);

  return {
    items: result,
    grand_total_days: parseFloat(grandTotalDays.toFixed(1)),
    grand_total_requests: leaves.length
  };
}

/**
 * 4. Calculate Monthly Trend (SPEC §11.2)
 */
function calculateMonthlyTrend({
  leaves = [],
  overtimes = [],
  startDate,
  endDate
}) {
  const monthMap = {};
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Initialize range months
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cur <= end) {
      const ym = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES_SHORT[cur.getMonth()]} ${cur.getFullYear()}`;
      monthMap[ym] = {
        month: ym,
        label,
        total_days: 0,
        request_count: 0,
        sick_days: 0,
        annual_days: 0,
        permit_days: 0,
        special_days: 0,
        overtime_hours: 0
      };
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // Populate leaves
  leaves.forEach(l => {
    const ym = (l.start_date ? formatDbDate(l.start_date) : '').slice(0, 7);
    if (!ym) return;

    if (!monthMap[ym]) {
      const [y, m] = ym.split('-').map(Number);
      monthMap[ym] = {
        month: ym,
        label: `${MONTH_NAMES_SHORT[m - 1]} ${y}`,
        total_days: 0,
        request_count: 0,
        sick_days: 0,
        annual_days: 0,
        permit_days: 0,
        special_days: 0,
        overtime_hours: 0
      };
    }

    const days = parseFloat(l.duration_days) || 0;
    const cat = l.leave_category || l.category || 'annual';

    monthMap[ym].request_count++;
    monthMap[ym].total_days += days;

    if (cat === 'sick') monthMap[ym].sick_days += days;
    else if (cat === 'annual') monthMap[ym].annual_days += days;
    else if (cat === 'permit') monthMap[ym].permit_days += days;
    else monthMap[ym].special_days += days;
  });

  // Populate overtimes
  overtimes.forEach(o => {
    const ym = (o.overtime_date ? formatDbDate(o.overtime_date) : '').slice(0, 7);
    if (!ym || !monthMap[ym]) return;
    const h = parseFloat(o.payable_hours != null ? o.payable_hours : o.hours) || 0;
    monthMap[ym].overtime_hours += h;
  });

  const items = Object.values(monthMap).map(m => ({
    ...m,
    total_days: parseFloat(m.total_days.toFixed(1)),
    sick_days: parseFloat(m.sick_days.toFixed(1)),
    annual_days: parseFloat(m.annual_days.toFixed(1)),
    permit_days: parseFloat(m.permit_days.toFixed(1)),
    special_days: parseFloat(m.special_days.toFixed(1)),
    overtime_hours: parseFloat(m.overtime_hours.toFixed(1))
  }));

  return items;
}

/**
 * 5. Calculate Top Absent Employees (SPEC §11.2)
 */
function calculateTopAbsent({ leaves = [], employees = [], limit = 5 }) {
  const empMap = {};

  employees.forEach(e => {
    empMap[e.id] = {
      employee_id: e.id,
      employee_name: e.full_name || e.name,
      nip: e.employee_number || e.nip || '',
      position_name: e.position_name || e.current_position || '',
      total_days: 0,
      breakdown: {
        annual: 0,
        sick: 0,
        permit: 0,
        special: 0,
        official: 0
      }
    };
  });

  let grandTotal = 0;

  leaves.forEach(l => {
    const empId = l.employee_id;
    if (!empMap[empId]) {
      empMap[empId] = {
        employee_id: empId,
        employee_name: l.employee_name || `Pegawai #${empId}`,
        nip: l.nip || '',
        position_name: '',
        total_days: 0,
        breakdown: { annual: 0, sick: 0, permit: 0, special: 0, official: 0 }
      };
    }

    const days = parseFloat(l.duration_days) || 0;
    const cat = l.leave_category || l.category || 'annual';

    empMap[empId].total_days += days;
    grandTotal += days;

    if (cat === 'annual') empMap[empId].breakdown.annual += days;
    else if (cat === 'sick') empMap[empId].breakdown.sick += days;
    else if (cat === 'permit') empMap[empId].breakdown.permit += days;
    else if (cat === 'official') empMap[empId].breakdown.official += days;
    else empMap[empId].breakdown.special += days;
  });

  const sorted = Object.values(empMap)
    .filter(e => e.total_days > 0)
    .sort((a, b) => b.total_days - a.total_days)
    .slice(0, limit)
    .map(e => ({
      ...e,
      total_days: parseFloat(e.total_days.toFixed(1)),
      percentage: grandTotal > 0 ? parseFloat(((e.total_days / grandTotal) * 100).toFixed(1)) : 0
    }));

  return sorted;
}

/**
 * 6. Calculate Detailed Recap per Employee (SPEC §11.2)
 */
function calculateRecap({
  employees = [],
  leaves = [],
  overtimes = [],
  balances = []
}) {
  const balanceByEmp = {};
  balances.forEach(b => {
    balanceByEmp[b.employee_id] = b;
  });

  const recap = employees.map(emp => {
    const empLeaves = leaves.filter(l => l.employee_id === emp.id);
    const empOvertimes = overtimes.filter(o => o.employee_id === emp.id && o.status === 'approved');
    const balance = balanceByEmp[emp.id] || null;

    let annualDays = 0;
    let specialDays = 0;
    let sickDays = 0;
    let permitDays = 0;
    let officialDays = 0;
    let unpaidDays = 0;

    empLeaves.forEach(l => {
      const days = parseFloat(l.duration_days) || 0;
      const cat = l.leave_category || l.category || 'annual';

      if (cat === 'annual') annualDays += days;
      else if (cat === 'sick') sickDays += days;
      else if (cat === 'permit') permitDays += days;
      else if (cat === 'official') officialDays += days;
      else if (cat === 'unpaid') unpaidDays += days;
      else specialDays += days;
    });

    const totalAbsentDays = annualDays + specialDays + sickDays + permitDays + unpaidDays;
    const totalWithOfficial = totalAbsentDays + officialDays;

    const overtimeHours = empOvertimes.reduce((acc, curr) => {
      const h = parseFloat(curr.payable_hours != null ? curr.payable_hours : curr.hours) || 0;
      return acc + h;
    }, 0);

    const remainingAnnualBalance = balance
      ? (parseFloat(balance.available_balance) || (parseFloat(balance.base_entitlement) - parseFloat(balance.used_balance || 0)))
      : null;

    return {
      employee_id: emp.id,
      employee_name: emp.full_name || emp.name,
      nip: emp.employee_number || emp.nip || '',
      school_unit_id: emp.school_unit_id,
      position_name: emp.position_name || emp.current_position || '',
      annual_leave_days: parseFloat(annualDays.toFixed(1)),
      special_leave_days: parseFloat(specialDays.toFixed(1)),
      sick_days: parseFloat(sickDays.toFixed(1)),
      permit_days: parseFloat(permitDays.toFixed(1)),
      official_days: parseFloat(officialDays.toFixed(1)),
      unpaid_days: parseFloat(unpaidDays.toFixed(1)),
      total_absent_days: parseFloat(totalAbsentDays.toFixed(1)),
      total_with_official_days: parseFloat(totalWithOfficial.toFixed(1)),
      overtime_payable_hours: parseFloat(overtimeHours.toFixed(1)),
      remaining_annual_balance: remainingAnnualBalance != null ? parseFloat(remainingAnnualBalance.toFixed(1)) : null
    };
  });

  return recap;
}

module.exports = {
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
};
