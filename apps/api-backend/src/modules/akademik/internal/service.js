/**
 * Internal Service Implementation
 * Modul Akademik - Fitur 9: Endpoint X-API-Key untuk Konsumsi Antar-Layanan
 */
const db = require('../../../config/db/akademik');

class InternalService {
  async getStudentBrief(id) {
    const student = await db('students')
      .where({ id })
      .select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'full_name', 'gender', 'status', 'user_id')
      .first();

    if (!student) {
      const error = new Error('Siswa tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const enrollment = await db('student_class_enrollments')
      .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
      .where({ 'student_class_enrollments.student_id': id, 'student_class_enrollments.status': 'aktif' })
      .select('class_groups.id as class_group_id', 'class_groups.name as class_group_name')
      .first();

    return {
      ...student,
      current_class: enrollment || null
    };
  }

  async listActiveStudents(query = {}) {
    let baseQuery = db('students').where('status', 'aktif');

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    return baseQuery.select('id', 'satuan_pendidikan_id', 'nis', 'nisn', 'full_name', 'gender');
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
}

module.exports = new InternalService();
