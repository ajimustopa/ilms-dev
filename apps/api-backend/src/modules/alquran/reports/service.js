/**
 * Reports Service for Alquran Module
 * Sesuai api-contract-alquran.md §2.5 & erd-alquran.md §1
 */
const db = require('../../../config/db/alquran');
const studentsService = require('../../akademik/students/service');
const curriculumService = require('../../akademik/curriculum/service');

class ReportsService {
  async getStudentReport(schoolUnitId, studentRefId) {
    // In-process validasi & ambil info siswa dari modul Akademik
    let student = null;
    try {
      student = await studentsService.getStudentById(studentRefId);
    } catch (e) {
      // Jika siswa tidak ditemukan
      const error = new Error(`Santri ID ${studentRefId} tidak ditemukan di modul Akademik`);
      error.statusCode = 404;
      throw error;
    }

    // 1. Ambil seluruh riwayat setoran hafalan yang verified
    const records = await db('hafalan_records')
      .where({
        school_unit_id: schoolUnitId,
        student_ref_id: studentRefId
      })
      .orderBy('record_date', 'asc');

    // 2. Ambil riwayat ujian munaqasyah
    const exams = await db('munaqasyah_exams')
      .where({
        school_unit_id: schoolUnitId,
        student_ref_id: studentRefId
      })
      .orderBy('exam_date', 'desc');

    // 3. Kalkulasi agregat
    const verifiedRecords = records.filter(r => r.verification_status === 'verified');
    const distinctJuz = [...new Set(verifiedRecords.map(r => r.juz))];
    const totalPages = verifiedRecords.reduce((acc, r) => {
      if (r.page_start && r.page_end) {
        return acc + Math.max(0, (r.page_end - r.page_start + 1));
      }
      return acc;
    }, 0);

    const scores = verifiedRecords.filter(r => r.tajwid_score !== null).map(r => parseFloat(r.tajwid_score));
    const avgTajwidScore = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      : null;

    return {
      student_ref_id: Number(studentRefId),
      student_name: student?.full_name || null,
      nis: student?.nis || null,
      summary: {
        total_verified_records: verifiedRecords.length,
        total_pending_records: records.filter(r => r.verification_status === 'pending').length,
        distinct_juz_achieved: distinctJuz.length,
        distinct_juz_list: distinctJuz,
        total_pages_memorized: totalPages,
        average_tajwid_score: avgTajwidScore ? parseFloat(avgTajwidScore) : null,
        total_exams_taken: exams.filter(e => e.status === 'completed').length,
        upcoming_exams: exams.filter(e => e.status === 'scheduled').length
      },
      records,
      exams
    };
  }

  async getClassReport(schoolUnitId, classRefId, periodLabel = null) {
    // In-process validasi & ambil info rombel dari modul Akademik
    let classGroup = null;
    try {
      classGroup = await curriculumService.getClassGroupById(classRefId);
    } catch (e) {
      const error = new Error(`Kelas ID ${classRefId} tidak ditemukan di modul Akademik`);
      error.statusCode = 404;
      throw error;
    }

    // 1. Ambil target kelas
    let targetQuery = db('hafalan_targets')
      .where({
        school_unit_id: schoolUnitId,
        class_ref_id: classRefId
      });
    if (periodLabel) {
      targetQuery = targetQuery.where('period_label', periodLabel);
    }
    const target = await targetQuery.first();

    // 2. Ambil seluruh record santri di kelas tersebut
    const records = await db('hafalan_records')
      .where('school_unit_id', schoolUnitId)
      .orderBy('record_date', 'desc');

    // Grouping per santri
    const studentMap = {};
    records.forEach(r => {
      if (!studentMap[r.student_ref_id]) {
        studentMap[r.student_ref_id] = {
          student_ref_id: r.student_ref_id,
          total_records: 0,
          verified_records: 0,
          juz_list: new Set(),
          total_pages: 0
        };
      }
      studentMap[r.student_ref_id].total_records += 1;
      if (r.verification_status === 'verified') {
        studentMap[r.student_ref_id].verified_records += 1;
        studentMap[r.student_ref_id].juz_list.add(r.juz);
        if (r.page_start && r.page_end) {
          studentMap[r.student_ref_id].total_pages += Math.max(0, r.page_end - r.page_start + 1);
        }
      }
    });

    const students = Object.values(studentMap).map(s => ({
      student_ref_id: s.student_ref_id,
      total_records: s.total_records,
      verified_records: s.verified_records,
      achieved_juz_count: s.juz_list.size,
      achieved_pages_count: s.total_pages,
      target_met: target ? (target.target_type === 'juz' ? s.juz_list.size >= target.target_value : s.total_pages >= target.target_value) : false
    }));

    return {
      class_ref_id: Number(classRefId),
      class_name: classGroup?.name || null,
      period_label: periodLabel || target?.period_label || 'Semua Periode',
      target: target || null,
      total_students_recorded: students.length,
      students
    };
  }
}

module.exports = new ReportsService();
