/**
 * Attendance Service Implementation
 * Modul Akademik - Fitur 5: Presensi & Pengajuan Izin Siswa
 */
const db = require('../../../config/db/akademik');

class AttendanceService {
  // ==========================================
  // 1. Presensi Harian Siswa
  // ==========================================
  async listAttendances(query = {}) {
    let baseQuery = db('student_attendances')
      .join('students', 'student_attendances.student_id', 'students.id')
      .join('class_groups', 'student_attendances.class_group_id', 'class_groups.id')
      .select(
        'student_attendances.*',
        'students.full_name as student_name',
        'students.nis',
        'class_groups.name as class_group_name'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_attendances.student_id', query.student_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.where('student_attendances.class_group_id', query.class_group_id);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('student_attendances.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('student_attendances.attendance_date', [query.start_date, query.end_date]);
    } else if (query.attendance_date) {
      baseQuery = baseQuery.where('student_attendances.attendance_date', query.attendance_date);
    }

    return baseQuery.orderBy('student_attendances.attendance_date', 'desc');
  }

  async recordAttendance(payload, user = null) {
    const { student_id, class_group_id, attendance_date, status, notes, satuan_pendidikan_id } = payload;
    if (!student_id || !class_group_id || !attendance_date || !status) {
      const error = new Error('Field student_id, class_group_id, attendance_date, dan status wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (!['hadir', 'izin', 'sakit', 'alpa'].includes(status)) {
      const error = new Error("Status presensi harus 'hadir', 'izin', 'sakit', atau 'alpa'");
      error.statusCode = 422;
      throw error;
    }

    const student = await db('students').where({ id: student_id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const schoolUnitId = satuan_pendidikan_id || student.satuan_pendidikan_id;
    const recorderEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;

    // Cek record presensi di hari yang sama
    const existing = await db('student_attendances')
      .where({ student_id, attendance_date })
      .first();

    if (existing) {
      await db('student_attendances').where({ id: existing.id }).update({
        class_group_id,
        status,
        notes: notes || null,
        recorded_by_employee_id: recorderEmployeeId,
        updated_at: db.fn.now()
      });
      return db('student_attendances').where({ id: existing.id }).first();
    }

    const [id] = await db('student_attendances').insert({
      satuan_pendidikan_id: schoolUnitId,
      student_id,
      class_group_id,
      attendance_date,
      status,
      notes: notes || null,
      recorded_by_employee_id: recorderEmployeeId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_attendances').where({ id }).first();
  }

  async recordAttendanceBulk(payload, user = null) {
    const { class_group_id, attendance_date, items, satuan_pendidikan_id } = payload;
    if (!class_group_id || !attendance_date || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Field class_group_id, attendance_date, dan items (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    if (!classGroup) {
      const error = new Error('Rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const schoolUnitId = satuan_pendidikan_id || classGroup.satuan_pendidikan_id;
    const recorderEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;

    const results = [];
    for (const item of items) {
      if (!item.student_id || !item.status) continue;

      const existing = await db('student_attendances')
        .where({ student_id: item.student_id, attendance_date })
        .first();

      if (existing) {
        await db('student_attendances').where({ id: existing.id }).update({
          class_group_id,
          status: item.status,
          notes: item.notes || null,
          recorded_by_employee_id: recorderEmployeeId,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: item.student_id, status: item.status, action: 'updated' });
      } else {
        const [id] = await db('student_attendances').insert({
          satuan_pendidikan_id: schoolUnitId,
          student_id: item.student_id,
          class_group_id,
          attendance_date,
          status: item.status,
          notes: item.notes || null,
          recorded_by_employee_id: recorderEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: item.student_id, status: item.status, action: 'created' });
      }
    }

    return {
      recorded_count: results.length,
      class_group_id,
      attendance_date,
      items: results
    };
  }

  async getAttendanceSummary(query = {}) {
    let baseQuery = db('student_attendances');

    if (query.class_group_id) {
      baseQuery = baseQuery.where('class_group_id', query.class_group_id);
    }
    if (query.student_id) {
      baseQuery = baseQuery.where('student_id', query.student_id);
    }
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('attendance_date', [query.start_date, query.end_date]);
    }

    const counts = await baseQuery
      .select('status', db.raw('COUNT(id) as total'))
      .groupBy('status');

    const summary = { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 };
    for (const c of counts) {
      summary[c.status] = parseInt(c.total, 10);
      summary.total += parseInt(c.total, 10);
    }

    return summary;
  }

  // ==========================================
  // 2. Pengajuan Izin / Sakit Siswa
  // ==========================================
  async listLeaveRequests(query = {}) {
    let baseQuery = db('student_leave_requests')
      .join('students', 'student_leave_requests.student_id', 'students.id')
      .leftJoin('guardians', 'student_leave_requests.requested_by_guardian_id', 'guardians.id')
      .select(
        'student_leave_requests.*',
        'students.full_name as student_name',
        'students.nis',
        'guardians.full_name as guardian_name'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_leave_requests.student_id', query.student_id);
    }
    if (query.approval_status) {
      baseQuery = baseQuery.where('student_leave_requests.approval_status', query.approval_status);
    }

    return baseQuery.orderBy('student_leave_requests.leave_date', 'desc');
  }

  async createLeaveRequest(payload, user = null) {
    const { student_id, leave_date, leave_type, reason, attachment_url, requested_by_guardian_id } = payload;
    if (!student_id || !leave_date || !leave_type) {
      const error = new Error('Field student_id, leave_date, dan leave_type wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (!['izin', 'sakit'].includes(leave_type)) {
      const error = new Error("leave_type harus 'izin' atau 'sakit'");
      error.statusCode = 422;
      throw error;
    }

    const student = await db('students').where({ id: student_id }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const guardianId = requested_by_guardian_id || (user?.ref_type === 'guardian' ? user.ref_id : null);

    const [id] = await db('student_leave_requests').insert({
      student_id,
      leave_date,
      leave_type,
      reason: reason || null,
      attachment_url: attachment_url || null,
      requested_by_guardian_id: guardianId,
      approval_status: 'menunggu',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_leave_requests').where({ id }).first();
  }

  async approveLeaveRequest(id, payload, user = null) {
    const { approval_status } = payload;
    if (!['disetujui', 'ditolak'].includes(approval_status)) {
      const error = new Error("approval_status harus 'disetujui' atau 'ditolak'");
      error.statusCode = 422;
      throw error;
    }

    const leave = await db('student_leave_requests').where({ id }).first();
    if (!leave) {
      const error = new Error('Pengajuan izin tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const approverEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;

    await db('student_leave_requests').where({ id }).update({
      approval_status,
      approved_by_employee_id: approverEmployeeId,
      updated_at: db.fn.now()
    });

    // Jika disetujui, otomatis sinkronisasi ke tabel presensi hari itu
    if (approval_status === 'disetujui') {
      const enrollment = await db('student_class_enrollments')
        .where({ student_id: leave.student_id, status: 'aktif' })
        .first();

      if (enrollment) {
        await this.recordAttendance({
          student_id: leave.student_id,
          class_group_id: enrollment.class_group_id,
          attendance_date: leave.leave_date,
          status: leave.leave_type, // 'izin' atau 'sakit'
          notes: `Disetujui dari pengajuan izin #${id}: ${leave.reason || ''}`
        }, user);
      }
    }

    return db('student_leave_requests').where({ id }).first();
  }
}

module.exports = new AttendanceService();
