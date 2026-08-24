const canteenStudentsService = require('./service');

class CanteenStudentsController {
  async listStudents(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenStudentsService.listStudents(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getStudentByStudentId(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenStudentsService.getStudentByStudentId(schoolUnitId, req.params.student_id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Data kantin siswa tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { status } = req.body;
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(422).json({ success: false, data: null, message: 'status harus active atau inactive', errors: null });
      }
      const data = await canteenStudentsService.updateStatus(schoolUnitId, req.params.student_id, req.body);
      res.json({ success: true, data, message: 'Status kantin santri berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async generateQr(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenStudentsService.generateQr(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: 'QR code santri berhasil di-generate', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateQr(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { qr_code } = req.body;
      if (!qr_code) {
        return res.status(422).json({ success: false, data: null, message: 'qr_code wajib diisi', errors: null });
      }
      const data = await canteenStudentsService.updateQr(schoolUnitId, req.params.student_id, qr_code);
      res.json({ success: true, data, message: 'QR code santri berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async resetChildPin(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenStudentsService.resetChildPin(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async resetParentPin(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenStudentsService.resetParentPin(schoolUnitId, req.params.student_id);
      res.json({ success: true, data, message: data.message, errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanteenStudentsController();
