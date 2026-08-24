/**
 * Parent-Facing Controller for Keuangan Module
 */
const parentFacingService = require('./service');

class ParentFacingController {
  getSchoolUnitId(req) {
    return req.headers['x-school-unit-id'] ||
           req.query.school_unit_id ||
           req.user?.school_units?.[0]?.id ||
           1;
  }

  getStudentId(req) {
    // Jika user adalah orangtua/siswa, utamakan ref_id dari token jika ref_type === 'student'
    if (req.user?.ref_type === 'student' && req.user?.ref_id) {
      return req.user.ref_id;
    }
    // Jika orang tua mengelola anak tertentu atau query student_id disertakan
    return req.query.student_id || req.body?.student_id || req.user?.ref_id || 1;
  }

  listBills = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const studentId = this.getStudentId(req);
      const data = await parentFacingService.listStudentBills(schoolUnitId, studentId);
      res.json({ success: true, data, message: 'Daftar tagihan anak berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getBillDetail = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const studentId = this.getStudentId(req);
      const data = await parentFacingService.getStudentBillDetail(schoolUnitId, studentId, req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, message: 'Tagihan tidak ditemukan', errors: null });
      res.json({ success: true, data, message: 'Detail tagihan anak berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  listPayments = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const studentId = this.getStudentId(req);
      const data = await parentFacingService.listStudentPayments(schoolUnitId, studentId);
      res.json({ success: true, data, message: 'Riwayat pembayaran anak berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };

  getSavings = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const studentId = this.getStudentId(req);
      const data = await parentFacingService.getStudentSavings(schoolUnitId, studentId);
      res.json({ success: true, data, message: 'Data tabungan anak berhasil diambil', errors: null });
    } catch (err) { next(err); }
  };
}

module.exports = new ParentFacingController();
