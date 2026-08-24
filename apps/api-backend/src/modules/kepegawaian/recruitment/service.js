/**
 * Recruitment Service Implementation (Expanded & Full Lifecycle)
 * Modul Kepegawaian - Fitur 1.6: Rekrutmen & Onboarding Pegawai Lengkap
 */
const db = require('../../../config/db/kepegawaian');
const usersService = require('../../core/users/service');
const schoolUnitsService = require('../../core/school-units/service');

const VALID_STAGES = [
  'applied',
  'screening',
  'interview',
  'psychological_test',
  'microteaching',
  'offering',
  'accepted',
  'rejected'
];

class RecruitmentService {
  /**
   * Mengambil daftar kandidat dengan filter & pagination
   */
  async listCandidates(query = {}) {
    let baseQuery = db('recruitment_candidates');

    if (query.selection_stage) {
      baseQuery = baseQuery.where('selection_stage', query.selection_stage);
    }

    if (query.school_unit_id) {
      baseQuery = baseQuery.where('school_unit_id', query.school_unit_id);
    }

    if (query.search) {
      const s = `%${query.search}%`;
      baseQuery = baseQuery.where((builder) => {
        builder.where('candidate_name', 'like', s)
          .orWhere('applied_position', 'like', s)
          .orWhere('email', 'like', s)
          .orWhere('phone_number', 'like', s);
      });
    }

    const candidates = await baseQuery.orderBy('id', 'desc');

    // Parse JSON fields untuk tiap kandidat
    return candidates.map(c => this._formatCandidate(c));
  }

  /**
   * Detail kandidat beserta seluruh riwayat tahapan, tes, wawancara, dan microteaching
   */
  async getCandidateById(id) {
    const candidate = await db('recruitment_candidates').where({ id }).first();
    if (!candidate) {
      const error = new Error('Kandidat rekrutmen tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const [stages, interviews, testResults, microteachings] = await Promise.all([
      db('recruitment_stage_histories').where({ candidate_id: id }).orderBy('id', 'desc'),
      db('recruitment_interview_evaluations').where({ candidate_id: id }).orderBy('id', 'desc'),
      db('recruitment_test_results')
        .leftJoin('recruitment_test_instruments', 'recruitment_test_results.instrument_id', 'recruitment_test_instruments.id')
        .select(
          'recruitment_test_results.*',
          'recruitment_test_instruments.title as instrument_title',
          'recruitment_test_instruments.test_type',
          'recruitment_test_instruments.passing_score'
        )
        .where({ candidate_id: id })
        .orderBy('recruitment_test_results.id', 'desc'),
      db('recruitment_microteaching_evaluations').where({ candidate_id: id }).orderBy('id', 'desc'),
    ]);

    const formatted = this._formatCandidate(candidate);
    formatted.stage_histories = stages;
    formatted.interviews = interviews.map(i => ({
      ...i,
      questions_answers: typeof i.questions_answers === 'string' ? JSON.parse(i.questions_answers || '[]') : (i.questions_answers || [])
    }));
    formatted.test_results = testResults.map(t => ({
      ...t,
      answers: typeof t.answers === 'string' ? JSON.parse(t.answers || '[]') : (t.answers || [])
    }));
    formatted.microteachings = microteachings;

    return formatted;
  }

