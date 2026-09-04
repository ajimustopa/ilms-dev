/**
 * Student Affairs Service Implementation
 * Modul Akademik - Fitur 6: Kesiswaan (Disiplin, Prestasi, BK, Ekskul, Kalender Akademik)
 */
const db = require('../../../config/db/akademik');
const employeesService = require('../../kepegawaian/employees/service');
const { parseUnitId } = require('../../../utils/parseUnitId');

class StudentAffairsService {
  // ==========================================
  // 1. Pelanggaran & Disiplin (Disciplinary Records)
  // ==========================================
  async listDisciplinaryRecords(query = {}) {
    let baseQuery = db('student_disciplinary_records')
      .join('students', 'student_disciplinary_records.student_id', 'students.id')
      .select(
        'student_disciplinary_records.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_disciplinary_records.student_id', query.student_id);
    }

    return baseQuery.orderBy('student_disciplinary_records.incident_date', 'desc');
  }

  async createDisciplinaryRecord(payload, user = null) {
    const { student_id, violation_type, points, incident_date, notes, handled_by_employee_id } = payload;
    if (!student_id || !violation_type || points === undefined || !incident_date) {
      const error = new Error('Field student_id, violation_type, points, dan incident_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const handlerId = handled_by_employee_id || (user?.ref_type === 'staff' ? user.ref_id : null);

    const [id] = await db('student_disciplinary_records').insert({
      student_id,
      violation_type: violation_type.trim(),
      points: parseInt(points, 10),
      incident_date,
      handled_by_employee_id: handlerId,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_disciplinary_records').where({ id }).first();
  }

  // ==========================================
  // 2. Prestasi Siswa (Student Achievements)
  // ==========================================
  async listAchievements(query = {}) {
    let baseQuery = db('student_achievements')
      .join('students', 'student_achievements.student_id', 'students.id')
      .select(
        'student_achievements.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('student_achievements.student_id', query.student_id);
    }
    if (query.level) {
      baseQuery = baseQuery.where('student_achievements.level', query.level);
    }

    return baseQuery.orderBy('student_achievements.achieved_at', 'desc');
  }

  async createAchievement(payload) {
    const { student_id, achievement_type, level, achieved_at, notes } = payload;
    if (!student_id || !achievement_type || !achieved_at) {
      const error = new Error('Field student_id, achievement_type, dan achieved_at wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('student_achievements').insert({
      student_id,
      achievement_type: achievement_type.trim(),
      level: level || null,
      achieved_at,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_achievements').where({ id }).first();
  }

  // ==========================================
  // 3. Bimbingan Konseling (Counseling Records)
  // ==========================================
  async listCounselingRecords(query = {}, user = null) {
    let baseQuery = db('counseling_records')
      .join('students', 'counseling_records.student_id', 'students.id')
      .select(
        'counseling_records.*',
        'students.full_name as student_name',
        'students.nis'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('counseling_records.student_id', query.student_id);
    }

    // Role visibility filtering
    const isBK = user?.roles?.some(r => ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan', 'guru_bk'].includes(r)) || user?.account_type === 'admin';
    const isWaliKelas = user?.roles?.includes('wali_kelas');

    if (!isBK) {
      if (isWaliKelas) {
        baseQuery = baseQuery.whereIn('counseling_records.visibility_level', ['bk_and_homeroom', 'all_staff']);
      } else {
        baseQuery = baseQuery.where('counseling_records.visibility_level', 'all_staff');
      }
    }

    return baseQuery.orderBy('counseling_records.session_date', 'desc');
  }

  async createCounselingRecord(payload, user = null) {
    const { student_id, session_date, service_type, notes, visibility_level, counselor_employee_id } = payload;
    if (!student_id || !session_date || !notes) {
      const error = new Error('Field student_id, session_date, dan notes wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const counselorId = counselor_employee_id || (user?.ref_type === 'staff' ? user.ref_id : null);

    const [id] = await db('counseling_records').insert({
      student_id,
      session_date,
      service_type: service_type ? service_type.trim() : null,
      notes: notes.trim(),
      visibility_level: visibility_level || 'bk_only',
      counselor_employee_id: counselorId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('counseling_records').where({ id }).first();
  }

  // ==========================================
  // 4. Ekstrakurikuler (Extracurriculars)
  // ==========================================
  async listExtracurriculars(query = {}) {
    let baseQuery = db('extracurriculars');
    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where((q) => {
        q.where('satuan_pendidikan_id', unitId).orWhereNull('satuan_pendidikan_id');
      });
    }

    const rows = await baseQuery.orderBy('name', 'asc');
    const enriched = [];
    for (const r of rows) {
      let supervisor_name = null;
      if (r.supervisor_employee_id) {
        try {
          const emp = await employeesService.getEmployeeById(r.supervisor_employee_id);
          supervisor_name = emp?.full_name || null;
        } catch (e) {}
      }
      enriched.push({ ...r, supervisor_name });
    }
    return enriched;
  }

  async createExtracurricular(payload) {
    const { satuan_pendidikan_id, name, supervisor_employee_id, schedule } = payload;
    if (!name) {
      const error = new Error('Field name wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (supervisor_employee_id) {
      try {
        await employeesService.getEmployeeById(supervisor_employee_id);
      } catch (e) {
        const error = new Error(`Pembina (Employee ID ${supervisor_employee_id}) tidak valid`);
        error.statusCode = 422;
        throw error;
      }
    }

    const [id] = await db('extracurriculars').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      name: name.trim(),
      supervisor_employee_id: supervisor_employee_id || null,
      schedule: schedule || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('extracurriculars').where({ id }).first();
  }

  async addExtracurricularMember(extracurricularId, payload) {
    const { student_id, academic_year_id } = payload;
    if (!student_id || !academic_year_id) {
      const error = new Error('Field student_id dan academic_year_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const extra = await db('extracurriculars').where({ id: extracurricularId }).first();
    if (!extra) {
      const error = new Error('Ekstrakurikuler tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const existing = await db('extracurricular_members')
      .where({ extracurricular_id: extracurricularId, student_id, academic_year_id })
      .first();

    if (existing) {
      return existing;
    }

    const [id] = await db('extracurricular_members').insert({
      extracurricular_id: extracurricularId,
      student_id,
      academic_year_id,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('extracurricular_members').where({ id }).first();
  }

  // ==========================================
  // 5. Kalender Akademik (Academic Calendar)
  // ==========================================
  async listCalendarEvents(query = {}) {
    let baseQuery = db('academic_calendar_events')
      .leftJoin('grade_levels', 'academic_calendar_events.grade_level_id', 'grade_levels.id')
      .select(
        'academic_calendar_events.*',
        'grade_levels.name as grade_level_name'
      );

    const unitId = parseUnitId(query.satuan_pendidikan_id);
    if (unitId) {
      baseQuery = baseQuery.where(b => {
        b.where('academic_calendar_events.satuan_pendidikan_id', unitId)
          .orWhereNull('academic_calendar_events.satuan_pendidikan_id');
      });
    }

    return baseQuery.orderBy('academic_calendar_events.start_date', 'asc');
  }

  async createCalendarEvent(payload) {
    const { satuan_pendidikan_id, title, start_date, end_date, grade_level_id, notes } = payload;
    if (!title || !start_date || !end_date) {
      const error = new Error('Field title, start_date, dan end_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('academic_calendar_events').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || null,
      title: title.trim(),
      start_date,
      end_date,
      grade_level_id: grade_level_id || null,
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('academic_calendar_events').where({ id }).first();
  }
}

module.exports = new StudentAffairsService();
