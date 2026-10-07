/**
 * Leave Request Pure Validator
 * Modul Kepegawaian - Core Aldepos
 * Conforms strictly to SPEC-CUTI-LEMBUR.md §4.4 and §12
 * 
 * PURE FUNCTION - NO DB / NO KNEX IMPORTS
 */

const { dateRange, diffInDays } = require('./dateHelper');

function diffCalendarDays(d1, d2) {
  return diffInDays(d1, d2);
}

/**
 * Validates a leave request context and returns { isValid, errors, warnings }
 * @param {object} context 
 * @returns {{ isValid: boolean, errors: Array<{ code: string, field: string, message: string }>, warnings: Array<{ code: string, message: string }> }}
 */
function validateLeaveRequest(context = {}) {
  const errors = [];
  const warnings = [];

  const {
    request = {},
    actor = {},
    employee = {},
    leaveType = {},
    duration = {},
    existingRequests = [],
    attendanceRecords = [],
    overtimeRecords = [],
    lockedPeriodDates = [],
    balance = null,
    today = new Date().toISOString().slice(0, 10),
    colleagueAbsenceStats = null
  } = context;

  const {
    start_date,
    end_date,
    start_portion = 'full',
    end_portion = 'full',
    reason = '',
    attachment,
    attachment_url,
    attachment_name,
    bypass_approval = false,
    bypass_reason = null
  } = request;

  // Helper to add error
  function addError(code, field, message) {
    errors.push({ code, field, message });
  }

  // Helper to add warning
  function addWarning(code, message) {
    warnings.push({ code, message });
  }

  // -------------------------------------------------------------
  // ORDER 1: STRUCTURE & ACTOR (SPEC §4.4 #1)
  // -------------------------------------------------------------
  
  // 1.1 Date Range
  if (!start_date || !end_date || start_date > end_date) {
    addError('INVALID_RANGE', 'end_date', 'Tanggal akhir harus sama dengan atau setelah tanggal mulai');
    return { isValid: false, errors, warnings };
  }

  // 1.2 Portion Validation
  const validPortions = ['full', 'am', 'pm'];
  if (!validPortions.includes(start_portion) || !validPortions.includes(end_portion)) {
    addError('INVALID_PORTION', 'start_portion', 'Porsi cuti tidak valid (pilih: full, am, atau pm)');
    return { isValid: false, errors, warnings };
  }

  if (start_date === end_date) {
    if (start_portion !== end_portion) {
      addError('INVALID_PORTION', 'end_portion', 'Pengajuan 1 hari wajib memiliki start_portion dan end_portion yang sama');
    }
  } else {
    // Multi-day: start_portion in {full, pm}, end_portion in {full, am}
    if (start_portion === 'am' || end_portion === 'pm') {
      addError('INVALID_PORTION', 'start_portion', 'Untuk cuti multi-hari, porsi awal hanya boleh full/pm dan porsi akhir hanya boleh full/am');
    }
  }

  if (!leaveType.half_day_allowed && (start_portion !== 'full' || end_portion !== 'full')) {
    addError('INVALID_PORTION', 'start_portion', `Jenis cuti '${leaveType.name || leaveType.code}' tidak mengizinkan pengambilan setengah hari`);
  }

  // 1.3 Employee Active Status
  if (!employee || !employee.id || employee.account_status !== 'active') {
    addError('EMPLOYEE_INACTIVE', 'employee_id', 'Pegawai tidak aktif atau tidak ditemukan dalam sistem');
  }

  // 1.4 Actor Check
  const isPrivileged = (actor.permissions || []).includes('kepegawaian.leave_requests.manage') ||
                       (actor.permissions || []).includes('kepegawaian.leave_requests.override');

  if (!actor.employeeId && !isPrivileged) {
    addError('ACTOR_NOT_EMPLOYEE', 'actor', 'Akun pengguna tidak terhubung dengan data pegawai aktif');
  }

  // 1.5 Scope Check
  if (isPrivileged && actor.employeeId && employee.id && actor.employeeId !== employee.id) {
    if (actor.unitScope && actor.unitScope !== 'all' && Array.isArray(actor.unitScope)) {
      if (!actor.unitScope.includes(employee.school_unit_id)) {
        addError('FORBIDDEN_SCOPE', 'school_unit_id', 'Pegawai berada di luar cakupan satuan pendidikan yang Anda kelola');
      }
    }
  }

  // Stop if structural errors found
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // -------------------------------------------------------------
  // ORDER 2: ELIGIBILITY (SPEC §4.4 #2)
  // -------------------------------------------------------------
  
  // 2.1 Inactive Leave Type
  if (leaveType.is_active === false || leaveType.is_active === 0) {
    addError('TYPE_INACTIVE', 'leave_type', `Jenis cuti '${leaveType.name || leaveType.code}' sedang dinonaktifkan oleh HRD`);
  }

  // 2.2 Gender Restriction
  if (leaveType.gender_restriction && leaveType.gender_restriction !== 'any') {
    const empGender = (employee.gender || '').toLowerCase();
    const reqGender = leaveType.gender_restriction.toLowerCase();
    const isMale = empGender === 'male' || empGender === 'l' || empGender === 'laki-laki';
    const isFemale = empGender === 'female' || empGender === 'p' || empGender === 'perempuan';

    if (reqGender === 'female' && !isFemale) {
      addError('TYPE_NOT_ALLOWED_FOR_EMPLOYEE', 'gender', `Jenis cuti '${leaveType.name}' khusus untuk pegawai perempuan`);
    } else if (reqGender === 'male' && !isMale) {
      addError('TYPE_NOT_ALLOWED_FOR_EMPLOYEE', 'gender', `Jenis cuti '${leaveType.name}' khusus untuk pegawai laki-laki`);
    }
  }

  // 2.3 Employment Status Eligibility
  if (leaveType.eligible_employment_statuses && Array.isArray(leaveType.eligible_employment_statuses) && leaveType.eligible_employment_statuses.length > 0) {
    const empStatus = (employee.employment_status || '').toUpperCase().trim();
    const isEligible = leaveType.eligible_employment_statuses.some(s => s.toUpperCase().trim() === empStatus);
    if (!isEligible) {
      addError('TYPE_NOT_ALLOWED_FOR_EMPLOYEE', 'employment_status', `Status kepegawaian '${employee.employment_status}' tidak berhak mengambil jenis cuti '${leaveType.name}'`);
    }
  }

  // 2.4 Marital Status Eligibility
  if (leaveType.eligible_marital_statuses && Array.isArray(leaveType.eligible_marital_statuses) && leaveType.eligible_marital_statuses.length > 0) {
    const empMarital = (employee.marital_status || '').toLowerCase().trim();
    const isEligible = leaveType.eligible_marital_statuses.some(s => s.toLowerCase().trim() === empMarital);
    if (!isEligible) {
      addError('TYPE_NOT_ALLOWED_FOR_EMPLOYEE', 'marital_status', `Status pernikahan '${employee.marital_status}' tidak memenuhi syarat jenis cuti '${leaveType.name}'`);
    }
  }

  // 2.5 Minimum Service Months
  if (leaveType.min_service_months && leaveType.min_service_months > 0) {
    if (!employee.join_date) {
      addError('UNKNOWN_JOIN_DATE', 'join_date', 'Tanggal bergabung pegawai belum terisi untuk verifikasi masa kerja');
    } else {
      const joinD = new Date(employee.join_date);
      const startD = new Date(start_date);
      const monthsDiff = (startD.getFullYear() - joinD.getFullYear()) * 12 + (startD.getMonth() - joinD.getMonth());
      if (monthsDiff < leaveType.min_service_months) {
        addError('TYPE_NOT_ALLOWED_FOR_EMPLOYEE', 'min_service_months', `Masa kerja minimum untuk jenis cuti '${leaveType.name}' adalah ${leaveType.min_service_months} bulan`);
      }
    }
  }

  // -------------------------------------------------------------
  // ORDER 3: DAYS & SCHEDULES (SPEC §4.4 #3)
  // -------------------------------------------------------------
  
  if (duration.error) {
    if (duration.error.code === 'NO_SCHEDULE_ASSIGNMENT') {
      addError('NO_SCHEDULE_ASSIGNMENT', 'start_date', duration.error.message || 'Tidak ada jadwal kerja yang ditetapkan pada rentang tanggal ini');
    } else if (duration.error.code === 'NO_WORKING_DAYS') {
      addError('NO_WORKING_DAYS', 'start_date', duration.error.message || 'Tidak ada hari kerja efektif dalam rentang pengajuan (semua hari libur/non-kerja)');
    } else {
      addError(duration.error.code || 'INVALID_DURATION', 'start_date', duration.error.message || 'Durasi pengajuan tidak valid');
    }
  } else if (duration.total === 0 || duration.total === 0.0) {
    addError('NO_WORKING_DAYS', 'start_date', 'Total hari kerja terhitung adalah 0 hari');
  }

  // Add duration warnings if any
  if (duration.warnings && Array.isArray(duration.warnings)) {
    for (const w of duration.warnings) {
      addWarning(w.code, w.message);
    }
  }

  // -------------------------------------------------------------
  // ORDER 4: TIME / BACKDATE / NOTICE / LOCKED (SPEC §4.4 #4)
  // -------------------------------------------------------------
  
  const calDiff = diffCalendarDays(today, start_date);

  // 4.1 Backdate Exceeded
  if (start_date < today) {
    const backdateDays = Math.abs(calDiff);
    const maxBackdate = leaveType.max_backdate_days !== null && leaveType.max_backdate_days !== undefined
      ? leaveType.max_backdate_days
      : 0;

    if (backdateDays > maxBackdate) {
      addError('BACKDATE_EXCEEDED', 'start_date', `Batas pengajuan mundur untuk '${leaveType.name}' maksimal ${maxBackdate} hari (pengajuan mundur ${backdateDays} hari)`);
    }
  }

  // 4.2 Notice Too Short
  if (start_date >= today) {
    const noticeDays = calDiff;
    const minNotice = leaveType.min_notice_days !== null && leaveType.min_notice_days !== undefined
      ? leaveType.min_notice_days
      : 0;

    if (noticeDays < minNotice) {
      addError('NOTICE_TOO_SHORT', 'start_date', `Pengajuan cuti '${leaveType.name}' wajib diajukan minimal ${minNotice} hari sebelumnya (lead time ${noticeDays} hari)`);
    }
  }

  // 4.3 Attendance Period Locked
  const lockedDatesSet = new Set(lockedPeriodDates || []);
  const reqDates = dateRange(start_date, end_date);
  const hitsLockedPeriod = reqDates.some(d => lockedDatesSet.has(d));
  if (hitsLockedPeriod) {
    addError('PERIOD_LOCKED', 'start_date', 'Rentang tanggal cuti mencakup periode presensi yang telah terkunci / diserahkan ke payroll');
  }

  // -------------------------------------------------------------
  // ORDER 5: LIMITS (MAX_DAYS_PER_REQUEST, PER_YEAR, LIFETIME) (SPEC §4.4 #5)
  // -------------------------------------------------------------
  
  const reqDuration = duration.total || 0;

  // 5.1 Max Days Per Request (Single & Chained Contiguous Requests)
  if (leaveType.max_days_per_request && leaveType.max_days_per_request > 0) {
    // Single request limit
    if (reqDuration > leaveType.max_days_per_request) {
      addError('MAX_DAYS_PER_REQUEST', 'duration_days', `Durasi per pengajuan untuk '${leaveType.name}' maksimal ${leaveType.max_days_per_request} hari (diajukan ${reqDuration} hari)`);
    } else {
      // Check contiguous chain of same leave_type
      let contiguousTotal = reqDuration;
      const typeId = leaveType.id;
      const typeCode = leaveType.code;

      const sameTypeRequests = existingRequests.filter(r => {
        if (r.status !== 'approved' && r.status !== 'pending' && r.status !== 'revision_requested') return false;
        if (r.id && request.id && r.id === request.id) return false;
        return (r.leave_type_id && r.leave_type_id === typeId) || (r.leave_type && r.leave_type === typeCode);
      });

      for (const r of sameTypeRequests) {
        // Contiguous if r.end_date is 1 calendar day before start_date OR r.start_date is 1 calendar day after end_date
        const daysBefore = diffCalendarDays(r.end_date, start_date);
        const daysAfter = diffCalendarDays(end_date, r.start_date);

        if (daysBefore === 1 || daysAfter === 1) {
          contiguousTotal += parseFloat(r.duration_days || 0);
        }
      }

      if (contiguousTotal > leaveType.max_days_per_request) {
        addError('MAX_DAYS_PER_REQUEST', 'duration_days', `Akumulasi cuti berdempetan (${contiguousTotal} hari) melebihi batas per pengajuan (${leaveType.max_days_per_request} hari)`);
      }
    }
  }

  // 5.2 Max Days Per Year
  if (leaveType.max_days_per_year && leaveType.max_days_per_year > 0) {
    const reqYear = start_date.slice(0, 4);
    let yearlyTotal = reqDuration;

    const yearlyRequests = existingRequests.filter(r => {
      if (r.status !== 'approved') return false;
      if (r.id && request.id && r.id === request.id) return false;
      const matchType = (r.leave_type_id && r.leave_type_id === leaveType.id) || (r.leave_type === leaveType.code);
      const matchYear = r.start_date && r.start_date.startsWith(reqYear);
      return matchType && matchYear;
    });

    for (const r of yearlyRequests) {
      yearlyTotal += parseFloat(r.duration_days || 0);
    }

    if (yearlyTotal > leaveType.max_days_per_year) {
      addError('MAX_DAYS_PER_YEAR', 'duration_days', `Total penggunaan '${leaveType.name}' dalam setahun (${yearlyTotal} hari) melebihi batas kuota ${leaveType.max_days_per_year} hari/tahun`);
    }
  }

  // 5.3 Max Occurrences Lifetime
  if (leaveType.max_occurrences_lifetime && leaveType.max_occurrences_lifetime > 0) {
    const lifetimeOccurrences = existingRequests.filter(r => {
      if (r.status !== 'approved') return false;
      if (r.id && request.id && r.id === request.id) return false;
      return (r.leave_type_id && r.leave_type_id === leaveType.id) || (r.leave_type === leaveType.code);
    }).length;

    if (lifetimeOccurrences >= leaveType.max_occurrences_lifetime) {
      addError('MAX_OCCURRENCES', 'leave_type', `Jenis cuti '${leaveType.name}' hanya boleh diambil maksimal ${leaveType.max_occurrences_lifetime} kali seumur kerja (sudah diambil ${lifetimeOccurrences} kali)`);
    }
  }

  // -------------------------------------------------------------
  // ORDER 6: ATTACHMENT & REASON (SPEC §4.4 #6)
  // -------------------------------------------------------------
  
  // 6.1 Reason Required
  if (leaveType.reason_required) {
    if (!reason || String(reason).trim() === '') {
      addError('REASON_REQUIRED', 'reason', `Alasan pengajuan wajib diisi untuk jenis cuti '${leaveType.name}'`);
    }
  }

  // 6.2 Attachment Required
  const hasAttachment = Boolean(attachment || attachment_url || attachment_name);
  if (leaveType.attachment_rule === 'required') {
    if (!hasAttachment) {
      addError('ATTACHMENT_REQUIRED', 'attachment', `Lampiran dokumen/surat bukti wajib disertakan untuk '${leaveType.name}'`);
    }
  } else if (leaveType.attachment_rule === 'required_after_days') {
    const threshold = leaveType.attachment_required_after_days || 2;
    if (reqDuration >= threshold && !hasAttachment) {
      addError('ATTACHMENT_REQUIRED', 'attachment', `Lampiran wajib disertakan untuk pengajuan cuti '${leaveType.name}' berdurasi ≥ ${threshold} hari`);
    }
  }

  // -------------------------------------------------------------
  // ORDER 7: OVERLAPS & CONFLICTS (SPEC §4.4 #7)
  // -------------------------------------------------------------
  
  for (const ex of existingRequests) {
    if (ex.status === 'cancelled' || ex.status === 'rejected') continue;
    if (ex.id && request.id && ex.id === request.id) continue;

    // Check date overlap
    const isOverlap = !(end_date < ex.start_date || start_date > ex.end_date);
    if (isOverlap) {
      // Check portion conflict if single day boundary
      let portionConflict = true;
      if (start_date === ex.end_date && start_date === end_date && ex.start_date === ex.end_date) {
        if ((start_portion === 'am' && ex.start_portion === 'pm') || (start_portion === 'pm' && ex.start_portion === 'am')) {
          portionConflict = false; // AM and PM on the same date can coexist
        }
      }

      if (portionConflict) {
        if (ex.status === 'approved') {
          addError('OVERLAP_APPROVED', 'start_date', `Rentang tanggal bertabrakan dengan cuti yang sudah disetujui (${ex.start_date} s.d ${ex.end_date})`);
        } else if (ex.status === 'pending' || ex.status === 'revision_requested') {
          addError('OVERLAP_PENDING', 'start_date', `Rentang tanggal bertabrakan dengan pengajuan cuti lain yang sedang diproses (${ex.start_date} s.d ${ex.end_date})`);
        }
      }
    }
  }

  // 7.2 Attendance Present Conflict
  for (const att of attendanceRecords) {
    if (reqDates.includes(att.attendance_date)) {
      if (att.status === 'present') {
        addError('ATTENDANCE_PRESENT_CONFLICT', 'start_date', `Terdapat data presensi hadir (present) pada tanggal ${att.attendance_date}`);
      }
    }
  }

  // 7.3 Overtime Conflict on Full Leave Day
  for (const ot of overtimeRecords) {
    if (reqDates.includes(ot.overtime_date)) {
      if (ot.status === 'approved' || ot.status === 'pending') {
        // If whole day leave -> conflict
        if (start_portion === 'full' && end_portion === 'full') {
          addError('OVERTIME_CONFLICT', 'start_date', `Terdapat jadwal lembur pada hari yang diajukan cuti penuh (${ot.overtime_date})`);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // ORDER 8: BALANCE & ENTITLEMENT (SPEC §4.4 #8)
  // -------------------------------------------------------------
  
  if (leaveType.deducts_balance) {
    if (!employee.join_date) {
      addError('UNKNOWN_JOIN_DATE', 'join_date', 'Tanggal bergabung pegawai belum terisi sehingga hak cuti tahunan tidak dapat dihitung');
    } else if (!balance) {
      addError('ENTITLEMENT_NOT_ELIGIBLE', 'balance', 'Pegawai belum memiliki hak jatah cuti tahunan aktif');
    } else {
      const avail = parseFloat(balance.available || 0);
      const allowNeg = Boolean(balance.allow_negative);
      const negLimit = parseFloat(balance.negative_limit_days || 0);

      if (avail < reqDuration) {
        if (!allowNeg) {
          addError('BALANCE_INSUFFICIENT', 'balance', `Sisa saldo cuti (${avail} hari) tidak mencukupi untuk durasi ${reqDuration} hari`);
        } else if ((avail - reqDuration) < -negLimit) {
          addError('BALANCE_INSUFFICIENT', 'balance', `Defisit saldo cuti melebihi batas toleransi saldo minus (-${negLimit} hari)`);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // WARNINGS: PEER / ABSENCE THRESHOLDS
  // -------------------------------------------------------------
  if (colleagueAbsenceStats) {
    if (colleagueAbsenceStats.maxAbsentCountExceeded) {
      addWarning('ABSENCE_THRESHOLD_EXCEEDED', 'Jumlah ketidakhadiran rekan satu unit pada tanggal ini melebihi batas ambang rawan operasional');
    }
    if (colleagueAbsenceStats.colleaguesOnLeaveCount > 0) {
      const names = (colleagueAbsenceStats.colleagueNames || []).slice(0, 3).join(', ');
      addWarning('COLLEAGUE_CONCURRENT_LEAVE', `Terdapat ${colleagueAbsenceStats.colleaguesOnLeaveCount} rekan lain yang mengambil cuti pada tanggal yang sama (${names})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  validateLeaveRequest
};
