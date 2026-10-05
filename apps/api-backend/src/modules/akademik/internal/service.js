/**
 * Internal Service Implementation
 * Modul Akademik - Fitur 9: Endpoint X-API-Key untuk Konsumsi Antar-Layanan
 */
const db = require('../../../config/db/akademik');

class InternalService {
  async getStudentBrief(id) {
    const student = await db('students')
      .where({ id })
      .select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'nipd', 'full_name', 'gender', 'status', 'user_id', 'cohort_name')
      .first();

    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Ambil tahun ajaran aktif di modul akademik sesuai satuan pendidikan siswa
    let activeYearQuery = db('academic_years').where('is_active', true);
    if (student.satuan_pendidikan_id) {
      activeYearQuery = activeYearQuery.where('satuan_pendidikan_id', student.satuan_pendidikan_id);
    }
    const activeYear = await activeYearQuery.first();

    // 2. Cari enrollment siswa pada tahun ajaran aktif (HANYA ROMBEL REGULER)
    let activeEnrollment = null;
    if (activeYear) {
      activeEnrollment = await db('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .where({
          'student_class_enrollments.student_id': id,
          'student_class_enrollments.academic_year_id': activeYear.id,
          'student_class_enrollments.status': 'aktif'
        })
        .where(function() {
          this.where('class_groups.type', 'reguler')
            .orWhere(function() {
              this.whereNull('class_groups.type')
                .whereNull('class_groups.extracurricular_id');
            });
        })
        .whereNull('class_groups.extracurricular_id')
        .select(
          'class_groups.id as class_group_id',
          'class_groups.name as class_group_name'
        )
        .first();
    }

    // 3. Jika tidak ada enrollment di tahun ajaran aktif, ambil kelas reguler terakhir (historis)
    let lastEnrollment = null;
    if (!activeEnrollment) {
      lastEnrollment = await db('student_class_enrollments')
        .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
        .leftJoin('academic_years', 'student_class_enrollments.academic_year_id', 'academic_years.id')
        .where('student_class_enrollments.student_id', id)
        .where(function() {
          this.where('class_groups.type', 'reguler')
            .orWhere(function() {
              this.whereNull('class_groups.type')
                .whereNull('class_groups.extracurricular_id');
            });
        })
        .whereNull('class_groups.extracurricular_id')
        .orderBy('student_class_enrollments.id', 'desc')
        .select(
          'class_groups.id as class_group_id',
          'class_groups.name as class_group_name',
          'student_class_enrollments.status as enrollment_status',
          'academic_years.name as academic_year_name'
        )
        .first();
    }

    return {
      ...student,
      academic_status: student.status, // 'aktif', 'lulus', 'pindah', 'keluar', 'calon'
      is_in_active_academic_year: Boolean(activeEnrollment),
      active_academic_year_name: activeYear?.name || null,
      current_class: activeEnrollment || null,
      last_class: lastEnrollment || null
    };
  }

  async listActiveStudents(query = {}) {
    let baseQuery = db('students');

    if (query.status) {
      baseQuery = baseQuery.where('status', query.status);
    } else if (query.include_all !== true) {
      baseQuery = baseQuery.where('status', 'aktif');
    }

    if (query.satuan_pendidikan_id && query.satuan_pendidikan_id !== 'all') {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    return baseQuery.select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'nipd', 'full_name', 'gender', 'status', 'cohort_name');
  }

  async getStudentGuardians(studentId) {
    const student = await db('students').where({ id: studentId }).first();
    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return db('student_guardians')
      .join('guardians', 'student_guardians.guardian_id', 'guardians.id')
      .where('student_guardians.student_id', studentId)
      .select(
        'guardians.id',
        'guardians.full_name',
        'guardians.phone',
        'guardians.email',
        'guardians.user_id',
        'student_guardians.relationship',
        'student_guardians.is_primary_contact'
      );
  }

  async getClassGroupDetail(id) {
    const classGroup = await db('class_groups')
      .join('academic_years', 'class_groups.academic_year_id', 'academic_years.id')
      .join('grade_levels', 'class_groups.grade_level_id', 'grade_levels.id')
      .where('class_groups.id', id)
      .select(
        'class_groups.*',
        'academic_years.name as academic_year_name',
        'grade_levels.name as grade_level_name'
      )
      .first();

    if (!classGroup) {
      const error = new Error('Rombel tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({ 'student_class_enrollments.class_group_id': id, 'student_class_enrollments.status': 'aktif' })
      .select('students.id', 'students.nis', 'students.full_name', 'students.gender');

    return {
      ...classGroup,
      total_students: students.length,
      students
    };
  }

  async receiveExamResult(payload) {
    const { student_id, subject_id, semester_id, exam_score, notes } = payload;
    if (!student_id || !subject_id || !semester_id || exam_score === undefined) {
      const error = new Error('Field student_id, subject_id, semester_id, dan exam_score wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('student_scores').insert({
      student_id,
      subject_id,
      semester_id,
      score_type: 'uas',
      score: parseFloat(exam_score),
      description: notes || 'Hasil integrasi ujian daring CBE',
      recorded_by_employee_id: 1, // Default sistem / admin
      recorded_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      score_id: id,
      student_id,
      subject_id,
      score: parseFloat(exam_score),
      message: 'Hasil ujian CBE berhasil disimpan ke data nilai akademik'
    };
  }

  async listAcademicYears(query = {}) {
    let q = db('academic_years');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.is_active !== undefined && query.is_active !== '') {
      const isActive = query.is_active === 'true' || query.is_active === true || query.is_active === '1' || query.is_active === 1;
      q = q.where('is_active', isActive);
    }
    const list = await q.select('id', 'name', 'start_date', 'end_date', 'is_active').orderBy('id', 'desc');
    return {
      academic_years: list.map(y => ({
        id: y.id,
        name: y.name,
        start_date: y.start_date ? (typeof y.start_date === 'string' ? y.start_date.slice(0, 10) : y.start_date.toISOString().slice(0, 10)) : null,
        end_date: y.end_date ? (typeof y.end_date === 'string' ? y.end_date.slice(0, 10) : y.end_date.toISOString().slice(0, 10)) : null,
        is_active: Boolean(y.is_active)
      }))
    };
  }

  async listCohorts(query = {}) {
    let q = db('cohorts');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.year) {
      q = q.where('year', query.year);
    }
    const list = await q.select('id', 'name', 'year').orderBy('year', 'desc');
    return {
      cohorts: list.map(c => ({
        id: c.id,
        name: c.name,
        year: c.year
      }))
    };
  }

  async listGradeLevels(query = {}) {
    let q = db('grade_levels');
    if (query.satuan_pendidikan_id) {
      q = q.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    const list = await q.select('id', 'name', 'order as level_order').orderBy('order', 'asc');
    return {
      grade_levels: list.map(g => ({
        id: g.id,
        name: g.name,
        level_order: g.level_order
      }))
    };
  }

  async listClassGroups(query = {}) {
    let q = db('class_groups')
      .leftJoin('student_class_enrollments', function() {
        this.on('class_groups.id', '=', 'student_class_enrollments.class_group_id')
          .andOn('student_class_enrollments.status', '=', db.raw('?', ['aktif']));
      })
      .groupBy('class_groups.id', 'class_groups.name', 'class_groups.grade_level_id', 'class_groups.academic_year_id')
      .select(
        'class_groups.id',
        'class_groups.name',
        'class_groups.grade_level_id',
        'class_groups.academic_year_id',
        db.raw('COUNT(student_class_enrollments.id) as student_count')
      );

    if (query.type) {
      q = q.where('class_groups.type', query.type);
    } else {
      q = q.where(function() {
        this.where('class_groups.type', 'reguler')
          .orWhere(function() {
            this.whereNull('class_groups.type')
              .whereNull('class_groups.extracurricular_id');
          });
      }).whereNull('class_groups.extracurricular_id');
    }

    if (query.satuan_pendidikan_id) {
      q = q.where('class_groups.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      q = q.where('class_groups.academic_year_id', query.academic_year_id);
    }
    if (query.grade_level_id) {
      q = q.where('class_groups.grade_level_id', query.grade_level_id);
    }

    const list = await q.orderBy('class_groups.name', 'asc');
    return {
      class_groups: list.map(c => ({
        id: c.id,
        name: c.name,
        grade_level_id: c.grade_level_id,
        academic_year_id: c.academic_year_id,
        student_count: parseInt(c.student_count, 10) || 0
      }))
    };
  }
}

module.exports = new InternalService();
