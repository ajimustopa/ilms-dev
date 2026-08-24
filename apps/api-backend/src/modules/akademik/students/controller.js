/**
 * Students Controller Implementation
 * Modul Akademik - Fitur: Data Master Siswa, Orang Tua / Wali, Mutasi, Onboarding,
 * Rekap Rapor DIK/DIN, Fisik Periodik & Dapodik Standard Lengkap
 */
const studentsService = require('./service');

class StudentsController {
  // 1. Siswa
  async listStudents(req, res, next) {
    try {
      const result = await studentsService.listStudents(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Daftar siswa berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudentById(req, res, next) {
    try {
      const result = await studentsService.getStudentById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail siswa lengkap berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createStudent(req, res, next) {
    try {
      const result = await studentsService.createStudent(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Data siswa baru berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStudent(req, res, next) {
    try {
      const result = await studentsService.updateStudent(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data siswa berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteStudent(req, res, next) {
    try {
      const result = await studentsService.deleteStudent(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Siswa berhasil dinonaktifkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Data Fisik Periodik
  async savePeriodicPhysical(req, res, next) {
    try {
      const result = await studentsService.savePeriodicPhysical(req.params.id, req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Catatan fisik periodik siswa berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePeriodicPhysical(req, res, next) {
    try {
      const result = await studentsService.deletePeriodicPhysical(req.params.id, req.params.recordId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Catatan fisik periodik berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Kelengkapan Rekap Rapor DIK/DIN
  async saveReportCardRecaps(req, res, next) {
    try {
      const result = await studentsService.saveReportCardRecaps(req.params.id, req.body.recaps || req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Kelengkapan rekap rapor berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Checklist Berkas Pendaftaran
  async updateDocumentChecklist(req, res, next) {
    try {
      const result = await studentsService.updateDocumentChecklist(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Checklist kelengkapan berkas berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Orang Tua / Wali
  async saveGuardian(req, res, next) {
    try {
      const result = await studentsService.saveGuardian(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data orang tua/wali berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteGuardian(req, res, next) {
    try {
      const result = await studentsService.deleteGuardian(req.params.id, req.params.guardianId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Relasi orang tua/wali berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Mutasi & Kelulusan
  async listMutations(req, res, next) {
    try {
      const result = await studentsService.listMutations(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar riwayat mutasi siswa berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createMutation(req, res, next) {
    try {
      const result = await studentsService.createMutation(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Riwayat mutasi/kelulusan siswa berhasil dicatat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async promoteStudents(req, res, next) {
    try {
      const result = await studentsService.promoteStudents(req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StudentsController();
