/**
 * PSB Candidate Portal Service
 * Modul Akademik - Portal Mandiri Calon Murid (Akun account_type: student / psb_candidate)
 */
const db = require('../../../../config/db/akademik');
const coreDb = require('../../../../config/db/core');
const psbService = require('../service');

class PsbPortalService {
  /**
   * Helper untuk mendapatkan registrant berdasarkan akun user JWT login
   */
  async getRegistrantByUserId(userId) {
    // 1. Cari via user_account_id di tabel psb_registrants
    let reg = await db('psb_registrants')
      .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
      .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
      .leftJoin('grade_levels', 'psb_registrants.requested_grade_level_id', 'grade_levels.id')
      .leftJoin('class_groups', 'psb_registrants.placed_class_group_id', 'class_groups.id')
      .where('psb_registrants.user_account_id', userId)
      .select(
        'psb_registrants.*',
        'psb_processes.name as psb_process_name',
        'psb_processes.target_academic_year',
        'psb_processes.description as psb_process_description',
        'psb_processes.start_date as psb_process_start_date',
        'psb_processes.end_date as psb_process_end_date',
        'psb_groups.name as psb_group_name',
        'grade_levels.name as requested_grade_level_name',
        'class_groups.name as placed_class_group_name'
      )
      .first();

    // 2. Fallback jika user login memiliki ref_type 'psb_registrant'
    if (!reg) {
      const user = await coreDb('users').where({ id: userId }).first();
      if (user && user.ref_type === 'psb_registrant' && user.ref_id) {
        reg = await db('psb_registrants')
          .leftJoin('psb_processes', 'psb_registrants.psb_process_id', 'psb_processes.id')
          .leftJoin('psb_groups', 'psb_registrants.psb_group_id', 'psb_groups.id')
          .leftJoin('grade_levels', 'psb_registrants.requested_grade_level_id', 'grade_levels.id')
          .leftJoin('class_groups', 'psb_registrants.placed_class_group_id', 'class_groups.id')
          .where('psb_registrants.id', user.ref_id)
          .select(
            'psb_registrants.*',
            'psb_processes.name as psb_process_name',
            'psb_processes.target_academic_year',
            'psb_processes.description as psb_process_description',
            'psb_processes.start_date as psb_process_start_date',
            'psb_processes.end_date as psb_process_end_date',
            'psb_groups.name as psb_group_name',
            'grade_levels.name as requested_grade_level_name',
            'class_groups.name as placed_class_group_name'
          )
          .first();
      }
    }

    if (!reg) {
      const error = new Error('Data pendaftaran calon murid tidak ditemukan untuk akun ini');
      error.statusCode = 404;
      throw error;
    }

    return reg;
  }

  async getProfile(userId) {
    const reg = await this.getRegistrantByUserId(userId);
    const documents = await db('psb_registrant_documents').where({ psb_registrant_id: reg.id });
    const testSessions = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where({ 'psb_test_sessions.psb_registrant_id': reg.id })
      .select('psb_test_sessions.*', 'psb_tests.name as test_name', 'psb_tests.duration_minutes', 'psb_tests.passing_score');

    return {
      registrant: reg,
      documents,
      test_sessions: testSessions
    };
  }

  async updateDataLengkap(userId, payload) {
    const reg = await this.getRegistrantByUserId(userId);

    const allowed = [
      'nisn',
      'full_name',
      'candidate_birth_place',
      'candidate_birth_date',
      'candidate_gender',
      'address',
      'previous_school_name',
      'father_name',
      'mother_name',
      'parent_contact',
      'entry_type',
      'requested_grade_level_id'
    ];

    const updateData = { updated_at: db.fn.now() };
    for (const k of allowed) {
      if (payload[k] !== undefined) {
        updateData[k] = payload[k];
      }
    }

    await db('psb_registrants').where({ id: reg.id }).update(updateData);
    return this.getProfile(userId);
  }

  async listDocuments(userId) {
    const reg = await this.getRegistrantByUserId(userId);
    return db('psb_registrant_documents').where({ psb_registrant_id: reg.id });
  }

  async uploadDocument(userId, payload) {
    const reg = await this.getRegistrantByUserId(userId);
    return psbService.addDocument(reg.id, payload);
  }

  async deleteDocument(userId, docId) {
    const reg = await this.getRegistrantByUserId(userId);
    return psbService.deleteDocument(reg.id, docId);
  }

  async listTestSessions(userId) {
    const reg = await this.getRegistrantByUserId(userId);
    return db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where({ 'psb_test_sessions.psb_registrant_id': reg.id })
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.description as test_description',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score'
      )
      .orderBy('psb_test_sessions.id', 'desc');
  }

  async getTestSessionDetail(userId, sessionId) {
    const reg = await this.getRegistrantByUserId(userId);
    const session = await db('psb_test_sessions')
      .join('psb_tests', 'psb_test_sessions.psb_test_id', 'psb_tests.id')
      .where({ 'psb_test_sessions.id': sessionId, 'psb_test_sessions.psb_registrant_id': reg.id })
      .select(
        'psb_test_sessions.*',
        'psb_tests.name as test_name',
        'psb_tests.description as test_description',
        'psb_tests.duration_minutes',
        'psb_tests.passing_score'
      )
      .first();

    if (!session) {
      const error = new Error('Sesi tes tidak ditemukan atau bukan milik akun Anda');
      error.statusCode = 404;
      throw error;
    }

    // Ambil soal tes
    const questions = await db('psb_test_questions')
      .where({ psb_test_id: session.psb_test_id })
      .orderBy('order_number', 'asc');

    // Jika tes sudah selesai atau sedang berlangsung, ambil jawaban
    const answers = await db('psb_test_answers')
      .where({ psb_test_session_id: sessionId });

    return {
      session,
      questions: questions.map((q) => ({
        id: q.id,
        question_type: q.question_type,
        question_text: q.question_text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        score_weight: q.score_weight,
        order_number: q.order_number,
        // Sembunyikan correct_answer jika belum graded
        correct_answer: session.status === 'graded' ? q.correct_answer : undefined
      })),
      answers
    };
  }

  async submitTestSession(userId, sessionId, answers) {
    const reg = await this.getRegistrantByUserId(userId);
    const session = await db('psb_test_sessions')
      .where({ id: sessionId, psb_registrant_id: reg.id })
      .first();

    if (!session) {
      const error = new Error('Sesi tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (session.status === 'graded' || session.status === 'submitted') {
      const error = new Error('Tes ini sudah pernah disubmit sebelumnya');
      error.statusCode = 400;
      throw error;
    }

    return psbService.submitTestSession(sessionId, { answers });
  }
}

module.exports = new PsbPortalService();
