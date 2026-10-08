/**
 * Calendar & Effective Work Schedule Service (Optimized for Batch / Monthly Calculation)
 * Modul Kepegawaian - Perhitungan Kalender Kerja Efektif, Hari Libur & Resolusi Jadwal
 */
const db = require('../../../config/db/kepegawaian');

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const holidayService = require('../leave/holidayService');
const { formatDbDate } = require('../leave/dateHelper');
const { mapLeaveTypeToAttendance } = require('./attendanceLeaveMapper');

class CalendarService {
  /**
   * Resolusi jadwal kerja pegawai untuk tanggal spesifik (Single Query)
   */
  async resolveEmployeeSchedule(employeeId, schoolUnitId, dateStr) {
    const targetDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    const dayName = DAYS_MAP[targetDate.getDay()];

    const customAssignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: 1 })
      .first();

    return this._computeScheduleForDay(customAssignment, schoolUnitId, dayName, null);
  }

  /**
   * Helper internal untuk komputasi jadwal per hari di RAM
   */
  _computeScheduleForDay(customAssignment, schoolUnitId, dayName, massSchedule = null) {
    // 1. Cek penugasan custom khusus pegawai
    if (customAssignment) {
      if (customAssignment.custom_day_schedules) {
        let parsedDays = customAssignment.custom_day_schedules;
        if (typeof parsedDays === 'string') {
          try { parsedDays = JSON.parse(parsedDays); } catch (e) { parsedDays = null; }
        }
        if (parsedDays && parsedDays[dayName]) {
          const cfg = parsedDays[dayName];
          return {
            id: customAssignment.id,
            name: customAssignment.assignment_type === 'flexible' ? 'Jadwal Fleksibel' : 'Jadwal Khusus Pegawai',
            schedule_type: customAssignment.assignment_type || 'custom',
            day_of_week: dayName,
            start_time: cfg.start_time || '07:30:00',
            end_time: cfg.end_time || '16:30:00',
            late_tolerance_minutes: cfg.late_tolerance_minutes !== undefined ? cfg.late_tolerance_minutes : 5,
            early_departure_tolerance_minutes: cfg.early_departure_tolerance_minutes !== undefined ? cfg.early_departure_tolerance_minutes : 5,
            flexible_target_hours: customAssignment.flexible_target_hours || '8.00',
            is_off_day: cfg.is_off || false,
            source: 'custom_assignment_day_schedule'
          };
        }
      }
    }

    // 2. Default fallback ke master schedule massal unit
    if (massSchedule) {
      const isOff = !this._isDayActiveInSchedule(massSchedule, dayName);
      return {
        ...massSchedule,
        is_off_day: isOff,
        source: 'unit_mass_schedule'
      };
    }

    // 3. Fallback default reguler (Senin - Jumat kerja, Sabtu - Minggu libur)
    const isWeekend = (dayName === 'sunday' || dayName === 'saturday');
    return {
      id: null,
      name: 'Default Reguler (07:30 - 16:30)',
      schedule_type: 'massal',
      day_of_week: dayName,
      start_time: '07:30:00',
      end_time: '16:30:00',
      late_tolerance_minutes: 5,
      early_departure_tolerance_minutes: 5,
      flexible_target_hours: '8.00',
      is_off_day: isWeekend,
      source: 'system_default'
    };
  }

  _isDayActiveInSchedule(schedule, dayName) {
    if (schedule.custom_day_schedules) {
      let cds = schedule.custom_day_schedules;
      if (typeof cds === 'string') {
        try { cds = JSON.parse(cds); } catch (e) { cds = null; }
      }
      if (cds && cds[dayName]) {
        return !cds[dayName].is_off;
      }
    }

    if (schedule.days_of_week) {
      let dow = schedule.days_of_week;
      if (typeof dow === 'string') {
        try { dow = JSON.parse(dow); } catch (e) { dow = []; }
      }
      if (Array.isArray(dow) && dow.length > 0) {
        return dow.includes(dayName);
      }
    }

    if (schedule.day_of_week) {
      return schedule.day_of_week === dayName;
    }

    return dayName !== 'sunday' && dayName !== 'saturday';
  }

  /**
   * Cek apakah tanggal merupakan hari libur nasional/sekolah
   */
  async isHoliday(dateStr, schoolUnitId = null) {
    try {
      const res = await holidayService.getHolidays({
        date_from: dateStr,
        date_to: dateStr,
        school_unit_id: schoolUnitId,
        review_status: 'confirmed'
      });
      const match = res.data && res.data.find(h => h.is_off_day);
      if (match) {
        return {
          is_holiday: true,
          holiday_name: match.name,
          holiday: match
        };
      }
    } catch (e) {
      // Fallback
    }

    return {
      is_holiday: false,
      holiday_name: null
    };
  }

  /**
   * Menghitung daftar hari kerja efektif untuk pegawai dalam rentang tanggal (In-Memory Batch Execution)
   */
  async getEffectiveWorkDays(employeeId, schoolUnitId, startDateStr, endDateStr) {
    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T00:00:00`);

    // Fetch assignment, template schedule, approved leaves, dan libur efektif HANYA SEKALI
    const [customAssignment, massSchedule, approvedLeaves, offHolidaysMap] = await Promise.all([
      db('employee_work_schedule_assignments')
        .where({ employee_id: employeeId, is_active: 1 })
        .first(),
      db('attendance_work_schedules')
        .where({ is_active: 1, schedule_type: 'massal' })
        .modify(qb => { if (schoolUnitId) qb.where('satuan_pendidikan_id', schoolUnitId); })
        .first(),
      db('employee_leave_requests')
        .where({ employee_id: employeeId, status: 'approved' })
        .where('start_date', '<=', endDateStr)
        .where('end_date', '>=', startDateStr),
      holidayService.getOffDaysForEmployee(employeeId, schoolUnitId, startDateStr, endDateStr).catch(() => ({}))
    ]);

    const workDays = [];
    const curr = new Date(start);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      const dayName = DAYS_MAP[curr.getDay()];

      const schedule = this._computeScheduleForDay(customAssignment, schoolUnitId, dayName, massSchedule);

      const leave = approvedLeaves.find(l => {
        const lStart = formatDbDate(l.start_date);
        const lEnd = formatDbDate(l.end_date);
        return dStr >= lStart && dStr <= lEnd;
      });

      const leaveMapping = leave ? mapLeaveTypeToAttendance(leave.leave_type) : null;

      const holidaysForDay = (offHolidaysMap && offHolidaysMap[dStr]) || [];
      const isHolidayOff = holidaysForDay.length > 0;
      const firstHoliday = holidaysForDay[0] || null;

      const isWorkDay = !schedule.is_off_day && !isHolidayOff;

      workDays.push({
        date: dStr,
        day_of_week: dayName,
        is_work_day: isWorkDay,
        is_off_day: schedule.is_off_day,
        is_holiday: isHolidayOff,
        holiday_name: firstHoliday ? firstHoliday.name : null,
        holiday_off: isHolidayOff,
        holidays: holidaysForDay,
        is_on_approved_leave: !!leave,
        leave_info: leave ? { id: leave.id, leave_type: leave.leave_type, reason: leave.reason } : null,
        leave_request_id: leave ? leave.id : null,
        leave_type_code: leave ? leave.leave_type : null,
        leave_portion: leave ? (leave.start_portion || 'full') : null,
        attendance_status: leave ? leaveMapping.status : (isHolidayOff ? 'holiday' : (schedule.is_off_day ? 'off' : 'present')),
        attendance_sub_status: leave ? leaveMapping.sub_status : null,
        schedule
      });

      curr.setDate(curr.getDate() + 1);
    }

    return workDays;
  }

  /**
   * Helper konversi 'HH:MM:SS' atau 'HH:MM' ke total menit
   */
  parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  /**
   * Hitung keterlambatan (is_late & late_minutes)
   */
  calculateLateMinutes(checkInTime, scheduleStartTime, lateToleranceMinutes = 0) {
    if (!checkInTime || !scheduleStartTime) {
      return { is_late: false, late_minutes: 0 };
    }
    const checkInMins = this.parseTimeToMinutes(checkInTime);
    const startMins = this.parseTimeToMinutes(scheduleStartTime);
    const tolerance = parseInt(lateToleranceMinutes, 10) || 0;
    const lateCutoff = startMins + tolerance;

    if (checkInMins > lateCutoff) {
      return {
        is_late: true,
        late_minutes: checkInMins - startMins
      };
    }
    return { is_late: false, late_minutes: 0 };
  }

  /**
   * Hitung pulang cepat (is_early_departure & early_departure_minutes)
   */
  calculateEarlyDepartureMinutes(checkOutTime, scheduleEndTime, earlyToleranceMinutes = 0) {
    if (!checkOutTime || !scheduleEndTime) {
      return { is_early_departure: false, early_departure_minutes: 0 };
    }
    const checkOutMins = this.parseTimeToMinutes(checkOutTime);
    const endMins = this.parseTimeToMinutes(scheduleEndTime);
    const tolerance = parseInt(earlyToleranceMinutes, 10) || 0;
    const earlyCutoff = endMins - tolerance;

    if (checkOutMins < earlyCutoff) {
      return {
        is_early_departure: true,
        early_departure_minutes: endMins - checkOutMins
      };
    }
    return { is_early_departure: false, early_departure_minutes: 0 };
  }
}

module.exports = new CalendarService();
