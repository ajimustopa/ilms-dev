const fs = require('fs');
const path = require('path');
const db = require('../../../config/db/kepegawaian');

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
  // 1. Presensi / Absensi
  // ==========================================
  async listAttendances(query = {}) {
    let baseQuery = db('employee_attendances')
      .leftJoin('employees', 'employee_attendances.employee_id', 'employees.id')
      .select(
        'employee_attendances.*',
        'employees.full_name as employee_name',
        'employees.employee_number'
      );

    if (query.employee_id) {
      baseQuery = baseQuery.where('employee_attendances.employee_id', query.employee_id);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('employee_attendances.school_unit_id', query.school_unit_id);
    }
    if (query.date_from) {
      baseQuery = baseQuery.where('employee_attendances.attendance_date', '>=', query.date_from);
    }
    if (query.date_to) {
      baseQuery = baseQuery.where('employee_attendances.attendance_date', '<=', query.date_to);
    }

    return baseQuery.orderBy('employee_attendances.attendance_date', 'desc');
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

  async checkIn(payload, user = null) {
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

    // Jika pegawai self-service, pakai ref_id dari token
    if (!employee_id && user && user.ref_type === 'staff') {
      employee_id = user.ref_id;
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

    // 2. Ambil master lokasi aktif untuk satuan pendidikan pegawai
    const activeLocations = await db('attendance_locations')
      .where({ satuan_pendidikan_id: targetSchoolUnitId, is_active: true });

    if (!activeLocations || activeLocations.length === 0) {
      const error = new Error('Belum ada master lokasi absensi aktif untuk unit sekolah ini. Silakan hubungi HRD.');
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

    // 3. Evaluasi Jam Kerja & Keterlambatan
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const attendanceDateObj = new Date(`${today}T00:00:00`);
    const dayName = daysOfWeek[attendanceDateObj.getDay()];

    const schedules = await db('attendance_work_schedules')
      .where({ satuan_pendidikan_id: targetSchoolUnitId, is_active: true })
      .where(function () {
        this.where({ day_of_week: dayName }).orWhere({ day_of_week: 'all' });
      });

    // Prioritaskan jadwal spesifik hari daripada 'all'
    let matchedSchedule = schedules.find((s) => s.day_of_week === dayName) || schedules.find((s) => s.day_of_week === 'all') || null;

    let isLate = false;
    let lateMinutes = 0;

    if (matchedSchedule) {
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
      matched_schedule_name: matchedSchedule ? matchedSchedule.name : null
    };
  }

  async checkOut(id, payload = {}) {
    const attendance = await db('employee_attendances').where({ id }).first();
    if (!attendance) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
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

    // 2. Ambil master lokasi aktif untuk satuan pendidikan
    const activeLocations = await db('attendance_locations')
      .where({ satuan_pendidikan_id: attendance.school_unit_id, is_active: true });

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
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const attendanceDateObj = new Date(`${attendance.attendance_date}T00:00:00`);
      const dayName = daysOfWeek[attendanceDateObj.getDay()];

      const schedules = await db('attendance_work_schedules')
        .where({ satuan_pendidikan_id: attendance.school_unit_id, is_active: true })
        .where(function () {
          this.where({ day_of_week: dayName }).orWhere({ day_of_week: 'all' });
        });

      matchedSchedule = schedules.find((s) => s.day_of_week === dayName) || schedules.find((s) => s.day_of_week === 'all') || null;
    }

    let isEarlyDeparture = false;
    let earlyDepartureMinutes = 0;

    if (matchedSchedule) {
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
      matched_schedule_name: matchedSchedule ? matchedSchedule.name : null
    };
  }

  // ==========================================
  // Status Presensi Hari Ini (Portal Guru Reminder)
  // ==========================================
  async getTodayStatus(user, query = {}) {
    let employeeId = query.employee_id;
    if (!employeeId && user && user.ref_type === 'staff') {
      employeeId = user.ref_id;
    }

    if (!employeeId) {
      const error = new Error('Field employee_id atau sesi login pegawai (staff) diperlukan');
      error.statusCode = 400;
      throw error;
    }

    const employee = await db('employees').where({ id: employeeId }).first();
    if (!employee) {
      const error = new Error('Pegawai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const today = query.date || now.toISOString().split('T')[0];
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const attendanceDateObj = new Date(`${today}T00:00:00`);
    const dayName = daysOfWeek[attendanceDateObj.getDay()];

    const attendance = await db('employee_attendances')
      .where({ employee_id: employeeId, attendance_date: today })
      .first();

    // Master lokasi aktif untuk satuan pendidikan pegawai
    const locations = await db('attendance_locations')
      .where({ satuan_pendidikan_id: employee.school_unit_id, is_active: true })
      .select('id', 'name', 'latitude', 'longitude', 'radius_meters', 'address');

    // Jadwal kerja aktif hari ini
    const schedules = await db('attendance_work_schedules')
      .where({ satuan_pendidikan_id: employee.school_unit_id, is_active: true })
      .where(function () {
        this.where({ day_of_week: dayName }).orWhere({ day_of_week: 'all' });
      });

    const matchedSchedule = schedules.find((s) => s.day_of_week === dayName) || schedules.find((s) => s.day_of_week === 'all') || null;

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
      locations: locations || []
    };
  }

  async correctAttendance(id, payload) {
    const attendance = await db('employee_attendances').where({ id }).first();
    if (!attendance) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
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
    if (payload.check_in_time !== undefined) updateData.check_in_time = payload.check_in_time;
    if (payload.check_out_time !== undefined) updateData.check_out_time = payload.check_out_time;

    await db('employee_attendances').where({ id }).update(updateData);
    return db('employee_attendances').where({ id }).first();
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

    const uploadsDir = path.join(__dirname, '../../../../public/uploads/leave-attachments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const sanitizedBase = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `izin_${employeeId || 'emp'}_${Date.now()}_${sanitizedBase || 'dokumen'}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    return {
      attachment_url: `/uploads/leave-attachments/${filename}`,
      attachment_name: originalName || filename,
      attachment_mime_type: mimeType,
      attachment_size_bytes: buffer.length
    };
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

    return baseQuery.orderBy('employee_leave_requests.id', 'desc');
  }

  async getMyLeaveRequests(user, query = {}) {
    if (!user || user.ref_type !== 'staff' || !user.ref_id) {
      const error = new Error('Sesi login pegawai (staff) diperlukan untuk mengakses daftar izin pribadi');
      error.statusCode = 403;
      throw error;
    }

    const employeeId = user.ref_id;
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
    const isOwner = user && user.ref_type === 'staff' && parseInt(user.ref_id, 10) === parseInt(leave.employee_id, 10);
    const isHRD = user && (
      (user.permissions && (user.permissions.includes('kepegawaian.leave_requests.manage') || user.permissions.includes('superadmin'))) ||
      user.role === 'admin_yayasan' ||
      user.role === 'hrd' ||
      user.is_admin
    );

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

    if (!employee_id && user && user.ref_type === 'staff') {
      employee_id = user.ref_id;
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

    return baseQuery.orderBy('employee_overtimes.id', 'desc');
  }

  async createOvertime(payload, user = null) {
    let { employee_id, school_unit_id, overtime_date, hours, notes } = payload;

    if (!employee_id && user && user.ref_type === 'staff') {
      employee_id = user.ref_id;
    }

    if (!employee_id || !overtime_date || hours === undefined) {
      const error = new Error('Field employee_id, overtime_date, dan hours wajib diisi');
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

    const [id] = await db('employee_overtimes').insert({
      employee_id,
      school_unit_id: targetSchoolUnitId,
      overtime_date,
      hours: parseFloat(hours),
      notes: notes || null,
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

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_overtimes').where({ id }).update({
      status: 'rejected',
      notes: payload.notes ? `${overtime.notes ? overtime.notes + ' | ' : ''}Alasan Penolakan: ${payload.notes}` : overtime.notes,
      approved_by: approverId,
      approved_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_overtimes').where({ id }).first();
  }

  // ==========================================
  // 4. Master Lokasi Absensi GPS (Multi-Titik)
  // ==========================================
  async listLocations(query = {}) {
    let baseQuery = db('attendance_locations');

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where({ satuan_pendidikan_id: query.satuan_pendidikan_id });
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where({ is_active: query.is_active === 'true' || query.is_active === true || query.is_active === 1 });
    }
    if (query.search) {
      baseQuery = baseQuery.where(function () {
        this.where('name', 'like', `%${query.search}%`)
          .orWhere('address', 'like', `%${query.search}%`);
      });
    }

    return baseQuery.orderBy('id', 'asc');
  }

  async getLocationById(id) {
    const location = await db('attendance_locations').where({ id }).first();
    if (!location) {
      const error = new Error('Lokasi absensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return location;
  }

  async createLocation(payload) {
    const { satuan_pendidikan_id, name, latitude, longitude, radius_meters, address, notes, is_active } = payload;

    if (!satuan_pendidikan_id || !name || latitude === undefined || longitude === undefined) {
      const error = new Error('Field satuan_pendidikan_id, name, latitude, dan longitude wajib diisi');
      error.statusCode = 422;
      throw error;
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
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('attendance_locations').where({ id }).first();
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

    await db('attendance_locations').where({ id }).update(updateData);
    return db('attendance_locations').where({ id }).first();
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

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where({ satuan_pendidikan_id: query.satuan_pendidikan_id });
    }
    if (query.day_of_week) {
      baseQuery = baseQuery.where(function () {
        this.where({ day_of_week: query.day_of_week })
          .orWhere({ day_of_week: 'all' });
      });
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where({ is_active: query.is_active === 'true' || query.is_active === true || query.is_active === 1 });
    }

    return baseQuery.orderBy('id', 'asc');
  }

  async getWorkScheduleById(id) {
    const schedule = await db('attendance_work_schedules').where({ id }).first();
    if (!schedule) {
      const error = new Error('Pengaturan jam kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return schedule;
  }

  async createWorkSchedule(payload) {
    const {
      satuan_pendidikan_id,
      name,
      day_of_week,
      start_time,
      end_time,
      late_tolerance_minutes,
      early_departure_tolerance_minutes,
      is_active,
      notes
    } = payload;

    if (!satuan_pendidikan_id || !name || !start_time || !end_time) {
      const error = new Error('Field satuan_pendidikan_id, name, start_time, dan end_time wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const validDays = ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const targetDay = day_of_week || 'all';
    if (!validDays.includes(targetDay)) {
      const error = new Error(`day_of_week harus salah satu dari: ${validDays.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('attendance_work_schedules').insert({
      satuan_pendidikan_id,
      name,
      day_of_week: targetDay,
      start_time,
      end_time,
      late_tolerance_minutes: late_tolerance_minutes !== undefined ? parseInt(late_tolerance_minutes, 10) : 15,
      early_departure_tolerance_minutes: early_departure_tolerance_minutes !== undefined ? parseInt(early_departure_tolerance_minutes, 10) : 0,
      is_active: is_active !== undefined ? is_active : true,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('attendance_work_schedules').where({ id }).first();
  }

  async updateWorkSchedule(id, payload) {
    const schedule = await db('attendance_work_schedules').where({ id }).first();
    if (!schedule) {
      const error = new Error('Pengaturan jam kerja tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.satuan_pendidikan_id !== undefined) updateData.satuan_pendidikan_id = payload.satuan_pendidikan_id;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.day_of_week !== undefined) {
      const validDays = ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!validDays.includes(payload.day_of_week)) {
        const error = new Error(`day_of_week harus salah satu dari: ${validDays.join(', ')}`);
        error.statusCode = 422;
        throw error;
      }
      updateData.day_of_week = payload.day_of_week;
    }
    if (payload.start_time !== undefined) updateData.start_time = payload.start_time;
    if (payload.end_time !== undefined) updateData.end_time = payload.end_time;
    if (payload.late_tolerance_minutes !== undefined) updateData.late_tolerance_minutes = parseInt(payload.late_tolerance_minutes, 10);
    if (payload.early_departure_tolerance_minutes !== undefined) updateData.early_departure_tolerance_minutes = parseInt(payload.early_departure_tolerance_minutes, 10);
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    await db('attendance_work_schedules').where({ id }).update(updateData);
    return db('attendance_work_schedules').where({ id }).first();
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
}

module.exports = new AttendanceService();
