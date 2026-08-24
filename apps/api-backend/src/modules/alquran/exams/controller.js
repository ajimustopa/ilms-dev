/**
 * Exams Controller for Alquran Module
 */
const examsService = require('./service');

class ExamsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  listExams = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await examsService.listExams(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar ujian munaqasyah berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createExam = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const { student_ref_id, juz_examined, exam_date, examiner_teacher_ref_id } = req.body;

      if (!student_ref_id || juz_examined === undefined || !exam_date || !examiner_teacher_ref_id) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi gagal: student_ref_id, juz_examined, exam_date, dan examiner_teacher_ref_id wajib diisi',
          errors: [{ field: 'student_ref_id', message: 'Field wajib' }]
        });
      }

      const data = await examsService.createExam(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Jadwal ujian munaqasyah berhasil dibuat', errors: null });
    } catch (err) { next(err); }
  };

  recordResult = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await examsService.recordExamResult(schoolUnitId, req.params.id, req.body);

      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }
      if (result.error === 'CONFLICT') {
        return res.status(409).json({ success: false, data: null, message: result.message, errors: null });
      }

      res.json({ success: true, data: result.data, message: 'Hasil ujian munaqasyah berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ExamsController();
