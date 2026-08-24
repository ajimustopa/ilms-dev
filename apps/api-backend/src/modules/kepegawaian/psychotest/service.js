/**
 * Psychotest Business Service Implementation
 * Modul Kepegawaian - Fitur Tes Psikologi (MBTI & Big Five OCEAN)
 */
const crypto = require('crypto');
const db = require('../../../config/db/kepegawaian');
const scoringService = require('./scoringService');

class PsychotestService {
  // =========================================================================
  // 1. BANK SOAL & INSTRUMEN ADMIN (6.1)
  // =========================================================================

  async listTypes(query = {}) {
    let q = db('psychotest_types as pt')
      .leftJoin('psychotest_questions as pq', 'pt.id', 'pq.test_type_id')
      .leftJoin('psychotest_dimensions as pd', 'pt.id', 'pd.test_type_id')
      .select(
        'pt.*',
        db.raw('COUNT(DISTINCT pd.id) as dimensions_count'),
        db.raw('COUNT(DISTINCT pq.id) as questions_count')
      )
      .groupBy('pt.id')
      .orderBy('pt.id', 'asc');

    if (query.is_active !== undefined) {
      q = q.where('pt.is_active', query.is_active === 'true' || query.is_active === true || query.is_active === 1);
    }
    return await q;
  }

  async getTypeById(id) {
    const type = await db('psychotest_types').where('id', id).first();
    if (!type) throw new Error('Tipe tes psikologi tidak ditemukan');

    const dimensions = await db('psychotest_dimensions')
      .where('test_type_id', id)
      .orderBy('order_number', 'asc');

    const questionsCount = await db('psychotest_questions')
      .where('test_type_id', id)
      .count('id as count')
      .first();

    const profilesCount = await db('psychotest_type_profiles')
      .where('test_type_id', id)
      .count('id as count')
      .first();

    return {
      ...type,
      dimensions,
      questions_count: parseInt(questionsCount ? questionsCount.count : 0, 10),
      profiles_count: parseInt(profilesCount ? profilesCount.count : 0, 10)
    };
  }

  async createType(data) {
    const payload = {
      school_unit_id: data.school_unit_id || null,
      code: data.code,
      name: data.name,
      scoring_method: data.scoring_method || 'dichotomy_4axis',
      description: data.description || null,
      instructions: data.instructions || null,
      duration_minutes: data.duration_minutes || 30,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };
    const [id] = await db('psychotest_types').insert(payload);
    return await this.getTypeById(id);
  }

