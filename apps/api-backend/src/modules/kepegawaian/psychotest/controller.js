/**
 * Psychotest Controller
 * Modul Kepegawaian - Fitur Tes Psikologi (MBTI & Big Five)
 * Standard Response Format: { success, data, message, errors }
 */
const psychotestService = require('./service');
const db = require('../../../config/db/kepegawaian');

class PsychotestController {
  // =========================================================================
  // 6.1 Admin Bank Soal (kepegawaian.psychotest_bank.manage)
  // =========================================================================

  async listTypes(req, res, next) {
    try {
      const data = await psychotestService.listTypes(req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar tipe tes psikologi berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getTypeById(req, res, next) {
    try {
      const data = await psychotestService.getTypeById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail tipe tes psikologi berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async createType(req, res, next) {
    try {
      const data = await psychotestService.createType(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Tipe tes psikologi baru berhasil dibuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async updateType(req, res, next) {
    try {
      const data = await psychotestService.updateType(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Tipe tes psikologi berhasil diperbarui',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteType(req, res, next) {
    try {
      await psychotestService.deleteType(req.params.id);
      return res.json({
        success: true,
        data: null,
        message: 'Tipe tes psikologi berhasil dihapus',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Dimensions ---
  async listDimensions(req, res, next) {
    try {
      const data = await psychotestService.listDimensions(req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar dimensi psikologi berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async createDimension(req, res, next) {
    try {
      const data = await psychotestService.createDimension(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Dimensi psikologi baru berhasil ditambahkan',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDimension(req, res, next) {
    try {
      const data = await psychotestService.updateDimension(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Dimensi psikologi berhasil diperbarui',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDimension(req, res, next) {
    try {
      await psychotestService.deleteDimension(req.params.id);
      return res.json({
        success: true,
        data: null,
        message: 'Dimensi psikologi berhasil dihapus',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Questions ---
  async listQuestions(req, res, next) {
    try {
      const data = await psychotestService.listQuestions(req.query);
      return res.json({
        success: true,
        data,
        message: 'Bank butir soal psikotes berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionById(req, res, next) {
    try {
      const data = await psychotestService.getQuestionById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail butir soal berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async createQuestion(req, res, next) {
    try {
      const data = await psychotestService.createQuestion(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Butir soal psikotes baru berhasil ditambahkan ke bank soal',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQuestion(req, res, next) {
    try {
      const data = await psychotestService.updateQuestion(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Butir soal psikotes berhasil diperbarui',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      await psychotestService.deleteQuestion(req.params.id);
      return res.json({
        success: true,
        data: null,
        message: 'Butir soal psikotes berhasil dihapus',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Profiles ---
  async listProfiles(req, res, next) {
    try {
      const data = await psychotestService.listProfiles(req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar master profil kepribadian & interpretasi HRD berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const data = await psychotestService.updateProfile(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Deskripsi profil interpretasi psikotes berhasil diperbarui',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6.2 Sesi & Laporan HRD (kepegawaian.psychotest_sessions.manage)
  // =========================================================================

  async listSessions(req, res, next) {
    try {
      const data = await psychotestService.listSessions(req.query);
      return res.json({
        success: true,
        data,
        message: 'Daftar sesi asesmen psikotes berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const data = await psychotestService.getSessionById(req.params.id);
      return res.json({
        success: true,
        data,
        message: 'Detail sesi psikotes berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async createSession(req, res, next) {
    try {
      const data = await psychotestService.createSession(req.body);
      return res.status(201).json({
        success: true,
        data,
        message: 'Sesi asesmen psikotes baru berhasil dijadwalkan dengan kode akses token',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req, res, next) {
    try {
      await psychotestService.deleteSession(req.params.id);
      return res.json({
        success: true,
        data: null,
        message: 'Sesi psikotes berhasil dibatalkan dan dihapus',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async evaluateSession(req, res, next) {
    try {
      const data = await psychotestService.evaluateSession(req.params.id, req.body);
      return res.json({
        success: true,
        data,
        message: 'Evaluasi asesor dan rekomendasi HRD berhasil disimpan',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getReportsSummary(req, res, next) {
    try {
      const data = await psychotestService.getReportsSummary();
      return res.json({
        success: true,
        data,
        message: 'Rangkuman analitik psikotes berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6.3 Self-Service Karyawan (Pegawai Aktif)
  // =========================================================================

  async getMyTests(req, res, next) {
    try {
      const employeeId = req.user?.ref_type === 'staff' ? req.user.ref_id : req.query.employee_id;
      const data = await psychotestService.listSessions({ employee_id: employeeId });
      return res.json({
        success: true,
        data,
        message: 'Daftar penugasan tes psikotes pegawai berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async takeMyTest(req, res, next) {
    try {
      const session = await psychotestService.getSessionById(req.params.session_id);
      if (session.status === 'completed') {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Tes ini sudah pernah Anda selesaikan',
          errors: null
        });
      }
      const data = await psychotestService.getTestQuestionsForTaker(session);
      return res.json({
        success: true,
        data,
        message: 'Lembar instrumen soal psikotes berhasil disiapkan',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async answerMyTest(req, res, next) {
    try {
      const { question_id, selected_option, response_time_seconds } = req.body;
      const data = await psychotestService.saveAnswer(req.params.session_id, question_id, selected_option, response_time_seconds);
      return res.json({
        success: true,
        data,
        message: 'Jawaban butir soal berhasil disimpan',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async submitMyTest(req, res, next) {
    try {
      const data = await psychotestService.submitAndScoreSession(req.params.session_id);
      return res.json({
        success: true,
        data,
        message: 'Tes psikotes berhasil diselesaikan dan dinilai otomatis',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTestResult(req, res, next) {
    try {
      const session = await psychotestService.getSessionById(req.params.session_id);
      return res.json({
        success: true,
        data: session,
        message: 'Hasil asesmen kepribadian berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6.4 Public Token-Based (Kandidat Pelamar Tanpa Login)
  // =========================================================================

  async verifyPublicToken(req, res, next) {
    try {
      // Sesi sudah divalidasi oleh publicTokenMiddleware
      const session = req.psychotestSession;
      return res.json({
        success: true,
        data: {
          session_code: session.session_code,
          test_type_code: session.test_type_code,
          test_type_name: session.test_type_name,
          participant_name: session.participant_name,
          duration_minutes: session.duration_minutes,
          status: session.status,
          instructions: session.test_instructions
        },
        message: 'Sesi psikotes publik valid dan siap dikerjakan',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicQuestions(req, res, next) {
    try {
      const session = req.psychotestSession;
      const data = await psychotestService.getTestQuestionsForTaker(session);
      return res.json({
        success: true,
        data,
        message: 'Daftar pertanyaan tes psikotes publik berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async savePublicAnswers(req, res, next) {
    try {
      const session = req.psychotestSession;
      const { answers } = req.body;
      let data;
      if (Array.isArray(answers)) {
        data = await psychotestService.saveBatchAnswers(session.id, answers);
      } else {
        const { question_id, selected_option, response_time_seconds } = req.body;
        data = await psychotestService.saveAnswer(session.id, question_id, selected_option, response_time_seconds);
      }
      return res.json({
        success: true,
        data,
        message: 'Jawaban berhasil disimpan sementara',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async submitPublicTest(req, res, next) {
    try {
      const session = req.psychotestSession;
      const data = await psychotestService.submitAndScoreSession(session.id);
      return res.json({
        success: true,
        data: {
          session_code: session.session_code,
          status: 'completed',
          result_label: data.result_label,
          completed_at: new Date().toISOString()
        },
        message: 'Terima kasih, seluruh rangkaian tes psikologi telah berhasil dikirimkan.',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicResult(req, res, next) {
    try {
      const session = req.psychotestSession;
      return res.json({
        success: true,
        data: {
          session_code: session.session_code,
          participant_name: session.participant_name,
          status: session.status,
          completed_at: session.completed_at
        },
        message: 'Informasi status tes psikologi berhasil dimuat',
        errors: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PsychotestController();
