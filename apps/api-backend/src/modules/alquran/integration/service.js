/**
 * Integration Service (Parent-Facing) for Alquran Module
 * Sesuai api-contract-alquran.md §2.6
 */
const db = require('../../../config/db/alquran');
const studentsService = require('../../akademik/students/service');

class IntegrationService {
  async getStudentAchievementsForParent(studentRefId, schoolUnitId = null) {
    // In-process validasi data siswa dari modul Akademik
    const student = await studentsService.getStudentById(studentRefId);

    let recordsQuery = db('hafalan_records')
      .where('student_ref_id', studentRefId)
      .orderBy('record_date', 'desc')
      .limit(10);

    let examsQuery = db('munaqasyah_exams')
      .where('student_ref_id', studentRefId)
      .where('status', 'scheduled')
      .orderBy('exam_date', 'asc')
      .limit(5);

    if (schoolUnitId) {
      recordsQuery = recordsQuery.where('school_unit_id', schoolUnitId);
      examsQuery = examsQuery.where('school_unit_id', schoolUnitId);
    }

    const latestRecords = await recordsQuery;
    const upcomingExams = await examsQuery;

    // Ambil capaian juz verified
    const verifiedJuz = await db('hafalan_records')
      .where('student_ref_id', studentRefId)
      .where('verification_status', 'verified')
      .distinct('juz');

    return {
      student_ref_id: Number(studentRefId),
      student_name: student?.full_name || null,
      nis: student?.nis || null,
      latest_records: latestRecords.map(r => ({
        juz: r.juz,
        page_start: r.page_start,
        page_end: r.page_end,
        record_date: r.record_date ? (typeof r.record_date === 'string' ? r.record_date.slice(0, 10) : r.record_date.toISOString().slice(0, 10)) : null,
        verification_status: r.verification_status,
        tajwid_score: r.tajwid_score ? parseFloat(r.tajwid_score) : null
      })),
      upcoming_exams: upcomingExams.map(e => ({
        juz_examined: e.juz_examined,
        exam_date: e.exam_date ? (typeof e.exam_date === 'string' ? e.exam_date.slice(0, 10) : e.exam_date.toISOString().slice(0, 10)) : null,
        status: e.status
      })),
      target_progress: {
        target_type: 'juz',
        target_value: 2,
        achieved_juz: verifiedJuz.length
      }
    };
  }
}

module.exports = new IntegrationService();
