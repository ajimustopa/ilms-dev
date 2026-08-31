/**
 * Attendance Service Implementation
 * Modul Kepegawaian - Fitur 3: Kehadiran (Presensi, Cuti & Izin, Lembur)
 */
const db = require('../../../config/db/kepegawaian');

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
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // radius bumi dalam meter
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  async checkIn(payload, user = null) {
    let { employee_id, school_unit_id, attendance_date, check_in_time, latitude, longitude, device_info, notes } = payload;

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

    // Default target koordinat Aldepos Islamic Boarding School jika belum diatur di database
    const defaultSchoolLat = -6.6521;
    const defaultSchoolLng = 106.8123;
    const maxAllowedRadius = 200; // 200 meter radius toleransi HRD

    let calculatedDistance = null;
    if (latitude && longitude) {
      calculatedDistance = this._calculateDistanceMeters(
        parseFloat(latitude),
        parseFloat(longitude),
        defaultSchoolLat,
        defaultSchoolLng
      );
    }

    const insertData = {
      employee_id,
      school_unit_id: targetSchoolUnitId,
      attendance_date: today,
      check_in_time: timeNow,
      check_out_time: null,
      status: 'present',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    const [id] = await db('employee_attendances').insert(insertData);
    const record = await db('employee_attendances').where({ id }).first();

    return {
      ...record,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      distance_meters: calculatedDistance,
      is_within_radius: calculatedDistance !== null ? calculatedDistance <= maxAllowedRadius : true
    };
  }

  async checkOut(id, payload = {}) {
    const attendance = await db('employee_attendances').where({ id }).first();
    if (!attendance) {
      const error = new Error('Data presensi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    const timeNow = payload.check_out_time || now.toTimeString().split(' ')[0];

    await db('employee_attendances').where({ id }).update({
      check_out_time: timeNow,
      updated_at: db.fn.now()
    });

    return db('employee_attendances').where({ id }).first();
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

  // ==========================================
  // 2. Cuti & Izin
  // ==========================================
  async listLeaveRequests(query = {}) {
    let baseQuery = db('employee_leave_requests')
      .leftJoin('employees as e', 'employee_leave_requests.employee_id', 'e.id')
      .leftJoin('employees as approver', 'employee_leave_requests.approved_by', 'approver.id')
      .select(
        'employee_leave_requests.*',
        'e.full_name as employee_name',
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

    return baseQuery.orderBy('employee_leave_requests.id', 'desc');
  }

  async createLeaveRequest(payload, user = null) {
    let { employee_id, school_unit_id, leave_type, start_date, end_date, reason } = payload;

    if (!employee_id && user && user.ref_type === 'staff') {
      employee_id = user.ref_id;
    }

    if (!employee_id || !leave_type || !start_date || !end_date) {
      const error = new Error('Field employee_id, leave_type, start_date, dan end_date wajib diisi');
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

    const [id] = await db('employee_leave_requests').insert({
      employee_id,
      school_unit_id: targetSchoolUnitId,
      leave_type: leave_type.trim(),
      start_date,
      end_date,
      reason: reason || null,
      status: 'pending',
      approved_by: null,
      approved_at: null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('employee_leave_requests').where({ id }).first();
  }

  async approveLeaveRequest(id, user = null) {
    const leave = await db('employee_leave_requests').where({ id }).first();
    if (!leave) {
      const error = new Error('Pengajuan cuti tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'pending') {
      const error = new Error(`Pengajuan cuti sudah berstatus '${leave.status}' dan tidak dapat diproses ulang`);
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
      const error = new Error('Pengajuan cuti tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'pending') {
      const error = new Error(`Pengajuan cuti sudah berstatus '${leave.status}' dan tidak dapat diproses ulang`);
      error.statusCode = 409;
      throw error;
    }

    const approverId = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    await db('employee_leave_requests').where({ id }).update({
      status: 'rejected',
      reason: payload.reason ? `${leave.reason ? leave.reason + ' | ' : ''}Alasan Penolakan: ${payload.reason}` : leave.reason,
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
}

module.exports = new AttendanceService();
