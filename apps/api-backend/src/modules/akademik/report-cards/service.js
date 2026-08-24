/**
 * Report Cards Service Implementation
 * Modul Akademik - Fitur 4: Rapor Siswa & Catatan Wali Kelas
 */
const db = require('../../../config/db/akademik');

class ReportCardsService {
  async listReportCards(query = {}) {
    let baseQuery = db('report_cards')
      .join('students', 'report_cards.student_id', 'students.id')
      .join('semesters', 'report_cards.semester_id', 'semesters.id')
      .select(
        'report_cards.*',
        'students.full_name as student_name',
        'students.nis',
        'semesters.name as semester_name'
      );

    if (query.student_id) {
      baseQuery = baseQuery.where('report_cards.student_id', query.student_id);
    }
    if (query.semester_id) {
      baseQuery = baseQuery.where('report_cards.semester_id', query.semester_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.whereIn('report_cards.student_id', function() {
        this.select('student_id').from('student_class_enrollments').where('class_group_id', query.class_group_id);
      });
    }

    return baseQuery.orderBy('report_cards.id', 'desc');
  }

  async getReportCardById(id) {
    const report = await db('report_cards')
      .join('students', 'report_cards.student_id', 'students.id')
      .join('semesters', 'report_cards.semester_id', 'semesters.id')
      .where('report_cards.id', id)
      .select(
        'report_cards.*',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'semesters.name as semester_name'
      )
      .first();

    if (!report) {
      const error = new Error('Rapor tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Ambil nilai seluruh mapel semester terkait
    const scores = await db('student_scores')
      .join('subjects', 'student_scores.subject_id', 'subjects.id')
      .where({
        'student_scores.student_id': report.student_id,
        'student_scores.semester_id': report.semester_id
      })
      .select(
        'student_scores.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'subjects.kkm'
      );

    // Ambil rincian capaian Tujuan Pembelajaran (TP)
    const tpScores = await db('student_tp_scores')
      .join('learning_objectives', 'student_tp_scores.learning_objective_id', 'learning_objectives.id')
      .join('subjects', 'student_tp_scores.subject_id', 'subjects.id')
      .where({
        'student_tp_scores.student_id': report.student_id,
        'student_tp_scores.semester_id': report.semester_id
      })
      .select(
        'student_tp_scores.*',
        'learning_objectives.code as tp_code',
        'learning_objectives.description as tp_description',
        'subjects.name as subject_name'
      )
      .orderBy('learning_objectives.order_index', 'asc');

    // Ambil nilai sikap
    const attitudes = await db('student_attitude_scores')
      .where({
        student_id: report.student_id,
        semester_id: report.semester_id
      });

    // Ambil rekap presensi
    const attendances = await db('student_attendances')
      .where({ student_id: report.student_id })
      .select('status', db.raw('COUNT(id) as total'))
      .groupBy('status');

    return {
      ...report,
      scores,
      tp_scores: tpScores,
      attitudes,
      attendance_summary: attendances
    };
  }

  async generateReportCards(payload, user = null) {
    const { student_id, class_group_id, semester_id, homeroom_note } = payload;
    if (!semester_id || (!student_id && !class_group_id)) {
      const error = new Error('Field semester_id dan salah satu dari student_id atau class_group_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    let targetStudentIds = [];
    if (student_id) {
      targetStudentIds = [student_id];
    } else if (class_group_id) {
      const enrollments = await db('student_class_enrollments').where({ class_group_id });
      targetStudentIds = enrollments.map(e => e.student_id);
    }

    if (targetStudentIds.length === 0) {
      const error = new Error('Tidak ada siswa yang ditemukan untuk di-generate rapor');
      error.statusCode = 404;
      throw error;
    }

    const generatorEmployeeId = user?.ref_type === 'staff' ? user.ref_id : null;
    const generatedResults = [];

    for (const sid of targetStudentIds) {
      const student = await db('students').where({ id: sid }).first();
      if (!student) continue;

      const pdfUrl = `/uploads/reports/rapor_${sid}_sem_${semester_id}_${Date.now()}.pdf`;

      const existing = await db('report_cards')
        .where({ student_id: sid, semester_id })
        .first();

      if (existing) {
        await db('report_cards').where({ id: existing.id }).update({
          homeroom_note: homeroom_note || existing.homeroom_note,
          file_url: pdfUrl,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          updated_at: db.fn.now()
        });
        generatedResults.push({ id: existing.id, student_id: sid, file_url: pdfUrl, status: 'updated' });
      } else {
        const [id] = await db('report_cards').insert({
          student_id: sid,
          semester_id,
          homeroom_note: homeroom_note || null,
          file_url: pdfUrl,
          generated_at: db.fn.now(),
          generated_by_employee_id: generatorEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        generatedResults.push({ id, student_id: sid, file_url: pdfUrl, status: 'generated' });
      }
    }

    return {
      total_generated: generatedResults.length,
      semester_id,
      items: generatedResults
    };
  }

  async updateNote(id, { homeroom_note }) {
    const report = await db('report_cards').where({ id }).first();
    if (!report) {
      const error = new Error('Rapor tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('report_cards').where({ id }).update({
      homeroom_note: homeroom_note || null,
      updated_at: db.fn.now()
    });

    return db('report_cards').where({ id }).first();
  }
}

module.exports = new ReportCardsService();
