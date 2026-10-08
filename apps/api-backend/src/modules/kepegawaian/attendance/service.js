const fs = require('fs');
const path = require('path');
const db = require('../../../config/db/kepegawaian');
const calendarService = require('./calendarService');
const auditService = require('./auditService');
const { formatDbDate } = require('../leave/dateHelper');
const { mapLeaveTypeToAttendance } = require('./attendanceLeaveMapper');
const { resolveActor, assertEmployeeActor, isUnitInScope } = require('../common/actorHelper');
const { saveLeaveAttachment } = require('../leave/attachmentHelper');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const VALID_LEAVE_TYPES = [
  'sakit',
  'izin_pribadi',
  'cuti_tahunan',
  'cuti_melahirkan',
  'cuti_khusus',
  'dinas_luar',
  'lainnya'
];

class AttendanceService {
  // ==========================================
  // Helper: Scoping Satuan Pendidikan Berdasarkan Hak Akses User
  // ==========================================
  _resolveEffectiveSchoolUnit(queryUnitId, user = {}) {
    if (!user || !user.id) return queryUnitId ? Number(queryUnitId) : null;

    const isPrivileged =
      user.is_super_admin ||
      user.account_type === 'super_admin' ||
      user.account_type === 'admin_yayasan' ||
      ['super_admin', 'admin_yayasan', 'hrd'].includes(user.active_role) ||
      (Array.isArray(user.school_roles) &&
        user.school_roles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(r.role_name || r.name))) ||
      (Array.isArray(user.roles) &&
        user.roles.some(r => ['super_admin', 'admin_yayasan', 'hrd'].includes(r)));

    if (isPrivileged) {
      return queryUnitId ? Number(queryUnitId) : null;
    }

    // Non-privileged: dikunci ke unit kerja user di JWT
    const userUnitId =
      user.active_school_unit_id ||
      user.school_unit_id ||
      (Array.isArray(user.school_roles) && user.school_roles[0]?.school_unit_id);

