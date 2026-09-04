/**
 * Attendance Service Implementation
 * Modul Akademik - Fitur 5: Presensi & Pengajuan Izin Siswa
 */
const db = require('../../../config/db/akademik');
const { parseUnitId } = require('../../../utils/parseUnitId');

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
    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where('student_attendances.satuan_pendidikan_id', unitId);
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
    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', unitId);
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

  // ==========================================
  // 3. Presensi Per Jam Pelajaran (Lesson Attendances)
  // ==========================================
  async listLessonAttendances(query = {}) {
    let baseQuery = db('lesson_attendances')
      .join('students', 'lesson_attendances.student_id', 'students.id')
      .join('class_groups', 'lesson_attendances.class_group_id', 'class_groups.id')
      .leftJoin('subject_schedules', 'lesson_attendances.subject_schedule_id', 'subject_schedules.id')
      .leftJoin('subjects', 'subject_schedules.subject_id', 'subjects.id')
      .select(
        'lesson_attendances.*',
        'students.full_name as student_name',
        'students.nis',
        'class_groups.name as class_group_name',
        'subjects.name as subject_name',
        'subject_schedules.start_time',
        'subject_schedules.end_time'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('lesson_attendances.student_id', query.student_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.where('lesson_attendances.class_group_id', query.class_group_id);
    }
    if (query.subject_schedule_id) {
      baseQuery = baseQuery.where('lesson_attendances.subject_schedule_id', query.subject_schedule_id);
    }
    if (query.date) {
      baseQuery = baseQuery.where('lesson_attendances.date', query.date);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('lesson_attendances.date', [query.start_date, query.end_date]);
    }

    return baseQuery.orderBy('lesson_attendances.date', 'desc').orderBy('lesson_attendances.id', 'asc');
  }

  async recordLessonAttendanceBulk(payload, user = null) {
    const { subject_schedule_id, class_group_id, date, attendances } = payload;
    const items = attendances || payload.items;

    if (!subject_schedule_id || !class_group_id || !date || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Field subject_schedule_id, class_group_id, date, dan attendances (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const recordedBy = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    const results = [];
    for (const item of items) {
      const validStatus = ['present', 'sick', 'permitted', 'absent', 'late'].includes(item.status) ? item.status : 'present';
      
      const existing = await db('lesson_attendances')
        .where({
          student_id: item.student_id,
          subject_schedule_id,
          date
        })
        .first();

      if (existing) {
        await db('lesson_attendances')
          .where({ id: existing.id })
          .update({
            class_group_id,
            status: validStatus,
            check_in_time: item.check_in_time || existing.check_in_time,
            recorded_by: recordedBy,
            input_method: item.input_method || 'manual',
            device_ref: item.device_ref || null,
            notes: item.notes !== undefined ? item.notes : existing.notes,
            updated_at: db.fn.now()
          });
        results.push(existing.id);
      } else {
        const [insertedId] = await db('lesson_attendances').insert({
          student_id: item.student_id,
          class_group_id,
          subject_schedule_id,
          date,
          status: validStatus,
          check_in_time: item.check_in_time || null,
          recorded_by: recordedBy,
          input_method: item.input_method || 'manual',
          device_ref: item.device_ref || null,
          notes: item.notes || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push(insertedId);
      }
    }

    return {
      message: `Presensi ${results.length} siswa per jam pelajaran berhasil disimpan`,
      total_processed: results.length,
      date,
      subject_schedule_id,
      class_group_id
    };
  }

  async getLessonAttendanceSummary(query = {}) {
    let baseQuery = db('lesson_attendances');

    if (query.student_id) {
      baseQuery = baseQuery.where('student_id', query.student_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.where('class_group_id', query.class_group_id);
    }
    if (query.subject_schedule_id) {
      baseQuery = baseQuery.where('subject_schedule_id', query.subject_schedule_id);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('date', [query.start_date, query.end_date]);
    } else if (query.date) {
      baseQuery = baseQuery.where('date', query.date);
    }

    const rows = await baseQuery.select('status').count('id as count').groupBy('status');
    const summary = {
      present: 0,
      sick: 0,
      permitted: 0,
      absent: 0,
      late: 0,
      total: 0,
      attendance_rate: 0
    };

    rows.forEach((r) => {
      if (summary[r.status] !== undefined) {
        summary[r.status] = Number(r.count);
      }
      summary.total += Number(r.count);
    });

    if (summary.total > 0) {
      summary.attendance_rate = Number((((summary.present + summary.late) / summary.total) * 100).toFixed(1));
    }

    return summary;
  }

  // ==========================================
  // 4. Presensi Kegiatan (Ekskul / Acara Sekolah / Lainnya)
  // ==========================================
  async listActivityAttendances(query = {}) {
    let baseQuery = db('activity_attendances')
      .join('students', 'activity_attendances.student_id', 'students.id')
      .select(
        'activity_attendances.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('activity_attendances.student_id', query.student_id);
    }
    if (query.activity_type) {
      baseQuery = baseQuery.where('activity_attendances.activity_type', query.activity_type);
    }
    if (query.activity_ref_id) {
      baseQuery = baseQuery.where('activity_attendances.activity_ref_id', query.activity_ref_id);
    }
    if (query.date) {
      baseQuery = baseQuery.where('activity_attendances.date', query.date);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('activity_attendances.date', [query.start_date, query.end_date]);
    }

    return baseQuery.orderBy('activity_attendances.date', 'desc').orderBy('activity_attendances.id', 'asc');
  }

  async recordActivityAttendanceBulk(payload, user = null) {
    const { activity_type, activity_ref_id, activity_name, date, attendances } = payload;
    const items = attendances || payload.items;

    if (!activity_type || !activity_name || !date || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Field activity_type, activity_name, date, dan attendances (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const recordedBy = user?.ref_type === 'staff' ? user.ref_id : (user?.id || null);

    const results = [];
    for (const item of items) {
      const validStatus = ['present', 'absent', 'excused'].includes(item.status) ? item.status : 'present';

      const existing = await db('activity_attendances')
        .where({
          student_id: item.student_id,
          activity_type,
          activity_ref_id: activity_ref_id || null,
          date
        })
        .first();

      if (existing) {
        await db('activity_attendances')
          .where({ id: existing.id })
          .update({
            activity_name,
            status: validStatus,
            recorded_by: recordedBy,
            input_method: item.input_method || 'manual',
            device_ref: item.device_ref || null,
            notes: item.notes !== undefined ? item.notes : existing.notes,
            updated_at: db.fn.now()
          });
        results.push(existing.id);
      } else {
        const [insertedId] = await db('activity_attendances').insert({
          student_id: item.student_id,
          activity_type,
          activity_ref_id: activity_ref_id || null,
          activity_name,
          date,
          status: validStatus,
          recorded_by: recordedBy,
          input_method: item.input_method || 'manual',
          device_ref: item.device_ref || null,
          notes: item.notes || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push(insertedId);
      }
    }

    return {
      message: `Presensi ${results.length} siswa untuk kegiatan ${activity_name} berhasil disimpan`,
      total_processed: results.length,
      activity_type,
      activity_name,
      date
    };
  }

  async getActivityAttendanceSummary(query = {}) {
    let baseQuery = db('activity_attendances');

    if (query.student_id) {
      baseQuery = baseQuery.where('student_id', query.student_id);
    }
    if (query.activity_type) {
      baseQuery = baseQuery.where('activity_type', query.activity_type);
    }
    if (query.activity_ref_id) {
      baseQuery = baseQuery.where('activity_ref_id', query.activity_ref_id);
    }
    if (query.start_date && query.end_date) {
      baseQuery = baseQuery.whereBetween('date', [query.start_date, query.end_date]);
    } else if (query.date) {
      baseQuery = baseQuery.where('date', query.date);
    }

    const rows = await baseQuery.select('status').count('id as count').groupBy('status');
    const summary = {
      present: 0,
      absent: 0,
      excused: 0,
      total: 0,
      attendance_rate: 0
    };

    rows.forEach((r) => {
      if (summary[r.status] !== undefined) {
        summary[r.status] = Number(r.count);
      }
      summary.total += Number(r.count);
    });

    if (summary.total > 0) {
      summary.attendance_rate = Number(((summary.present / summary.total) * 100).toFixed(1));
    }

    return summary;
  }
}

module.exports = new AttendanceService();
