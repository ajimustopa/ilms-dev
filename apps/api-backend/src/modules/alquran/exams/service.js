/**
 * Exams (Munaqasyah) Service for Alquran Module
 * Sesuai api-contract-alquran.md §2.3 & erd-alquran.md §2.3
 */
const db = require('../../../config/db/alquran');
const studentsService = require('../../akademik/students/service');
const employeesService = require('../../kepegawaian/employees/service');

class ExamsService {
  async listExams(schoolUnitId, filters = {}) {
    let query = db('munaqasyah_exams').where('school_unit_id', schoolUnitId);

    if (filters.student_ref_id) {
      query = query.where('student_ref_id', filters.student_ref_id);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }

    return query.orderBy('exam_date', 'desc').orderBy('id', 'desc');
  }

  async getExamById(schoolUnitId, id) {
    return db('munaqasyah_exams')
      .where({ id, school_unit_id: schoolUnitId })
      .first();
  }

  async createExam(schoolUnitId, data) {
    const { student_ref_id, juz_examined, exam_date, examiner_teacher_ref_id, notes = null } = data;

    // In-process validasi: pastikan santri ada di Akademik & penguji ada di Kepegawaian
    await studentsService.getStudentById(student_ref_id);
    await employeesService.getEmployeeById(examiner_teacher_ref_id);

    const [id] = await db('munaqasyah_exams').insert({
      school_unit_id: schoolUnitId,
      student_ref_id,
      juz_examined,
      exam_date,
      examiner_teacher_ref_id,
      status: 'scheduled',
      notes
    });

    const actualId = id || (await db('munaqasyah_exams').where({ school_unit_id: schoolUnitId }).orderBy('id', 'desc').first()).id;
    return this.getExamById(schoolUnitId, actualId);
  }

  async recordExamResult(schoolUnitId, id, data) {
    const exam = await this.getExamById(schoolUnitId, id);
    if (!exam) return { error: 'NOT_FOUND', message: 'Jadwal ujian munaqasyah tidak ditemukan' };

    if (exam.status === 'completed' || exam.status === 'cancelled') {
      return { error: 'CONFLICT', message: `Ujian sudah berstatus ${exam.status} dan tidak dapat diubah lagi` };
    }

    const { score, status = 'completed', notes } = data;

    await db('munaqasyah_exams')
      .where({ id, school_unit_id: schoolUnitId })
      .update({
        score: score !== undefined && score !== null ? parseFloat(score) : exam.score,
        status,
        notes: notes !== undefined ? notes : exam.notes
      });

    const updated = await this.getExamById(schoolUnitId, id);
    return { data: updated };
  }
}

module.exports = new ExamsService();
