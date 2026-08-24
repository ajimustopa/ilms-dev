/**
 * Reports Service Implementation
 * Modul Akademik - Fitur 7: Laporan & Rekapitulasi Akademik
 */
const db = require('../../../config/db/akademik');

class ReportsService {
  async getAcademicSummary(query = {}) {
    let studentQuery = db('students');
    let classQuery = db('class_groups');
    let attendanceQuery = db('student_attendances');

    if (query.satuan_pendidikan_id) {
      studentQuery = studentQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
      classQuery = classQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
      attendanceQuery = attendanceQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }

    const totalStudents = await studentQuery.clone().count('id as total').first();
    const activeStudents = await studentQuery.clone().where('status', 'aktif').count('id as total').first();
    const totalClasses = await classQuery.clone().count('id as total').first();

    const attendanceBreakdown = await attendanceQuery.clone()
      .select('status', db.raw('COUNT(id) as total'))
      .groupBy('status');

    const totalAtt = attendanceBreakdown.reduce((acc, cur) => acc + parseInt(cur.total, 10), 0);
    const totalHadir = parseInt(attendanceBreakdown.find(a => a.status === 'hadir')?.total || 0, 10);
    const attendancePercentage = totalAtt > 0 ? parseFloat(((totalHadir / totalAtt) * 100).toFixed(2)) : 0;

    return {
      total_students: parseInt(totalStudents?.total || 0, 10),
      active_students: parseInt(activeStudents?.total || 0, 10),
      total_class_groups: parseInt(totalClasses?.total || 0, 10),
      overall_attendance_rate: attendancePercentage,
      attendance_breakdown: attendanceBreakdown
    };
  }

  async exportReport(query = {}) {
    const { type, satuan_pendidikan_id, format } = query;
    let data = [];

    if (type === 'scores') {
      data = await db('student_scores')
        .join('students', 'student_scores.student_id', 'students.id')
        .join('subjects', 'student_scores.subject_id', 'subjects.id')
        .select(
          'students.nis',
          'students.full_name as student_name',
          'subjects.name as subject_name',
          'student_scores.score_type',
          'student_scores.score',
          'student_scores.recorded_at'
        )
        .limit(500);
    } else {
      // Default export students
      let q = db('students').select('id', 'nis', 'nisn', 'full_name', 'gender', 'birth_date', 'status');
      if (satuan_pendidikan_id) q = q.where('satuan_pendidikan_id', satuan_pendidikan_id);
      data = await q.limit(500);
    }

    return {
      export_type: type || 'students',
      format: format || 'excel',
      total_rows: data.length,
      download_url: `/exports/akademik_${type || 'students'}_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      sample_data: data.slice(0, 5)
    };
  }
}

module.exports = new ReportsService();