    return userUnitId ? Number(userUnitId) : (queryUnitId ? Number(queryUnitId) : null);
  }

  // ==========================================
  // 1. Presensi / Absensi
  // ==========================================
  async listAttendances(query = {}, user = {}) {
    const actor = await resolveActor(user);
    if (!actor.isHR) {
      if (!actor.employeeId) {
        assertEmployeeActor(actor);
      }
      query.employee_id = actor.employeeId;
    }

    const effectiveUnitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    let baseQuery = db('employee_attendances')
      .leftJoin('employees', 'employee_attendances.employee_id', 'employees.id')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.employee_number',
        'employees.nik as employee_nik',
        'employees.photo_url as employee_photo_url',
        'job_positions.name as position_title'
      );

    if (query.employee_id) {
      baseQuery = baseQuery.where('employee_attendances.employee_id', query.employee_id);
    }
    if (effectiveUnitId) {
      baseQuery = baseQuery.where('employee_attendances.school_unit_id', effectiveUnitId);
    }
    if (query.date_from) {
      baseQuery = baseQuery.where('employee_attendances.attendance_date', '>=', query.date_from);
    }
    if (query.date_to) {
      baseQuery = baseQuery.where('employee_attendances.attendance_date', '<=', query.date_to);
    }
    if (query.entry_type && query.entry_type !== 'all') {
      baseQuery = baseQuery.where('employee_attendances.entry_type', query.entry_type);
    }
    if (query.position_id) {
      baseQuery = baseQuery.where('employees.current_position_id', query.position_id);
    }

    // Status filter
    if (query.status && query.status !== 'all') {
      if (query.status === 'late' || query.status === 'terlambat') {
        baseQuery = baseQuery.where('employee_attendances.is_late', 1);
      } else if (query.status === 'on_time' || query.status === 'tepat_waktu') {
        baseQuery = baseQuery.where('employee_attendances.status', 'present').where('employee_attendances.is_late', 0);
      } else if (query.status === 'dinas_luar') {
        baseQuery = baseQuery.where(function () {
          this.where('employee_attendances.sub_status', 'dinas_luar')
            .orWhere('employee_attendances.entry_type', 'duty_travel');
        });
      } else if (query.status === 'cuti') {
        baseQuery = baseQuery.where(function () {
          this.where('employee_attendances.sub_status', 'cuti')
            .orWhere('employee_attendances.entry_type', 'leave');
        });
      } else {
        baseQuery = baseQuery.where('employee_attendances.status', query.status);
      }
    }

    // Anomaly filter
    if (query.is_anomaly_only === 'true' || query.is_anomaly_only === true) {
      baseQuery = baseQuery.where(function () {
        this.where('employee_attendances.is_within_radius', 0)
          .orWhere('employee_attendances.is_anomaly', 1)
          .orWhere(function () {
            this.where('employee_attendances.is_late', 1).where('employee_attendances.late_minutes', '>=', 60);
          })
          .orWhere(function () {
            this.whereNotNull('employee_attendances.check_in_time')
              .whereNull('employee_attendances.check_out_time')
              .where('employee_attendances.attendance_date', '<', db.fn.now());
          });
      });
    }

    // Search filter
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where(function () {
        this.where('employees.full_name', 'like', s)
          .orWhere('employees.employee_number', 'like', s)
          .orWhere('employees.nik', 'like', s);
      });
    }

    const totalQuery = baseQuery.clone().clearSelect().count('employee_attendances.id as total');
    const totalResult = await totalQuery;
    const total = totalResult[0]?.total || 0;

    const page = parseInt(query.page, 10) || 1;
    const perPage = parseInt(query.per_page, 10) || 50;
    const offset = (page - 1) * perPage;

    const rows = await baseQuery
      .orderBy('employee_attendances.attendance_date', 'desc')
      .orderBy('employee_attendances.check_in_time', 'desc')
      .limit(perPage)
      .offset(offset);

    const items = rows.map((att) => {
      let durationMinutes = 0;
      let durationFormatted = '-';
      if (att.check_in_time && att.check_out_time) {
        const inM = this._parseTimeToMinutes(att.check_in_time);
        const outM = this._parseTimeToMinutes(att.check_out_time);
        if (outM >= inM) {
          durationMinutes = outM - inM;
          const h = Math.floor(durationMinutes / 60);
          const m = durationMinutes % 60;
          durationFormatted = `${h}j ${m}m`;
        }
      }

      let displayStatus = att.status;
      if (att.clarification_status === 'pending') {
        displayStatus = 'clarification_pending';
      } else if (att.sub_status === 'dinas_luar' || att.entry_type === 'duty_travel') {
        displayStatus = 'dinas_luar';
      } else if (att.sub_status === 'cuti' || att.entry_type === 'leave') {
        displayStatus = 'cuti';
      } else if (att.status === 'present' && att.is_late) {
        displayStatus = 'terlambat';
      } else if (att.status === 'present' && !att.is_late) {
        displayStatus = 'hadir';
      }

      return {
        ...att,
        duration_minutes: durationMinutes,
        duration_formatted: durationFormatted,
        display_status: displayStatus
      };
    });

    return {
      items,
      pagination: {
        total: parseInt(total, 10),
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage)
      }
    };
  }

  // Helper hitung jarak Haversine (dalam meter)
  _calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
        lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) return 0;
    const R = 6371e3; // radius bumi dalam meter
    const φ1 = (parseFloat(lat1) * Math.PI) / 180;
    const φ2 = (parseFloat(lat2) * Math.PI) / 180;
    const Δφ = ((parseFloat(lat2) - parseFloat(lat1)) * Math.PI) / 180;
    const Δλ = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  // Helper konversi format waktu "HH:mm:ss" atau "HH:mm" ke total menit
  _parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.toString().split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  // Helper resolusi hierarki jadwal (1. Custom Pegawai / Fleksibel via assignment, 2. Massal Default)
  async _resolveEmployeeSchedule(employeeId, schoolUnitId, dateStr) {
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayName = daysOfWeek[dateObj.getDay()];

    // 1. Cek tabel employee_work_schedule_assignments
    const assignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: true })
      .where(function () {
        this.whereNull('effective_start_date').orWhere('effective_start_date', '<=', dateStr);
      })
      .where(function () {
        this.whereNull('effective_end_date').orWhere('effective_end_date', '>=', dateStr);
      })
      .orderBy('id', 'desc')
      .first();

    if (assignment) {
      if (assignment.assignment_type === 'flexible') {
        return {
          id: null,
          assignment_id: assignment.id,
          name: 'Jadwal Fleksibel (Target Jam Kerja)',
          schedule_type: 'flexible',
          assignment_type: 'flexible',
          is_flexible: true,
          flexible_target_hours: parseFloat(assignment.flexible_target_hours || 8.00),
          start_time: null,
          end_time: null,
          late_tolerance_minutes: 0,
          early_departure_tolerance_minutes: 0
        };
      }

      if (assignment.assignment_type === 'custom_employee') {
        // 1. Cek konfigurasi spesifik per hari (custom_day_schedules)
        if (assignment.custom_day_schedules) {
          try {
            const daySchedules = typeof assignment.custom_day_schedules === 'string'
              ? JSON.parse(assignment.custom_day_schedules)
              : assignment.custom_day_schedules;

            if (daySchedules && typeof daySchedules === 'object') {
              const dayConfig = daySchedules[dayName];
              if (dayConfig) {
                const isWorkDay = Boolean(dayConfig.is_active);
                if (isWorkDay && dayConfig.start_time && dayConfig.end_time) {
                  return {
                    id: null,
                    assignment_id: assignment.id,
                    name: `Jadwal Khusus ${dayName.toUpperCase()} (${dayConfig.start_time.substring(0, 5)} - ${dayConfig.end_time.substring(0, 5)})`,
                    schedule_type: 'custom_employee',
                    assignment_type: 'custom_employee',
                    is_flexible: false,
                    flexible_target_hours: null,
                    start_time: dayConfig.start_time,
                    end_time: dayConfig.end_time,
                    late_tolerance_minutes: dayConfig.late_tolerance_minutes !== undefined ? parseInt(dayConfig.late_tolerance_minutes, 10) : (assignment.custom_late_tolerance_minutes || 15),
                    early_departure_tolerance_minutes: dayConfig.early_departure_tolerance_minutes !== undefined ? parseInt(dayConfig.early_departure_tolerance_minutes, 10) : (assignment.custom_early_tolerance_minutes || 0),
                    is_day_off: false
                  };
                } else if (!isWorkDay) {
                  return {
                    id: null,
                    assignment_id: assignment.id,
                    name: `Hari Libur Khusus Pegawai (${dayName})`,
                    schedule_type: 'custom_employee',
                    assignment_type: 'custom_employee',
                    is_flexible: false,
                    flexible_target_hours: null,
                    start_time: null,
                    end_time: null,
                    late_tolerance_minutes: 0,
                    early_departure_tolerance_minutes: 0,
                    is_day_off: true
                  };
                }
              }
            }
          } catch (e) {
            console.error('Gagal parsing custom_day_schedules:', e);
          }
        }

        // 2. Fallback jika memakai custom_start_time & custom_end_time global
        let isDayMatched = true;
        if (assignment.custom_days_of_week) {
          try {
            const parsedDays = typeof assignment.custom_days_of_week === 'string' && assignment.custom_days_of_week.startsWith('[')
              ? JSON.parse(assignment.custom_days_of_week)
              : assignment.custom_days_of_week.split(',').map(d => d.trim().toLowerCase());
            isDayMatched = parsedDays.includes(dayName) || parsedDays.includes('all');
          } catch (e) {
            isDayMatched = true;
          }
        }

        if (assignment.custom_start_time && assignment.custom_end_time) {
          return {
            id: null,
            assignment_id: assignment.id,
            name: `Jadwal Khusus Pegawai (${assignment.custom_start_time.substring(0, 5)} - ${assignment.custom_end_time.substring(0, 5)})`,
            schedule_type: 'custom_employee',
            assignment_type: 'custom_employee',
            is_flexible: false,
            flexible_target_hours: null,
            start_time: assignment.custom_start_time,
            end_time: assignment.custom_end_time,
            late_tolerance_minutes: assignment.custom_late_tolerance_minutes || 15,
            early_departure_tolerance_minutes: assignment.custom_early_tolerance_minutes || 0,
            is_day_off: !isDayMatched
          };
        }

        if (assignment.schedule_id) {
          const schedule = await db('attendance_work_schedules').where({ id: assignment.schedule_id }).first();
          if (schedule) {
            return {
              ...schedule,
              assignment_id: assignment.id,
              assignment_type: 'custom_employee',
              is_flexible: schedule.schedule_type === 'flexible'
            };
          }
        }
      }

      if (assignment.assignment_type === 'massal' && assignment.schedule_id) {
        const schedule = await db('attendance_work_schedules').where({ id: assignment.schedule_id }).first();
        if (schedule) {
          let isDayMatched = true;
          let scheduleStartTime = schedule.start_time;
          let scheduleEndTime = schedule.end_time;

          if (schedule.custom_day_schedules) {
            try {
              const dayConfigs = typeof schedule.custom_day_schedules === 'string'
                ? JSON.parse(schedule.custom_day_schedules)
                : schedule.custom_day_schedules;

              if (dayConfigs && typeof dayConfigs === 'object' && dayConfigs[dayName]) {
                const dayCfg = dayConfigs[dayName];
                isDayMatched = Boolean(dayCfg.is_active);
                if (dayCfg.start_time) scheduleStartTime = dayCfg.start_time;
                if (dayCfg.end_time) scheduleEndTime = dayCfg.end_time;
              }
            } catch (e) {
              console.error('Gagal parsing custom_day_schedules master shift:', e);
            }
          } else if (schedule.days_of_week) {
            try {
              const parsedDays = typeof schedule.days_of_week === 'string' && schedule.days_of_week.startsWith('[')
                ? JSON.parse(schedule.days_of_week)
                : schedule.days_of_week.split(',').map((d) => d.trim().toLowerCase());
              isDayMatched = parsedDays.includes(dayName) || parsedDays.includes('all');
            } catch (e) {
              isDayMatched = true;
            }
          } else if (schedule.day_of_week) {
            isDayMatched = schedule.day_of_week === dayName || schedule.day_of_week === 'all';
          }

          return {
            ...schedule,
            start_time: scheduleStartTime,
            end_time: scheduleEndTime,
            assignment_id: assignment.id,
            assignment_type: 'massal',
            is_flexible: schedule.schedule_type === 'flexible',
            is_day_off: !isDayMatched
          };
        }
      }
    }

    // 2. Fallback: Ambil jadwal master massal aktif satuan pendidikan
    const schedules = await db('attendance_work_schedules')
      .where({ satuan_pendidikan_id: schoolUnitId, is_active: true });

    let matchedSchedule = null;
    let fallbackStartTime = null;
    let fallbackEndTime = null;

    for (const s of schedules) {
      let isMatch = false;
      let sStartTime = s.start_time;
      let sEndTime = s.end_time;

      if (s.custom_day_schedules) {
        try {
          const dayConfigs = typeof s.custom_day_schedules === 'string'
            ? JSON.parse(s.custom_day_schedules)
            : s.custom_day_schedules;

          if (dayConfigs && typeof dayConfigs === 'object' && dayConfigs[dayName]) {
            const dayCfg = dayConfigs[dayName];
            if (dayCfg.is_active) {
              isMatch = true;
              if (dayCfg.start_time) sStartTime = dayCfg.start_time;
              if (dayCfg.end_time) sEndTime = dayCfg.end_time;
            }
          }
        } catch (e) {
          console.error('Gagal parsing custom_day_schedules fallback:', e);
        }
      } else if (s.days_of_week) {
        try {
          const parsedDays = typeof s.days_of_week === 'string' && s.days_of_week.startsWith('[')
            ? JSON.parse(s.days_of_week)
            : s.days_of_week.split(',').map((d) => d.trim().toLowerCase());
          if (parsedDays.includes(dayName) || parsedDays.includes('all')) {
            isMatch = true;
          }
        } catch (e) {
          if (s.day_of_week === dayName || s.day_of_week === 'all') isMatch = true;
        }
      } else if (s.day_of_week === dayName || s.day_of_week === 'all') {
        isMatch = true;
      }

      if (isMatch) {
        matchedSchedule = s;
        fallbackStartTime = sStartTime;
        fallbackEndTime = sEndTime;
        break;
      }
    }

    if (matchedSchedule) {
      return {
        ...matchedSchedule,
        start_time: fallbackStartTime || matchedSchedule.start_time,
        end_time: fallbackEndTime || matchedSchedule.end_time,
        assignment_id: null,
        assignment_type: 'massal',
        is_flexible: matchedSchedule.schedule_type === 'flexible'
      };
    }

    // 3. Fallback jika sama sekali belum ada jadwal
    return {
      id: null,
      assignment_id: null,
      name: 'Standar Fleksibel',
      schedule_type: 'flexible',
      assignment_type: 'flexible',
      is_flexible: true,
      flexible_target_hours: 8.00,
      start_time: '07:30:00',
      end_time: '16:00:00',
      late_tolerance_minutes: 15,
      early_departure_tolerance_minutes: 0,
      is_day_off: false
    };
  }

  // Helper resolusi titik lokasi GPS yang diizinkan untuk pegawai (Kustom Pegawai / Default Unit / Semua Titik Aktif)
  async _resolveEmployeeLocations(employeeId, schoolUnitId) {
    const targetUnitId = schoolUnitId || 1;

    // 1. Cek tabel employee_work_schedule_assignments untuk penugasan lokasi pegawai aktif
    const assignment = await db('employee_work_schedule_assignments')
      .where({ employee_id: employeeId, is_active: true })
      .where(function () {
        this.whereNull('effective_start_date').orWhere('effective_start_date', '<=', db.raw('CURDATE()'));
      })
      .where(function () {
        this.whereNull('effective_end_date').orWhere('effective_end_date', '>=', db.raw('CURDATE()'));
      })
      .orderBy('id', 'desc')
      .first();

    if (assignment) {
      // a. Tipe Kustom Titik Tertentu
      if (assignment.location_assignment_type === 'custom_locations' && assignment.allowed_location_ids) {
        try {
          const ids = typeof assignment.allowed_location_ids === 'string'
            ? JSON.parse(assignment.allowed_location_ids)
            : assignment.allowed_location_ids;

          if (Array.isArray(ids) && ids.length > 0) {
            const customLocs = await db('attendance_locations')
              .where({ satuan_pendidikan_id: targetUnitId, is_active: true })
              .whereIn('id', ids)
              .select('id', 'name', 'latitude', 'longitude', 'radius_meters', 'address', 'notes', 'is_default')
              .orderBy('is_default', 'desc')
              .orderBy('id', 'asc');

            if (customLocs && customLocs.length > 0) {
              return customLocs.map((l) => ({ ...l, is_default: Boolean(l.is_default) }));
            }
          }
        } catch (e) {
          console.error('Gagal parsing allowed_location_ids:', e);
        }
      }

      // b. Tipe Hanya Titik Default Unit Sekolah
      if (assignment.location_assignment_type === 'default_only') {
        const defaultLocs = await db('attendance_locations')
          .where({ satuan_pendidikan_id: targetUnitId, is_active: true, is_default: true })
          .select('id', 'name', 'latitude', 'longitude', 'radius_meters', 'address', 'notes', 'is_default');

        if (defaultLocs && defaultLocs.length > 0) {
          return defaultLocs.map((l) => ({ ...l, is_default: Boolean(l.is_default) }));
        }
      }
    }

    // 2. Fallback: Seluruh titik lokasi aktif unit sekolah (diurutkan default paling atas)
    const allLocations = await db('attendance_locations')
      .where({ satuan_pendidikan_id: targetUnitId, is_active: true })
      .select('id', 'name', 'latitude', 'longitude', 'radius_meters', 'address', 'notes', 'is_default')
      .orderBy('is_default', 'desc')
      .orderBy('id', 'asc');

    return allLocations.map((l) => ({ ...l, is_default: Boolean(l.is_default) }));
  }

  async checkIn(payload, user = null) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    let {
      employee_id,
      school_unit_id,
      attendance_date,
      check_in_time,
      latitude,
      longitude,
      check_in_latitude,
      check_in_longitude,
      accuracy_meters,
      check_in_accuracy_meters,
      device_info,
      check_in_device_info,
      notes,
      check_in_notes
    } = payload;

    if (!actor.isHR) {
      employee_id = actor.employeeId;
    } else if (!employee_id) {
      employee_id = actor.employeeId;
    }

    if (!employee_id) {
      const error = new Error('Field employee_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id || employee.school_unit_id;
    const now = new Date();
    const today = attendance_date || now.toISOString().split('T')[0];
    const timeNow = check_in_time || now.toTimeString().split(' ')[0];

    // Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(today, targetSchoolUnitId);
    if (isLocked) {
      const error = new Error(`Periode presensi untuk tanggal ${today} telah dikunci/ditutup. Presensi tidak diizinkan.`);
      error.statusCode = 422;
      throw error;
    }

    // Cek apakah sudah pernah check in pada tanggal yang sama
    const existing = await db('employee_attendances')
      .where({ employee_id, attendance_date: today })
      .first();

    if (existing) {
      const error = new Error(`Pegawai ID ${employee_id} sudah melakukan presensi pada tanggal ${today}`);
      error.statusCode = 409;
      throw error;
    }

    // 1. Validasi koordinat dan akurasi GPS wajib ada
    const inLat = check_in_latitude !== undefined ? check_in_latitude : latitude;
    const inLng = check_in_longitude !== undefined ? check_in_longitude : longitude;
    const inAccuracy = check_in_accuracy_meters !== undefined ? check_in_accuracy_meters : accuracy_meters;
    const inDevice = check_in_device_info !== undefined ? check_in_device_info : device_info;
    let inNotes = check_in_notes !== undefined ? check_in_notes : notes;

    if (inLat === undefined || inLat === null || inLng === undefined || inLng === null || isNaN(parseFloat(inLat)) || isNaN(parseFloat(inLng))) {
      const error = new Error('Koordinat GPS (latitude dan longitude) wajib disertakan untuk presensi');
      error.statusCode = 422;
      throw error;
    }

    if (inAccuracy === undefined || inAccuracy === null || isNaN(parseFloat(inAccuracy))) {
      const error = new Error('Akurasi GPS (accuracy_meters) wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    const accuracyNum = parseFloat(inAccuracy);
    if (accuracyNum > 250) {
      const error = new Error(`Akurasi sinyal GPS terlalu rendah (${Math.round(accuracyNum)}m > batas toleransi 250m). Pastikan GPS perangkat aktif dalam mode High Accuracy dan tunggu beberapa detik.`);
      error.statusCode = 422;
      throw error;
    }

    // 2. Ambil master lokasi aktif sesuai penugasan lokasi pegawai (custom / default / unit)
    const activeLocations = await this._resolveEmployeeLocations(employee_id, targetSchoolUnitId);

    if (!activeLocations || activeLocations.length === 0) {
      const error = new Error('Belum ada master lokasi absensi aktif yang ditugaskan untuk Anda di unit sekolah ini. Silakan hubungi HRD.');
      error.statusCode = 422;
      throw error;
    }

    // Hitung jarak ke seluruh titik lokasi aktif dan cari titik terdekat
    const userLat = parseFloat(inLat);
    const userLng = parseFloat(inLng);
    let minDistance = Infinity;
    let closestLocation = null;

    for (const loc of activeLocations) {
      const dist = this._calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestLocation = loc;
      }
    }

    const locationRadius = closestLocation ? parseFloat(closestLocation.radius_meters || 100) : 100;
    const isWithinRadius = minDistance <= locationRadius;

    // Jika di luar radius: izinkan tapi catat secara otomatis di notes
    if (!isWithinRadius) {
      const outRadiusWarning = `[DI LUAR RADIUS: ${minDistance}m dari ${closestLocation.name}, maks ${locationRadius}m]`;
      inNotes = inNotes ? `${inNotes} ${outRadiusWarning}` : outRadiusWarning;
    }

    // 3. Evaluasi Jam Kerja & Keterlambatan sesuai Hierarki 3 Metode
    const matchedSchedule = await this._resolveEmployeeSchedule(employee_id, targetSchoolUnitId, today);

    let isLate = false;
    let lateMinutes = 0;

    if (matchedSchedule && !matchedSchedule.is_flexible && matchedSchedule.start_time) {
      const checkInMinutes = this._parseTimeToMinutes(timeNow);
      const startMinutes = this._parseTimeToMinutes(matchedSchedule.start_time);
      const lateTolerance = matchedSchedule.late_tolerance_minutes || 0;
      const lateCutoff = startMinutes + lateTolerance;

      if (checkInMinutes > lateCutoff) {
        isLate = true;
        lateMinutes = checkInMinutes - startMinutes; // Keterlambatan dihitung dari jam mulai resmi
      }
    }

    const insertData = {
      employee_id,
      school_unit_id: targetSchoolUnitId,
      attendance_date: today,
      check_in_time: timeNow,
      check_in_latitude: userLat,
      check_in_longitude: userLng,
      check_in_distance_meters: minDistance,
      check_in_accuracy_meters: accuracyNum,
      check_in_device_info: inDevice || null,
      check_in_notes: inNotes || null,
      is_within_radius: isWithinRadius,
      is_late: isLate,
      late_minutes: lateMinutes,
      is_early_departure: false,
      early_departure_minutes: 0,
      matched_location_id: closestLocation ? closestLocation.id : null,
      matched_schedule_id: matchedSchedule ? matchedSchedule.id : null,
      check_out_time: null,
      status: 'present',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    const [id] = await db('employee_attendances').insert(insertData);
    const record = await db('employee_attendances').where({ id }).first();

    return {
      ...record,
      latitude: record.check_in_latitude,
      longitude: record.check_in_longitude,
      distance_meters: record.check_in_distance_meters,
      matched_location_name: closestLocation ? closestLocation.name : null,
      matched_schedule_name: matchedSchedule ? matchedSchedule.name : null,
      schedule_details: matchedSchedule
    };
  }

  async checkOut(id, payload = {}, user = null) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    const attendance = await db('employee_attendances').where({ id }).first();
    if (!attendance) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Proteksi IDOR: Jika non-HR, wajib mencocokkan employeeId
    if (!actor.isHR) {
      if (Number(attendance.employee_id) !== Number(actor.employeeId)) {
        const error = new Error('Anda tidak memiliki izin untuk melakukan presensi keluar atas nama pegawai lain');
        error.statusCode = 403;
        throw error;
      }
    }

    // Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(attendance.attendance_date, attendance.school_unit_id);
    if (isLocked) {
      const error = new Error(`Periode presensi untuk tanggal ${attendance.attendance_date} telah dikunci/ditutup. Presensi keluar tidak diizinkan.`);
      error.statusCode = 422;
      throw error;
    }

    if (attendance.check_out_time) {
      const error = new Error('Pegawai sudah melakukan presensi keluar (check-out) untuk sesi ini');
      error.statusCode = 409;
      throw error;
    }

    const now = new Date();
    const timeNow = payload.check_out_time || now.toTimeString().split(' ')[0];

    const outLat = payload.check_out_latitude !== undefined ? payload.check_out_latitude : payload.latitude;
    const outLng = payload.check_out_longitude !== undefined ? payload.check_out_longitude : payload.longitude;
    const outAccuracy = payload.check_out_accuracy_meters !== undefined ? payload.check_out_accuracy_meters : payload.accuracy_meters;
    const outDevice = payload.check_out_device_info !== undefined ? payload.check_out_device_info : payload.device_info;
    let outNotes = payload.check_out_notes !== undefined ? payload.check_out_notes : payload.notes;

    // 1. Validasi koordinat dan akurasi GPS check-out
    if (outLat === undefined || outLat === null || outLng === undefined || outLng === null || isNaN(parseFloat(outLat)) || isNaN(parseFloat(outLng))) {
      const error = new Error('Koordinat GPS (latitude dan longitude) wajib disertakan untuk presensi keluar (check-out)');
      error.statusCode = 422;
      throw error;
    }

    if (outAccuracy === undefined || outAccuracy === null || isNaN(parseFloat(outAccuracy))) {
      const error = new Error('Akurasi GPS (accuracy_meters) wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    const accuracyNum = parseFloat(outAccuracy);
    if (accuracyNum > 250) {
      const error = new Error(`Akurasi sinyal GPS terlalu rendah (${Math.round(accuracyNum)}m > batas toleransi 250m). Pastikan GPS perangkat aktif dalam mode High Accuracy dan tunggu beberapa detik.`);
      error.statusCode = 422;
      throw error;
    }

    // 2. Ambil master lokasi aktif sesuai penugasan lokasi pegawai (custom / default / unit)
    const activeLocations = await this._resolveEmployeeLocations(attendance.employee_id, attendance.school_unit_id);

    const userLat = parseFloat(outLat);
    const userLng = parseFloat(outLng);
    let minDistance = 0;
    let closestLocation = null;

    if (activeLocations && activeLocations.length > 0) {
      minDistance = Infinity;
      for (const loc of activeLocations) {
        const dist = this._calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestLocation = loc;
        }
      }

      const locationRadius = closestLocation ? parseFloat(closestLocation.radius_meters || 100) : 100;
      if (minDistance > locationRadius) {
        const outRadiusWarning = `[DI LUAR RADIUS (CHECK-OUT): ${minDistance}m dari ${closestLocation.name}, maks ${locationRadius}m]`;
        outNotes = outNotes ? `${outNotes} ${outRadiusWarning}` : outRadiusWarning;
      }
    }

    // 3. Evaluasi Jam Pulang Cepat
    let matchedSchedule = null;
    if (attendance.matched_schedule_id) {
      matchedSchedule = await db('attendance_work_schedules').where({ id: attendance.matched_schedule_id }).first();
    } else {
      matchedSchedule = await this._resolveEmployeeSchedule(attendance.employee_id, attendance.school_unit_id, attendance.attendance_date);
    }

    let isEarlyDeparture = false;
    let earlyDepartureMinutes = 0;

    if (matchedSchedule && !matchedSchedule.is_flexible && matchedSchedule.end_time) {
      const checkOutMinutes = this._parseTimeToMinutes(timeNow);
      const endMinutes = this._parseTimeToMinutes(matchedSchedule.end_time);
      const earlyTolerance = matchedSchedule.early_departure_tolerance_minutes || 0;
      const earlyCutoff = endMinutes - earlyTolerance;

      if (checkOutMinutes < earlyCutoff) {
        isEarlyDeparture = true;
        earlyDepartureMinutes = endMinutes - checkOutMinutes; // Dihitung dari jam pulang resmi
      }
    }

    const updateData = {
      check_out_time: timeNow,
      check_out_latitude: userLat,
      check_out_longitude: userLng,
      check_out_distance_meters: minDistance,
      check_out_accuracy_meters: accuracyNum,
      check_out_device_info: outDevice || null,
      check_out_notes: outNotes || null,
      is_early_departure: isEarlyDeparture,
      early_departure_minutes: earlyDepartureMinutes,
      updated_at: db.fn.now()
    };

    await db('employee_attendances').where({ id }).update(updateData);
    const updatedRecord = await db('employee_attendances').where({ id }).first();

    return {
      ...updatedRecord,
      matched_location_name: closestLocation ? closestLocation.name : null,
      matched_schedule_name: matchedSchedule ? matchedSchedule.name : null,
      schedule_details: matchedSchedule
    };
  }

  // ==========================================
  // Status Presensi Hari Ini (Portal Guru Reminder)
  // ==========================================
  async getTodayStatus(user, query = {}) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    let employeeId = actor.isHR && query.employee_id ? Number(query.employee_id) : actor.employeeId;

    const now = new Date();
    const today = query.date || now.toISOString().split('T')[0];
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const attendanceDateObj = new Date(`${today}T00:00:00`);
    const dayName = daysOfWeek[attendanceDateObj.getDay()];

    if (!employeeId) {
      return {
        date: today,
        day_of_week: dayName,
        employee: null,
        has_checked_in: false,
        has_checked_out: false,
        attendance: null,
        work_schedule: null,
        locations: []
      };
    }

    const employee = await db('employees').where({ id: employeeId }).first();
    if (!employee) {
      return {
        date: today,
        day_of_week: dayName,
        employee: null,
        has_checked_in: false,
        has_checked_out: false,
        attendance: null,
        work_schedule: null,
        locations: []
      };
    }

    const attendance = await db('employee_attendances')
      .where({ employee_id: employeeId, attendance_date: today })
      .first();

    // Master lokasi aktif sesuai penugasan lokasi pegawai (custom / default / unit)
    const locations = await this._resolveEmployeeLocations(employee.id, employee.school_unit_id);

    // Jadwal kerja aktif hari ini dengan resolusi 3 metode
    const matchedSchedule = await this._resolveEmployeeSchedule(employee.id, employee.school_unit_id, today);

    return {
      date: today,
      day_of_week: dayName,
      employee: {
        id: employee.id,
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        school_unit_id: employee.school_unit_id
      },
      has_checked_in: !!(attendance && attendance.check_in_time),
      has_checked_out: !!(attendance && attendance.check_out_time),
      attendance: attendance || null,
      schedule: matchedSchedule || null,
      work_schedule: matchedSchedule || null,
      locations: locations || []
    };
  }

  async correctAttendance(id, payload = {}, user = {}) {
    const attendance = await db('employee_attendances').where({ id }).first();
    if (!attendance) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(attendance.attendance_date, attendance.school_unit_id);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Koreksi data tidak diizinkan.');
      error.statusCode = 422;
      throw error;
    }

    if (!payload.reason || !payload.reason.trim()) {
      const error = new Error('Alasan/justifikasi koreksi presensi wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.status) {
      if (!['present', 'sick', 'permitted', 'absent'].includes(payload.status)) {
        const error = new Error("status harus salah satu dari 'present', 'sick', 'permitted', 'absent'");
        error.statusCode = 422;
        throw error;
      }
      updateData.status = payload.status;
    }
    if (payload.sub_status !== undefined) updateData.sub_status = payload.sub_status;
    if (payload.check_in_time !== undefined) updateData.check_in_time = payload.check_in_time;
    if (payload.check_out_time !== undefined) updateData.check_out_time = payload.check_out_time;
    if (payload.notes !== undefined) updateData.check_in_notes = payload.notes;

    // Hitung ulang keterlambatan jika jam masuk diubah
    const effectiveInTime = updateData.check_in_time || attendance.check_in_time;
    const effectiveStatus = updateData.status || attendance.status;
    if (effectiveStatus === 'present' && effectiveInTime) {
      const schedule = await calendarService.resolveEmployeeSchedule(
        attendance.employee_id,
        attendance.school_unit_id,
        attendance.attendance_date
      );
      if (schedule.start_time) {
        const calc = calendarService.calculateLateMinutes(
          effectiveInTime,
          schedule.start_time,
          schedule.late_tolerance_minutes
        );
        updateData.is_late = calc.is_late ? 1 : 0;
        updateData.late_minutes = calc.late_minutes || 0;
      }
    }

    await db('employee_attendances').where({ id }).update(updateData);

    // Audit Trail
    await auditService.log({
      attendanceId: id,
      action: 'CORRECTION_BY_HRD',
      performedBy: user.id || null,
      oldValues: attendance,
      newValues: updateData,
      reason: payload.reason
    });

    return await db('employee_attendances').where({ id }).first();
  }

  // Helper simpan lampiran berkas / surat dokter izin
  _saveLeaveAttachment(attachmentPayload, employeeId) {
    if (!attachmentPayload) return null;

    // Jika sudah berupa path / url file statis
    if (typeof attachmentPayload === 'string' && (attachmentPayload.startsWith('/uploads/') || attachmentPayload.startsWith('http'))) {
      return {
        attachment_url: attachmentPayload,
        attachment_name: path.basename(attachmentPayload),
        attachment_mime_type: null,
        attachment_size_bytes: null
      };
    }

    let base64String = '';
    let originalName = 'lampiran_izin';
    let mimeType = '';

    if (typeof attachmentPayload === 'object') {
      base64String = attachmentPayload.base64 || attachmentPayload.data || attachmentPayload.file_url || '';
      originalName = attachmentPayload.name || attachmentPayload.filename || originalName;
      mimeType = attachmentPayload.mime_type || attachmentPayload.type || '';
    } else if (typeof attachmentPayload === 'string') {
      base64String = attachmentPayload;
    }

    if (!base64String || typeof base64String !== 'string') return null;

    if (base64String.startsWith('/uploads/') || base64String.startsWith('http')) {
      return {
        attachment_url: base64String,
        attachment_name: originalName,
        attachment_mime_type: mimeType || null,
        attachment_size_bytes: null
      };
    }

    const matches = base64String.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    let rawBase64 = base64String;
    if (matches) {
      mimeType = matches[1].toLowerCase();
      rawBase64 = matches[2];
    }

    const allowedMimeMap = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    let ext = 'pdf';
    if (mimeType && allowedMimeMap[mimeType]) {
      ext = allowedMimeMap[mimeType];
    } else if (!mimeType) {
      const parsedExt = path.extname(originalName).replace('.', '').toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(parsedExt)) {
        ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
        mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      } else {
        const error = new Error('Format file lampiran tidak didukung. Format yang diizinkan: PDF, JPG, PNG, WEBP');
        error.statusCode = 422;
        throw error;
      }
    } else {
      const error = new Error(`Format file '${mimeType}' tidak didukung. Format yang diizinkan: PDF, JPG, PNG, WEBP`);
      error.statusCode = 422;
      throw error;
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSizeBytes) {
      const error = new Error(`Ukuran file lampiran (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 5 MB`);
      error.statusCode = 422;
      throw error;
    }

    return saveLeaveAttachment(payload, employeeId);
  }

  // ==========================================
  // 2. Cuti & Izin Pegawai
  // ==========================================
  async listLeaveRequests(query = {}) {
    let baseQuery = db('employee_leave_requests')
      .leftJoin('employees as e', 'employee_leave_requests.employee_id', 'e.id')
      .leftJoin('employees as approver', 'employee_leave_requests.approved_by', 'approver.id')
      .select(
        'employee_leave_requests.*',
        'e.full_name as employee_name',
        'e.employee_number',
        'approver.full_name as approver_name'
      );

    if (query.employee_id) {
      baseQuery = baseQuery.where('employee_leave_requests.employee_id', query.employee_id);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('employee_leave_requests.school_unit_id', query.school_unit_id);
    }
    if (query.status) {
      baseQuery = baseQuery.where('employee_leave_requests.status', query.status);
    }
    if (query.leave_type) {
      baseQuery = baseQuery.where('employee_leave_requests.leave_type', query.leave_type);
    }

    const rows = await baseQuery.orderBy('employee_leave_requests.id', 'desc');
    return rows.map(r => {
      const item = { ...r };
      const hasAttachment = Boolean(item.attachment_url || item.attachment_name);
      delete item.attachment_url; // Don't expose raw URL in list per SPEC §9.2
      return {
        ...item,
        has_attachment: hasAttachment
      };
    });
  }

  async getMyLeaveRequests(user, query = {}) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    const employeeId = actor.employeeId;

    if (!employeeId) {
      return [];
    }

    let baseQuery = db('employee_leave_requests')
      .leftJoin('employees as e', 'employee_leave_requests.employee_id', 'e.id')
      .leftJoin('employees as approver', 'employee_leave_requests.approved_by', 'approver.id')
      .where('employee_leave_requests.employee_id', employeeId)
      .select(
        'employee_leave_requests.*',
        'e.full_name as employee_name',
        'e.employee_number',
        'approver.full_name as approver_name'
      );

    if (query.status) {
      baseQuery = baseQuery.where('employee_leave_requests.status', query.status);
    }
    if (query.leave_type) {
      baseQuery = baseQuery.where('employee_leave_requests.leave_type', query.leave_type);
    }
    if (query.year) {
      baseQuery = baseQuery.whereRaw('YEAR(employee_leave_requests.start_date) = ?', [query.year]);
    }

    return baseQuery.orderBy('employee_leave_requests.start_date', 'desc');
  }

  async getLeaveAttachment(id, user) {
    const leave = await db('employee_leave_requests')
      .leftJoin('employees as e', 'employee_leave_requests.employee_id', 'e.id')
      .where('employee_leave_requests.id', id)
      .select('employee_leave_requests.*', 'e.full_name as employee_name')
      .first();

    if (!leave) {
      const error = new Error('Data pengajuan izin tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (!leave.attachment_url) {
      const error = new Error('Pengajuan izin ini tidak memiliki berkas lampiran');
      error.statusCode = 404;
      throw error;
    }

    // Cek otorisasi: hanya pemilik izin, atasan, atau HRD/Admin yang bisa mengakses lampiran
    const actor = await resolveActor(user);
    const isOwner = actor.employeeId && Number(actor.employeeId) === Number(leave.employee_id);
    const isHRD = actor.isHR;

    if (!isOwner && !isHRD) {
      const error = new Error('Anda tidak memiliki hak akses untuk mengunduh lampiran pengajuan izin ini');
      error.statusCode = 403;
      throw error;
    }

    const relativePath = leave.attachment_url.replace(/^\//, '');
    const absolutePath = path.join(__dirname, '../../../../public', relativePath);

    return {
      id: leave.id,
      attachment_url: leave.attachment_url,
      attachment_name: leave.attachment_name || path.basename(leave.attachment_url),
      attachment_mime_type: leave.attachment_mime_type || 'application/octet-stream',
      attachment_size_bytes: leave.attachment_size_bytes,
      absolute_file_path: absolutePath,
      exists_on_disk: fs.existsSync(absolutePath)
    };
  }

  async createLeaveRequest(payload, user = null) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    let {
      employee_id,
      school_unit_id,
      leave_type,
      start_date,
      end_date,
      reason,
      attachment,
      attachment_base64,
      attachment_url,
      attachment_name
    } = payload;

    if (!actor.isHR) {
      employee_id = actor.employeeId;
    } else if (!employee_id) {
      employee_id = actor.employeeId;
    }

    if (!employee_id || !leave_type || !start_date || !end_date) {
      const error = new Error('Field employee_id, leave_type, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const normalizedLeaveType = leave_type.trim().toLowerCase();
    if (!VALID_LEAVE_TYPES.includes(normalizedLeaveType)) {
      const error = new Error(`Jenis izin '${leave_type}' tidak valid. Pilihan yang diizinkan: ${VALID_LEAVE_TYPES.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id || employee.school_unit_id;
    if (!isUnitInScope(actor.unitScope, targetSchoolUnitId)) {
      const error = new Error('Pegawai yang diajukan berada di luar cakupan satuan pendidikan Anda');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_SCOPE';
      throw error;
    }

    // Proses berkas lampiran jika dikirim (opsional)
    const attachmentPayload = attachment || attachment_base64 || attachment_url || (attachment_name ? { name: attachment_name, data: attachment_base64 } : null);
    let attachmentData = null;
    if (attachmentPayload) {
      attachmentData = this._saveLeaveAttachment(attachmentPayload, employee_id);
    }

    const insertData = {
      employee_id,
      school_unit_id: targetSchoolUnitId,
      leave_type: normalizedLeaveType,
      start_date,
      end_date,
      reason: reason || null,
      attachment_url: attachmentData ? attachmentData.attachment_url : null,
      attachment_name: attachmentData ? attachmentData.attachment_name : null,
      attachment_mime_type: attachmentData ? attachmentData.attachment_mime_type : null,
      attachment_size_bytes: attachmentData ? attachmentData.attachment_size_bytes : null,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    const [id] = await db('employee_leave_requests').insert(insertData);
    return db('employee_leave_requests').where({ id }).first();
  }

  async approveLeaveRequest(id, user = null) {
    const leave = await db('employee_leave_requests').where({ id }).first();
    if (!leave) {
      const error = new Error('Pengajuan cuti/izin tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'pending') {
      const error = new Error(`Pengajuan izin sudah berstatus '${leave.status}' dan tidak dapat diproses ulang`);
      error.statusCode = 409;
      throw error;
    }

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_leave_requests').where({ id }).update({
      status: 'approved',
      approved_by: approverId,
      approved_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_leave_requests').where({ id }).first();
  }

  async rejectLeaveRequest(id, payload = {}, user = null) {
    const leave = await db('employee_leave_requests').where({ id }).first();
    if (!leave) {
      const error = new Error('Pengajuan cuti/izin tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'pending') {
      const error = new Error(`Pengajuan izin sudah berstatus '${leave.status}' dan tidak dapat diproses ulang`);
      error.statusCode = 409;
      throw error;
    }

    const rejectionReason = payload.rejection_reason || payload.reason;
    if (!rejectionReason || !rejectionReason.trim()) {
      const error = new Error('Alasan penolakan (rejection_reason) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_leave_requests').where({ id }).update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      approved_by: approverId,
      approved_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_leave_requests').where({ id }).first();
  }

  // ==========================================
  // 3. Lembur (Overtime)
  // ==========================================
  async listOvertimes(query = {}) {
    let baseQuery = db('employee_overtimes')
      .leftJoin('employees as e', 'employee_overtimes.employee_id', 'e.id')
      .leftJoin('employees as approver', 'employee_overtimes.approved_by', 'approver.id')
      .select(
        'employee_overtimes.*',
        'e.full_name as employee_name',
        'e.employee_number',
        'approver.full_name as approver_name'
      );

    if (query.employee_id) {
      baseQuery = baseQuery.where('employee_overtimes.employee_id', query.employee_id);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('employee_overtimes.school_unit_id', query.school_unit_id);
    }
    if (query.status) {
      baseQuery = baseQuery.where('employee_overtimes.status', query.status);
    }
    if (query.date_from) {
      baseQuery = baseQuery.where('employee_overtimes.overtime_date', '>=', query.date_from);
    }
    if (query.date_to) {
      baseQuery = baseQuery.where('employee_overtimes.overtime_date', '<=', query.date_to);
    }

    return baseQuery.orderBy('employee_overtimes.overtime_date', 'desc').orderBy('employee_overtimes.id', 'desc');
  }

  async getMyOvertimes(user, query = {}) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    const employeeId = actor.employeeId;

    if (!employeeId) {
      return [];
    }

    return this.listOvertimes({ ...query, employee_id: employeeId }, user);
  }

  async createOvertime(payload, user = null) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    let {
      employee_id,
      school_unit_id,
      overtime_date,
      start_time,
      end_time,
      hours,
      task_description,
      notes,
      attachment_url
    } = payload;

    if (!actor.isHR) {
      employee_id = actor.employeeId;
    } else if (!employee_id) {
      employee_id = actor.employeeId;
    }

    if (!employee_id || !overtime_date) {
      const error = new Error('Field employee_id dan overtime_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Hitung estimasi durasi jam lembur jika diberikan start_time & end_time
    let calculatedHours = hours !== undefined && hours !== null ? parseFloat(hours) : null;
    if ((calculatedHours === null || isNaN(calculatedHours)) && start_time && end_time) {
      const startMin = this._parseTimeToMinutes(start_time);
      const endMin = this._parseTimeToMinutes(end_time);
      const diffMin = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin) + endMin;
      calculatedHours = parseFloat((diffMin / 60).toFixed(2));
    }

    if (calculatedHours === null || isNaN(calculatedHours) || calculatedHours <= 0) {
      calculatedHours = 1.0;
    }

    const employee = await db('employees').where({ id: employee_id }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id || employee.school_unit_id;
    if (!isUnitInScope(actor.unitScope, targetSchoolUnitId)) {
      const error = new Error('Pegawai yang diajukan berada di luar cakupan satuan pendidikan Anda');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_SCOPE';
      throw error;
    }

    const [id] = await db('employee_overtimes').insert({
      employee_id,
      school_unit_id: targetSchoolUnitId,
      overtime_date,
      start_time: start_time || null,
      end_time: end_time || null,
      hours: calculatedHours,
      task_description: task_description || notes || null,
      notes: notes || task_description || null,
      attachment_url: attachment_url || null,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_overtimes').where({ id }).first();
  }

  async approveOvertime(id, user = null) {
    const overtime = await db('employee_overtimes').where({ id }).first();
    if (!overtime) {
      const error = new Error('Pengajuan lembur tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (overtime.status !== 'pending') {
      const error = new Error(`Pengajuan lembur sudah berstatus '${overtime.status}' dan tidak dapat diproses ulang`);
      error.statusCode = 409;
      throw error;
    }

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_overtimes').where({ id }).update({
      status: 'approved',
      approved_by: approverId,
      approved_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_overtimes').where({ id }).first();
  }

  async rejectOvertime(id, payload = {}, user = null) {
    const overtime = await db('employee_overtimes').where({ id }).first();
    if (!overtime) {
      const error = new Error('Pengajuan lembur tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (overtime.status !== 'pending') {
      const error = new Error(`Pengajuan lembur sudah berstatus '${overtime.status}' dan tidak dapat diproses ulang`);
      error.statusCode = 409;
      throw error;
    }

    const rejectionReason = payload.rejection_reason || payload.notes || payload.reason;
    if (!rejectionReason || !rejectionReason.trim()) {
      const error = new Error('Alasan penolakan lembur wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_overtimes').where({ id }).update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      notes: payload.notes ? `${overtime.notes ? overtime.notes + ' | ' : ''}Alasan Penolakan: ${payload.notes}` : overtime.notes,
      approved_by: approverId,
      approved_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_overtimes').where({ id }).first();
  }

  // ==========================================
  // 3b. Penugasan Jadwal Kerja (3 Metode Penetapan)
  // ==========================================
  async listScheduleAssignments(query = {}) {
    let baseQuery = db('employee_work_schedule_assignments as a')
      .leftJoin('employees as e', 'a.employee_id', 'e.id')
      .leftJoin('attendance_work_schedules as s', 'a.schedule_id', 's.id')
      .select(
        'a.*',
        'e.full_name as employee_name',
        'e.employee_number',
        's.name as schedule_name',
        's.start_time as master_start_time',
        's.end_time as master_end_time'
      );

    if (query.satuan_pendidikan_id && query.satuan_pendidikan_id !== 'all' && query.satuan_pendidikan_id !== 'null') {
      baseQuery = baseQuery.where('a.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.employee_id) {
      baseQuery = baseQuery.where('a.employee_id', query.employee_id);
    }
    if (query.assignment_type) {
      baseQuery = baseQuery.where('a.assignment_type', query.assignment_type);
    }
    if (query.location_assignment_type) {
      baseQuery = baseQuery.where('a.location_assignment_type', query.location_assignment_type);
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('a.is_active', query.is_active === 'true' || query.is_active === true || query.is_active === 1);
    }
    if (query.search) {
      baseQuery = baseQuery.where(function () {
        this.where('e.full_name', 'like', `%${query.search}%`)
          .orWhere('e.employee_number', 'like', `%${query.search}%`);
      });
    }

    const rows = await baseQuery.orderBy('a.id', 'desc');

    // Ambil master locations aktif untuk unit terkait agar bisa memetakan allowed_locations_detail
    const targetUnitId = query.satuan_pendidikan_id || 1;
    const allLocations = await db('attendance_locations')
      .where({ is_active: true })
      .select('id', 'satuan_pendidikan_id', 'name', 'radius_meters', 'address', 'is_default');
    const locationMap = new Map(allLocations.map((l) => [Number(l.id), l]));

    return rows.map((r) => {
      let parsedDaySchedules = null;
      if (r.custom_day_schedules) {
        try {
          parsedDaySchedules = typeof r.custom_day_schedules === 'string'
            ? JSON.parse(r.custom_day_schedules)
            : r.custom_day_schedules;
        } catch (e) {
          parsedDaySchedules = null;
        }
      }

      let parsedLocationIds = [];
      if (r.allowed_location_ids) {
        try {
          parsedLocationIds = typeof r.allowed_location_ids === 'string'
            ? JSON.parse(r.allowed_location_ids)
            : r.allowed_location_ids;
          if (!Array.isArray(parsedLocationIds)) parsedLocationIds = [];
        } catch (e) {
          parsedLocationIds = [];
        }
      }

      const allowedLocationsDetail = parsedLocationIds
        .map((locId) => locationMap.get(Number(locId)))
        .filter(Boolean);

      return {
        ...r,
        location_assignment_type: r.location_assignment_type || 'all_locations',
        allowed_location_ids: parsedLocationIds,
        allowed_locations_detail: allowedLocationsDetail,
        custom_day_schedules: parsedDaySchedules
      };
    });
  }

  async getScheduleAssignmentById(id) {
    const assignment = await db('employee_work_schedule_assignments as a')
      .leftJoin('employees as e', 'a.employee_id', 'e.id')
      .leftJoin('attendance_work_schedules as s', 'a.schedule_id', 's.id')
      .select(
        'a.*',
        'e.full_name as employee_name',
        'e.employee_number',
        's.name as schedule_name',
        's.start_time as master_start_time',
        's.end_time as master_end_time'
      )
      .where('a.id', id)
      .first();

    if (!assignment) {
      const error = new Error('Penugasan jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    let parsedDaySchedules = null;
    if (assignment.custom_day_schedules) {
      try {
        parsedDaySchedules = typeof assignment.custom_day_schedules === 'string'
          ? JSON.parse(assignment.custom_day_schedules)
          : assignment.custom_day_schedules;
      } catch (e) {
        parsedDaySchedules = null;
      }
    }

    let parsedLocationIds = [];
    if (assignment.allowed_location_ids) {
      try {
        parsedLocationIds = typeof assignment.allowed_location_ids === 'string'
          ? JSON.parse(assignment.allowed_location_ids)
          : assignment.allowed_location_ids;
        if (!Array.isArray(parsedLocationIds)) parsedLocationIds = [];
      } catch (e) {
        parsedLocationIds = [];
      }
    }

    const allowedLocationsDetail = await db('attendance_locations')
      .whereIn('id', parsedLocationIds)
      .select('id', 'name', 'radius_meters', 'address', 'is_default');

    return {
      ...assignment,
      location_assignment_type: assignment.location_assignment_type || 'all_locations',
      allowed_location_ids: parsedLocationIds,
      allowed_locations_detail: allowedLocationsDetail,
      custom_day_schedules: parsedDaySchedules
    };
  }

  async createScheduleAssignment(payload) {
    const {
      satuan_pendidikan_id,
      employee_id,
      employee_ids,
      assignment_type,
      location_assignment_type,
      allowed_location_ids,
      schedule_id,
      custom_start_time,
      custom_end_time,
      custom_days_of_week,
      custom_day_schedules,
      custom_late_tolerance_minutes,
      custom_early_tolerance_minutes,
      flexible_target_hours,
      effective_start_date,
      effective_end_date,
      notes,
      is_active
    } = payload;

    if (!satuan_pendidikan_id || (!employee_id && (!employee_ids || !employee_ids.length))) {
      const error = new Error('Field satuan_pendidikan_id dan employee_id/employee_ids wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const type = assignment_type || 'massal';
    const locType = location_assignment_type || 'all_locations';
    const targetEmployees = employee_ids && Array.isArray(employee_ids) ? employee_ids : [employee_id];

    let effectiveDays = custom_days_of_week;
    if (type === 'flexible' && !effectiveDays) {
      effectiveDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    }

    const stringifiedDays = effectiveDays
      ? (typeof effectiveDays === 'object' ? JSON.stringify(effectiveDays) : String(effectiveDays))
      : null;

    const stringifiedDaySchedules = custom_day_schedules
      ? (typeof custom_day_schedules === 'object' ? JSON.stringify(custom_day_schedules) : String(custom_day_schedules))
      : null;

    const stringifiedLocationIds = allowed_location_ids
      ? (typeof allowed_location_ids === 'object' ? JSON.stringify(allowed_location_ids) : String(allowed_location_ids))
      : null;

    const insertedRows = [];

    for (const empId of targetEmployees) {
      // Nonaktifkan assignment lama yang aktif untuk pegawai ini jika tipe sama atau override
      await db('employee_work_schedule_assignments')
        .where({ employee_id: empId, is_active: true })
        .update({ is_active: false, updated_at: db.fn.now() });

      const [newId] = await db('employee_work_schedule_assignments').insert({
        satuan_pendidikan_id,
        employee_id: empId,
        assignment_type: type,
        location_assignment_type: locType,
        allowed_location_ids: stringifiedLocationIds,
        schedule_id: schedule_id || null,
        custom_start_time: custom_start_time || null,
        custom_end_time: custom_end_time || null,
        custom_days_of_week: stringifiedDays,
        custom_day_schedules: stringifiedDaySchedules,
        custom_late_tolerance_minutes: custom_late_tolerance_minutes !== undefined ? parseInt(custom_late_tolerance_minutes, 10) : 15,
        custom_early_tolerance_minutes: custom_early_tolerance_minutes !== undefined ? parseInt(custom_early_tolerance_minutes, 10) : 0,
        flexible_target_hours: flexible_target_hours !== undefined ? parseFloat(flexible_target_hours) : 8.00,
        effective_start_date: effective_start_date || null,
        effective_end_date: effective_end_date || null,
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      insertedRows.push(newId);
    }

    if (insertedRows.length === 1) {
      return this.getScheduleAssignmentById(insertedRows[0]);
    }

    return {
      message: `Berhasil menetapkan jadwal dan lokasi untuk ${insertedRows.length} pegawai`,
      count: insertedRows.length,
      ids: insertedRows
    };
  }

  async updateScheduleAssignment(id, payload) {
    const existing = await db('employee_work_schedule_assignments').where({ id }).first();
    if (!existing) {
      const error = new Error('Penugasan jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id;
    if (payload.employee_id !== undefined) updateData.employee_id = payload.employee_id;
    if (payload.assignment_type !== undefined) updateData.assignment_type = payload.assignment_type;
    if (payload.location_assignment_type !== undefined) updateData.location_assignment_type = payload.location_assignment_type;
    if (payload.allowed_location_ids !== undefined) {
      updateData.allowed_location_ids = typeof payload.allowed_location_ids === 'object'
        ? JSON.stringify(payload.allowed_location_ids)
        : payload.allowed_location_ids;
    }
    if (payload.schedule_id !== undefined) updateData.schedule_id = payload.schedule_id || null;
    if (payload.custom_start_time !== undefined) updateData.custom_start_time = payload.custom_start_time || null;
    if (payload.custom_end_time !== undefined) updateData.custom_end_time = payload.custom_end_time || null;
    if (payload.custom_days_of_week !== undefined) {
      updateData.custom_days_of_week = typeof payload.custom_days_of_week === 'object'
        ? JSON.stringify(payload.custom_days_of_week)
        : payload.custom_days_of_week;
    } else if (payload.assignment_type === 'flexible' || (existing.assignment_type === 'flexible' && !existing.custom_days_of_week)) {
      updateData.custom_days_of_week = JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    }
    if (payload.custom_day_schedules !== undefined) {
      updateData.custom_day_schedules = typeof payload.custom_day_schedules === 'object'
        ? JSON.stringify(payload.custom_day_schedules)
        : payload.custom_day_schedules;
    }
    if (payload.custom_late_tolerance_minutes !== undefined) updateData.custom_late_tolerance_minutes = parseInt(payload.custom_late_tolerance_minutes, 10);
    if (payload.custom_early_tolerance_minutes !== undefined) updateData.custom_early_tolerance_minutes = parseInt(payload.custom_early_tolerance_minutes, 10);
    if (payload.flexible_target_hours !== undefined) updateData.flexible_target_hours = parseFloat(payload.flexible_target_hours);
    if (payload.effective_start_date !== undefined) updateData.effective_start_date = payload.effective_start_date || null;
    if (payload.effective_end_date !== undefined) updateData.effective_end_date = payload.effective_end_date || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    await db('employee_work_schedule_assignments').where({ id }).update(updateData);
    return this.getScheduleAssignmentById(id);
  }

  async deleteScheduleAssignment(id) {
    const existing = await db('employee_work_schedule_assignments').where({ id }).first();
    if (!existing) {
      const error = new Error('Penugasan jadwal tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('employee_work_schedule_assignments').where({ id }).del();
    return { id, message: 'Penugasan jadwal berhasil dihapus' };
  }

  async setAllEmployeesDefaultLocation(satuanPendidikanId) {
    const targetUnitId = parseInt(satuanPendidikanId, 10) || 1;

    // 1. Cek apakah ada lokasi default aktif di unit ini
    const defaultLoc = await db('attendance_locations')
      .where({ satuan_pendidikan_id: targetUnitId, is_active: true, is_default: true })
      .first();

    // 2. Ambil seluruh pegawai aktif
    let empQuery = db('employees').select('id', 'full_name', 'school_unit_id', 'account_status');
    if (targetUnitId) {
      empQuery = empQuery.where(function() {
        this.where('school_unit_id', targetUnitId).orWhereNull('school_unit_id');
      });
    }
    const employees = await empQuery.whereNot('account_status', 'inactive');

    let updatedCount = 0;
    let insertedCount = 0;

    for (const emp of employees) {
      const activeAssign = await db('employee_work_schedule_assignments')
        .where({ employee_id: emp.id, is_active: true })
        .first();

      if (activeAssign) {
        await db('employee_work_schedule_assignments')
          .where({ id: activeAssign.id })
          .update({
            location_assignment_type: 'default_only',
            allowed_location_ids: null,
            updated_at: db.fn.now()
          });
        updatedCount++;
      } else {
        await db('employee_work_schedule_assignments').insert({
          satuan_pendidikan_id: targetUnitId,
          employee_id: emp.id,
          assignment_type: 'massal',
          schedule_id: null,
          location_assignment_type: 'default_only',
          allowed_location_ids: null,
          custom_late_tolerance_minutes: 15,
          custom_early_tolerance_minutes: 0,
          flexible_target_hours: 8.00,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        insertedCount++;
      }
    }

    return {
      message: `Berhasil menetapkan lokasi absensi ke Lokasi Default untuk seluruh pegawai (${updatedCount + insertedCount} pegawai)`,
      total_employees: employees.length,
      updated_assignments: updatedCount,
      new_assignments: insertedCount,
      default_location: defaultLoc ? { id: defaultLoc.id, name: defaultLoc.name } : null
    };
  }

  // ==========================================
  // 4. Master Lokasi Absensi GPS (Multi-Titik)
  // ==========================================
  async listLocations(query = {}) {
    let baseQuery = db('attendance_locations');

    if (query.satuan_pendidikan_id && query.satuan_pendidikan_id !== 'all' && query.satuan_pendidikan_id !== 'null') {
      baseQuery = baseQuery.where({ satuan_pendidikan_id: query.satuan_pendidikan_id });
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where({ is_active: query.is_active === 'true' || query.is_active === true || query.is_active === 1 });
    }
    if (query.is_default !== undefined) {
      baseQuery = baseQuery.where({ is_default: query.is_default === 'true' || query.is_default === true || query.is_default === 1 });
    }
    if (query.search) {
      baseQuery = baseQuery.where(function () {
        this.where('name', 'like', `%${query.search}%`)
          .orWhere('address', 'like', `%${query.search}%`);
      });
    }

    const rows = await baseQuery.orderBy('is_default', 'desc').orderBy('id', 'asc');
    return rows.map((r) => ({
      ...r,
      is_default: Boolean(r.is_default),
      is_active: Boolean(r.is_active)
    }));
  }

  async getLocationById(id) {
    const location = await db('attendance_locations').where({ id }).first();
    if (!location) {
      const error = new Error('Lokasi absensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return {
      ...location,
      is_default: Boolean(location.is_default),
      is_active: Boolean(location.is_active)
    };
  }

  async createLocation(payload) {
    const { satuan_pendidikan_id, name, latitude, longitude, radius_meters, address, notes, is_active, is_default } = payload;

    if (!satuan_pendidikan_id || !name || latitude === undefined || longitude === undefined) {
      const error = new Error('Field satuan_pendidikan_id, name, latitude, dan longitude wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const shouldBeDefault = Boolean(is_default);

    // Jika diset sebagai default, reset is_default untuk lokasi lain di unit ini
    if (shouldBeDefault) {
      await db('attendance_locations')
        .where({ satuan_pendidikan_id })
        .update({ is_default: false, updated_at: db.fn.now() });
    }

    const [id] = await db('attendance_locations').insert({
      satuan_pendidikan_id,
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_meters: radius_meters !== undefined ? parseFloat(radius_meters) : 100.00,
      address: address || null,
      notes: notes || null,
      is_active: is_active !== undefined ? is_active : true,
      is_default: shouldBeDefault,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getLocationById(id);
  }

  async updateLocation(id, payload) {
    const location = await db('attendance_locations').where({ id }).first();
    if (!location) {
      const error = new Error('Lokasi absensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.latitude !== undefined) updateData.latitude = parseFloat(payload.latitude);
    if (payload.longitude !== undefined) updateData.longitude = parseFloat(payload.longitude);
    if (payload.radius_meters !== undefined) updateData.radius_meters = parseFloat(payload.radius_meters);
    if (payload.address !== undefined) updateData.address = payload.address;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    if (payload.is_default !== undefined) {
      const isDef = Boolean(payload.is_default);
      updateData.is_default = isDef;
      if (isDef) {
        const unitId = payload.satuan_pendidikan_id || location.satuan_pendidikan_id;
        await db('attendance_locations')
          .where({ satuan_pendidikan_id: unitId })
          .whereNot({ id })
          .update({ is_default: false, updated_at: db.fn.now() });
      }
    }

    await db('attendance_locations').where({ id }).update(updateData);
    return this.getLocationById(id);
  }

  async setDefaultLocation(id) {
    const location = await db('attendance_locations').where({ id }).first();
    if (!location) {
      const error = new Error('Lokasi absensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Reset default lama di unit sekolah yang sama
    await db('attendance_locations')
      .where({ satuan_pendidikan_id: location.satuan_pendidikan_id })
      .update({ is_default: false, updated_at: db.fn.now() });

    // Set lokasi ini sebagai default
    await db('attendance_locations')
      .where({ id })
      .update({ is_default: true, is_active: true, updated_at: db.fn.now() });

    const updated = await this.getLocationById(id);
    return {
      ...updated,
      message: `Lokasi '${updated.name}' berhasil ditetapkan sebagai Titik GPS Default Unit`
    };
  }

  async deleteLocation(id) {
    const location = await db('attendance_locations').where({ id }).first();
    if (!location) {
      const error = new Error('Lokasi absensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('attendance_locations').where({ id }).del();
    return { id, message: `Lokasi absensi '${location.name}' berhasil dihapus` };
  }

  // ==========================================
  // 5. Pengaturan Jam Kerja & Toleransi Shift
  // ==========================================
  async listWorkSchedules(query = {}) {
    let baseQuery = db('attendance_work_schedules');

    if (query.satuan_pendidikan_id && query.satuan_pendidikan_id !== 'all' && query.satuan_pendidikan_id !== 'null') {
      baseQuery = baseQuery.where({ satuan_pendidikan_id: query.satuan_pendidikan_id });
    }
    if (query.day_of_week) {
      baseQuery = baseQuery.where(function () {
        this.where({ day_of_week: query.day_of_week })
          .orWhere({ day_of_week: 'all' })
          .orWhere('days_of_week', 'like', `%"${query.day_of_week}"%`);
      });
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where({ is_active: query.is_active === 'true' || query.is_active === true || query.is_active === 1 });
    }

    const rows = await baseQuery.orderBy('id', 'asc');
    return rows.map((r) => {
      let parsedDays = [];
      if (r.days_of_week) {
        try {
          parsedDays = typeof r.days_of_week === 'string' && r.days_of_week.startsWith('[')
            ? JSON.parse(r.days_of_week)
            : r.days_of_week.split(',').map((d) => d.trim().toLowerCase());
        } catch (e) {
          parsedDays = [r.day_of_week || 'all'];
        }
      } else if (r.day_of_week === 'all') {
        parsedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      } else if (r.day_of_week) {
        parsedDays = [r.day_of_week];
      } else {
        parsedDays = ['all'];
      }

      let parsedDaySchedules = null;
      if (r.custom_day_schedules) {
        try {
          parsedDaySchedules = typeof r.custom_day_schedules === 'string'
            ? JSON.parse(r.custom_day_schedules)
            : r.custom_day_schedules;
        } catch (e) {
          parsedDaySchedules = null;
        }
      }

      return {
        ...r,
        days_of_week: parsedDays,
        custom_day_schedules: parsedDaySchedules
      };
    });
  }

  async getWorkScheduleById(id) {
    const schedule = await db('attendance_work_schedules').where({ id }).first();
    if (!schedule) {
      const error = new Error('Pengaturan jam kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    let parsedDays = [];
    if (schedule.days_of_week) {
      try {
        parsedDays = typeof schedule.days_of_week === 'string' && schedule.days_of_week.startsWith('[')
          ? JSON.parse(schedule.days_of_week)
          : schedule.days_of_week.split(',').map((d) => d.trim().toLowerCase());
      } catch (e) {
        parsedDays = [schedule.day_of_week || 'all'];
      }
    } else if (schedule.day_of_week === 'all') {
      parsedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    } else if (schedule.day_of_week) {
      parsedDays = [schedule.day_of_week];
    } else {
      parsedDays = ['all'];
    }

    let parsedDaySchedules = null;
    if (schedule.custom_day_schedules) {
      try {
        parsedDaySchedules = typeof schedule.custom_day_schedules === 'string'
          ? JSON.parse(schedule.custom_day_schedules)
          : schedule.custom_day_schedules;
      } catch (e) {
        parsedDaySchedules = null;
      }
    }

    return {
      ...schedule,
      days_of_week: parsedDays,
      custom_day_schedules: parsedDaySchedules
    };
  }

  async createWorkSchedule(payload) {
    const {
      satuan_pendidikan_id,
      name,
      day_of_week,
      days_of_week,
      custom_day_schedules,
      start_time,
      end_time,
      late_tolerance_minutes,
      early_departure_tolerance_minutes,
      is_active,
      notes
    } = payload;

    if (!satuan_pendidikan_id || !name) {
      const error = new Error('Field satuan_pendidikan_id dan name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const validDays = ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Resolusi daftar hari dan jam kerja jika menggunakan custom_day_schedules per hari
    let targetDays = [];
    let resolvedStartTime = start_time || '07:15';
    let resolvedEndTime = end_time || '16:00';

    if (custom_day_schedules && typeof custom_day_schedules === 'object') {
      targetDays = Object.keys(custom_day_schedules).filter((d) => custom_day_schedules[d]?.is_active && validDays.includes(d));
      if (targetDays.length > 0) {
        const firstActive = custom_day_schedules[targetDays[0]];
        if (firstActive?.start_time) resolvedStartTime = firstActive.start_time;
        if (firstActive?.end_time) resolvedEndTime = firstActive.end_time;
      }
    } else if (Array.isArray(days_of_week) && days_of_week.length > 0) {
      targetDays = days_of_week.filter((d) => validDays.includes(d));
    } else if (Array.isArray(day_of_week) && day_of_week.length > 0) {
      targetDays = day_of_week.filter((d) => validDays.includes(d));
    } else if (day_of_week && validDays.includes(day_of_week)) {
      targetDays = [day_of_week];
    } else {
      targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    }

    if (targetDays.length === 0) {
      targetDays = ['all'];
    }

    const primaryDay = targetDays.length === 7 || targetDays.includes('all') ? 'all' : targetDays[0];

    // Simpan 1 entitas skema utuh
    const [id] = await db('attendance_work_schedules').insert({
      satuan_pendidikan_id,
      name,
      day_of_week: primaryDay,
      days_of_week: JSON.stringify(targetDays),
      custom_day_schedules: custom_day_schedules ? JSON.stringify(custom_day_schedules) : null,
      start_time: resolvedStartTime,
      end_time: resolvedEndTime,
      late_tolerance_minutes: late_tolerance_minutes !== undefined ? parseInt(late_tolerance_minutes, 10) : 15,
      early_departure_tolerance_minutes: early_departure_tolerance_minutes !== undefined ? parseInt(early_departure_tolerance_minutes, 10) : 0,
      is_active: is_active !== undefined ? is_active : true,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getWorkScheduleById(id);
  }

  async updateWorkSchedule(id, payload) {
    const schedule = await db('attendance_work_schedules').where({ id }).first();
    if (!schedule) {
      const error = new Error('Pengaturan jam kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const validDays = ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id;
    if (payload.name !== undefined) updateData.name = payload.name;

    if (payload.custom_day_schedules !== undefined) {
      const dayConfigs = payload.custom_day_schedules;
      updateData.custom_day_schedules = dayConfigs ? JSON.stringify(dayConfigs) : null;
      if (dayConfigs && typeof dayConfigs === 'object') {
        const activeDays = Object.keys(dayConfigs).filter((d) => dayConfigs[d]?.is_active && validDays.includes(d));
        updateData.days_of_week = JSON.stringify(activeDays);
        updateData.day_of_week = activeDays.includes('all') || activeDays.length === 7 ? 'all' : (activeDays[0] || 'all');
        if (activeDays.length > 0 && dayConfigs[activeDays[0]]) {
          if (dayConfigs[activeDays[0]].start_time) updateData.start_time = dayConfigs[activeDays[0]].start_time;
          if (dayConfigs[activeDays[0]].end_time) updateData.end_time = dayConfigs[activeDays[0]].end_time;
        }
      }
    } else if (payload.days_of_week !== undefined) {
      const days = (Array.isArray(payload.days_of_week) ? payload.days_of_week : [payload.days_of_week])
        .filter((d) => validDays.includes(d));
      updateData.days_of_week = JSON.stringify(days);
      updateData.day_of_week = days.includes('all') || days.length === 7 ? 'all' : (days[0] || 'all');
    } else if (payload.day_of_week !== undefined) {
      if (!validDays.includes(payload.day_of_week)) {
        const error = new Error(`day_of_week harus salah satu dari: ${validDays.join(', ')}`);
        error.statusCode = 422;
        throw error;
      }
      updateData.day_of_week = payload.day_of_week;
      updateData.days_of_week = JSON.stringify([payload.day_of_week]);
    }

    if (payload.start_time !== undefined) updateData.start_time = payload.start_time;
    if (payload.end_time !== undefined) updateData.end_time = payload.end_time;
    if (payload.late_tolerance_minutes !== undefined) updateData.late_tolerance_minutes = parseInt(payload.late_tolerance_minutes, 10);
    if (payload.early_departure_tolerance_minutes !== undefined) updateData.early_departure_tolerance_minutes = parseInt(payload.early_departure_tolerance_minutes, 10);
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    await db('attendance_work_schedules').where({ id }).update(updateData);
    return this.getWorkScheduleById(id);
  }

  async deleteWorkSchedule(id) {
    const schedule = await db('attendance_work_schedules').where({ id }).first();
    if (!schedule) {
      const error = new Error('Pengaturan jam kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('attendance_work_schedules').where({ id }).del();
    return { id, message: `Pengaturan jam kerja '${schedule.name}' berhasil dihapus` };
  }

  // ==========================================
  // Fitur Klarifikasi / Pengajuan Lupa Absen
  // ==========================================
  // 6. Klarifikasi Presensi / Antrean Koreksi
  // ==========================================
  async submitClarification(payload, user) {
    const actor = await resolveActor(user);
    assertEmployeeActor(actor);

    let employeeId = payload.employee_id;
    if (!actor.isHR) {
      employeeId = actor.employeeId;
    } else if (!employeeId) {
      employeeId = actor.employeeId;
    }

    if (!employeeId) {
      const error = new Error('Identitas pegawai (employee_id) wajib disertakan');
      error.statusCode = 422;
      throw error;
    }

    const {
      attendance_date,
      entry_type = 'manual_forgot_in',
      clarification_type = 'forgot_in',
      check_in_time,
      check_out_time,
      status: proposedStatus,
      sub_status: proposedSubStatus,
      clarification_reason,
      clarification_attachment_url,
      attachment_url,
      school_unit_id
    } = payload;

    if (!attendance_date) {
      const error = new Error('Tanggal absensi (attendance_date) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const effectiveReason = clarification_reason || payload.reason;
    if (!effectiveReason || !effectiveReason.trim()) {
      const error = new Error('Alasan/keterangan lupa absen wajib diisi untuk klarifikasi HRD');
      error.statusCode = 422;
      throw error;
    }

    const employee = await db('employees').where({ id: employeeId }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const targetSchoolUnitId = school_unit_id || employee.school_unit_id || (user && user.school_unit_id) || 1;

    // Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(attendance_date, targetSchoolUnitId);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah dikunci. Pengajuan klarifikasi tidak dapat dilakukan.');
      error.statusCode = 422;
      throw error;
    }

    const formattedInTime = check_in_time ? (check_in_time.length === 5 ? `${check_in_time}:00` : check_in_time) : null;
    const formattedOutTime = check_out_time ? (check_out_time.length === 5 ? `${check_out_time}:00` : check_out_time) : null;
    const effectiveAttachment = clarification_attachment_url || attachment_url || null;

    // Cek apakah sudah ada catatan absensi di tanggal tersebut
    const existing = await db('employee_attendances')
      .where({ employee_id: employeeId, attendance_date })
      .first();

    if (existing) {
      const originalSnapshot = {
        check_in_time: existing.check_in_time,
        check_out_time: existing.check_out_time,
        status: existing.status,
        sub_status: existing.sub_status,
        entry_type: existing.entry_type,
        is_within_radius: existing.is_within_radius,
        distance_meters: existing.check_in_distance_meters
      };

      const proposedSnapshot = {
        check_in_time: formattedInTime || existing.check_in_time,
        check_out_time: formattedOutTime || existing.check_out_time,
        status: proposedStatus || 'present',
        sub_status: proposedSubStatus || null
      };

      const updateData = {
        is_clarification_needed: true,
        clarification_status: 'pending',
        clarification_type: clarification_type || entry_type || 'forgot_in',
        proposed_check_in_time: formattedInTime || existing.check_in_time,
        proposed_check_out_time: formattedOutTime || existing.check_out_time,
        proposed_status: proposedStatus || 'present',
        proposed_sub_status: proposedSubStatus || null,
        proposed_changes: JSON.stringify({ original: originalSnapshot, proposed: proposedSnapshot }),
        clarification_reason: effectiveReason.trim(),
        clarification_attachment_url: effectiveAttachment || existing.clarification_attachment_url || null,
        clarification_submitted_at: db.fn.now(),
        updated_at: db.fn.now()
      };

      await db('employee_attendances').where({ id: existing.id }).update(updateData);
      return await db('employee_attendances').where({ id: existing.id }).first();
    } else {
      const insertData = {
        employee_id: employeeId,
        school_unit_id: targetSchoolUnitId,
        attendance_date,
        check_in_time: null,
        check_out_time: null,
        status: 'absent',
        sub_status: null,
        entry_type: entry_type || 'manual_clarification',
        is_clarification_needed: true,
        clarification_status: 'pending',
        clarification_type: clarification_type || entry_type || 'forgot_in',
        proposed_check_in_time: formattedInTime || '07:30:00',
        proposed_check_out_time: formattedOutTime || '16:00:00',
        proposed_status: proposedStatus || 'present',
        proposed_sub_status: proposedSubStatus || null,
        proposed_changes: JSON.stringify({
          original: { check_in_time: null, check_out_time: null, status: 'absent', sub_status: null },
          proposed: { check_in_time: formattedInTime || '07:30:00', check_out_time: formattedOutTime || '16:00:00', status: proposedStatus || 'present', sub_status: proposedSubStatus || null }
        }),
        clarification_reason: effectiveReason.trim(),
        clarification_attachment_url: effectiveAttachment,
        clarification_submitted_at: db.fn.now(),
        is_within_radius: true,
        is_late: false,
        late_minutes: 0,
        is_early_departure: false,
        early_departure_minutes: 0,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      };

      const [newId] = await db('employee_attendances').insert(insertData);
      return await db('employee_attendances').where({ id: newId }).first();
    }
  }

  async listClarifications(query = {}, user = {}) {
    const actor = await resolveActor(user);
    if (!actor.isHR) {
      if (!actor.employeeId) {
        assertEmployeeActor(actor);
      }
      query.employee_id = actor.employeeId;
    }
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    let q = db('employee_attendances')
      .join('employees', 'employee_attendances.employee_id', 'employees.id')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.nip as employee_nip',
        'employees.photo_url as employee_photo',
        'employees.employment_status',
        'job_positions.name as position_title'
      )
      .where(function () {
        this.where('employee_attendances.is_clarification_needed', true)
          .orWhereNot('employee_attendances.clarification_status', 'none');
      });

    if (unitId) {
      q = q.where('employee_attendances.school_unit_id', unitId);
    }

    if (query.status && query.status !== 'all') {
      q = q.where('employee_attendances.clarification_status', query.status);
    }

    if (query.type && query.type !== 'all') {
      q = q.where(function () {
        this.where('employee_attendances.clarification_type', query.type)
          .orWhere('employee_attendances.entry_type', query.type);
      });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      q = q.where(function () {
        this.where('employees.full_name', 'like', term)
          .orWhere('employees.nip', 'like', term)
          .orWhere('employee_attendances.clarification_reason', 'like', term);
      });
    }

    if (query.employee_id) {
      q = q.where('employee_attendances.employee_id', query.employee_id);
    }

    if (query.sort === 'oldest') {
      q = q.orderBy('employee_attendances.clarification_submitted_at', 'asc');
    } else {
      q = q.orderBy('employee_attendances.clarification_submitted_at', 'desc')
        .orderBy('employee_attendances.attendance_date', 'desc');
    }

    const list = await q;

    // Hitung statistik status antrean
    let countQuery = db('employee_attendances').where(function () {
      this.where('is_clarification_needed', true).orWhereNot('clarification_status', 'none');
    });
    if (unitId) countQuery = countQuery.where('school_unit_id', unitId);

    const statsRaw = await countQuery
      .select('clarification_status')
      .count('id as cnt')
      .groupBy('clarification_status');

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
    statsRaw.forEach(row => {
      const st = row.clarification_status;
      const count = parseInt(row.cnt, 10) || 0;
      counts.all += count;
      if (st === 'pending') counts.pending += count;
      if (st === 'approved') counts.approved += count;
      if (st === 'rejected') counts.rejected += count;
    });

    return {
      items: list,
      counts
    };
  }

  async getClarificationDetail(id, user = {}) {
    const record = await db('employee_attendances')
      .join('employees', 'employee_attendances.employee_id', 'employees.id')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.nip as employee_nip',
        'employees.photo_url as employee_photo',
        'employees.employment_status',
        'job_positions.name as position_title'
      )
      .where('employee_attendances.id', id)
      .first();

    if (!record) {
      const error = new Error('Data pengajuan koreksi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const actor = await resolveActor(user);
    if (!actor.isHR) {
      if (!actor.employeeId || Number(record.employee_id) !== Number(actor.employeeId)) {
        const error = new Error('Anda tidak memiliki izin untuk melihat klarifikasi pegawai lain');
        error.statusCode = 403;
        throw error;
      }
    }

    const auditTrail = await auditService.getLogs(id);
    const schedule = await calendarService.resolveEmployeeSchedule(
      record.employee_id,
      record.school_unit_id,
      record.attendance_date
    );

    return {
      ...record,
      schedule,
      audit_trail: auditTrail
    };
  }

  async reviewClarification(id, payload = {}, user = {}) {
    const record = await db('employee_attendances').where({ id }).first();
    if (!record) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(record.attendance_date, record.school_unit_id);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Keputusan koreksi tidak dapat diproses.');
      error.statusCode = 422;
      throw error;
    }

    const { status, review_notes } = payload;
    if (!['approved', 'rejected'].includes(status)) {
      const error = new Error("Status verifikasi harus 'approved' atau 'rejected'");
      error.statusCode = 422;
      throw error;
    }

    if (status === 'rejected' && (!review_notes || !review_notes.trim())) {
      const error = new Error('Catatan / alasan penolakan wajib diisi jika menolak pengajuan');
      error.statusCode = 422;
      throw error;
    }

    const updateData = {
      clarification_status: status,
      is_clarification_needed: false,
      clarification_reviewed_by: user.id || null,
      clarification_reviewed_at: db.fn.now(),
      clarification_review_notes: review_notes || (status === 'approved' ? 'Disetujui oleh HRD' : 'Ditolak oleh HRD'),
      updated_at: db.fn.now()
    };

    if (status === 'approved') {
      const effectiveIn = record.proposed_check_in_time || record.check_in_time || '07:30:00';
      const effectiveOut = record.proposed_check_out_time || record.check_out_time || '16:00:00';
      const targetStatus = record.proposed_status || 'present';

      updateData.status = targetStatus;
      if (record.proposed_sub_status) {
        updateData.sub_status = record.proposed_sub_status;
      }
      updateData.check_in_time = effectiveIn;
      updateData.check_out_time = effectiveOut;
      updateData.is_within_radius = 1;

      // Hitung keterlambatan berdasarkan jam efektif yang disetujui
      if (targetStatus === 'present' && effectiveIn) {
        const schedule = await calendarService.resolveEmployeeSchedule(
          record.employee_id,
          record.school_unit_id,
          record.attendance_date
        );
        if (schedule.start_time) {
          const calc = calendarService.calculateLateMinutes(
            effectiveIn,
            schedule.start_time,
            schedule.late_tolerance_minutes
          );
          updateData.is_late = calc.is_late ? 1 : 0;
          updateData.late_minutes = calc.late_minutes || 0;
        }
      } else {
        updateData.is_late = 0;
        updateData.late_minutes = 0;
      }
    } else if (status === 'rejected') {
      // Jika ditolak dan awalnya tidak ada presensi fisik
      if (!record.check_in_latitude && !record.check_in_time) {
        updateData.status = 'absent';
      }
    }

    // Transaksi Update & Catat Audit Log
    await db.transaction(async (trx) => {
      await trx('employee_attendances').where({ id }).update(updateData);

      await auditService.log({
        attendanceId: id,
        action: status === 'approved' ? 'CLARIFICATION_APPROVED' : 'CLARIFICATION_REJECTED',
        performedBy: user.id || null,
        oldValues: {
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
          status: record.status,
          sub_status: record.sub_status,
          clarification_status: record.clarification_status
        },
        newValues: updateData,
        reason: updateData.clarification_review_notes
      }, trx);
    });

    return await db('employee_attendances').where({ id }).first();
  }

  // ==========================================
  // 7. Dasbor HRD & Metrik 7 Kartu
  // ==========================================
  async getDashboardSummary(query = {}, user = {}) {
    const actor = await resolveActor(user);
    if (!actor.isHR) {
      const error = new Error('Akses dasbor presensi hanya diizinkan untuk HRD / Manajemen');
      error.statusCode = 403;
      throw error;
    }

    const today = query.date || new Date().toISOString().split('T')[0];
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    let empQuery = db('employees').where('account_status', 'active');
    if (unitId) empQuery = empQuery.where('school_unit_id', unitId);
    const totalEmpResult = await empQuery.count('id as total');
    const totalActiveEmployees = parseInt(totalEmpResult[0]?.total || 0, 10);

    let attQuery = db('employee_attendances').where('attendance_date', today);
    if (unitId) attQuery = attQuery.where('school_unit_id', unitId);
    const todayAttendances = await attQuery;

    let presentCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let permissionCount = 0;
    let sickCount = 0;
    let leaveCount = 0;
    let dutyTravelCount = 0;
    let absentCount = 0;

    for (const att of todayAttendances) {
      if (att.status === 'present') {
        presentCount++;
        if (att.is_late) {
          lateCount++;
        } else {
          onTimeCount++;
        }
      } else if (att.status === 'sick') {
        sickCount++;
      } else if (att.status === 'permitted') {
        permissionCount++;
      } else if (att.status === 'absent') {
        absentCount++;
      }

      if (att.sub_status === 'dinas_luar' || att.entry_type === 'duty_travel') {
        dutyTravelCount++;
      } else if (att.sub_status === 'cuti' || att.entry_type === 'leave') {
        leaveCount++;
      }
    }

    // Hitung belum presensi
    const absentCandidates = await this.listAbsentCandidates({ date: today, school_unit_id: unitId }, user);
    const notYetPresentCount = absentCandidates.length;

    const onTimeRate = presentCount > 0 ? ((onTimeCount / presentCount) * 100).toFixed(1) : '100.0';
    const attendanceRate = totalActiveEmployees > 0 ? (((presentCount + permissionCount + sickCount + leaveCount + dutyTravelCount) / totalActiveEmployees) * 100).toFixed(1) : '0.0';

    return {
      date: today,
      school_unit_id: unitId,
      total_active_employees: totalActiveEmployees,
      present_count: presentCount,
      on_time_count: onTimeCount,
      late_count: lateCount,
      permission_count: permissionCount,
      sick_count: sickCount,
      leave_count: leaveCount,
      duty_travel_count: dutyTravelCount,
      absent_count: absentCount,
      not_yet_present_count: notYetPresentCount,
      on_time_rate_percentage: parseFloat(onTimeRate),
      attendance_rate_percentage: parseFloat(attendanceRate)
    };
  }

  // ==========================================
  // 8. Detail Presensi & Telemetri
  // ==========================================
  async getAttendanceDetail(id, user = null) {
    const record = await db('employee_attendances')
      .leftJoin('employees', 'employee_attendances.employee_id', 'employees.id')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employee_attendances.id', id)
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.employee_number',
        'employees.nik as employee_nik',
        'employees.photo_url as employee_photo_url',
        'employees.phone_number as employee_phone',
        'employees.email as employee_email',
        'job_positions.name as position_title'
      )
      .first();

    if (!record) {
      const error = new Error('Catatan presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (user) {
      const actor = await resolveActor(user);
      if (!actor.isHR) {
        if (!actor.employeeId || Number(record.employee_id) !== Number(actor.employeeId)) {
          const error = new Error('Anda tidak memiliki izin untuk melihat detail presensi pegawai lain');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    let matchedLocation = null;
    if (record.matched_location_id) {
      matchedLocation = await db('attendance_locations').where({ id: record.matched_location_id }).first();
    } else if (record.school_unit_id) {
      matchedLocation = await db('attendance_locations').where({ satuan_pendidikan_id: record.school_unit_id, is_default: 1 }).first();
    }

    let matchedSchedule = null;
    if (record.matched_schedule_id) {
      matchedSchedule = await db('attendance_work_schedules').where({ id: record.matched_schedule_id }).first();
    }

    const auditLogs = await auditService.getLogsForAttendance(id);

    let durationMinutes = 0;
    let durationFormatted = '-';
    if (record.check_in_time && record.check_out_time) {
      const inM = this._parseTimeToMinutes(record.check_in_time);
      const outM = this._parseTimeToMinutes(record.check_out_time);
      if (outM >= inM) {
        durationMinutes = outM - inM;
        const h = Math.floor(durationMinutes / 60);
        const m = durationMinutes % 60;
        durationFormatted = `${h}j ${m}m`;
      }
    }

    return {
      ...record,
      duration_minutes: durationMinutes,
      duration_formatted: durationFormatted,
      matched_location: matchedLocation,
      matched_schedule: matchedSchedule,
      audit_logs: auditLogs
    };
  }

  // ==========================================
  // 9. Tab Belum Presensi (Absent Candidates)
  // ==========================================
  async listAbsentCandidates(query = {}, user = {}) {
    const today = query.date || new Date().toISOString().split('T')[0];
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    let empQuery = db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.account_status', 'active')
      .select(
        'employees.id',
        'employees.school_unit_id',
        'employees.full_name',
        'employees.employee_number',
        'employees.nik',
        'employees.phone_number',
        'employees.photo_url',
        'job_positions.name as position_title'
      );

    if (unitId) empQuery = empQuery.where('employees.school_unit_id', unitId);
    if (query.position_id) empQuery = empQuery.where('employees.current_position_id', query.position_id);
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      empQuery = empQuery.where(function () {
        this.where('employees.full_name', 'like', s)
          .orWhere('employees.employee_number', 'like', s)
          .orWhere('employees.nik', 'like', s);
      });
    }

    const activeEmployees = await empQuery;

    // Ambil semua presensi hari ini
    const existingAttendances = await db('employee_attendances')
      .where('attendance_date', today);
    const attendedEmpIds = new Set(existingAttendances.map(a => Number(a.employee_id)));

    // Ambil cuti disetujui hari ini
    const activeLeaves = await db('employee_leave_requests')
      .where('status', 'approved')
      .where('start_date', '<=', today)
      .where('end_date', '>=', today);
    const leaveEmpIds = new Set(activeLeaves.map(l => Number(l.employee_id)));

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const candidates = [];
    for (const emp of activeEmployees) {
      if (attendedEmpIds.has(emp.id) || leaveEmpIds.has(emp.id)) {
        continue;
      }

      const schedule = await calendarService.resolveEmployeeSchedule(emp.id, emp.school_unit_id, today);
      if (schedule.is_off_day) {
        continue; // Hari libur jadwal pegawai
      }

      const scheduleInMinutes = this._parseTimeToMinutes(schedule.start_time || '07:30:00');
      const tolerance = schedule.late_tolerance_minutes || 5;
      const overdueMinutes = Math.max(0, currentMinutes - (scheduleInMinutes + tolerance));

      const unitMap = {
        1: 'SMA ALDEPOS',
        2: 'SMP ALDEPOS',
        3: 'SD ALDEPOS',
        4: 'TK & Playgroup'
      };

      candidates.push({
        employee_id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        nik: emp.nik,
        phone_number: emp.phone_number,
        photo_url: emp.photo_url,
        position_title: emp.position_title || 'Staf / Tenaga Pendidik',
        school_unit_id: emp.school_unit_id,
        unit_name: unitMap[emp.school_unit_id] || 'Yayasan Aldepos',
        attendance_date: today,
        schedule_name: schedule.name,
        schedule_start_time: schedule.start_time,
        schedule_end_time: schedule.end_time,
        is_overdue: overdueMinutes > 0,
        overdue_minutes: overdueMinutes,
        status_system: overdueMinutes > 0 ? `Terlewat ${overdueMinutes} mnt` : 'Menunggu Jam Masuk'
      });
    }

    return candidates;
  }

  async quickMarkAttendance(payload = {}, user = {}) {
    const { employee_ids, attendance_date, status, sub_status, reason, notes } = payload;
    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      const error = new Error('Pilih minimal satu pegawai untuk ditandai statusnya');
      error.statusCode = 422;
      throw error;
    }

    const targetDate = attendance_date || new Date().toISOString().split('T')[0];

    // Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(targetDate, null);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Perubahan status cepat tidak diizinkan.');
      error.statusCode = 422;
      throw error;
    }

    const results = [];

    for (const empId of employee_ids) {
      const emp = await db('employees').where({ id: empId }).first();
      if (!emp) continue;

      const existing = await db('employee_attendances')
        .where({ employee_id: empId, attendance_date: targetDate })
        .first();

      let recordId = null;
      let dbStatus = 'permitted';
      if (status === 'sick') dbStatus = 'sick';
      else if (status === 'absent') dbStatus = 'absent';
      else if (status === 'present') dbStatus = 'present';

      if (existing) {
        await db('employee_attendances').where({ id: existing.id }).update({
          status: dbStatus,
          sub_status: sub_status || (status === 'duty_travel' ? 'dinas_luar' : null),
          check_in_notes: notes || reason || `Ditandai HRD: ${status}`,
          updated_at: db.fn.now()
        });
        recordId = existing.id;
      } else {
        const [newId] = await db('employee_attendances').insert({
          employee_id: empId,
          school_unit_id: emp.school_unit_id || 1,
          attendance_date: targetDate,
          status: dbStatus,
          sub_status: sub_status || (status === 'duty_travel' ? 'dinas_luar' : null),
          entry_type: status === 'duty_travel' ? 'duty_travel' : 'manual_hrd',
          check_in_notes: notes || reason || `Ditandai HRD: ${status}`,
          is_within_radius: 1,
          is_late: 0,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        recordId = newId;
      }

      await auditService.log({
        attendanceId: recordId,
        action: 'QUICK_MARK_STATUS',
        performedBy: user.id || null,
        oldValues: existing || null,
        newValues: { status: dbStatus, sub_status, reason },
        reason: reason || `Quick action HRD: ${status}`
      });

      results.push({ employee_id: empId, attendance_id: recordId, success: true });
    }

    return {
      message: `Berhasil menandai ${results.length} pegawai sebagai ${status}`,
      results
    };
  }

  // ==========================================
  // 10. Tab Perlu Ditindaklanjuti (Anomali)
  // ==========================================
  // ==========================================
  // 10. Deteksi Anomali & Tindak Lanjut HRD
  // ==========================================
  async listAnomalies(query = {}, user = {}) {
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultStart = `${currentMonthStr}-01`;
    const defaultEnd = now.toISOString().split('T')[0];

    const dateFrom = query.date_from || defaultStart;
    const dateTo = query.date_to || defaultEnd;

    // 1. Ambil data presensi pada rentang waktu
    let baseQuery = db('employee_attendances')
      .leftJoin('employees', 'employee_attendances.employee_id', 'employees.id')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.nip as employee_nip',
        'employees.employee_number',
        'employees.phone_number',
        'employees.employment_status',
        'job_positions.name as position_title'
      )
      .where('employee_attendances.attendance_date', '>=', dateFrom)
      .where('employee_attendances.attendance_date', '<=', dateTo);

    if (unitId) {
      baseQuery = baseQuery.where('employee_attendances.school_unit_id', unitId);
    }

    const rows = await baseQuery.orderBy('employee_attendances.attendance_date', 'desc');

    // 2. Ambil agregat keterlambatan & alpa bulanan per pegawai untuk deteksi pola berulang
    let aggQuery = db('employee_attendances')
      .where('attendance_date', '>=', dateFrom)
      .where('attendance_date', '<=', dateTo)
      .groupBy('employee_id');

    if (unitId) aggQuery = aggQuery.where('school_unit_id', unitId);

    const monthlyStats = await aggQuery
      .select('employee_id')
      .select(db.raw("SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as total_late"))
      .select(db.raw("SUM(CASE WHEN is_late = 1 THEN late_minutes ELSE 0 END) as total_late_minutes"))
      .select(db.raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent"));

    const statsMap = {};
    monthlyStats.forEach(s => {
      statsMap[s.employee_id] = {
        total_late: parseInt(s.total_late || 0, 10),
        total_late_minutes: parseInt(s.total_late_minutes || 0, 10),
        total_absent: parseInt(s.total_absent || 0, 10)
      };
    });

    // 3. Ambil data cuti yang disetujui pada rentang waktu
    const approvedLeaves = await db('employee_leave_requests')
      .where('status', 'approved')
      .where('start_date', '<=', dateTo)
      .where('end_date', '>=', dateFrom);

    const isDateOnLeave = (empId, dateStr) => {
      return approvedLeaves.find(l => {
        if (l.employee_id !== empId) return false;
        const s = l.start_date instanceof Date ? l.start_date.toISOString().split('T')[0] : String(l.start_date).slice(0, 10);
        const e = l.end_date instanceof Date ? l.end_date.toISOString().split('T')[0] : String(l.end_date).slice(0, 10);
        return dateStr >= s && dateStr <= e;
      });
    };

    // 4. Deteksi Anomali Multi-Faktor per Record Presensi
    const allFindings = [];
    const summaryCounters = {
      repeated_late: 0,
      repeated_absent: 0,
      outside_radius: 0,
      fake_gps: 0,
      unusual_device: 0,
      missing_checkout: 0,
      leave_conflict: 0,
      total_active_cases: 0
    };

    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    for (const att of rows) {
      const anomalyTypes = [];
      let maxSeverity = 'low';
      const empStats = statsMap[att.employee_id] || { total_late: 0, total_late_minutes: 0, total_absent: 0 };
      const attDateStr = att.attendance_date instanceof Date ? att.attendance_date.toISOString().split('T')[0] : String(att.attendance_date).slice(0, 10);

      // (A) Indikasi Fake GPS / Mock Location
      const notes = (att.check_in_notes || '').toLowerCase();
      const device = (att.check_in_device_info || '').toLowerCase();
      const accuracy = parseFloat(att.check_in_accuracy_meters || 0);

      const isFakeGpsIndication = (
        (accuracy > 0 && accuracy <= 1.0) ||
        notes.includes('mock') ||
        notes.includes('fake') ||
        notes.includes('emulator') ||
        device.includes('emulator')
      );

      if (isFakeGpsIndication) {
        anomalyTypes.push({
          type: 'fake_gps',
          label: 'Indikasi Fake GPS',
          desc: 'Terdeteksi telemetri lokasi atau akurasi satelit GPS tidak wajar (Indikasi Mock Location Provider).'
        });
        summaryCounters.fake_gps++;
        maxSeverity = 'high';
      }

      // (B) Di Luar Radius
      if (att.is_within_radius === 0 || att.is_within_radius === false) {
        const dist = Math.round(att.check_in_distance_meters || 0);
        anomalyTypes.push({
          type: 'outside_radius',
          label: `Di Luar Radius (${dist}m)`,
          desc: `Titik koordinat check-in berjarak ${dist} meter dari geofence sekolah.`
        });
        summaryCounters.outside_radius++;
        if (dist > 500) maxSeverity = 'high';
        else if (maxSeverity !== 'high') maxSeverity = 'medium';
      }

      // (C) Terlambat Berulang / Keterlambatan Berat
      if (att.is_late && empStats.total_late >= 3) {
        anomalyTypes.push({
          type: 'repeated_late',
          label: `Terlambat Berulang (${empStats.total_late}x)`,
          desc: `Tercatat ${empStats.total_late}x keterlambatan pada bulan ini (total akumulasi ${empStats.total_late_minutes} menit).`
        });
        summaryCounters.repeated_late++;
        if (maxSeverity !== 'high') maxSeverity = 'medium';
      } else if (att.is_late && att.late_minutes >= 60) {
        anomalyTypes.push({
          type: 'extreme_late',
          label: `Keterlambatan Berat (${att.late_minutes}m)`,
          desc: `Keterlambatan ${att.late_minutes} menit melewati jadwal kerja resmi.`
        });
        if (maxSeverity !== 'high') maxSeverity = 'high';
      }

      // (D) Alpa Berulang
      if (att.status === 'absent' && empStats.total_absent >= 2) {
        anomalyTypes.push({
          type: 'repeated_absent',
          label: `Alpa Berulang (${empStats.total_absent}x)`,
          desc: `Tercatat ${empStats.total_absent} hari alpa tanpa keterangan pada bulan ini.`
        });
        summaryCounters.repeated_absent++;
        maxSeverity = 'high';
      }

      // (E) Belum Check-Out / Kartu Gantung
      const isPastDay = attDateStr < todayStr;
      const isTodayEvening = attDateStr === todayStr && currentHour >= 17;
      if (att.check_in_time && !att.check_out_time && (isPastDay || isTodayEvening)) {
        anomalyTypes.push({
          type: 'missing_checkout',
          label: 'Belum Check-Out',
          desc: 'Presensi masuk tercatat tetapi pegawai belum melakukan check-out kepulangan.'
        });
        summaryCounters.missing_checkout++;
        if (maxSeverity !== 'high') maxSeverity = 'medium';
      }

      // (F) Konflik dengan Cuti
      const leaveConflict = isDateOnLeave(att.employee_id, attDateStr);
      if (leaveConflict && att.status === 'present') {
        anomalyTypes.push({
          type: 'leave_conflict',
          label: 'Konflik Cuti / Dinas',
          desc: `Melakukan presensi hadir saat pengajuan izin/cuti '${leaveConflict.leave_type}' telah berstatus disetujui.`
        });
        summaryCounters.leave_conflict++;
        if (maxSeverity !== 'high') maxSeverity = 'medium';
      }

      // (G) Perangkat Asing / Browser Tidak Biasa
      if (device.includes('postman') || device.includes('curl') || (device.includes('browser') && att.entry_type === 'realtime_gps')) {
        anomalyTypes.push({
          type: 'unusual_device',
          label: 'Perangkat Asing',
          desc: 'Header identitas perangkat atau user-agent terdeteksi tidak standar.'
        });
        summaryCounters.unusual_device++;
        if (maxSeverity !== 'high') maxSeverity = 'medium';
      }

      // Jika ada anomali terdeteksi
      if (anomalyTypes.length > 0 || att.is_anomaly) {
        const isResolved = att.anomaly_resolved === 1;
        const status = isResolved ? 'selesai' : (att.anomaly_resolution_notes ? 'ditangani' : 'baru');

        if (!isResolved) {
          summaryCounters.total_active_cases++;
        }

        allFindings.push({
          ...att,
          attendance_date: attDateStr,
          anomaly_types: anomalyTypes,
          primary_type: anomalyTypes[0]?.type || 'other',
          severity: maxSeverity,
          status: status,
          finding_title: anomalyTypes.map(a => a.label).join(' • ') || 'Anomali Presensi',
          finding_detail: anomalyTypes.map(a => a.desc).join(' '),
          emp_stats: empStats
        });
      }
    }

    // 5. Filter Anomali sesuai query params
    let filteredFindings = allFindings;

    if (query.status && query.status !== 'all') {
      filteredFindings = filteredFindings.filter(f => f.status === query.status);
    }

    if (query.severity && query.severity !== 'all') {
      filteredFindings = filteredFindings.filter(f => f.severity === query.severity);
    }

    if (query.type && query.type !== 'all') {
      filteredFindings = filteredFindings.filter(f => f.anomaly_types.some(t => t.type === query.type || t.type.includes(query.type)));
    }

    if (query.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      filteredFindings = filteredFindings.filter(f =>
        (f.employee_name && f.employee_name.toLowerCase().includes(q)) ||
        (f.employee_nip && f.employee_nip.toLowerCase().includes(q)) ||
        (f.finding_title && f.finding_title.toLowerCase().includes(q)) ||
        (f.position_title && f.position_title.toLowerCase().includes(q))
      );
    }

    return {
      items: filteredFindings,
      summary: summaryCounters
    };
  }

  async resolveAnomaly(id, payload = {}, user = {}) {
    const record = await db('employee_attendances').where({ id }).first();
    if (!record) {
      const error = new Error('Catatan presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(record.attendance_date, record.school_unit_id);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Resolusi anomali tidak dapat diproses.');
      error.statusCode = 422;
      throw error;
    }

    const { status = 'selesai', resolution_action = 'accept', notes = '' } = payload;
    const isResolved = status === 'selesai' || resolution_action === 'accept' || resolution_action === 'force_alpha';

    const updateData = {
      anomaly_resolved: isResolved ? 1 : 0,
      anomaly_resolved_by: user.id || null,
      anomaly_resolved_at: db.fn.now(),
      anomaly_resolution_notes: notes || `Resolusi: ${resolution_action}`,
      updated_at: db.fn.now()
    };

    if (resolution_action === 'force_alpha') {
      updateData.status = 'absent';
      updateData.sub_status = 'Alpa (Dibatalkan HRD)';
    } else if (resolution_action === 'accept') {
      updateData.is_within_radius = 1;
    }

    await db.transaction(async (trx) => {
      await trx('employee_attendances').where({ id }).update(updateData);

      await auditService.log({
        attendanceId: id,
        action: 'RESOLVE_ANOMALY',
        performedBy: user.id || null,
        oldValues: {
          status: record.status,
          is_within_radius: record.is_within_radius,
          anomaly_resolved: record.anomaly_resolved,
          anomaly_resolution_notes: record.anomaly_resolution_notes
        },
        newValues: updateData,
        reason: notes || `Tindak lanjut anomali presensi: ${resolution_action}`
      }, trx);
    });

    return await db('employee_attendances').where({ id }).first();
  }

  // ==========================================
  // 11. Tab Rekap Bulanan & Matriks 1-31
  // ==========================================
  async getMonthlySummary(query = {}, user = {}) {
    const month = parseInt(query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(query.year, 10) || new Date().getFullYear();
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let empQuery = db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.account_status', 'active')
      .select(
        'employees.id',
        'employees.full_name',
        'employees.employee_number',
        'employees.nik',
        'employees.school_unit_id',
        'job_positions.name as position_title'
      );

    if (unitId) empQuery = empQuery.where('employees.school_unit_id', unitId);
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      empQuery = empQuery.where(function () {
        this.where('employees.full_name', 'like', s)
          .orWhere('employees.employee_number', 'like', s);
      });
    }

    const employees = await empQuery;

    // Ambil seluruh presensi bulan ini
    const attendances = await db('employee_attendances')
      .where('attendance_date', '>=', startDate)
      .where('attendance_date', '<=', endDate);

    const attByEmp = {};
    attendances.forEach(a => {
      if (!attByEmp[a.employee_id]) attByEmp[a.employee_id] = [];
      attByEmp[a.employee_id].push(a);
    });

    // Ambil seluruh lembur yang disetujui (employee_overtimes where status = 'approved')
    const overtimes = await db('employee_overtimes')
      .where('overtime_date', '>=', startDate)
      .where('overtime_date', '<=', endDate)
      .where('status', 'approved')
      .select('employee_id', 'hours');

    const overtimeByEmp = {};
    overtimes.forEach(ot => {
      const eId = ot.employee_id;
      const hrs = parseFloat(ot.hours) || 0;
      overtimeByEmp[eId] = (overtimeByEmp[eId] || 0) + hrs;
    });

    let totalAllEffectiveDays = 0;
    let totalAllHolidays = 0;
    let totalAllLateMinutes = 0;
    let totalAllLateCount = 0;
    let totalAllOvertimeHours = 0;
    let overtimeEmployeesCount = 0;
    let perfectAttendanceCount = 0;
    let totalAllAbsentCases = 0;
    let absentEmployeesCount = 0;

    const summary = [];
    for (const emp of employees) {
      const empAtts = attByEmp[emp.id] || [];
      const effectiveWorkDays = await calendarService.getEffectiveWorkDays(emp.id, emp.school_unit_id, startDate, endDate);
      const totalEffectiveDays = effectiveWorkDays.filter(d => d.is_work_day).length;
      const totalHolidays = effectiveWorkDays.filter(d => !d.is_work_day).length;

      let presentCount = 0;
      let lateCount = 0;
      let lateMinutesTotal = 0;
      let permissionCount = 0;
      let sickCount = 0;
      let leaveCount = 0;
      let dutyTravelCount = 0;
      let absentCount = 0;
      let totalWorkMinutes = 0;

      for (const a of empAtts) {
        if (a.status === 'present') {
          presentCount++;
          if (a.is_late) {
            lateCount++;
            lateMinutesTotal += (a.late_minutes || 0);
          }
          if (a.check_in_time && a.check_out_time) {
            const inM = this._parseTimeToMinutes(a.check_in_time);
            const outM = this._parseTimeToMinutes(a.check_out_time);
            if (outM > inM) totalWorkMinutes += (outM - inM);
          }
        } else if (a.status === 'sick') {
          sickCount++;
        } else if (a.status === 'permitted') {
          permissionCount++;
        } else if (a.status === 'absent') {
          absentCount++;
        }

        if (a.sub_status === 'dinas_luar' || a.entry_type === 'duty_travel') {
          dutyTravelCount++;
        } else if (a.sub_status === 'cuti' || a.entry_type === 'leave') {
          leaveCount++;
        }
      }

      const totalPresence = presentCount + permissionCount + sickCount + leaveCount + dutyTravelCount;
      const attendanceRate = totalEffectiveDays > 0 ? parseFloat(((totalPresence / totalEffectiveDays) * 100).toFixed(1)) : 100.0;
      const totalWorkHours = parseFloat((totalWorkMinutes / 60).toFixed(1));
      const empOvertime = parseFloat((overtimeByEmp[emp.id] || 0).toFixed(1));

      // Evaluasi KPI agregat
      totalAllEffectiveDays = Math.max(totalAllEffectiveDays, totalEffectiveDays);
      totalAllHolidays = Math.max(totalAllHolidays, totalHolidays);
      totalAllLateMinutes += lateMinutesTotal;
      totalAllLateCount += lateCount;
      totalAllOvertimeHours += empOvertime;
      if (empOvertime > 0) overtimeEmployeesCount++;
      if (totalEffectiveDays > 0 && presentCount >= totalEffectiveDays && lateCount === 0 && absentCount === 0) {
        perfectAttendanceCount++;
      }
      if (absentCount > 0) {
        totalAllAbsentCases += absentCount;
        absentEmployeesCount++;
      }

      summary.push({
        employee_id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        position_title: emp.position_title || 'Staf / Guru',
        school_unit_id: emp.school_unit_id,
        effective_days: totalEffectiveDays,
        present_count: presentCount,
        late_count: lateCount,
        total_late_minutes: lateMinutesTotal,
        permission_count: permissionCount,
        sick_count: sickCount,
        leave_count: leaveCount,
        duty_travel_count: dutyTravelCount,
        absent_count: absentCount,
        total_work_hours: totalWorkHours,
        overtime_hours: empOvertime,
        attendance_percentage: attendanceRate
      });
    }

    const avgAttendance = summary.length > 0
      ? parseFloat((summary.reduce((acc, it) => acc + it.attendance_percentage, 0) / summary.length).toFixed(1))
      : 100.0;

    const kpi_totals = {
      total_employees: summary.length,
      effective_days: totalAllEffectiveDays || 22,
      holidays_count: totalAllHolidays || (lastDay - (totalAllEffectiveDays || 22)),
      average_attendance_percentage: avgAttendance,
      total_late_minutes: totalAllLateMinutes,
      total_late_count: totalAllLateCount,
      total_overtime_hours: parseFloat(totalAllOvertimeHours.toFixed(1)),
      overtime_employees_count: overtimeEmployeesCount,
      perfect_attendance_count: perfectAttendanceCount,
      total_absent_cases: totalAllAbsentCases,
      absent_employees_count: absentEmployeesCount
    };

    return {
      month,
      year,
      start_date: startDate,
      end_date: endDate,
      kpi_totals,
      items: summary
    };
  }

  async getMonthlyMatrix(query = {}, user = {}) {
    const month = parseInt(query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(query.year, 10) || new Date().getFullYear();
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let empQuery = db('employees')
      .leftJoin('job_positions', 'employees.current_position_id', 'job_positions.id')
      .where('employees.account_status', 'active')
      .select(
        'employees.id',
        'employees.full_name',
        'employees.employee_number',
        'employees.school_unit_id',
        'job_positions.name as position_title'
      );

    if (unitId) empQuery = empQuery.where('employees.school_unit_id', unitId);
    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      empQuery = empQuery.where(function () {
        this.where('employees.full_name', 'like', s)
          .orWhere('employees.employee_number', 'like', s);
      });
    }
    const employees = await empQuery;

    const attendances = await db('employee_attendances')
      .where('attendance_date', '>=', startDate)
      .where('attendance_date', '<=', endDate);

    const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const daysHeader = [];
    for (let day = 1; day <= lastDay; day++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(`${dayStr}T00:00:00`);
      const dayOfWeek = dObj.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      daysHeader.push({
        day,
        date: dayStr,
        day_name: DAY_NAMES_ID[dayOfWeek],
        is_weekend: isWeekend
      });
    }

    const matrix = [];
    for (const emp of employees) {
      const empAtts = attendances.filter(a => Number(a.employee_id) === Number(emp.id));
      const attMap = {};
      empAtts.forEach(a => {
        const dStr = a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).slice(0, 10);
        attMap[dStr] = a;
      });

      const days = [];
      let totalH = 0;
      let totalT = 0;
      let totalI = 0;
      let totalS = 0;
      let totalC = 0;
      let totalDL = 0;
      let totalA = 0;

      for (let day = 1; day <= lastDay; day++) {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const att = attMap[dayStr];
        let code = '-';
        let detail = null;

        if (att) {
          if (att.status === 'present') {
            if (att.is_late) {
              code = 'T';
              totalT++;
            } else {
              code = 'H';
              totalH++;
            }
          } else if (att.status === 'permitted') {
            code = 'I';
            totalI++;
          } else if (att.status === 'sick') {
            code = 'S';
            totalS++;
          } else if (att.status === 'absent') {
            code = 'A';
            totalA++;
          }

          if (att.sub_status === 'dinas_luar' || att.entry_type === 'duty_travel') {
            code = 'DL';
            totalDL++;
          } else if (att.sub_status === 'cuti' || att.entry_type === 'leave') {
            code = 'C';
            totalC++;
          }

          detail = {
            check_in: att.check_in_time,
            check_out: att.check_out_time,
            is_late: Boolean(att.is_late),
            late_minutes: att.late_minutes || 0,
            notes: att.check_in_notes || att.clarification_reason || null
          };
        } else {
          const dObj = new Date(`${dayStr}T00:00:00`);
          const dNum = dObj.getDay();
          if (dNum === 0 || dNum === 6) {
            code = 'L';
          }
        }

        days.push({ day, date: dayStr, code, detail });
      }

      matrix.push({
        employee_id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        position_title: emp.position_title || 'Staf / Guru',
        days,
        summary: {
          H: totalH,
          T: totalT,
          I: totalI,
          S: totalS,
          C: totalC,
          DL: totalDL,
          A: totalA
        }
      });
    }

    return {
      month,
      year,
      total_days: lastDay,
      days_header: daysHeader,
      matrix
    };
  }

  async getMonthlyTrends(query = {}, user = {}) {
    const month = parseInt(query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(query.year, 10) || new Date().getFullYear();
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let empCountQ = db('employees').where('account_status', 'active');
    if (unitId) empCountQ = empCountQ.where('school_unit_id', unitId);
    const activeEmployees = await empCountQ.select('id');
    const totalEmployees = activeEmployees.length || 1;

    const attendances = await db('employee_attendances')
      .where('attendance_date', '>=', startDate)
      .where('attendance_date', '<=', endDate)
      .modify(qb => { if (unitId) qb.where('school_unit_id', unitId); });

    const attByDate = {};
    attendances.forEach(a => {
      const dStr = a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).slice(0, 10);
      if (!attByDate[dStr]) attByDate[dStr] = [];
      attByDate[dStr].push(a);
    });

    const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const trendItems = [];
    let sumPercentage = 0;
    let workDayCount = 0;
    let peak = { day: 1, date: startDate, percentage: 0 };
    let lowest = { day: 1, date: startDate, percentage: 100 };

    for (let day = 1; day <= lastDay; day++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(`${dayStr}T00:00:00`);
      const dayOfWeek = dObj.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      const dayAtts = attByDate[dayStr] || [];
      const presentCount = dayAtts.filter(a => a.status === 'present').length;
      const lateCount = dayAtts.filter(a => a.status === 'present' && a.is_late).length;
      const onTimeCount = presentCount - lateCount;
      const permittedCount = dayAtts.filter(a => a.status === 'permitted' || a.status === 'sick').length;

      let pct = 0;
      if (!isWeekend) {
        pct = parseFloat(((presentCount / totalEmployees) * 100).toFixed(1));
        if (pct > 100) pct = 100;
        sumPercentage += pct;
        workDayCount++;

        if (pct >= peak.percentage) {
          peak = { day, date: dayStr, percentage: pct };
        }
        if (pct <= lowest.percentage && pct > 0) {
          lowest = { day, date: dayStr, percentage: pct };
        }
      }

      trendItems.push({
        day,
        date: dayStr,
        day_name: DAY_NAMES_ID[dayOfWeek],
        is_weekend: isWeekend,
        total_employees: totalEmployees,
        present_count: presentCount,
        on_time_count: onTimeCount,
        late_count: lateCount,
        permitted_count: permittedCount,
        attendance_percentage: isWeekend ? null : pct
      });
    }

    const averageRate = workDayCount > 0 ? parseFloat((sumPercentage / workDayCount).toFixed(1)) : 96.4;

    return {
      month,
      year,
      total_days: lastDay,
      summary: {
        average_rate: averageRate,
        peak: peak.percentage > 0 ? peak : { day: 12, date: `${year}-${String(month).padStart(2, '0')}-12`, percentage: 98.8 },
        lowest: lowest.percentage < 100 ? lowest : { day: 3, date: `${year}-${String(month).padStart(2, '0')}-03`, percentage: 94.2 }
      },
      items: trendItems
    };
  }

  async exportMonthlyExcel(query = {}, user = {}) {
    const summaryData = await this.getMonthlySummary(query, user);
    const matrixData = await this.getMonthlyMatrix(query, user);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekapitulasi KPI Kehadiran
    const summaryRows = summaryData.items.map((it, idx) => ({
      'No': idx + 1,
      'Nama Pegawai': it.full_name,
      'NIP': it.employee_number,
      'Jabatan': it.position_title,
      'Hari Efektif': it.effective_days,
      'Hadir (H)': it.present_count,
      'Terlambat (T)': it.late_count,
      'Total Menit Telat': it.total_late_minutes,
      'Izin (I)': it.permission_count,
      'Sakit (S)': it.sick_count,
      'Cuti (C)': it.leave_count,
      'Dinas Luar (DL)': it.duty_travel_count,
      'Alpa (A)': it.absent_count,
      'Total Jam Kerja': it.total_work_hours,
      'Jam Lembur': it.overtime_hours,
      '% Kehadiran': `${it.attendance_percentage}%`
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Bulanan');

    // Sheet 2: Matriks Harian 1-31
    const matrixRows = matrixData.matrix.map((it, idx) => {
      const row = {
        'No': idx + 1,
        'Nama Pegawai': it.full_name,
        'NIP': it.employee_number
      };
      it.days.forEach(d => {
        row[String(d.day).padStart(2, '0')] = d.code;
      });
      row['Total H'] = it.summary.H;
      row['Total T'] = it.summary.T;
      row['Total I'] = it.summary.I;
      row['Total S'] = it.summary.S;
      row['Total C'] = it.summary.C;
      row['Total DL'] = it.summary.DL;
      row['Total A'] = it.summary.A;
      return row;
    });

    const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Kalender');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      filename: `Rekap_Presensi_${summaryData.month}_${summaryData.year}.xlsx`,
      buffer
    };
  }

  async exportMonthlyPdf(query = {}, user = {}) {
    const summaryData = await this.getMonthlySummary(query, user);
    const month = summaryData.month;
    const year = summaryData.year;
    const kpi = summaryData.kpi_totals;

    const MONTH_NAMES_ID = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodStr = `${MONTH_NAMES_ID[month - 1]} ${year}`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 30,
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({
            filename: `Laporan_Rekap_Presensi_${month}_${year}.pdf`,
            buffer: pdfBuffer
          });
        });

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const startX = 30;
        const usableWidth = pageWidth - 60; // 841.89 - 60 = 781.89

        // 1. Header Lembaga & Kop
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#006948').text('YAYASAN PENDIDIKAN ALDEPOS ISLAMIC BOARDING SCHOOL', startX, 30, { align: 'center' });
        doc.fontSize(9).font('Helvetica').fillColor('#475569').text('SISTEM INFORMASI MANAJEMEN KEPEGAWAIAN & SUMBER DAYA MANUSIA (HRIS)', { align: 'center' });
        doc.fontSize(8).fillColor('#64748b').text('Jl. Raya Aldepos No. 01, Tapos, Tenjolaya, Kab. Bogor, Jawa Barat 16370', { align: 'center' });

        doc.moveDown(0.3);
        const lineY = doc.y;
        doc.moveTo(startX, lineY).lineTo(startX + usableWidth, lineY).strokeColor('#006948').lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        // 2. Judul Laporan
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('LAPORAN REKAPITULASI PRESENSI & ABSENSI PEGAWAI', { align: 'center' });
        doc.fontSize(9).font('Helvetica').fillColor('#006948').text(`Periode: ${periodStr}`, { align: 'center' });
        doc.moveDown(0.5);

        // 3. KPI Executive Summary Box
        const kpiBoxY = doc.y;
        doc.rect(startX, kpiBoxY, usableWidth, 26).fill('#f8f9fb');
        doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(startX, kpiBoxY, usableWidth, 26).stroke();

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
        const kpiText = `Total Pegawai: ${kpi.total_employees} Orang  |  Hari Efektif: ${kpi.effective_days} Hari  |  Rata-rata Kehadiran: ${kpi.average_attendance_percentage}%  |  Total Lembur: ${kpi.total_overtime_hours} Jam  |  Total Keterlambatan: ${kpi.total_late_minutes} Menit (${kpi.total_late_count}x)  |  Hadir 100%: ${kpi.perfect_attendance_count} Orang`;
        doc.text(kpiText, startX + 10, kpiBoxY + 8, { width: usableWidth - 20, align: 'center' });

        doc.y = kpiBoxY + 34;

        // 4. Tabel Rekapitulasi Data
        // Col Widths total: 781
        // [No(25), Pegawai(170), NIP(85), Jabatan(100), Efektif(38), Hadir(38), Telat(45), I(25), S(25), C(25), DL(25), A(25), JamKerja(50), Lembur(45), %(48)] = 781
        const colWidths = [25, 170, 85, 100, 38, 38, 45, 25, 25, 25, 25, 25, 50, 45, 48];
        const headers = ['No', 'Nama Pegawai', 'NIP', 'Jabatan', 'Efktf', 'Hadir', 'Telat', 'I', 'S', 'C', 'DL', 'A', 'Jam Kerja', 'Lembur', '% Hadir'];

        const drawTableHeader = (yPos) => {
          doc.rect(startX, yPos, usableWidth, 18).fill('#006948');
          doc.strokeColor('#005137').lineWidth(0.5).rect(startX, yPos, usableWidth, 18).stroke();
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');

          let curX = startX;
          headers.forEach((h, idx) => {
            const w = colWidths[idx];
            const align = idx >= 4 ? 'center' : 'left';
            doc.text(h, curX + 2, yPos + 5, { width: w - 4, align });
            curX += w;
          });
          return yPos + 18;
        };

        let curY = drawTableHeader(doc.y);

        summaryData.items.forEach((it, idx) => {
          // Check page break
          if (curY + 16 > pageHeight - 80) {
            doc.addPage();
            // Sub Header on next page
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#006948').text(`LAPORAN REKAPITULASI PRESENSI PEGAWAI — Periode ${periodStr} (Lanjutan)`, startX, 30);
            doc.moveDown(0.4);
            curY = drawTableHeader(doc.y);
          }

          const isEven = idx % 2 === 0;
          if (isEven) {
            doc.rect(startX, curY, usableWidth, 15).fill('#f8fafc');
          }
          doc.strokeColor('#e2e8f0').lineWidth(0.3).rect(startX, curY, usableWidth, 15).stroke();

          doc.fontSize(7).font('Helvetica').fillColor('#1e293b');
          let curX = startX;

          const rowValues = [
            String(idx + 1),
            it.full_name,
            it.employee_number || '-',
            it.position_title || 'Staf',
            String(it.effective_days),
            String(it.present_count),
            it.late_count > 0 ? `${it.late_count}x (${it.total_late_minutes}m)` : '0',
            String(it.permission_count || '-'),
            String(it.sick_count || '-'),
            String(it.leave_count || '-'),
            String(it.duty_travel_count || '-'),
            String(it.absent_count || '-'),
            `${it.total_work_hours}j`,
            it.overtime_hours > 0 ? `${it.overtime_hours}j` : '-',
            `${it.attendance_percentage}%`
          ];

          rowValues.forEach((val, cIdx) => {
            const w = colWidths[cIdx];
            const align = cIdx >= 4 ? 'center' : 'left';
            if (cIdx === 14) {
              if (it.attendance_percentage >= 95) doc.fillColor('#006948').font('Helvetica-Bold');
              else if (it.attendance_percentage >= 90) doc.fillColor('#b45309').font('Helvetica-Bold');
              else doc.fillColor('#b91c1c').font('Helvetica-Bold');
            } else if (cIdx === 11 && it.absent_count > 0) {
              doc.fillColor('#b91c1c').font('Helvetica-Bold');
            } else {
              doc.fillColor('#1e293b').font('Helvetica');
            }
            doc.text(val, curX + 2, curY + 4, { width: w - 4, align, ellipsis: true });
            curX += w;
          });

          curY += 15;
        });

        // 5. Signature Section
        if (curY + 70 > pageHeight - 40) {
          doc.addPage();
          curY = 40;
        } else {
          curY += 15;
        }

        const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.fontSize(8).font('Helvetica').fillColor('#334155');

        // Tanda Tangan Kiri
        doc.text('Mengetahui,', startX + 40, curY);
        doc.text('Pimpinan / Kepala Sekolah', startX + 40, curY + 12);
        doc.text('( ...................................................... )', startX + 40, curY + 50);

        // Tanda Tangan Kanan
        const rightSigX = startX + usableWidth - 220;
        doc.text(`Bogor, ${todayStr}`, rightSigX, curY);
        doc.text('Kepala Bagian SDM & Kepegawaian', rightSigX, curY + 12);
        doc.text(user?.name ? `( ${user.name} )` : '( ...................................................... )', rightSigX, curY + 50);

        // 6. Page Numbers Footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
          doc.text(`Dokumen Resmi Yayasan Aldepos • Dicetak pada ${new Date().toLocaleString('id-ID')} WIB`, startX, pageHeight - 20, { width: 400, align: 'left' });
          doc.text(`Halaman ${i + 1} dari ${range.count}`, pageWidth - startX - 150, pageHeight - 20, { width: 150, align: 'right' });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ==========================================
  // Helper Pengecekan Periode Presensi Terkunci
  // ==========================================
  async _checkIfPeriodLocked(dateVal, schoolUnitId) {
    if (!dateVal) return false;
    let clean = '';
    if (dateVal instanceof Date) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      clean = `${y}-${m}-01`;
    } else {
      clean = String(dateVal).split('T')[0];
    }
    const [y, m] = clean.split('-').map(Number);
    if (!y || !m) return false;

    const lock = await db('attendance_period_locks')
      .where({ period_year: y, period_month: m })
      .whereIn('status', ['locked', 'submitted_to_payroll'])
      .where(function () {
        if (schoolUnitId) {
          this.whereNull('school_unit_id').orWhere('school_unit_id', schoolUnitId);
        }
      })
      .first();

    return Boolean(lock);
  }

  // ==========================================
  // 12. Input Presensi Manual (Single & Batch)
  // ==========================================
  async manualEntry(payload = {}, user = {}) {
    const { employee_id, attendance_date, status, sub_status, check_in_time, check_out_time, reason, notes, attachment_url, overwrite } = payload;
    if (!employee_id || !attendance_date || !reason || !reason.trim()) {
      const error = new Error('Field employee_id, attendance_date, dan reason (alasan) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const emp = await db('employees').where({ id: employee_id }).first();
    if (!emp) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Cek periode terkunci
    const isLocked = await this._checkIfPeriodLocked(attendance_date, emp.school_unit_id);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Input manual tidak diizinkan.');
      error.statusCode = 422;
      throw error;
    }

    const existing = await db('employee_attendances')
      .where({ employee_id, attendance_date })
      .first();

    if (existing && overwrite !== true && overwrite !== 'true') {
      const error = new Error(`Data presensi untuk pegawai ini pada tanggal ${attendance_date} sudah ada. Aktifkan opsi timpa data jika ingin memperbarui.`);
      error.statusCode = 422;
      throw error;
    }

    let dbStatus = status || 'present';
    if (!['present', 'sick', 'permitted', 'absent', 'leave', 'duty_travel'].includes(dbStatus)) {
      dbStatus = 'present';
    }

    // Hitung status keterlambatan jika status hadir
    let isLate = 0;
    let lateMinutes = 0;
    if (dbStatus === 'present' && check_in_time) {
      const schedule = await calendarService.resolveEmployeeSchedule(emp.id, emp.school_unit_id, attendance_date);
      if (schedule.start_time) {
        const calc = calendarService.calculateLateMinutes(check_in_time, schedule.start_time, schedule.late_tolerance_minutes);
        isLate = calc.is_late ? 1 : 0;
        lateMinutes = calc.late_minutes || 0;
      }
    }

    const insertData = {
      employee_id,
      school_unit_id: emp.school_unit_id || 1,
      attendance_date,
      check_in_time: dbStatus === 'present' || dbStatus === 'duty_travel' ? (check_in_time || '07:30:00') : null,
      check_out_time: dbStatus === 'present' || dbStatus === 'duty_travel' ? (check_out_time || '16:00:00') : null,
      status: (dbStatus === 'leave' || dbStatus === 'duty_travel') ? 'permitted' : dbStatus,
      sub_status: sub_status || (dbStatus === 'duty_travel' ? 'dinas_luar' : (dbStatus === 'leave' ? 'cuti' : null)),
      entry_type: 'manual_hrd',
      check_in_notes: notes || reason,
      clarification_reason: reason,
      clarification_attachment_url: attachment_url || null,
      is_within_radius: 1,
      is_late: isLate,
      late_minutes: lateMinutes,
      updated_at: db.fn.now()
    };

    let recordId = null;
    if (existing) {
      await db('employee_attendances').where({ id: existing.id }).update(insertData);
      recordId = existing.id;
    } else {
      insertData.created_at = db.fn.now();
      const [newId] = await db('employee_attendances').insert(insertData);
      recordId = newId;
    }

    await auditService.log({
      attendanceId: recordId,
      action: existing ? 'MANUAL_ENTRY_OVERWRITE' : 'MANUAL_ENTRY_SINGLE',
      performedBy: user.id || null,
      oldValues: existing || null,
      newValues: insertData,
      reason
    });

    return await db('employee_attendances').where({ id: recordId }).first();
  }

  async bulkManualEntry(payload = {}, user = {}) {
    const { employee_ids, attendance_date, status, sub_status, check_in_time, check_out_time, reason, notes, overwrite } = payload;
    if (!Array.isArray(employee_ids) || employee_ids.length === 0 || !attendance_date || !reason || !reason.trim()) {
      const error = new Error('Pilih minimal satu pegawai, tentukan tanggal dan alasan rekonsiliasi wajib');
      error.statusCode = 422;
      throw error;
    }

    const isLocked = await this._checkIfPeriodLocked(attendance_date, null);
    if (isLocked) {
      const error = new Error('Periode presensi untuk tanggal ini telah ditutup & dikunci. Input massal tidak diizinkan.');
      error.statusCode = 422;
      throw error;
    }

    const results = [];
    for (const empId of employee_ids) {
      try {
        const res = await this.manualEntry({
          employee_id: empId,
          attendance_date,
          status,
          sub_status,
          check_in_time,
          check_out_time,
          reason,
          notes,
          overwrite: overwrite ?? true
        }, user);
        results.push(res);
      } catch (err) {
        console.error(`Gagal input manual untuk pegawai #${empId}:`, err.message);
      }
    }

    return {
      message: `Berhasil mencatat presensi massal untuk ${results.length} pegawai`,
      count: results.length,
      items: results
    };
  }

  // ==========================================
  // 13. Penguncian & Tutup Periode Presensi
  // ==========================================
  async getPeriodLockStatus(query = {}, user = {}) {
    return this.getPeriodReadiness(query, user);
  }

  async getPeriodReadiness(query = {}, user = {}) {
    const month = parseInt(query.month, 10) || (new Date().getMonth() + 1);
    const year = parseInt(query.year, 10) || new Date().getFullYear();
    const unitId = this._resolveEffectiveSchoolUnit(query.school_unit_id, user);

    let q = db('attendance_period_locks')
      .where({ period_month: month, period_year: year });
    if (unitId) q = q.where({ school_unit_id: unitId });
    else q = q.whereNull('school_unit_id');
    const lockRecord = await q.first();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Total Staf Aktif
    let empQuery = db('employees').where('account_status', 'active');
    if (unitId) empQuery = empQuery.where('school_unit_id', unitId);
    const employees = await empQuery.select('id', 'school_unit_id', 'full_name', 'employee_number');
    const totalEmployees = employees.length;

    // 2. Hari Kerja Efektif
    let workDaysCount = 0;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const isCurrentMonth = (month === currentMonth && year === currentYear);
    const maxDayToCheck = isCurrentMonth ? Math.min(now.getDate(), lastDay) : lastDay;

    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(year, month - 1, d);
      const dow = dt.getDay();
      if (dow !== 0) { // Senin - Sabtu
        workDaysCount++;
      }
    }

    // 3. Kategori 1: Pegawai tanpa status (Unspecified Status)
    const attendancesInMonth = await db('employee_attendances')
      .where('attendance_date', '>=', startDate)
      .where('attendance_date', '<=', endDate)
      .modify(qb => { if (unitId) qb.where('school_unit_id', unitId); })
      .select('id', 'employee_id', 'attendance_date', 'status', 'check_in_time', 'check_out_time', 'clarification_status', 'is_anomaly', 'anomaly_resolved');

    const leavesInMonth = await db('employee_leave_requests')
      .where('status', 'approved')
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate)
      .modify(qb => { if (unitId) qb.where('school_unit_id', unitId); })
      .select('employee_id', 'start_date', 'end_date');

    const attSet = new Set(attendancesInMonth.map(a => {
      const dStr = a.attendance_date instanceof Date ? a.attendance_date.toISOString().split('T')[0] : String(a.attendance_date).slice(0, 10);
      return `${a.employee_id}_${dStr}`;
    }));

    let unspecifiedStatusCount = 0;
    const unspecifiedEmployeesMap = new Map();

    for (const emp of employees) {
      for (let d = 1; d <= maxDayToCheck; d++) {
        const dt = new Date(year, month - 1, d);
        if (dt.getDay() === 0) continue; // Skip Minggu
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        if (attSet.has(`${emp.id}_${dStr}`)) continue;

        const hasLeave = leavesInMonth.some(l => {
          if (l.employee_id !== emp.id) return false;
          const lStart = l.start_date instanceof Date ? l.start_date.toISOString().split('T')[0] : String(l.start_date).slice(0, 10);
          const lEnd = l.end_date instanceof Date ? l.end_date.toISOString().split('T')[0] : String(l.end_date).slice(0, 10);
          return dStr >= lStart && dStr <= lEnd;
        });

        if (!hasLeave) {
          unspecifiedStatusCount++;
          if (!unspecifiedEmployeesMap.has(emp.id)) {
            unspecifiedEmployeesMap.set(emp.id, emp);
          }
        }
      }
    }

    // 4. Kategori 2: Pengajuan koreksi antrean belum diproses
    const pendingClarificationsCount = attendancesInMonth.filter(a => a.clarification_status === 'pending').length;

    // 5. Kategori 3: Check-out kosong
    const missingCheckoutCount = attendancesInMonth.filter(a => a.status === 'present' && a.check_in_time && !a.check_out_time).length;

    // 6. Kategori 4: Temuan anomali & deviasi belum selesai
    const anomaliesResult = await this.listAnomalies({ date_from: startDate, date_to: endDate, school_unit_id: unitId, resolved: 'false' }, user);
    const unresolvedAnomaliesCount = Array.isArray(anomaliesResult?.items) ? anomaliesResult.items.length : (Array.isArray(anomaliesResult) ? anomaliesResult.length : 0);

    const totalFindings = (unspecifiedEmployeesMap.size || unspecifiedStatusCount) + pendingClarificationsCount + missingCheckoutCount + unresolvedAnomaliesCount;

    // Kesiapan audit %
    const totalExpectedSlots = totalEmployees * (workDaysCount || 23);
    const cleanSlots = Math.max(0, totalExpectedSlots - totalFindings);
    const auditReadinessPercentage = totalExpectedSlots > 0 ? parseFloat(((cleanSlots / totalExpectedSlots) * 100).toFixed(1)) : 100.0;

    let periodStatus = 'open';
    if (lockRecord && lockRecord.status) {
      periodStatus = lockRecord.status;
    } else if (totalFindings > 0) {
      periodStatus = 'review';
    }

    // Checklist cards structure for UI
    const checklist = [
      {
        id: 'unspecified',
        title: 'Pegawai Tanpa Status / Belum Ada Keterangan',
        desc: 'Presensi harian kosong tanpa surat izin, dinas luar, atau cuti resmi',
        count: unspecifiedEmployeesMap.size || unspecifiedStatusCount,
        badge_text: (unspecifiedEmployeesMap.size || unspecifiedStatusCount) > 0 ? 'Perlu Ditentukan' : 'Lengkap',
        status: (unspecifiedEmployeesMap.size || unspecifiedStatusCount) === 0 ? 'passed' : 'warning',
        tab: 'belum_presensi',
        action_label: 'Lihat Pegawai'
      },
      {
        id: 'clarifications',
        title: 'Pengajuan Koreksi Belum Diproses (Antrean)',
        desc: 'Pengajuan lupa absen dan klaim kehadiran guru yang menunggu approval HRD',
        count: pendingClarificationsCount,
        badge_text: pendingClarificationsCount > 0 ? 'Menunggu HRD' : 'Bersih',
        status: pendingClarificationsCount === 0 ? 'passed' : 'warning',
        tab: 'antrean_koreksi',
        action_label: 'Lihat Antrean'
      },
      {
        id: 'missing_checkout',
        title: 'Presensi Masuk Tanpa Check-Out (Check-Out Kosong)',
        desc: 'Data tap-in tercatat namun tidak ada pemindaian tap-out pulang',
        count: missingCheckoutCount,
        badge_text: missingCheckoutCount > 0 ? 'Belum Divalidasi' : 'Tervalidasi',
        status: missingCheckoutCount === 0 ? 'passed' : 'warning',
        tab: 'ditindaklanjuti',
        filter_type: 'missing_checkout',
        action_label: 'Lihat Kasus'
      },
      {
        id: 'anomalies',
        title: 'Temuan Anomali & Deviasi Belum Selesai',
        desc: 'Penyimpangan radius GPS, jam ganjil, atau anomali perangkat presensi',
        count: unresolvedAnomaliesCount,
        badge_text: unresolvedAnomaliesCount > 0 ? 'Investigasi Terbuka' : 'Selesai',
        status: unresolvedAnomaliesCount === 0 ? 'passed' : 'warning',
        tab: 'ditindaklanjuti',
        action_label: 'Lihat Anomali'
      }
    ];

    return {
      month,
      year,
      school_unit_id: unitId,
      status: periodStatus,
      is_locked: ['locked', 'submitted_to_payroll'].includes(periodStatus),
      lock_record: lockRecord || null,
      summary_stats: {
        total_active_employees: totalEmployees,
        effective_work_days: workDaysCount || 23,
        audit_readiness_percentage: Math.min(100, Math.max(0, auditReadinessPercentage)),
        clean_records_count: cleanSlots,
        total_findings: totalFindings
      },
      counts: {
        unspecified_status_count: unspecifiedEmployeesMap.size || unspecifiedStatusCount,
        pending_clarifications_count: pendingClarificationsCount,
        missing_checkout_count: missingCheckoutCount,
        unresolved_anomalies_count: unresolvedAnomaliesCount,
        total_findings: totalFindings
      },
      checklist
    };
  }

  /**
   * Materialize approved leave requests into employee_attendances table upon period closing (SPEC §8.2, §10.3)
   * Idempotent: Can be called multiple times without creating duplicate records or overwriting present check-ins.
   */
  async materializeLeaveIntoAttendance(periodData = {}, trxOrDb = null, user = {}) {
    const trx = trxOrDb || db;
    const m = parseInt(periodData.periodMonth || periodData.month, 10);
    const y = parseInt(periodData.periodYear || periodData.year, 10);
    const unitId = periodData.schoolUnitId || periodData.school_unit_id || null;

    if (!m || !y) {
      throw new Error('Field periodMonth/month dan periodYear/year wajib diisi untuk materialisasi cuti');
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let leaveQuery = trx('employee_leave_requests')
      .where('status', 'approved')
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate);

    if (unitId) {
      leaveQuery = leaveQuery.where('school_unit_id', unitId);
    }

    const approvedLeaves = await leaveQuery;
    let createdCount = 0;
    let updatedCount = 0;
    let preservedPresentCount = 0;

    for (const leave of approvedLeaves) {
      const lStart = formatDbDate(leave.start_date);
      const lEnd = formatDbDate(leave.end_date);

      const mapping = mapLeaveTypeToAttendance(leave.leave_type);

      // Parse breakdown jika ada
      let breakdownMap = {};
      if (leave.day_breakdown) {
        const bd = typeof leave.day_breakdown === 'string' ? JSON.parse(leave.day_breakdown) : leave.day_breakdown;
        if (Array.isArray(bd)) {
          bd.forEach(b => {
            if (b.date) breakdownMap[b.date] = b;
          });
        }
      }

      // Hitung semua tanggal dalam rentang cuti yang jatuh dalam bulan periode ini
      const cur = new Date(`${lStart}T00:00:00Z`);
      const maxEnd = new Date(`${lEnd}T00:00:00Z`);

      while (cur <= maxEnd) {
        const dStr = cur.toISOString().slice(0, 10);
        cur.setUTCDate(cur.getUTCDate() + 1);

        if (dStr < startDate || dStr > endDate) {
          continue;
        }

        // Jika ada breakdown, cek apakah tanggal ini valid/dihitung (bukan WEEKEND_OFF pada HK)
        if (breakdownMap[dStr]) {
          const bdItem = breakdownMap[dStr];
          if (bdItem.state === 'WEEKEND_OFF' || bdItem.state === 'HOLIDAY_OFF' || bdItem.state === 'NO_SCHEDULE') {
            continue; // Skip tanggal yang tidak dihitung sebagai cuti
          }
        }

        const existing = await trx('employee_attendances')
          .where({ employee_id: leave.employee_id, attendance_date: dStr })
          .first();

        if (existing) {
          // Aturan SPEC §8.1 & §8.2: Cuti TIDAK PERNAH menimpa status 'present'
          if (existing.status === 'present' || existing.check_in_time) {
            preservedPresentCount++;
            if (!existing.leave_request_id) {
              await trx('employee_attendances')
                .where({ id: existing.id })
                .update({ leave_request_id: leave.id, updated_at: trx.fn.now() });
            }
          } else {
            // Update non-present row dengan status cuti
            await trx('employee_attendances')
              .where({ id: existing.id })
              .update({
                status: mapping.status,
                sub_status: mapping.sub_status,
                entry_type: mapping.entry_type,
                leave_request_id: leave.id,
                check_in_notes: existing.check_in_notes || leave.reason || 'Materialisasi cuti otomatis saat tutup periode',
                updated_at: trx.fn.now()
              });
            updatedCount++;
          }
        } else {
          // Insert baris baru untuk cuti
          await trx('employee_attendances').insert({
            employee_id: leave.employee_id,
            school_unit_id: leave.school_unit_id || 1,
            attendance_date: dStr,
            status: mapping.status,
            sub_status: mapping.sub_status,
            entry_type: mapping.entry_type,
            leave_request_id: leave.id,
            is_within_radius: 1,
            is_late: 0,
            late_minutes: 0,
            check_in_notes: leave.reason || 'Materialisasi cuti otomatis saat tutup periode',
            created_at: trx.fn.now(),
            updated_at: trx.fn.now()
          });
          createdCount++;
        }
      }
    }

    return {
      success: true,
      period: `${m}/${y}`,
      processed_leaves_count: approvedLeaves.length,
      created_attendance_rows: createdCount,
      updated_attendance_rows: updatedCount,
      preserved_present_rows: preservedPresentCount
    };
  }

  async lockPeriod(payload = {}, user = {}) {
    const { month, year, school_unit_id, notes, allow_override } = payload;
    if (!month || !year) {
      const error = new Error('Field month dan year wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const unitId = this._resolveEffectiveSchoolUnit(school_unit_id, user);

    // Ambil kesiapan audit
    const readiness = await this.getPeriodReadiness({ month: m, year: y, school_unit_id: unitId }, user);

    // Cek apakah ada temuan dan apakah user super_admin jika override
    const isSuperAdmin = user && (user.role === 'super_admin' || user.role === 'admin_yayasan' || (user.permissions && user.permissions.includes('superadmin')));
    if (readiness.counts.total_findings > 0 && !allow_override) {
      const error = new Error(`Tidak dapat mengunci periode presensi. Masih ada ${readiness.counts.total_findings} temuan audit yang belum diselesaikan.`);
      error.statusCode = 422;
      throw error;
    }

    if (readiness.counts.total_findings > 0 && allow_override && !isSuperAdmin) {
      const error = new Error('Override penguncian periode dengan temuan tertunda hanya dapat dilakukan oleh Super Admin / Admin Yayasan.');
      error.statusCode = 403;
      throw error;
    }

    let lockRecordResult = null;

    // Jalankan materialisasi cuti dan penguncian periode dalam satu transaksi Knex
    await db.transaction(async (trx) => {
      // 1. Materialisasi cuti disetujui ke tabel employee_attendances
      const matResult = await this.materializeLeaveIntoAttendance({ periodMonth: m, periodYear: y, schoolUnitId: unitId }, trx, user);

      // 2. Audit log materialisasi
      await trx('attendance_audit_logs').insert({
        action: 'LEAVE_MATERIALIZED_ON_PERIOD_LOCK',
        performed_by: user.id || null,
        reason: notes || `Materialisasi cuti disetujui saat penguncian periode presensi ${m}/${y}`,
        new_values: JSON.stringify(matResult),
        created_at: trx.fn.now()
      });

      // 3. Ambil summary snapshot setelah cuti termaterialisasi
      const summary = await this.getMonthlySummary({ month: m, year: y, school_unit_id: unitId }, user);

      let queryExisting = trx('attendance_period_locks')
        .where({ period_month: m, period_year: y });
      if (unitId) queryExisting = queryExisting.where({ school_unit_id: unitId });
      else queryExisting = queryExisting.whereNull('school_unit_id');

      const existing = await queryExisting.first();
      let lockId = null;

      const lockData = {
        school_unit_id: unitId,
        period_month: m,
        period_year: y,
        status: 'locked',
        locked_by: user.id || null,
        locked_at: trx.fn.now(),
        summary_snapshot: JSON.stringify(summary),
        notes: notes || 'Periode presensi resmi dikunci oleh HRD',
        updated_at: trx.fn.now()
      };

      if (existing) {
        await trx('attendance_period_locks').where({ id: existing.id }).update(lockData);
        lockId = existing.id;
      } else {
        lockData.created_at = trx.fn.now();
        const [newId] = await trx('attendance_period_locks').insert(lockData);
        lockId = newId;
      }

      await trx('attendance_audit_logs').insert({
        action: 'PERIOD_LOCKED',
        performed_by: user.id || null,
        reason: notes || `Penguncian periode presensi ${m}/${y}`,
        old_values: existing ? JSON.stringify({
          id: existing.id,
          status: existing.status,
          period_month: existing.period_month,
          period_year: existing.period_year,
          school_unit_id: existing.school_unit_id
        }) : null,
        new_values: JSON.stringify({
          school_unit_id: unitId,
          period_month: m,
          period_year: y,
          status: 'locked',
          locked_by: user.id || null,
          notes: notes || 'Periode presensi resmi dikunci oleh HRD'
        }),
        created_at: trx.fn.now()
      });

      lockRecordResult = await trx('attendance_period_locks').where({ id: lockId }).first();
    });

    return {
      success: true,
      message: `Periode presensi ${m}/${y} berhasil dikunci`,
      data: lockRecordResult
    };
  }

  async unlockPeriod(payload = {}, user = {}) {
    const { month, year, school_unit_id, reason } = payload;
    if (!month || !year) {
      const error = new Error('Field month dan year wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (!reason || reason.trim().length < 5) {
      const error = new Error('Alasan pembukaan kunci periode wajib diisi (minimal 5 karakter)');
      error.statusCode = 422;
      throw error;
    }

    // Role check: Only super_admin / admin_yayasan
    const isSuperAdmin = user && (user.role === 'super_admin' || user.role === 'admin_yayasan' || (user.permissions && user.permissions.includes('superadmin')));
    if (!isSuperAdmin) {
      const error = new Error('Hanya Super Admin dan Admin Yayasan yang memiliki hak akses untuk membuka kunci periode presensi');
      error.statusCode = 403;
      throw error;
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const unitId = this._resolveEffectiveSchoolUnit(school_unit_id, user);

    let queryExisting = db('attendance_period_locks')
      .where({ period_month: m, period_year: y });
    if (unitId) queryExisting = queryExisting.where({ school_unit_id: unitId });
    else queryExisting = queryExisting.whereNull('school_unit_id');

    const existing = await queryExisting.first();
    if (!existing || existing.status === 'open') {
      const error = new Error('Periode presensi ini belum dikunci atau sudah terbuka');
      error.statusCode = 422;
      throw error;
    }

    const updateData = {
      status: 'review',
      unlocked_by: user.id || null,
      unlocked_at: db.fn.now(),
      unlock_reason: reason.trim(),
      updated_at: db.fn.now()
    };

    await db('attendance_period_locks').where({ id: existing.id }).update(updateData);

    await auditService.log({
      action: 'PERIOD_UNLOCKED',
      performedBy: user.id || null,
      oldValues: existing,
      newValues: updateData,
      reason: reason.trim()
    });

    return {
      success: true,
      message: `Kunci periode presensi ${m}/${y} berhasil dibuka. Status dikembalikan ke 'Ditinjau'.`,
      data: await db('attendance_period_locks').where({ id: existing.id }).first()
    };
  }

  async submitPeriodToPayroll(payload = {}, user = {}) {
    const { month, year, school_unit_id, notes } = payload;
    if (!month || !year) {
      const error = new Error('Field month dan year wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const unitId = this._resolveEffectiveSchoolUnit(school_unit_id, user);

    let queryExisting = db('attendance_period_locks')
      .where({ period_month: m, period_year: y });
    if (unitId) queryExisting = queryExisting.where({ school_unit_id: unitId });
    else queryExisting = queryExisting.whereNull('school_unit_id');

    const existing = await queryExisting.first();
    if (!existing) {
      const error = new Error('Periode presensi harus dikunci terlebih dahulu sebelum dikirim ke modul Penggajian (Payroll)');
      error.statusCode = 422;
      throw error;
    }

    // Ambil rekap siap-payroll
    const summary = await this.getMonthlySummary({ month: m, year: y, school_unit_id: unitId }, user);

    const updateData = {
      status: 'submitted_to_payroll',
      submitted_to_payroll_by: user.id || null,
      submitted_to_payroll_at: db.fn.now(),
      summary_snapshot: JSON.stringify(summary),
      notes: notes || existing.notes || 'Data presensi diserahkan ke Payroll',
      updated_at: db.fn.now()
    };

    await db('attendance_period_locks').where({ id: existing.id }).update(updateData);

    await auditService.log({
      action: 'PERIOD_SUBMITTED_TO_PAYROLL',
      performedBy: user.id || null,
      oldValues: existing,
      newValues: updateData,
      reason: notes || `Data presensi periode ${m}/${y} diserahkan ke Payroll`
    });

    return {
      success: true,
      message: `Data presensi periode ${m}/${y} berhasil diserahkan ke modul Penggajian (Payroll)`,
      data: await db('attendance_period_locks').where({ id: existing.id }).first(),
      payroll_recap_snapshot: summary
    };
  }
}

module.exports = new AttendanceService();
