/**
 * Attendance Leave Mapper & Pure Resolution Engine
 * Modul Kepegawaian - Core Aldepos
 * Conforms to SPEC-CUTI-LEMBUR.md §3.3, §8.1, §8.2
 */

/**
 * Pemetaan jenis cuti ke status & sub_status presensi
 * SPEC §3.3:
 * - sick -> status 'sick'
 * - permit -> status 'permitted', sub_status 'izin'
 * - annual / special / unpaid -> status 'permitted', sub_status 'cuti'
 * - official -> status 'permitted', sub_status 'dinas_luar'
 */
function mapLeaveTypeToAttendance(leaveTypeCode, category = null) {
  const code = (leaveTypeCode || '').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();

  if (code === 'sakit' || cat === 'sick') {
    return {
      status: 'sick',
      sub_status: null,
      entry_type: 'leave'
    };
  }

  if (code === 'dinas_luar' || cat === 'official') {
    return {
      status: 'permitted',
      sub_status: 'dinas_luar',
      entry_type: 'duty_travel'
    };
  }

  if (code === 'izin' || code === 'izin_pribadi' || cat === 'permit') {
    return {
      status: 'permitted',
      sub_status: 'izin',
      entry_type: 'leave'
    };
  }

  // Default: annual, special, unpaid, cuti_* -> permitted / cuti
  return {
    status: 'permitted',
    sub_status: 'cuti',
    entry_type: 'leave'
  };
}

/**
 * Resolusi status presensi harian secara murni (Pure function)
 * Aturan utama:
 * 1. Cuti disetujui menang atas absent/unspecified.
 * 2. Cuti TIDAK PERNAH menimpa status 'present' (kehadiran riil).
 * 3. Additive fields: leave_request_id, leave_type_code, leave_portion, holiday_off.
 */
function deriveDailyAttendanceStatus({
  date,
  schedule = {},
  approvedLeave = null,
  holiday = null,
  existingAttendance = null
}) {
  const isHolidayOff = Boolean(holiday && (holiday.is_off_day !== false));
  const isWeekendOff = Boolean(schedule && schedule.is_off_day);
  const isWorkDay = !isHolidayOff && !isWeekendOff;

  // 1. Jika sudah ada data presensi 'present' riil (Check-in hadir) -> JANGAN DITIMPA
  if (existingAttendance && (existingAttendance.status === 'present' || existingAttendance.check_in_time)) {
    return {
      ...existingAttendance,
      date,
      is_work_day: isWorkDay,
      holiday_off: isHolidayOff,
      holiday_name: holiday ? holiday.name : null,
      is_on_approved_leave: Boolean(approvedLeave),
      leave_request_id: existingAttendance.leave_request_id || (approvedLeave ? approvedLeave.id : null),
      leave_type_code: approvedLeave ? approvedLeave.leave_type : null,
      leave_portion: approvedLeave ? (approvedLeave.portion || approvedLeave.start_portion || 'full') : null,
      source: 'actual_present_attendance'
    };
  }

  // 2. Jika ada pengajuan cuti yang disetujui (Approved Leave)
  if (approvedLeave) {
    const mapping = mapLeaveTypeToAttendance(approvedLeave.leave_type, approvedLeave.category);
    const portion = approvedLeave.portion || approvedLeave.start_portion || 'full';

    return {
      id: existingAttendance ? existingAttendance.id : null,
      employee_id: approvedLeave.employee_id,
      school_unit_id: approvedLeave.school_unit_id || (existingAttendance ? existingAttendance.school_unit_id : null),
      attendance_date: date,
      date,
      status: mapping.status,
      sub_status: mapping.sub_status,
      entry_type: mapping.entry_type,
      leave_request_id: approvedLeave.id,
      leave_type_code: approvedLeave.leave_type,
      leave_portion: portion,
      is_late: 0,
      late_minutes: 0,
      check_in_time: null,
      check_out_time: null,
      check_in_notes: approvedLeave.reason || 'Cuti disetujui',
      is_work_day: isWorkDay,
      holiday_off: isHolidayOff,
      holiday_name: holiday ? holiday.name : null,
      is_on_approved_leave: true,
      source: 'derived_approved_leave'
    };
  }

  // 3. Jika ada data presensi manual lain (mis. manual entry sick / permitted / absent)
  if (existingAttendance) {
    return {
      ...existingAttendance,
      date,
      is_work_day: isWorkDay,
      holiday_off: isHolidayOff,
      holiday_name: holiday ? holiday.name : null,
      is_on_approved_leave: false,
      leave_request_id: existingAttendance.leave_request_id || null,
      leave_type_code: null,
      leave_portion: null,
      source: 'existing_attendance'
    };
  }

  // 4. Hari libur
  if (isHolidayOff) {
    return {
      date,
      attendance_date: date,
      status: 'holiday',
      sub_status: null,
      is_work_day: false,
      holiday_off: true,
      holiday_name: holiday ? holiday.name : null,
      is_on_approved_leave: false,
      leave_request_id: null,
      leave_type_code: null,
      leave_portion: null,
      source: 'holiday'
    };
  }

  // 5. Hari libur jadwal mingguan (weekend/off)
  if (isWeekendOff) {
    return {
      date,
      attendance_date: date,
      status: 'off',
      sub_status: null,
      is_work_day: false,
      holiday_off: false,
      holiday_name: null,
      is_on_approved_leave: false,
      leave_request_id: null,
      leave_type_code: null,
      leave_portion: null,
      source: 'schedule_off'
    };
  }

  // 6. Hari kerja normal tanpa data presensi
  return {
    date,
    attendance_date: date,
    status: 'absent',
    sub_status: null,
    is_work_day: true,
    holiday_off: false,
    holiday_name: null,
    is_on_approved_leave: false,
    leave_request_id: null,
    leave_type_code: null,
    leave_portion: null,
    source: 'unspecified_absent'
  };
}

module.exports = {
  mapLeaveTypeToAttendance,
  deriveDailyAttendanceStatus
};
