/**
 * PSB (Penerimaan Murid Baru) Controller
 * Modul Akademik
 */
const psbService = require('./service');

class PsbController {
  // ============================================================
  // 1. PSB PROCESSES & DASHBOARD
  // ============================================================

  async listProcesses(req, res, next) {
    try {
      const data = await psbService.listProcesses(req.query);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar proses PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getProcessById(req, res, next) {
    try {
      const data = await psbService.getProcessById(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail proses PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createProcess(req, res, next) {
    try {
      const data = await psbService.createProcess(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Proses PSB baru berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProcess(req, res, next) {
    try {
      const data = await psbService.updateProcess(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Proses PSB berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteProcess(req, res, next) {
    try {
      const data = await psbService.deleteProcess(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Proses PSB berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  async getProcessUnits(req, res, next) {
    try {
      const data = await psbService.getProcessUnits(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar satuan pendidikan dalam proses PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProcessUnits(req, res, next) {
    try {
      const units = req.body.units || req.body;
      const data = await psbService.updateProcessUnits(req.params.id, Array.isArray(units) ? units : []);
      return res.status(200).json({
        success: true,
        data,
        message: 'Pengaturan kuota & kode awalan satuan pendidikan berhasil disimpan'
      });
    } catch (err) {
      next(err);
    }
  }

  async getProcessDashboard(req, res, next) {
    try {
      const data = await psbService.getProcessDashboard(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Dashboard statistik proses PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 2. PSB GROUPS (GELOMBANG / JALUR)
  // ============================================================

  async listGroups(req, res, next) {
    try {
      const data = await psbService.listGroups(req.query);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar gelombang PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getGroupById(req, res, next) {
    try {
      const data = await psbService.getGroupById(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail gelombang PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createGroup(req, res, next) {
    try {
      const data = await psbService.createGroup(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Gelombang PSB berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const data = await psbService.updateGroup(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Gelombang PSB berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteGroup(req, res, next) {
    try {
      const data = await psbService.deleteGroup(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Gelombang PSB berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 3. PSB REGISTRANTS
  // ============================================================

  async listRegistrants(req, res, next) {
    try {
      const data = await psbService.listRegistrants(req.query);
      return res.status(200).json({
        success: true,
        data: data.items,
        pagination: data.pagination,
        message: 'Daftar pendaftar calon murid berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getRegistrantById(req, res, next) {
    try {
      const data = await psbService.getRegistrantById(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail data calon murid berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createRegistrant(req, res, next) {
    try {
      const data = await psbService.createRegistrant(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Pendaftaran calon murid berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRegistrant(req, res, next) {
    try {
      const data = await psbService.updateRegistrant(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Data calon murid berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRegistrant(req, res, next) {
    try {
      const data = await psbService.deleteRegistrant(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Data calon murid berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  async createRegistrantAccount(req, res, next) {
    try {
      const data = await psbService.createRegistrantAccount(req.params.id);
      return res.status(201).json({
        success: true,
        data,
        message: 'Akun portal calon murid berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async placeRegistrant(req, res, next) {
    try {
      const placed_by = req.user ? req.user.full_name || req.user.username : 'Petugas PSB';
      const data = await psbService.placeRegistrant(req.params.id, { ...req.body, placed_by });
      return res.status(200).json({
        success: true,
        data,
        message: 'Calon murid berhasil ditempatkan ke kelas definitif'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 4. PSB REGISTRANT DOCUMENTS
  // ============================================================

  async listDocuments(req, res, next) {
    try {
      const data = await psbService.listDocuments(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar dokumen lampiran pendaftar berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async addDocument(req, res, next) {
    try {
      const data = await psbService.addDocument(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Dokumen lampiran berhasil diunggah'
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyDocument(req, res, next) {
    try {
      const verified_by = req.user ? req.user.id : null;
      const data = await psbService.verifyDocument(req.params.id, req.params.docId, {
        ...req.body,
        verified_by
      });
      return res.status(200).json({
        success: true,
        data,
        message: 'Verifikasi dokumen pendaftar berhasil disimpan'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req, res, next) {
    try {
      const data = await psbService.deleteDocument(req.params.id, req.params.docId);
      return res.status(200).json({
        success: true,
        data,
        message: 'Dokumen lampiran berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 5. PSB TESTS & QUESTIONS
  // ============================================================

  async listTests(req, res, next) {
    try {
      const data = await psbService.listTests(req.query);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar paket tes PSB berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getTestById(req, res, next) {
    try {
      const data = await psbService.getTestById(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail tes PSB beserta bank soal berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createTest(req, res, next) {
    try {
      const data = await psbService.createTest(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Paket tes seleksi PSB berhasil dibuat'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTest(req, res, next) {
    try {
      const data = await psbService.updateTest(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Paket tes PSB berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTest(req, res, next) {
    try {
      const data = await psbService.deleteTest(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Paket tes PSB berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  async createTestQuestion(req, res, next) {
    try {
      const data = await psbService.createTestQuestion(req.params.id, req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Soal tes berhasil ditambahkan'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTestQuestion(req, res, next) {
    try {
      const data = await psbService.updateTestQuestion(req.params.questionId, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'Soal tes berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTestQuestion(req, res, next) {
    try {
      const data = await psbService.deleteTestQuestion(req.params.questionId);
      return res.status(200).json({
        success: true,
        data,
        message: 'Soal tes berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 6. PSB TEST SESSIONS & GRADING
  // ============================================================

  async listTestSessions(req, res, next) {
    try {
      const data = await psbService.listTestSessions(req.query);
      return res.status(200).json({
        success: true,
        data,
        message: 'Daftar sesi tes calon murid berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async getTestSessionById(req, res, next) {
    try {
      const data = await psbService.getTestSessionById(req.params.id);
      return res.status(200).json({
        success: true,
        data,
        message: 'Detail sesi tes calon murid berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  async createTestSession(req, res, next) {
    try {
      const data = await psbService.createTestSession(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Jadwal sesi tes berhasil ditugaskan ke calon murid'
      });
    } catch (err) {
      next(err);
    }
  }

  async submitTestSession(req, res, next) {
    try {
      const data = await psbService.submitTestSession(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: data.message || 'Jawaban tes berhasil disubmit'
      });
    } catch (err) {
      next(err);
    }
  }

  async gradeTestSession(req, res, next) {
    try {
      const data = await psbService.gradeTestSession(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: data.message || 'Penilaian manual tes berhasil disimpan'
      });
    } catch (err) {
      next(err);
    }
  }

  // ============================================================
  // 7. INTERNAL INTAKE
  // ============================================================

  async intakePublicRegistrant(req, res, next) {
    try {
      const data = await psbService.intakePublicRegistrant(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: data.message || 'Intake pendaftar PPDB publik berhasil'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PsbController();