  async updateType(id, data) {
    const existing = await db('psychotest_types').where('id', id).first();
    if (!existing) throw new Error('Tipe tes tidak ditemukan');

    const payload = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(data.duration_minutes && { duration_minutes: data.duration_minutes }),
      ...(data.is_active !== undefined && { is_active: Boolean(data.is_active) }),
      updated_at: db.fn.now()
    };
    await db('psychotest_types').where('id', id).update(payload);
    return await this.getTypeById(id);
  }

  async deleteType(id) {
    const sessionCount = await db('psychotest_sessions').where('test_type_id', id).count('id as count').first();
    if (sessionCount && sessionCount.count > 0) {
      throw new Error('Tipe tes tidak dapat dihapus karena sudah memiliki riwayat sesi pelaksanaan ujian');
    }
    return await db('psychotest_types').where('id', id).del();
  }

  // --- Dimensions ---
  async listDimensions(query = {}) {
    let q = db('psychotest_dimensions as pd')
      .join('psychotest_types as pt', 'pd.test_type_id', 'pt.id')
      .leftJoin('psychotest_questions as pq', 'pd.id', 'pq.dimension_id')
      .select(
        'pd.*',
        'pt.name as test_type_name',
        'pt.code as test_type_code',
        db.raw('COUNT(pq.id) as questions_count')
      )
      .groupBy('pd.id')
      .orderBy('pd.test_type_id', 'asc')
      .orderBy('pd.order_number', 'asc');

    if (query.test_type_id) {
      q = q.where('pd.test_type_id', query.test_type_id);
    }
    return await q;
  }

  async createDimension(data) {
    const payload = {
      test_type_id: data.test_type_id,
      code: data.code,
      name: data.name,
      pole_positive_code: data.pole_positive_code || null,
      pole_positive_label: data.pole_positive_label || null,
      pole_negative_code: data.pole_negative_code || null,
      pole_negative_label: data.pole_negative_label || null,
      description: data.description || null,
      order_number: data.order_number || 1,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };
    const [id] = await db('psychotest_dimensions').insert(payload);
    return await db('psychotest_dimensions').where('id', id).first();
  }

  async updateDimension(id, data) {
    const payload = {
      ...(data.name && { name: data.name }),
      ...(data.pole_positive_code !== undefined && { pole_positive_code: data.pole_positive_code }),
      ...(data.pole_positive_label !== undefined && { pole_positive_label: data.pole_positive_label }),
      ...(data.pole_negative_code !== undefined && { pole_negative_code: data.pole_negative_code }),
      ...(data.pole_negative_label !== undefined && { pole_negative_label: data.pole_negative_label }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.order_number && { order_number: data.order_number }),
      ...(data.is_active !== undefined && { is_active: Boolean(data.is_active) }),
      updated_at: db.fn.now()
    };
    await db('psychotest_dimensions').where('id', id).update(payload);
    return await db('psychotest_dimensions').where('id', id).first();
  }

  async deleteDimension(id) {
    return await db('psychotest_dimensions').where('id', id).del();
  }

  // --- Questions ---
  async listQuestions(query = {}) {
    let q = db('psychotest_questions as pq')
      .join('psychotest_types as pt', 'pq.test_type_id', 'pt.id')
      .join('psychotest_dimensions as pd', 'pq.dimension_id', 'pd.id')
      .select(
        'pq.*',
        'pt.name as test_type_name',
        'pd.name as dimension_name',
        'pd.code as dimension_code'
      )
      .orderBy('pq.test_type_id', 'asc')
      .orderBy('pq.order_number', 'asc');

    if (query.test_type_id) {
      q = q.where('pq.test_type_id', query.test_type_id);
    }
    if (query.dimension_id) {
      q = q.where('pq.dimension_id', query.dimension_id);
    }
    if (query.question_type) {
      q = q.where('pq.question_type', query.question_type);
    }
    return await q;
  }

  async getQuestionById(id) {
    const q = await db('psychotest_questions as pq')
      .join('psychotest_types as pt', 'pq.test_type_id', 'pt.id')
      .join('psychotest_dimensions as pd', 'pq.dimension_id', 'pd.id')
      .where('pq.id', id)
      .select('pq.*', 'pt.name as test_type_name', 'pd.name as dimension_name', 'pd.code as dimension_code')
      .first();
    if (!q) throw new Error('Butir soal tidak ditemukan');
    return q;
  }

  async createQuestion(data) {
    const payload = {
      test_type_id: data.test_type_id,
      dimension_id: data.dimension_id,
      question_code: data.question_code || null,
      question_text: data.question_text,
      question_type: data.question_type || 'forced_choice',
      scoring_direction: data.scoring_direction || 'normal',
      option_a_text: data.option_a_text || null,
      option_a_pole: data.option_a_pole || null,
      option_b_text: data.option_b_text || null,
      option_b_pole: data.option_b_pole || null,
      order_number: data.order_number || 1,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };
    const [id] = await db('psychotest_questions').insert(payload);
    return await this.getQuestionById(id);
  }

  async updateQuestion(id, data) {
    const payload = {
      ...(data.dimension_id && { dimension_id: data.dimension_id }),
      ...(data.question_code !== undefined && { question_code: data.question_code }),
      ...(data.question_text && { question_text: data.question_text }),
      ...(data.question_type && { question_type: data.question_type }),
      ...(data.scoring_direction && { scoring_direction: data.scoring_direction }),
      ...(data.option_a_text !== undefined && { option_a_text: data.option_a_text }),
      ...(data.option_a_pole !== undefined && { option_a_pole: data.option_a_pole }),
      ...(data.option_b_text !== undefined && { option_b_text: data.option_b_text }),
      ...(data.option_b_pole !== undefined && { option_b_pole: data.option_b_pole }),
      ...(data.order_number && { order_number: data.order_number }),
      ...(data.is_active !== undefined && { is_active: Boolean(data.is_active) }),
      updated_at: db.fn.now()
    };
    await db('psychotest_questions').where('id', id).update(payload);
    return await this.getQuestionById(id);
  }

  async deleteQuestion(id) {
    return await db('psychotest_questions').where('id', id).del();
  }

  // --- Profiles ---
  async listProfiles(query = {}) {
    let q = db('psychotest_type_profiles as ptp')
      .join('psychotest_types as pt', 'ptp.test_type_id', 'pt.id')
      .select('ptp.*', 'pt.name as test_type_name', 'pt.code as test_type_code')
      .orderBy('ptp.test_type_id', 'asc')
      .orderBy('ptp.profile_code', 'asc');

    if (query.test_type_id) {
      q = q.where('ptp.test_type_id', query.test_type_id);
    }
    return await q;
  }

  async updateProfile(id, data) {
    const payload = {
      ...(data.profile_label && { profile_label: data.profile_label }),
      ...(data.description_text && { description_text: data.description_text }),
      ...(data.strengths_text !== undefined && { strengths_text: data.strengths_text }),
      ...(data.weaknesses_text !== undefined && { weaknesses_text: data.weaknesses_text }),
      ...(data.hrd_recommendation_text && { hrd_recommendation_text: data.hrd_recommendation_text }),
      ...(data.suitable_roles !== undefined && { suitable_roles: data.suitable_roles }),
      updated_at: db.fn.now()
    };
    await db('psychotest_type_profiles').where('id', id).update(payload);
    return await db('psychotest_type_profiles').where('id', id).first();
  }

  // =========================================================================
  // 2. SESI & LAPORAN HRD (6.2)
  // =========================================================================

  async listSessions(query = {}) {
    let q = db('psychotest_sessions as ps')
      .join('psychotest_types as pt', 'ps.test_type_id', 'pt.id')
      .leftJoin('recruitment_candidates as rc', 'ps.candidate_id', 'rc.id')
      .leftJoin('employees as emp', 'ps.employee_id', 'emp.id')
      .leftJoin('psychotest_results as pr', 'ps.id', 'pr.session_id')
      .select(
        'ps.*',
        'pt.name as test_type_name',
        'pt.code as test_type_code',
        'rc.candidate_name',
        'rc.applied_position',
        'emp.full_name as employee_name',
        'emp.employee_number',
        'pr.result_code',
        'pr.result_label'
      )
      .orderBy('ps.id', 'desc');

    if (query.status) {
      q = q.where('ps.status', query.status);
    }
    if (query.test_type_id) {
      q = q.where('ps.test_type_id', query.test_type_id);
    }
    if (query.candidate_id) {
      q = q.where('ps.candidate_id', query.candidate_id);
    }
    if (query.employee_id) {
      q = q.where('ps.employee_id', query.employee_id);
    }
    if (query.search) {
      const s = `%${query.search}%`;
      q = q.where((b) => {
        b.where('ps.participant_name', 'like', s)
          .orWhere('ps.session_code', 'like', s)
          .orWhere('ps.participant_email', 'like', s);
      });
    }

    return await q;
  }

  async getSessionById(id) {
    const session = await db('psychotest_sessions as ps')
      .join('psychotest_types as pt', 'ps.test_type_id', 'pt.id')
      .leftJoin('recruitment_candidates as rc', 'ps.candidate_id', 'rc.id')
      .leftJoin('employees as emp', 'ps.employee_id', 'emp.id')
      .leftJoin('psychotest_results as pr', 'ps.id', 'pr.session_id')
      .where('ps.id', id)
      .select(
        'ps.*',
        'pt.name as test_type_name',
        'pt.code as test_type_code',
        'pt.scoring_method',
        'rc.candidate_name',
        'rc.applied_position',
        'emp.full_name as employee_name',
        'emp.employee_number',
        'pr.id as result_id',
        'pr.result_code',
        'pr.result_label',
        'pr.dimension_scores',
        'pr.profile_summary',
        'pr.strengths_summary',
        'pr.development_areas',
        'pr.hrd_recommendation',
        'pr.radar_chart_data',
        'pr.assessor_name',
        'pr.assessor_evaluation'
      )
      .first();

    if (!session) throw new Error('Sesi psikotes tidak ditemukan');

    if (session.dimension_scores && typeof session.dimension_scores === 'string') {
      session.dimension_scores = JSON.parse(session.dimension_scores);
    }
    if (session.radar_chart_data && typeof session.radar_chart_data === 'string') {
      session.radar_chart_data = JSON.parse(session.radar_chart_data);
    }

    // Ambil rekap jawaban
    const answers = await db('psychotest_answers as pa')
      .join('psychotest_questions as pq', 'pa.question_id', 'pq.id')
      .join('psychotest_dimensions as pd', 'pq.dimension_id', 'pd.id')
      .where('pa.session_id', id)
      .select(
        'pa.*',
        'pq.question_code',
        'pq.question_text',
        'pd.name as dimension_name'
      );

    session.answers = answers;
    return session;
  }

  async createSession(data) {
    const testType = await db('psychotest_types').where('id', data.test_type_id).first();
    if (!testType) throw new Error('Tipe tes psikologi tidak valid');

    // Generate unique session token code
    const tokenCode = `PSI-${testType.code.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let participantName = data.participant_name;
    let participantEmail = data.participant_email || null;

    if (data.candidate_id) {
      const candidate = await db('recruitment_candidates').where('id', data.candidate_id).first();
      if (candidate) {
        participantName = participantName || candidate.candidate_name;
        participantEmail = participantEmail || candidate.email;
      }
    } else if (data.employee_id) {
      const employee = await db('employees').where('id', data.employee_id).first();
      if (employee) {
        participantName = participantName || employee.full_name;
        participantEmail = participantEmail || employee.email;
      }
    }

    const payload = {
      school_unit_id: data.school_unit_id || null,
      test_type_id: data.test_type_id,
      candidate_id: data.candidate_id || null,
      employee_id: data.employee_id || null,
      participant_name: participantName || 'Peserta Psikotes',
      participant_email: participantEmail,
      session_code: tokenCode,
      status: 'scheduled',
      scheduled_at: data.scheduled_at || db.fn.now(),
      duration_minutes: data.duration_minutes || testType.duration_minutes || 30,
      assessor_notes: data.assessor_notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    const [id] = await db('psychotest_sessions').insert(payload);
    return await this.getSessionById(id);
  }

  async deleteSession(id) {
    return await db('psychotest_sessions').where('id', id).del();
  }

  async evaluateSession(id, data) {
    const result = await db('psychotest_results').where('session_id', id).first();
    if (!result) throw new Error('Hasil skor psikotes belum tersedia untuk sesi ini');

    await db('psychotest_results').where('id', result.id).update({
      assessor_name: data.assessor_name || 'HRD Evaluator',
      assessor_evaluation: data.assessor_evaluation,
      ...(data.hrd_recommendation && { hrd_recommendation: data.hrd_recommendation }),
      updated_at: db.fn.now()
    });

    return await this.getSessionById(id);
  }

  async getReportsSummary() {
    const totalSessions = await db('psychotest_sessions').count('id as count').first();
    const completedSessions = await db('psychotest_sessions').where('status', 'completed').count('id as count').first();

    const mbtiDist = await db('psychotest_results as pr')
      .join('psychotest_types as pt', 'pr.test_type_id', 'pt.id')
      .where('pt.code', 'mbti')
      .select('pr.result_code', db.raw('COUNT(pr.id) as count'))
      .groupBy('pr.result_code')
      .orderBy('count', 'desc');

    const totalBigFive = await db('psychotest_results as pr')
      .join('psychotest_types as pt', 'pr.test_type_id', 'pt.id')
      .where('pt.code', 'big_five')
      .count('pr.id as count')
      .first();

    return {
      total_sessions: parseInt(totalSessions ? totalSessions.count : 0, 10),
      completed_sessions: parseInt(completedSessions ? completedSessions.count : 0, 10),
      mbti_distribution: mbtiDist,
      big_five_total_assessed: parseInt(totalBigFive ? totalBigFive.count : 0, 10)
    };
  }

  // =========================================================================
  // 3. SELF-SERVICE KARYAWAN & 4. PUBLIK TOKEN (6.3 & 6.4)
  // =========================================================================

  async getTestQuestionsForTaker(session) {
    const questions = await db('psychotest_questions as pq')
      .join('psychotest_dimensions as pd', 'pq.dimension_id', 'pd.id')
      .where('pq.test_type_id', session.test_type_id)
      .where('pq.is_active', true)
      .select(
        'pq.id',
        'pq.question_code',
        'pq.question_text',
        'pq.question_type',
        'pq.option_a_text',
        'pq.option_b_text',
        'pq.order_number',
        'pd.id as dimension_id',
        'pd.name as dimension_name'
      )
      .orderBy('pq.order_number', 'asc');

    // Ambil jawaban yang sudah pernah disimpan (jika ada)
    const existingAnswers = await db('psychotest_answers')
      .where('session_id', session.id)
      .select('question_id', 'selected_option', 'raw_score');

    const answerMap = {};
    existingAnswers.forEach(a => {
      answerMap[a.question_id] = a.selected_option;
    });

    return {
      session_info: {
        id: session.id,
        session_code: session.session_code,
        test_type_name: session.test_type_name,
        participant_name: session.participant_name,
        duration_minutes: session.duration_minutes,
        total_questions: questions.length,
        status: session.status,
        instructions: session.test_instructions || 'Bacalah setiap pernyataan dengan seksama dan pilih opsi yang paling sesuai dengan diri Anda.'
      },
      questions: questions.map(q => ({
        ...q,
        saved_answer: answerMap[q.id] || null
      }))
    };
  }

  async saveAnswer(sessionId, questionId, selectedOption, responseTimeSeconds = 0) {
    const question = await db('psychotest_questions').where('id', questionId).first();
    if (!question) throw new Error('Butir soal tidak ditemukan');

    let rawScore = 0;
    let selectedPole = null;

    if (question.question_type === 'forced_choice') {
      selectedPole = selectedOption === 'A' ? question.option_a_pole : question.option_b_pole;
    } else if (question.question_type === 'likert_5') {
      rawScore = parseFloat(selectedOption) || 3;
    }

    const payload = {
      session_id: sessionId,
      question_id: questionId,
      selected_option: String(selectedOption),
      selected_pole: selectedPole,
      raw_score: rawScore,
      response_time_seconds: responseTimeSeconds || 0,
      updated_at: db.fn.now()
    };

    const existing = await db('psychotest_answers')
      .where({ session_id: sessionId, question_id: questionId })
      .first();

    if (existing) {
      await db('psychotest_answers').where('id', existing.id).update(payload);
    } else {
      payload.created_at = db.fn.now();
      await db('psychotest_answers').insert(payload);
    }

    // Update status session jadi in_progress jika baru mulai
    await db('psychotest_sessions')
      .where('id', sessionId)
      .where('status', 'scheduled')
      .update({
        status: 'in_progress',
        started_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    return { question_id: questionId, selected_option: selectedOption, status: 'saved' };
  }

  async saveBatchAnswers(sessionId, answersArray = []) {
    for (const item of answersArray) {
      await this.saveAnswer(sessionId, item.question_id, item.selected_option, item.response_time_seconds || 0);
    }
    return { count: answersArray.length, status: 'all_saved' };
  }

  async submitAndScoreSession(sessionId) {
    return await scoringService.calculateAndSaveResult(sessionId);
  }
}

module.exports = new PsychotestService();
