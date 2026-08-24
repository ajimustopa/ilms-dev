/**
 * Recruitment Controller Implementation
 * Modul Kepegawaian - Fitur 1.6: Rekrutmen & Onboarding Pegawai Lengkap
 */
const recruitmentService = require('./service');

class RecruitmentController {
  // 1. Candidates
  async list(req, res, next) {
    try {
      const result = await recruitmentService.listCandidates(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar kandidat rekrutmen berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await recruitmentService.getCandidateById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail kandidat rekrutmen berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const assessor_name = req.user?.full_name || 'Tim HRD';
      const result = await recruitmentService.createCandidate({ ...req.body, assessor_name });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Kandidat rekrutmen berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await recruitmentService.updateCandidate(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data kandidat berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await recruitmentService.deleteCandidate(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Kandidat berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStage(req, res, next) {
    try {
      const assessor_name = req.body.assessor_name || req.user?.full_name || 'Tim HRD';
      const result = await recruitmentService.updateStage(req.params.id, {
        selection_stage: req.body.selection_stage,
        notes: req.body.notes,
        status: req.body.status,
        assessor_name
      });
      res.status(200).json({
        success: true,
        data: result,
        message: 'Tahapan seleksi kandidat berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async addStageHistory(req, res, next) {
    try {
      const assessor_name = req.body.assessor_name || req.user?.full_name || 'Tim Penilai';
      const result = await recruitmentService.addStageHistory(req.params.id, {
        ...req.body,
        assessor_name
      });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Catatan riwayat tahapan berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Interviews
  async addInterview(req, res, next) {
    try {
      const interviewer_name = req.body.interviewer_name || req.user?.full_name || 'Pewawancara Utama';
      const result = await recruitmentService.addInterviewEvaluation(req.params.id, {
        ...req.body,
        interviewer_name
      });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Hasil penilaian wawancara berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteInterview(req, res, next) {
    try {
      const result = await recruitmentService.deleteInterviewEvaluation(req.params.interviewId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Penilaian wawancara berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 3. Test Instruments (Bank Soal Psikotes & Wawancara)
  async listInstruments(req, res, next) {
    try {
      const result = await recruitmentService.listTestInstruments(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar instrumen tes berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getInstrumentById(req, res, next) {
    try {
      const result = await recruitmentService.getTestInstrumentById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail instrumen tes berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createInstrument(req, res, next) {
    try {
      const result = await recruitmentService.createTestInstrument(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Instrumen tes baru berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateInstrument(req, res, next) {
    try {
      const result = await recruitmentService.updateTestInstrument(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Instrumen tes berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteInstrument(req, res, next) {
    try {
      const result = await recruitmentService.deleteTestInstrument(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Instrumen tes berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. Test Results (Psikotes)
  async submitTestResult(req, res, next) {
    try {
      const assessor_name = req.user?.full_name || 'Sistem Psikotes';
      const result = await recruitmentService.submitTestResult(req.params.id, {
        ...req.body,
        assessor_name
      });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Jawaban dan hasil tes psikotes berhasil dievaluasi',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Microteaching
  async addMicroteaching(req, res, next) {
    try {
      const evaluator_name = req.body.evaluator_name || req.user?.full_name || 'Tim Penilai Microteaching';
      const result = await recruitmentService.addMicroteachingEvaluation(req.params.id, {
        ...req.body,
        evaluator_name
      });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Hasil evaluasi microteaching berhasil disimpan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMicroteaching(req, res, next) {
    try {
      const result = await recruitmentService.deleteMicroteachingEvaluation(req.params.microteachingId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Evaluasi microteaching berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Activation
  async activate(req, res, next) {
    try {
      const result = await recruitmentService.activateCandidate(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Kandidat berhasil diaktifkan sebagai pegawai dan akun Core Service dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecruitmentController();
