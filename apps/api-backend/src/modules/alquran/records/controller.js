/**
 * Records Controller for Alquran Module
 */
const recordsService = require('./service');

class RecordsController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.params.school_unit_id ||
           req.body?.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getTeacherRefId(req) {
    return req.user?.ref_id || req.user?.id || 1;
  }

  listRecords = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const data = await recordsService.listRecords(schoolUnitId, req.query);
      res.json({ success: true, data, message: 'Daftar capaian hafalan berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  createRecord = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const teacherRefId = this.getTeacherRefId(req);
      const { student_ref_id, juz, record_date } = req.body;

      if (!student_ref_id || juz === undefined || !record_date) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi gagal: student_ref_id, juz, dan record_date wajib diisi',
          errors: [{ field: 'juz', message: 'Nilai juz wajib diisi antara 1-30' }]
        });
      }

      const data = await recordsService.createRecord(schoolUnitId, req.body, teacherRefId);
      res.status(201).json({ success: true, data, message: 'Capaian setoran hafalan berhasil dicatat', errors: null });
    } catch (err) { next(err); }
  };

  verifyRecord = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const teacherRefId = this.getTeacherRefId(req);
      const { verification_status } = req.body;

      if (!verification_status || !['verified', 'rejected'].includes(verification_status)) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'Validasi gagal: verification_status harus bernilai verified atau rejected',
          errors: [{ field: 'verification_status', message: 'Status tidak valid' }]
        });
      }

      const result = await recordsService.verifyRecord(schoolUnitId, req.params.id, req.body, teacherRefId);
      if (result.error === 'NOT_FOUND') {
        return res.status(404).json({ success: false, data: null, message: result.message, errors: null });
      }

      res.json({ success: true, data: result.data, message: 'Status verifikasi setoran hafalan berhasil diperbarui', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new RecordsController();
