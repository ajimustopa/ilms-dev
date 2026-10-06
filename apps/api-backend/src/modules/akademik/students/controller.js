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
      const result = await studentsService.promoteStudents(req.body, req.user);
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

  async graduateStudents(req, res, next) {
    try {
      const result = await studentsService.graduateStudents(req.body, req.user);
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

  async getGraduationCertificateData(req, res, next) {
    try {
      const result = await studentsService.getGraduationCertificateData(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data kelulusan dan nilai sertifikat berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudentClassHistory(req, res, next) {
    try {
      const result = await studentsService.getStudentClassHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat kronologis rombel siswa berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async quickAddLegacy(req, res, next) {
    try {
      const result = await studentsService.quickAddLegacyStudent(req.body, req.user);
      res.status(201).json({
        success: true,
        data: result.student,
        warning: result.warning,
        message: result.warning
          ? `Data siswa berhasil disimpan dengan catatan: ${result.warning}`
          : 'Data siswa riwayat / alumni berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async searchQuick(req, res, next) {
    try {
      const result = await studentsService.searchQuick(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Hasil pencarian cepat siswa berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async batchImport(req, res, next) {
    try {
      const result = await studentsService.batchImport(req.body, req.user);
      res.status(200).json({
        success: true,
        data: result,
        message: `Import selesai: ${result.inserted_count} baru, ${result.updated_count} diperbarui${result.skipped_count > 0 ? `, ${result.skipped_count} dilewati` : ''}`,
        errors: result.errors && result.errors.length > 0 ? result.errors : null
      });
    } catch (err) {
      next(err);
    }
  }

  async printCardsPdf(req, res, next) {
    try {
      const pdfBuffer = await studentsService.generatePrintableCardsPdf(req.body, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="kartu-tanda-siswa-akademik.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async uploadPhoto(req, res, next) {
    try {
      const studentId = req.params.id || req.body.student_id;
      const result = await studentsService.uploadStudentPhoto(studentId, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pas foto siswa berhasil diunggah',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StudentsController();