  /**
   * Pendaftaran pelamar / kandidat baru
   */
  async createCandidate(payload) {
    const {
      school_unit_id,
      candidate_name,
      applied_position,
      email,
      phone_number,
      last_education,
      skills,
      work_experiences,
      documents,
      notes,
      selection_stage,
      assessor_name
    } = payload;

    if (!candidate_name || !applied_position) {
      const error = new Error('Field candidate_name dan applied_position wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    if (school_unit_id) {
      try {
        await schoolUnitsService.getSchoolUnitById(school_unit_id);
      } catch (e) {
        const error = new Error(`Satuan Pendidikan ID ${school_unit_id} tidak valid`);
        error.statusCode = 422;
        throw error;
      }
    }

    const stage = selection_stage || 'applied';
    if (!VALID_STAGES.includes(stage)) {
      const error = new Error(`selection_stage tidak valid. Pilihan: ${VALID_STAGES.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('recruitment_candidates').insert({
      school_unit_id: school_unit_id || null,
      candidate_name: candidate_name.trim(),
      applied_position: applied_position.trim(),
      email: email ? email.trim() : null,
      phone_number: phone_number ? phone_number.trim() : null,
      last_education: last_education ? last_education.trim() : null,
      skills: typeof skills === 'object' ? JSON.stringify(skills) : (skills || null),
      work_experiences: typeof work_experiences === 'object' ? JSON.stringify(work_experiences) : (work_experiences || null),
      documents: typeof documents === 'object' ? JSON.stringify(documents) : (documents || null),
      notes: notes || null,
      selection_stage: stage,
      activated_employee_id: null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Catat riwayat tahap awal
    await db('recruitment_stage_histories').insert({
      candidate_id: id,
      stage: stage,
      status: 'in_progress',
      notes: notes || 'Pendaftaran awal berkas lamaran kandidat',
      assessor_name: assessor_name || 'HRD Rekrutmen',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getCandidateById(id);
  }

  /**
   * Update data profil kandidat
   */
  async updateCandidate(id, payload) {
    await this.getCandidateById(id);

    const updateData = {
      updated_at: db.fn.now()
    };

    if (payload.candidate_name) updateData.candidate_name = payload.candidate_name.trim();
    if (payload.applied_position) updateData.applied_position = payload.applied_position.trim();
    if (payload.school_unit_id !== undefined) updateData.school_unit_id = payload.school_unit_id || null;
    if (payload.email !== undefined) updateData.email = payload.email ? payload.email.trim() : null;
    if (payload.phone_number !== undefined) updateData.phone_number = payload.phone_number ? payload.phone_number.trim() : null;
    if (payload.last_education !== undefined) updateData.last_education = payload.last_education ? payload.last_education.trim() : null;
    if (payload.skills !== undefined) updateData.skills = typeof payload.skills === 'object' ? JSON.stringify(payload.skills) : payload.skills;
    if (payload.work_experiences !== undefined) updateData.work_experiences = typeof payload.work_experiences === 'object' ? JSON.stringify(payload.work_experiences) : payload.work_experiences;
    if (payload.documents !== undefined) updateData.documents = typeof payload.documents === 'object' ? JSON.stringify(payload.documents) : payload.documents;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    await db('recruitment_candidates').where({ id }).update(updateData);
    return this.getCandidateById(id);
  }

  /**
   * Hapus kandidat
   */
  async deleteCandidate(id) {
    await this.getCandidateById(id);
    await db('recruitment_candidates').where({ id }).delete();
    return { message: `Kandidat ID ${id} berhasil dihapus` };
  }

  /**
   * Update / Pindah Tahapan Seleksi Kandidat (dengan catatan dan status)
   */
  async updateStage(id, payload) {
    const candidate = await this.getCandidateById(id);

    const selectionStage = typeof payload === 'string' ? payload : payload.selection_stage;
    const notes = typeof payload === 'object' ? payload.notes : null;
    const status = typeof payload === 'object' ? (payload.status || 'in_progress') : 'in_progress';
    const assessorName = typeof payload === 'object' ? (payload.assessor_name || 'Tim Seleksi') : 'Tim Seleksi';

    if (!VALID_STAGES.includes(selectionStage)) {
      const error = new Error(`selection_stage harus salah satu dari: ${VALID_STAGES.join(', ')}`);
      error.statusCode = 422;
      throw error;
    }

    await db('recruitment_candidates').where({ id }).update({
      selection_stage: selectionStage,
      updated_at: db.fn.now()
    });

    // Masukkan ke log riwayat tahapan
    await db('recruitment_stage_histories').insert({
      candidate_id: id,
      stage: selectionStage,
      status: status,
      notes: notes || `Transisi ke tahapan ${selectionStage}`,
      assessor_name: assessorName,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getCandidateById(id);
  }

  /**
   * Tambah catatan riwayat tahapan secara manual
   */
  async addStageHistory(candidateId, payload) {
    await this.getCandidateById(candidateId);
    const { stage, status, notes, assessor_name } = payload;

    const [id] = await db('recruitment_stage_histories').insert({
      candidate_id: candidateId,
      stage: stage || 'screening',
      status: status || 'passed',
      notes: notes || null,
      assessor_name: assessor_name || 'Pewawancara / Penilai',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('recruitment_stage_histories').where({ id }).first();
  }

  // ==========================================
  // WAWANCARA (INTERVIEW EVALUATIONS)
  // ==========================================

  async addInterviewEvaluation(candidateId, payload) {
    await this.getCandidateById(candidateId);
    const {
      interviewer_name,
      interview_date,
      questions_answers,
      overall_score,
      recommendation,
      notes
    } = payload;

    if (!interviewer_name || !interview_date) {
      const error = new Error('Field interviewer_name dan interview_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // Hitung rata-rata skor pertanyaan jika ada
    let computedScore = overall_score !== undefined ? Number(overall_score) : 0;
    if (Array.isArray(questions_answers) && questions_answers.length > 0 && overall_score === undefined) {
      const total = questions_answers.reduce((acc, q) => acc + (Number(q.score) || 0), 0);
      computedScore = Number((total / questions_answers.length).toFixed(2));
    }

    const [id] = await db('recruitment_interview_evaluations').insert({
      candidate_id: candidateId,
      interviewer_name: interviewer_name.trim(),
      interview_date: interview_date,
      questions_answers: JSON.stringify(questions_answers || []),
      overall_score: computedScore,
      recommendation: recommendation || 'recommended',
      notes: notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Otomatis log ke riwayat tahapan interview
    await db('recruitment_stage_histories').insert({
      candidate_id: candidateId,
      stage: 'interview',
      status: recommendation === 'rejected' ? 'failed' : 'passed',
      notes: `Evaluasi wawancara oleh ${interviewer_name} (Skor: ${computedScore}, Rekomendasi: ${recommendation})`,
      assessor_name: interviewer_name,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('recruitment_interview_evaluations').where({ id }).first();
  }

  async deleteInterviewEvaluation(interviewId) {
    await db('recruitment_interview_evaluations').where({ id: interviewId }).delete();
    return { message: 'Evaluasi wawancara berhasil dihapus' };
  }

  // ==========================================
  // BANK INSTRUMEN SOAL TES PSIKOTES, WAWANCARA & MICROTEACHING
  // ==========================================

  async listTestInstruments(query = {}) {
    let baseQuery = db('recruitment_test_instruments');

    if (query.test_type) {
      baseQuery = baseQuery.where('test_type', query.test_type);
    }
    if (query.school_unit_id) {
      baseQuery = baseQuery.where('school_unit_id', query.school_unit_id);
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', query.is_active === 'true' || query.is_active === true);
    }

    const items = await baseQuery.orderBy('id', 'desc');
    const result = [];
    for (const inst of items) {
      const usageRes = await db('recruitment_test_results').where({ instrument_id: inst.id }).count('id as count').first();
      const usageCount = Number(usageRes?.count || 0);
      result.push({
        ...inst,
        is_active: Boolean(inst.is_active),
        usage_count: usageCount,
        questions: typeof inst.questions === 'string' ? JSON.parse(inst.questions || '[]') : (inst.questions || [])
      });
    }
    return result;
  }

  async getTestInstrumentById(id) {
    const inst = await db('recruitment_test_instruments').where({ id }).first();
    if (!inst) {
      const error = new Error('Instrumen tes tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    const usageRes = await db('recruitment_test_results').where({ instrument_id: inst.id }).count('id as count').first();
    const usageCount = Number(usageRes?.count || 0);
    return {
      ...inst,
      is_active: Boolean(inst.is_active),
      usage_count: usageCount,
      questions: typeof inst.questions === 'string' ? JSON.parse(inst.questions || '[]') : (inst.questions || [])
    };
  }

  async createTestInstrument(payload) {
    const {
      school_unit_id,
      title,
      test_type,
      description,
      duration_minutes,
      passing_score,
      questions,
      is_active
    } = payload;

    if (!title || !test_type) {
      const error = new Error('Field title dan test_type wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('recruitment_test_instruments').insert({
      school_unit_id: school_unit_id || null,
      title: title.trim(),
      test_type: test_type.trim(),
      description: description || null,
      duration_minutes: duration_minutes || 30,
      passing_score: passing_score !== undefined ? Number(passing_score) : 70.0,
      questions: JSON.stringify(questions || []),
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return this.getTestInstrumentById(id);
  }

  async updateTestInstrument(id, payload) {
    await this.getTestInstrumentById(id);

    const updateData = {
      updated_at: db.fn.now()
    };

    if (payload.title) updateData.title = payload.title.trim();
    if (payload.test_type) updateData.test_type = payload.test_type.trim();
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.duration_minutes !== undefined) updateData.duration_minutes = Number(payload.duration_minutes);
    if (payload.passing_score !== undefined) updateData.passing_score = Number(payload.passing_score);
    if (payload.questions !== undefined) updateData.questions = JSON.stringify(payload.questions);
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active ? 1 : 0;

    await db('recruitment_test_instruments').where({ id }).update(updateData);
    return this.getTestInstrumentById(id);
  }

  async deleteTestInstrument(id) {
    await this.getTestInstrumentById(id);
    const usageRes = await db('recruitment_test_results').where({ instrument_id: id }).count('id as count').first();
    const usageCount = Number(usageRes?.count || 0);
    if (usageCount > 0) {
      const error = new Error(`Paket instrumen/soal ID ${id} tidak dapat dihapus karena sudah pernah dipakai dalam ${usageCount} sesi penilaian pelamar. Anda dapat menonaktifkan statusnya.`);
      error.statusCode = 400;
      throw error;
    }
    await db('recruitment_test_instruments').where({ id }).delete();
    return { message: `Instrumen tes ID ${id} berhasil dihapus` };
  }

  // ==========================================
  // HASIL TES PSIKOTES (KOREKSI & NILAI OTOMATIS)
  // ==========================================

  async submitTestResult(candidateId, payload) {
    await this.getCandidateById(candidateId);
    const { instrument_id, answers, notes, assessor_name } = payload;

    if (!instrument_id) {
      const error = new Error('Field instrument_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const instrument = await this.getTestInstrumentById(instrument_id);
    const questions = instrument.questions || [];

    // Perhitungan nilai otomatis berdasarkan jawaban dan kunci/bobot
    let totalScore = 0;
    let maxPossibleScore = 0;
    const evaluatedAnswers = (answers || []).map((ans) => {
      const q = questions.find(item => item.id == ans.question_id || item.id === ans.question_id);
      let isCorrect = false;
      let scoreEarned = 0;
      const weight = q?.score_weight ? Number(q.score_weight) : 10;
      maxPossibleScore += weight;

      if (q && q.correct_option !== undefined) {
        isCorrect = String(ans.selected_option).trim().toLowerCase() === String(q.correct_option).trim().toLowerCase();
        scoreEarned = isCorrect ? weight : 0;
      } else if (ans.score !== undefined) {
        scoreEarned = Number(ans.score) || 0;
      }

      totalScore += scoreEarned;

      return {
        question_id: ans.question_id,
        question_text: q?.question || '',
        selected_option: ans.selected_option,
        is_correct: isCorrect,
        score: scoreEarned
      };
    });

    // Skala normalisasi jika bobot terdefinisi
    const finalScore = maxPossibleScore > 0 ? Number(((totalScore / maxPossibleScore) * 100).toFixed(2)) : totalScore;
    const isPassed = finalScore >= Number(instrument.passing_score);
    const status = isPassed ? 'passed' : 'failed';

    const [id] = await db('recruitment_test_results').insert({
      candidate_id: candidateId,
      instrument_id: instrument_id,
      answers: JSON.stringify(evaluatedAnswers),
      total_score: finalScore,
      status: status,
      notes: notes || `Tes ${instrument.title} selesai dengan skor ${finalScore}/${maxPossibleScore > 0 ? 100 : maxPossibleScore}`,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Otomatis log ke riwayat tahapan psychological_test
    await db('recruitment_stage_histories').insert({
      candidate_id: candidateId,
      stage: 'psychological_test',
      status: status,
      notes: `Hasil ${instrument.title}: Skor ${finalScore} (Passing: ${instrument.passing_score}) -> ${status.toUpperCase()}`,
      assessor_name: assessor_name || 'Sistem Evaluasi Psikotes Otomatis',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('recruitment_test_results').where({ id }).first();
  }

  // ==========================================
  // MICROTEACHING EVALUATIONS (KHUSUS GURU)
  // ==========================================

  async addMicroteachingEvaluation(candidateId, payload) {
    await this.getCandidateById(candidateId);
    const {
      evaluator_name,
      subject_topic,
      teaching_date,
      mastery_score,
      methodology_score,
      classroom_management_score,
      media_tech_score,
      communication_score,
      recommendation,
      evaluator_notes
    } = payload;

    if (!evaluator_name || !subject_topic || !teaching_date) {
      const error = new Error('Field evaluator_name, subject_topic, dan teaching_date wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const s1 = Number(mastery_score) || 0;
    const s2 = Number(methodology_score) || 0;
    const s3 = Number(classroom_management_score) || 0;
    const s4 = Number(media_tech_score) || 0;
    const s5 = Number(communication_score) || 0;

    // Rata-rata 5 aspek microteaching
    const finalScore = Number(((s1 + s2 + s3 + s4 + s5) / 5).toFixed(2));

    const [id] = await db('recruitment_microteaching_evaluations').insert({
      candidate_id: candidateId,
      evaluator_name: evaluator_name.trim(),
      subject_topic: subject_topic.trim(),
      teaching_date: teaching_date,
      mastery_score: s1,
      methodology_score: s2,
      classroom_management_score: s3,
      media_tech_score: s4,
      communication_score: s5,
      final_score: finalScore,
      recommendation: recommendation || (finalScore >= 75 ? 'recommended' : 'rejected'),
      evaluator_notes: evaluator_notes || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Otomatis log ke riwayat tahapan microteaching
    await db('recruitment_stage_histories').insert({
      candidate_id: candidateId,
      stage: 'microteaching',
      status: finalScore >= 75 ? 'passed' : 'failed',
      notes: `Uji Mengajar (Materi: ${subject_topic}) oleh ${evaluator_name}. Nilai Akhir: ${finalScore}. Rekomendasi: ${recommendation}`,
      assessor_name: evaluator_name,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('recruitment_microteaching_evaluations').where({ id }).first();
  }

  async deleteMicroteachingEvaluation(microteachingId) {
    await db('recruitment_microteaching_evaluations').where({ id: microteachingId }).delete();
    return { message: 'Evaluasi microteaching berhasil dihapus' };
  }

  // ==========================================
  // AKTIVASI PEGAWAI & PROVISIONING SSO
  // ==========================================

  async activateCandidate(id, payload) {
    const candidate = await this.getCandidateById(id);

    if (candidate.activated_employee_id) {
      const error = new Error(`Kandidat ini sudah pernah diaktifkan sebagai pegawai (Employee ID: ${candidate.activated_employee_id})`);
      error.statusCode = 409;
      throw error;
    }

    const {
      employee_number,
      employment_status,
      current_position_id,
      birth_date,
      gender,
      nip,
      nuptk,
      academic_title,
      birth_place,
      religion,
      marital_status,
      address,
      phone_number,
      email,
      photo_url,
      current_rank,
      school_unit_id
    } = payload;

    const targetSchoolUnitId = school_unit_id || candidate.school_unit_id || 1;
    const targetGender = gender || 'male';
    const targetStatus = employment_status || 'gtt';

    if (!employee_number) {
      const error = new Error('employee_number wajib diisi untuk aktivasi pegawai');
      error.statusCode = 422;
      throw error;
    }

    const existingNum = await db('employees').where({ employee_number: employee_number.trim() }).first();
    if (existingNum) {
      const error = new Error('Nomor pegawai sudah digunakan');
      error.statusCode = 409;
      throw error;
    }

    // 1. Buat record pegawai baru di tabel employees
    const [employeeId] = await db('employees').insert({
      school_unit_id: targetSchoolUnitId,
      employee_number: employee_number.trim(),
      nip: nip ? nip.trim() : null,
      nuptk: nuptk ? nuptk.trim() : null,
      full_name: candidate.candidate_name,
      academic_title: academic_title ? academic_title.trim() : null,
      birth_place: birth_place || null,
      birth_date: birth_date || null,
      gender: targetGender,
      religion: religion || null,
      marital_status: marital_status || null,
      address: address || null,
      phone_number: phone_number || candidate.phone_number || null,
      email: email ? email.trim() : (candidate.email || null),
      photo_url: photo_url || null,
      current_position_id: current_position_id || null,
      current_rank: current_rank || null,
      employment_status: targetStatus,
      account_status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 2. Update kandidat dengan ID pegawai yang diaktifkan dan ubah stage ke 'accepted'
    await db('recruitment_candidates').where({ id }).update({
      activated_employee_id: employeeId,
      selection_stage: 'accepted',
      updated_at: db.fn.now()
    });

    // 3. Tambahkan ke riwayat tahapan
    await db('recruitment_stage_histories').insert({
      candidate_id: id,
      stage: 'accepted',
      status: 'passed',
      notes: `Kandidat resmi diaktifkan sebagai pegawai (NIP/NIPD: ${employee_number})`,
      assessor_name: 'Kepala SDM / Yayasan',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // 4. Provisioning akun Core Service in-process
    let coreAccount = null;
    try {
      const generatedUsername = employee_number.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      coreAccount = await usersService.internalCreateUser({
        username: generatedUsername,
        password: 'Password123!',
        full_name: candidate.candidate_name,
        account_type: 'staff',
        ref_type: 'staff',
        ref_id: employeeId,
        school_unit_id: targetSchoolUnitId,
        role_id: 3 // Default staff
      });
    } catch (err) {
      console.warn(`[Core Provisioning Warning] Gagal membuat akun Core untuk kandidat aktivasi ${employeeId}:`, err.message);
    }

    return {
      employee_id: employeeId,
      core_account_provisioned: !!coreAccount,
      core_username: coreAccount ? coreAccount.username : null
    };
  }

  // ==========================================
  // HELPER FORMATTING
  // ==========================================
  _formatCandidate(c) {
    return {
      ...c,
      skills: typeof c.skills === 'string' ? JSON.parse(c.skills || '[]') : (c.skills || []),
      work_experiences: typeof c.work_experiences === 'string' ? JSON.parse(c.work_experiences || '[]') : (c.work_experiences || []),
      documents: typeof c.documents === 'string' ? JSON.parse(c.documents || '[]') : (c.documents || [])
    };
  }
}

module.exports = new RecruitmentService();
