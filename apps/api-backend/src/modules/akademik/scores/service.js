/**
 * Scores Service Implementation
 * Modul Akademik - Fitur 3: Penilaian (Assessment Types, Sessions, Scores & Report Card Processor)
 */
const db = require('../../../config/db/akademik');

class ScoresService {
  // ==========================================
  // 1. Jenis Pengujian & Bobot Nilai Rapor (Assessment Types)
  // ==========================================
  async listAssessmentTypes(query = {}) {
    let baseQuery = db('assessment_types');
    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.category) {
      baseQuery = baseQuery.where('category', query.category);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where((q) => {
        q.where('academic_year_id', query.academic_year_id).orWhereNull('academic_year_id');
      });
    }
    if (query.is_active !== undefined) {
      baseQuery = baseQuery.where('is_active', query.is_active === 'true' || query.is_active === true || query.is_active === 1);
    }

    const rows = await baseQuery.orderBy('order_index', 'asc').orderBy('id', 'asc');
    return rows.map(r => ({
      ...r,
      weight_percentage: parseFloat(r.weight_percentage) || 0,
      is_tp_based: Boolean(r.is_tp_based),
      is_active: Boolean(r.is_active)
    }));
  }

  async createAssessmentType(payload) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      category,
      name,
      code,
      description,
      weight_percentage,
      is_tp_based,
      order_index
    } = payload;

    if (!satuan_pendidikan_id || !name || !code) {
      const error = new Error('Field satuan_pendidikan_id, name, dan code wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('assessment_types').insert({
      satuan_pendidikan_id: Number(satuan_pendidikan_id),
      academic_year_id: academic_year_id ? Number(academic_year_id) : null,
      category: category || 'mapel',
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : null,
      weight_percentage: weight_percentage !== undefined ? parseFloat(weight_percentage) : 0,
      is_tp_based: is_tp_based !== undefined ? Boolean(is_tp_based) : true,
      order_index: order_index ? parseInt(order_index, 10) : 1,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('assessment_types').where({ id }).first();
  }

  async updateAssessmentType(id, payload) {
    const existing = await db('assessment_types').where({ id }).first();
    if (!existing) {
      const error = new Error('Jenis pengujian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.code !== undefined) updateData.code = payload.code.trim().toUpperCase();
    if (payload.description !== undefined) updateData.description = payload.description ? payload.description.trim() : null;
    if (payload.weight_percentage !== undefined) updateData.weight_percentage = parseFloat(payload.weight_percentage);
    if (payload.is_tp_based !== undefined) updateData.is_tp_based = Boolean(payload.is_tp_based);
    if (payload.order_index !== undefined) updateData.order_index = parseInt(payload.order_index, 10);
    if (payload.is_active !== undefined) updateData.is_active = Boolean(payload.is_active);

    await db('assessment_types').where({ id }).update(updateData);
    return db('assessment_types').where({ id }).first();
  }

  async deleteAssessmentType(id) {
    const existing = await db('assessment_types').where({ id }).first();
    if (!existing) {
      const error = new Error('Jenis pengujian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Hapus sesi terkait
    const sessions = await db('assessment_sessions').where({ assessment_type_id: id }).select('id');
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length > 0) {
      await db('assessment_session_scores').whereIn('assessment_session_id', sessionIds).del();
      await db('assessment_sessions').whereIn('id', sessionIds).del();
    }

    await db('assessment_types').where({ id }).del();
    return { success: true, message: 'Jenis pengujian berhasil dihapus' };
  }

  // ==========================================
  // 2. Sesi / Pelaksanaan Penilaian (Assessment Sessions)
  // ==========================================
  async listAssessmentSessions(query = {}) {
    let baseQuery = db('assessment_sessions')
      .join('assessment_types', 'assessment_sessions.assessment_type_id', 'assessment_types.id')
      .join('class_groups', 'assessment_sessions.class_group_id', 'class_groups.id')
      .leftJoin('subjects', 'assessment_sessions.subject_id', 'subjects.id')
      .leftJoin('extracurriculars', 'assessment_sessions.extracurricular_id', 'extracurriculars.id')
      .join('semesters', 'assessment_sessions.semester_id', 'semesters.id')
      .select(
        'assessment_sessions.*',
        'assessment_types.name as assessment_type_name',
        'assessment_types.code as assessment_type_code',
        'assessment_types.weight_percentage as assessment_type_weight',
        'assessment_types.is_tp_based as assessment_type_is_tp_based',
        'class_groups.name as class_group_name',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'extracurriculars.name as extracurricular_name',
        'semesters.name as semester_name'
      );

    if (query.satuan_pendidikan_id) {
      baseQuery = baseQuery.where('assessment_sessions.satuan_pendidikan_id', query.satuan_pendidikan_id);
    }
    if (query.academic_year_id) {
      baseQuery = baseQuery.where('assessment_sessions.academic_year_id', query.academic_year_id);
    }
    if (query.semester_id) {
      baseQuery = baseQuery.where('assessment_sessions.semester_id', query.semester_id);
    }
    if (query.class_group_id) {
      baseQuery = baseQuery.where('assessment_sessions.class_group_id', query.class_group_id);
    }
    if (query.subject_id) {
      baseQuery = baseQuery.where('assessment_sessions.subject_id', query.subject_id);
    }
    if (query.extracurricular_id) {
      baseQuery = baseQuery.where('assessment_sessions.extracurricular_id', query.extracurricular_id);
    }
    if (query.assessment_type_id) {
      baseQuery = baseQuery.where('assessment_sessions.assessment_type_id', query.assessment_type_id);
    }

    const rows = await baseQuery.orderBy('assessment_sessions.assessment_date', 'desc').orderBy('assessment_sessions.id', 'desc');

    // Parse learning_objective_ids dan hitung total siswa yang dinilai
    return Promise.all(rows.map(async (r) => {
      let tpIds = [];
      try {
        tpIds = r.learning_objective_ids ? JSON.parse(r.learning_objective_ids) : [];
      } catch (e) {
        tpIds = [];
      }

      // Ambil ringkasan TP
      let tpDetails = [];
      if (tpIds.length > 0) {
        tpDetails = await db('learning_objectives')
          .whereIn('id', tpIds)
          .select('id', 'code', 'description', 'order_index');
      }

      const scoreStats = await db('assessment_session_scores')
        .where({ assessment_session_id: r.id })
        .countDistinct('student_id as scored_students_count')
        .avg('score as average_score')
        .first();

      return {
        ...r,
        learning_objective_ids: tpIds,
        learning_objectives: tpDetails,
        max_score: parseFloat(r.max_score) || 100,
        scored_students_count: Number(scoreStats?.scored_students_count || 0),
        average_score: scoreStats?.average_score ? parseFloat(Number(scoreStats.average_score).toFixed(2)) : null
      };
    }));
  }

  async createAssessmentSession(payload, user = null) {
    const {
      satuan_pendidikan_id,
      academic_year_id,
      semester_id,
      class_group_id,
      subject_id,
      assessment_type_id,
      title,
      assessment_date,
      learning_objective_ids,
      max_score,
      notes,
      teacher_employee_id
    } = payload;

    if (!satuan_pendidikan_id || !academic_year_id || !semester_id || !class_group_id || (!subject_id && !payload.extracurricular_id) || !assessment_type_id || !title) {
      const error = new Error('Field satuan_pendidikan_id, academic_year_id, semester_id, class_group_id, subject_id / extracurricular_id, assessment_type_id, dan title wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const teacherId = teacher_employee_id || (user?.ref_type === 'staff' ? user.ref_id : null);
    const dateVal = assessment_date || new Date().toISOString().split('T')[0];
    const tpIdsStr = Array.isArray(learning_objective_ids) ? JSON.stringify(learning_objective_ids) : (learning_objective_ids || '[]');

    const [id] = await db('assessment_sessions').insert({
      satuan_pendidikan_id: Number(satuan_pendidikan_id),
      academic_year_id: Number(academic_year_id),
      semester_id: Number(semester_id),
      class_group_id: Number(class_group_id),
      subject_id: subject_id ? Number(subject_id) : null,
      extracurricular_id: payload.extracurricular_id ? Number(payload.extracurricular_id) : null,
      assessment_type_id: Number(assessment_type_id),
      title: title.trim(),
      assessment_date: dateVal,
      learning_objective_ids: tpIdsStr,
      max_score: max_score !== undefined ? parseFloat(max_score) : 100,
      notes: notes ? notes.trim() : null,
      teacher_employee_id: teacherId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('assessment_sessions').where({ id }).first();
  }

  async updateAssessmentSession(id, payload) {
    const existing = await db('assessment_sessions').where({ id }).first();
    if (!existing) {
      const error = new Error('Sesi penilaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = { updated_at: db.fn.now() };
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.assessment_date !== undefined) updateData.assessment_date = payload.assessment_date;
    if (payload.assessment_type_id !== undefined) updateData.assessment_type_id = Number(payload.assessment_type_id);
    if (payload.subject_id !== undefined) updateData.subject_id = payload.subject_id ? Number(payload.subject_id) : null;
    if (payload.extracurricular_id !== undefined) updateData.extracurricular_id = payload.extracurricular_id ? Number(payload.extracurricular_id) : null;
    if (payload.learning_objective_ids !== undefined) {
      updateData.learning_objective_ids = Array.isArray(payload.learning_objective_ids)
        ? JSON.stringify(payload.learning_objective_ids)
        : payload.learning_objective_ids;
    }
    if (payload.max_score !== undefined) updateData.max_score = parseFloat(payload.max_score);
    if (payload.notes !== undefined) updateData.notes = payload.notes ? payload.notes.trim() : null;

    await db('assessment_sessions').where({ id }).update(updateData);
    return db('assessment_sessions').where({ id }).first();
  }

  async deleteAssessmentSession(id) {
    const existing = await db('assessment_sessions').where({ id }).first();
    if (!existing) {
      const error = new Error('Sesi penilaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('assessment_session_scores').where({ assessment_session_id: id }).del();
    await db('assessment_sessions').where({ id }).del();
    return { success: true, message: 'Sesi penilaian berhasil dihapus' };
  }

  // ==========================================
  // 3. Input Nilai per Sesi (Session Scores)
  // ==========================================
  async getSessionScores(sessionId) {
    const session = await db('assessment_sessions')
      .join('assessment_types', 'assessment_sessions.assessment_type_id', 'assessment_types.id')
      .where({ 'assessment_sessions.id': sessionId })
      .select(
        'assessment_sessions.*',
        'assessment_types.name as assessment_type_name',
        'assessment_types.code as assessment_type_code',
        'assessment_types.is_tp_based'
      )
      .first();

    if (!session) {
      const error = new Error('Sesi penilaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Ambil daftar siswa di rombel ini
    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({
        'student_class_enrollments.class_group_id': session.class_group_id
      })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    // Ambil nilai yang sudah ada di sesi ini
    const existingScores = await db('assessment_session_scores')
      .where({ assessment_session_id: sessionId });

    // TP yang diujikan
    let tpIds = [];
    try {
      tpIds = session.learning_objective_ids ? JSON.parse(session.learning_objective_ids) : [];
    } catch (e) {
      tpIds = [];
    }

    let tpDetails = [];
    if (tpIds.length > 0) {
      tpDetails = await db('learning_objectives')
        .whereIn('id', tpIds)
        .select('id', 'code', 'description')
        .orderBy('order_index', 'asc');
    }

    // Map nilai per student_id -> { score, feedback, tp_scores: { [tp_id]: score } }
    const studentScoreMap = {};
    for (const sc of existingScores) {
      if (!studentScoreMap[sc.student_id]) {
        studentScoreMap[sc.student_id] = {
          score: sc.score !== null ? parseFloat(sc.score) : null,
          feedback: sc.feedback,
          tp_scores: {}
        };
      }
      if (sc.learning_objective_id) {
        studentScoreMap[sc.student_id].tp_scores[sc.learning_objective_id] = sc.score !== null ? parseFloat(sc.score) : null;
      }
    }

    const formattedStudents = students.map(st => {
      const recorded = studentScoreMap[st.student_id] || { score: null, feedback: '', tp_scores: {} };
      return {
        student_id: st.student_id,
        student_name: st.student_name,
        nis: st.nis,
        nisn: st.nisn,
        gender: st.gender,
        score: recorded.score,
        feedback: recorded.feedback || '',
        tp_scores: recorded.tp_scores
      };
    });

    return {
      session: {
        ...session,
        learning_objective_ids: tpIds,
        learning_objectives: tpDetails,
        max_score: parseFloat(session.max_score) || 100
      },
      students: formattedStudents
    };
  }

  async saveSessionScoresBulk(sessionId, payload, user = null) {
    const session = await db('assessment_sessions').where({ id: sessionId }).first();
    if (!session) {
      const error = new Error('Sesi penilaian tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const { items } = payload;
    if (!Array.isArray(items)) {
      const error = new Error('Field items (array) wajib dikirim');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : 1;

    // Bersihkan nilai lama di sesi ini
    await db('assessment_session_scores').where({ assessment_session_id: sessionId }).del();

    const insertRows = [];
    for (const item of items) {
      if (!item.student_id) continue;

      // Jika ada tp_scores spesifik per TP
      if (item.tp_scores && typeof item.tp_scores === 'object' && Object.keys(item.tp_scores).length > 0) {
        for (const [tpId, tpScoreVal] of Object.entries(item.tp_scores)) {
          if (tpScoreVal !== null && tpScoreVal !== undefined && tpScoreVal !== '') {
            const numScore = parseFloat(tpScoreVal);
            insertRows.push({
              assessment_session_id: sessionId,
              student_id: item.student_id,
              learning_objective_id: Number(tpId),
              score: isNaN(numScore) ? null : numScore,
              feedback: item.feedback || null,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });

            // Sinkronkan juga ke student_tp_scores jika mapel
            if (session.subject_id) {
              const existingTpScore = await db('student_tp_scores')
                .where({
                  student_id: item.student_id,
                  learning_objective_id: Number(tpId),
                  subject_id: session.subject_id,
                  semester_id: session.semester_id
                })
                .first();

              let mastery = 'tercapai';
              if (numScore >= 85) mastery = 'tercapai_optimal';
              else if (numScore >= 75) mastery = 'tercapai';
              else if (numScore >= 60) mastery = 'cukup';
              else mastery = 'perlu_bimbingan';

              if (existingTpScore) {
                await db('student_tp_scores').where({ id: existingTpScore.id }).update({
                  score: numScore,
                  mastery_status: mastery,
                  updated_at: db.fn.now()
                });
              } else {
                await db('student_tp_scores').insert({
                  student_id: item.student_id,
                  learning_objective_id: Number(tpId),
                  subject_id: session.subject_id,
                  semester_id: session.semester_id,
                  score: numScore,
                  mastery_status: mastery,
                  recorded_by_employee_id: reviewerEmployeeId,
                  created_at: db.fn.now(),
                  updated_at: db.fn.now()
                });
              }
            }
          }
        }
      }

      // Simpan juga record skor total sesi jika ada
      if (item.score !== null && item.score !== undefined && item.score !== '') {
        const numScore = parseFloat(item.score);
        insertRows.push({
          assessment_session_id: sessionId,
          student_id: item.student_id,
          learning_objective_id: null,
          score: isNaN(numScore) ? null : numScore,
          feedback: item.feedback || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    if (insertRows.length > 0) {
      await db('assessment_session_scores').insert(insertRows);
    }

    return {
      success: true,
      saved_count: insertRows.length,
      session_id: sessionId
    };
  }

  // ==========================================
  // 4. Rekap Matriks Nilai (Recap Matrix per TP & Assessment Type)
  // ==========================================
  async getRecapMatrix(query = {}) {
    const { class_group_id, subject_id, extracurricular_id, semester_id, satuan_pendidikan_id } = query;
    if (!class_group_id || (!subject_id && !extracurricular_id) || !semester_id) {
      const error = new Error('Field class_group_id, subject_id / extracurricular_id, dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    // 1. Data Siswa
    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({
        'student_class_enrollments.class_group_id': class_group_id
      })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    // 2. Data Tujuan Pembelajaran (TP) pada semester ini (jika Mapel)
    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    let learningObjectives = [];
    if (subject_id) {
      let tpQuery = db('learning_objectives')
        .where({ subject_id, semester_id, is_active: true });
      if (classGroup?.grade_level_id) {
        tpQuery = tpQuery.where('grade_level_id', classGroup.grade_level_id);
      }
      learningObjectives = await tpQuery.orderBy('order_index', 'asc').orderBy('code', 'asc');
    }

    // 3. Data Jenis Pengujian & Bobot
    const schoolUnitId = satuan_pendidikan_id || classGroup?.satuan_pendidikan_id || 1;
    const isEkskulMode = Boolean(extracurricular_id || classGroup?.type === 'ekstrakurikuler');
    let typeQuery = db('assessment_types')
      .where({ satuan_pendidikan_id: schoolUnitId, is_active: true });
    if (isEkskulMode) {
      typeQuery = typeQuery.where('category', 'ekskul');
    } else {
      typeQuery = typeQuery.where((q) => {
        q.where('category', 'mapel').orWhereNull('category');
      });
    }
    let assessmentTypes = await typeQuery.orderBy('order_index', 'asc');
    if (assessmentTypes.length === 0 && isEkskulMode) {
      assessmentTypes = await db('assessment_types').where({ satuan_pendidikan_id: schoolUnitId, is_active: true }).orderBy('order_index', 'asc');
    }

    // 4. Data Sesi Penilaian
    let sessionQuery = db('assessment_sessions')
      .where({ class_group_id, semester_id });
    if (subject_id) {
      sessionQuery = sessionQuery.where('subject_id', subject_id);
    } else if (extracurricular_id) {
      sessionQuery = sessionQuery.where('extracurricular_id', extracurricular_id);
    }
    const sessions = await sessionQuery.orderBy('assessment_date', 'asc');

    // 5. Data Skor Sesi
    const sessionIds = sessions.map(s => s.id);
    const sessionScores = sessionIds.length > 0
      ? await db('assessment_session_scores').whereIn('assessment_session_id', sessionIds)
      : [];

    // 6. Data Skor TP tersimpan
    const storedTpScores = subject_id
      ? await db('student_tp_scores').where({ subject_id, semester_id })
      : [];

    // 7. Data Nilai Akhir tersimpan
    const storedStudentScores = subject_id
      ? await db('student_scores').where({ subject_id, semester_id })
      : await db('student_extracurricular_scores').where({ extracurricular_id, semester_id });

    // KKM Aktif
    let targetKkm = 75;
    if (subject_id && classGroup?.grade_level_id && classGroup?.academic_year_id) {
      const kkmRecord = await db('subject_grade_kkms')
        .where({
          subject_id,
          grade_level_id: classGroup.grade_level_id,
          academic_year_id: classGroup.academic_year_id
        })
        .first();
      if (kkmRecord) targetKkm = parseFloat(kkmRecord.kkm) || 75;
    }

    // Bangun Matriks Nilai
    const matrix = {};
    for (const student of students) {
      const sId = student.student_id;

      // A. Hitung Rata-Rata per TP
      const tpAverages = {};
      for (const tp of learningObjectives) {
        // Cari dari sesi ujian yang menguji TP ini
        const relevantScores = sessionScores.filter(sc => sc.student_id === sId && sc.learning_objective_id === tp.id && sc.score !== null);
        if (relevantScores.length > 0) {
          const avg = relevantScores.reduce((acc, curr) => acc + parseFloat(curr.score), 0) / relevantScores.length;
          tpAverages[tp.id] = parseFloat(avg.toFixed(2));
        } else {
          // Cari fallback di storedTpScores
          const fallback = storedTpScores.find(st => st.student_id === sId && st.learning_objective_id === tp.id);
          tpAverages[tp.id] = fallback?.score !== null && fallback?.score !== undefined ? parseFloat(fallback.score) : null;
        }
      }

      // B. Hitung Rata-Rata per Jenis Pengujian
      const typeAverages = {};
      for (const type of assessmentTypes) {
        const typeSessions = sessions.filter(s => s.assessment_type_id === type.id);
        const typeSessionIds = new Set(typeSessions.map(s => s.id));

        const scoresForType = sessionScores.filter(sc => sc.student_id === sId && typeSessionIds.has(sc.assessment_session_id) && sc.score !== null);

        if (scoresForType.length > 0) {
          const avg = scoresForType.reduce((acc, curr) => acc + parseFloat(curr.score), 0) / scoresForType.length;
          typeAverages[type.id] = parseFloat(avg.toFixed(2));
        } else if (type.is_tp_based) {
          // Jika TP-based dan tidak ada sesi terpisah, rata-ratakan nilai TP yang ada
          const validTpVals = Object.values(tpAverages).filter(v => v !== null && !isNaN(v));
          if (validTpVals.length > 0) {
            typeAverages[type.id] = parseFloat((validTpVals.reduce((a, b) => a + b, 0) / validTpVals.length).toFixed(2));
          } else {
            typeAverages[type.id] = null;
          }
        } else {
          // Fallback dari student_scores berdasarkan kode/tipe
          const fallbackScore = storedStudentScores.find(sc => sc.student_id === sId && sc.score_type?.toLowerCase() === type.code.toLowerCase());
          typeAverages[type.id] = fallbackScore?.score !== null && fallbackScore?.score !== undefined ? parseFloat(fallbackScore.score) : null;
        }
      }

      // C. Hitung Estimasi Nilai Akhir Rapor & Nilai Tersimpan
      let totalWeighted = 0;
      let totalWeightUsed = 0;
      for (const type of assessmentTypes) {
        const val = typeAverages[type.id];
        const weight = parseFloat(type.weight_percentage) || 0;
        if (val !== null && val !== undefined && !isNaN(val)) {
          totalWeighted += (val * weight);
          totalWeightUsed += weight;
        }
      }

      const calculatedFinal = totalWeightUsed > 0
        ? parseFloat((totalWeighted / (totalWeightUsed > 0 ? (totalWeightUsed === 100 ? 100 : totalWeightUsed) : 100)).toFixed(2))
        : null;

      // Nilai Rapor Tersimpan (jika sudah diproses sebelumnya)
      const storedFinal = storedStudentScores.find(sc => sc.student_id === sId && sc.score_type === 'nilai_akhir');

      matrix[sId] = {
        tp_averages: tpAverages,
        type_averages: typeAverages,
        calculated_final: calculatedFinal,
        stored_final: storedFinal?.score !== null && storedFinal?.score !== undefined ? parseFloat(storedFinal.score) : null,
        competency_description: storedFinal?.competency_description || null
      };
    }

    return {
      class_group: classGroup,
      kkm: targetKkm,
      students,
      learning_objectives: learningObjectives,
      assessment_types: assessmentTypes.map(t => ({
        ...t,
        weight_percentage: parseFloat(t.weight_percentage) || 0,
        is_tp_based: Boolean(t.is_tp_based)
      })),
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        assessment_type_id: s.assessment_type_id,
        assessment_date: s.assessment_date
      })),
      matrix
    };
  }

  // ==========================================
  // 5. Pengolahan & Generate Nilai Rapor & Deskripsi Capaian TP
  // ==========================================
  async processReportScores(payload, user = null) {
    const {
      class_group_id,
      subject_id,
      semester_id,
      academic_year_id,
      items
    } = payload;

    if (!class_group_id || !subject_id || !semester_id) {
      const error = new Error('Field class_group_id, subject_id, dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : 1;
    const recordDate = new Date().toISOString().split('T')[0];

    // Ambil Data TP pada semester ini untuk narasi
    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    let tpQuery = db('learning_objectives')
      .where({ subject_id, semester_id, is_active: true });
    if (classGroup?.grade_level_id) {
      tpQuery = tpQuery.where('grade_level_id', classGroup.grade_level_id);
    }
    const learningObjectives = await tpQuery.orderBy('order_index', 'asc').orderBy('code', 'asc');
    const tpMap = {};
    for (const tp of learningObjectives) {
      tpMap[tp.id] = tp.description || tp.code;
    }

    // KKM
    let targetKkm = 75;
    if (classGroup?.grade_level_id && (academic_year_id || classGroup?.academic_year_id)) {
      const kkmRecord = await db('subject_grade_kkms')
        .where({
          subject_id,
          grade_level_id: classGroup.grade_level_id,
          academic_year_id: academic_year_id || classGroup.academic_year_id
        })
        .first();
      if (kkmRecord) targetKkm = parseFloat(kkmRecord.kkm) || 75;
    }

    const processedResults = [];

    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const finalScoreVal = item.final_score !== null && item.final_score !== undefined && item.final_score !== ''
        ? parseFloat(item.final_score)
        : null;

      // 1. Sinkronkan nilai TP jika dikirim
      const tpScoreEntries = [];
      if (item.tp_scores && typeof item.tp_scores === 'object') {
        for (const [tpId, tpVal] of Object.entries(item.tp_scores)) {
          if (tpVal !== null && tpVal !== undefined && tpVal !== '') {
            const numVal = parseFloat(tpVal);
            tpScoreEntries.push({ tpId: Number(tpId), score: numVal, desc: tpMap[tpId] || `TP #${tpId}` });

            // Simpan / update di student_tp_scores
            const existingTp = await db('student_tp_scores')
              .where({
                student_id: sId,
                learning_objective_id: Number(tpId),
                subject_id,
                semester_id
              })
              .first();

            let mastery = 'tercapai';
            if (numVal >= 85) mastery = 'tercapai_optimal';
            else if (numVal >= targetKkm) mastery = 'tercapai';
            else if (numVal >= 60) mastery = 'cukup';
            else mastery = 'perlu_bimbingan';

            if (existingTp) {
              await db('student_tp_scores').where({ id: existingTp.id }).update({
                score: numVal,
                mastery_status: mastery,
                updated_at: db.fn.now()
              });
            } else {
              await db('student_tp_scores').insert({
                student_id: sId,
                learning_objective_id: Number(tpId),
                subject_id,
                semester_id,
                score: numVal,
                mastery_status: mastery,
                recorded_by_employee_id: reviewerEmployeeId,
                created_at: db.fn.now(),
                updated_at: db.fn.now()
              });
            }
          }
        }
      }

      // 2. Generate Narasi Deskripsi Capaian Kompetensi Kurikulum Merdeka
      // Template: "Mencapai kompetensi dengan sangat baik dalam .... Perlu peningkatan dalam ..."
      let narrative = item.competency_description;

      if (!narrative && tpScoreEntries.length > 0) {
        // Urutkan TP dari skor tertinggi ke terendah
        tpScoreEntries.sort((a, b) => b.score - a.score);

        const highest = tpScoreEntries[0];
        const lowest = tpScoreEntries[tpScoreEntries.length - 1];

        const sentences = [];

        // Capaian Tertinggi
        if (highest && highest.score >= targetKkm) {
          sentences.push(`Mencapai kompetensi dengan sangat baik dalam ${highest.desc}.`);
        } else if (highest) {
          sentences.push(`Menunjukkan penguasaan dalam ${highest.desc}.`);
        }

        // Perlu Peningkatan (jika nilai terendah berbeda dengan tertinggi atau berada di bawah KKM)
        if (lowest && (lowest.tpId !== highest.tpId || lowest.score < targetKkm)) {
          if (lowest.score < targetKkm) {
            sentences.push(`Perlu peningkatan dan pendampingan dalam ${lowest.desc}.`);
          } else if (tpScoreEntries.length > 1) {
            sentences.push(`Perlu peningkatan dalam ${lowest.desc}.`);
          }
        }

        narrative = sentences.join(' ');
      }

      // 3. Simpan / Update Nilai Akhir di student_scores
      if (finalScoreVal !== null) {
        const existingFinal = await db('student_scores')
          .where({
            student_id: sId,
            subject_id,
            semester_id,
            score_type: 'nilai_akhir'
          })
          .first();

        if (existingFinal) {
          await db('student_scores').where({ id: existingFinal.id }).update({
            score: finalScoreVal,
            description: `Nilai Rapor Akhir Semester (Kalkulasi Terpadu)`,
            competency_description: narrative || existingFinal.competency_description,
            recorded_by_employee_id: reviewerEmployeeId,
            recorded_at: recordDate,
            updated_at: db.fn.now()
          });
        } else {
          await db('student_scores').insert({
            student_id: sId,
            subject_id,
            semester_id,
            score_type: 'nilai_akhir',
            score: finalScoreVal,
            description: `Nilai Rapor Akhir Semester (Kalkulasi Terpadu)`,
            competency_description: narrative,
            recorded_by_employee_id: reviewerEmployeeId,
            recorded_at: recordDate,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }

      processedResults.push({
        student_id: sId,
        final_score: finalScoreVal,
        competency_description: narrative
      });
    }

    // 4. Catat ke report_score_input_history
    const historyMethod = payload.method === 'calculated_from_components' ? 'calculated_from_components' : 'manual';
    const userNotes = payload.user_notes || payload.notes || null;
    const historyRecordedByName = user?.full_name || user?.username || 'Guru / Staf Penginput';
    const historyRecordedByEmpId = user?.ref_type === 'staff' ? user.ref_id : null;

    const existingHistoryCount = await db('report_score_input_history')
      .where({
        class_group_id,
        subject_id,
        semester_id
      })
      .count('id as cnt')
      .first();
    const nextVersionNum = (parseInt(existingHistoryCount?.cnt || 0, 10)) + 1;
    const versionLabel = payload.version_label || `Versi ${nextVersionNum} (${historyMethod === 'calculated_from_components' ? 'Otomatis Terbobot' : 'Input Manual'})`;

    // Nonaktifkan versi sebelumnya
    await db('report_score_input_history')
      .where({
        class_group_id,
        subject_id,
        semester_id
      })
      .update({ is_active: false });

    // Insert history snapshot baru
    const [historyId] = await db('report_score_input_history').insert({
      satuan_pendidikan_id: classGroup?.satuan_pendidikan_id || payload.satuan_pendidikan_id || 1,
      class_group_id,
      subject_id,
      extracurricular_id: payload.extracurricular_id || null,
      semester_id,
      academic_year_id: academic_year_id || classGroup?.academic_year_id || null,
      method: historyMethod,
      version_label: versionLabel,
      user_notes: userNotes,
      scores_data: JSON.stringify(items),
      is_active: true,
      recorded_by_name: historyRecordedByName,
      recorded_by_employee_id: historyRecordedByEmpId,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return {
      success: true,
      total_processed: processedResults.length,
      history_id: historyId,
      version_label: versionLabel,
      method: historyMethod,
      items: processedResults
    };
  }

  // ==========================================
  // 5B. Riwayat & Versi Penginputan Nilai Rapor
  // ==========================================
  async getReportScoreHistory(query = {}) {
    const { class_group_id, subject_id, semester_id } = query;
    if (!class_group_id || !subject_id || !semester_id) {
      const error = new Error('Field class_group_id, subject_id, dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const history = await db('report_score_input_history')
      .where({
        class_group_id,
        subject_id,
        semester_id
      })
      .orderBy('id', 'desc');

    return history.map(h => {
      let parsedScores = [];
      try {
        parsedScores = typeof h.scores_data === 'string' ? JSON.parse(h.scores_data) : (h.scores_data || []);
      } catch (e) {
        parsedScores = [];
      }
      return {
        ...h,
        is_active: Boolean(h.is_active),
        scores_data: parsedScores,
        student_count: parsedScores.length
      };
    });
  }

  async activateReportScoreVersion(historyId, user = null) {
    const history = await db('report_score_input_history').where({ id: historyId }).first();
    if (!history) {
      const error = new Error('Riwayat versi nilai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Set semua versi lain ke nonaktif, dan versi ini ke aktif
    await db('report_score_input_history')
      .where({
        class_group_id: history.class_group_id,
        subject_id: history.subject_id,
        semester_id: history.semester_id
      })
      .update({ is_active: false });

    await db('report_score_input_history')
      .where({ id: historyId })
      .update({ is_active: true, updated_at: db.fn.now() });

    // Pulihkan / terapkan nilai dari snapshot versi ini ke student_scores & student_tp_scores
    let items = [];
    try {
      items = typeof history.scores_data === 'string' ? JSON.parse(history.scores_data) : (history.scores_data || []);
    } catch (e) {
      items = [];
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : (history.recorded_by_employee_id || 1);
    const recordDate = new Date().toISOString().split('T')[0];

    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const finalScoreVal = item.final_score !== null && item.final_score !== undefined && item.final_score !== ''
        ? parseFloat(item.final_score)
        : null;

      if (finalScoreVal !== null) {
        const existingFinal = await db('student_scores')
          .where({
            student_id: sId,
            subject_id: history.subject_id,
            semester_id: history.semester_id,
            score_type: 'nilai_akhir'
          })
          .first();

        if (existingFinal) {
          await db('student_scores').where({ id: existingFinal.id }).update({
            score: finalScoreVal,
            description: `Nilai Rapor Akhir Semester (${history.version_label})`,
            competency_description: item.competency_description || existingFinal.competency_description,
            recorded_by_employee_id: reviewerEmployeeId,
            recorded_at: recordDate,
            updated_at: db.fn.now()
          });
        } else {
          await db('student_scores').insert({
            student_id: sId,
            subject_id: history.subject_id,
            semester_id: history.semester_id,
            score_type: 'nilai_akhir',
            score: finalScoreVal,
            description: `Nilai Rapor Akhir Semester (${history.version_label})`,
            competency_description: item.competency_description || null,
            recorded_by_employee_id: reviewerEmployeeId,
            recorded_at: recordDate,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          });
        }
      }
    }

    return {
      success: true,
      message: `Versi ${history.version_label} berhasil ditetapkan sebagai nilai rapor aktif`,
      activated_version_id: historyId
    };
  }

  async toggleReportScoreVersion(historyId, user = null) {
    const history = await db('report_score_input_history').where({ id: historyId }).first();
    if (!history) {
      const error = new Error('Riwayat versi nilai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (!history.is_active) {
      return await this.activateReportScoreVersion(historyId, user);
    } else {
      await db('report_score_input_history')
        .where({ id: historyId })
        .update({ is_active: false, updated_at: db.fn.now() });

      return {
        success: true,
        message: `Versi ${history.version_label} berhasil dinonaktifkan`,
        is_active: false
      };
    }
  }

  async deleteReportScoreVersion(historyId) {
    const history = await db('report_score_input_history').where({ id: historyId }).first();
    if (!history) {
      const error = new Error('Riwayat versi nilai tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('report_score_input_history').where({ id: historyId }).del();

    return {
      success: true,
      message: `Riwayat versi nilai berhasil dihapus`,
      deleted_id: historyId
    };
  }

  // ==========================================
  // 6. Buku Nilai / Leger Rombel Lengkap (Leger & Print)
  // ==========================================
  async getLegerData(query = {}) {
    const { class_group_id, semester_id } = query;
    if (!class_group_id || !semester_id) {
      const error = new Error('Field class_group_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups')
      .where({ 'class_groups.id': class_group_id })
      .first();

    const semester = await db('semesters')
      .join('academic_years', 'semesters.academic_year_id', 'academic_years.id')
      .where({ 'semesters.id': semester_id })
      .select('semesters.*', 'academic_years.name as academic_year_name')
      .first();

    // Siswa di kelas
    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({
        'student_class_enrollments.class_group_id': class_group_id
      })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    // Mapel reguler
    let subjectsQuery = db('subjects')
      .where({ is_active: true, parent_subject_id: null });
    if (classGroup?.satuan_pendidikan_id) {
      subjectsQuery = subjectsQuery.where('satuan_pendidikan_id', classGroup.satuan_pendidikan_id);
    }
    const subjects = await subjectsQuery.orderBy('name', 'asc');

    // Nilai akhir seluruh siswa di kelas ini pada semester ini
    const studentIds = students.map(s => s.student_id);
    const finalScores = studentIds.length > 0
      ? await db('student_scores')
          .whereIn('student_id', studentIds)
          .where({ semester_id, score_type: 'nilai_akhir' })
      : [];

    // Map skor: { [student_id]: { [subject_id]: score } }
    const studentScoresMap = {};
    for (const sc of finalScores) {
      if (!studentScoresMap[sc.student_id]) studentScoresMap[sc.student_id] = {};
      studentScoresMap[sc.student_id][sc.subject_id] = sc.score !== null ? parseFloat(sc.score) : null;
    }

    // Hitung total & rata-rata per siswa untuk penentuan ranking
    const studentSummaries = students.map(st => {
      const scores = studentScoresMap[st.student_id] || {};
      const validScores = Object.values(scores).filter(v => v !== null && !isNaN(v));
      const total = validScores.reduce((a, b) => a + b, 0);
      const average = validScores.length > 0 ? parseFloat((total / validScores.length).toFixed(2)) : 0;

      return {
        ...st,
        scores,
        total_score: parseFloat(total.toFixed(2)),
        average_score: average,
        scored_subjects_count: validScores.length
      };
    });

    // Urutkan untuk ranking (berdasarkan rata-rata tertinggi)
    studentSummaries.sort((a, b) => b.average_score - a.average_score);
    studentSummaries.forEach((st, idx) => {
      st.rank = idx + 1;
    });

    return {
      class_group: classGroup,
      semester,
      subjects,
      students: studentSummaries
    };
  }

  // ==========================================
  // Legacy / Direct Score Endpoints (Backwards Compatibility)
  // ==========================================
  async listScores(query = {}, user = null) {
    let baseQuery = db('student_scores')
      .join('students', 'student_scores.student_id', 'students.id')
      .join('subjects', 'student_scores.subject_id', 'subjects.id')
      .join('semesters', 'student_scores.semester_id', 'semesters.id')
      .select(
        'student_scores.*',
        'students.full_name as student_name',
        'students.nis',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'semesters.name as semester_name'
      );

    if (query.student_id) baseQuery = baseQuery.where('student_scores.student_id', query.student_id);
    if (query.subject_id) baseQuery = baseQuery.where('student_scores.subject_id', query.subject_id);
    if (query.semester_id) baseQuery = baseQuery.where('student_scores.semester_id', query.semester_id);
    if (query.score_type) baseQuery = baseQuery.where('student_scores.score_type', query.score_type);

    const rows = await baseQuery.orderBy('student_scores.recorded_at', 'desc');
    return rows.map(r => ({
      ...r,
      score: r.score !== null ? parseFloat(r.score) : null
    }));
  }

  async createScore(payload, user = null) {
    const {
      student_id,
      subject_id,
      semester_id,
      score_type,
      score,
      description,
      recorded_by_employee_id,
      recorded_at
    } = payload;

    if (!student_id || !subject_id || !semester_id || !score_type) {
      const error = new Error('Field student_id, subject_id, semester_id, dan score_type wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = recorded_by_employee_id || (user?.ref_type === 'staff' ? user.ref_id : 1);
    const recordDate = recorded_at || new Date().toISOString().split('T')[0];

    const [id] = await db('student_scores').insert({
      student_id,
      subject_id,
      semester_id,
      score_type,
      score: score !== undefined && score !== null ? parseFloat(score) : null,
      description: description || null,
      recorded_by_employee_id: reviewerEmployeeId,
      recorded_at: recordDate,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_scores').where({ id }).first();
  }

  async createScoresBulk(payload, user = null) {
    const { subject_id, semester_id, score_type, recorded_at, items } = payload;
    if (!subject_id || !semester_id || !score_type || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Field subject_id, semester_id, score_type, dan items (array) wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : 1;
    const recordDate = recorded_at || new Date().toISOString().split('T')[0];

    const results = [];
    for (const item of items) {
      if (!item.student_id) continue;
      const [id] = await db('student_scores').insert({
        student_id: item.student_id,
        subject_id,
        semester_id,
        score_type,
        score: item.score !== undefined && item.score !== null ? parseFloat(item.score) : null,
        description: item.description || null,
        recorded_by_employee_id: reviewerEmployeeId,
        recorded_at: recordDate,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      results.push({ id, student_id: item.student_id, score: item.score });
    }

    return {
      inserted_count: results.length,
      subject_id,
      semester_id,
      score_type,
      items: results
    };
  }

  async listTpScores(query = {}) {
    let baseQuery = db('student_tp_scores')
      .join('students', 'student_tp_scores.student_id', 'students.id')
      .join('learning_objectives', 'student_tp_scores.learning_objective_id', 'learning_objectives.id')
      .join('subjects', 'student_tp_scores.subject_id', 'subjects.id')
      .join('semesters', 'student_tp_scores.semester_id', 'semesters.id')
      .select(
        'student_tp_scores.*',
        'students.full_name as student_name',
        'students.nis',
        'learning_objectives.code as tp_code',
        'learning_objectives.description as tp_description',
        'subjects.name as subject_name',
        'semesters.name as semester_name'
      );

    if (query.student_id) baseQuery = baseQuery.where('student_tp_scores.student_id', query.student_id);
    if (query.learning_objective_id) baseQuery = baseQuery.where('student_tp_scores.learning_objective_id', query.learning_objective_id);
    if (query.subject_id) baseQuery = baseQuery.where('student_tp_scores.subject_id', query.subject_id);
    if (query.semester_id) baseQuery = baseQuery.where('student_tp_scores.semester_id', query.semester_id);

    const rows = await baseQuery.orderBy('student_tp_scores.id', 'desc');
    return rows.map(r => ({
      ...r,
      score: r.score !== null ? parseFloat(r.score) : null
    }));
  }

  async saveTpScoresBulk(payload, user = null) {
    const { learning_objective_id, subject_id, semester_id, items } = payload;
    if (!learning_objective_id || !subject_id || !semester_id || !Array.isArray(items)) {
      const error = new Error('Field learning_objective_id, subject_id, semester_id, dan items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : 1;
    const results = [];

    for (const item of items) {
      if (!item.student_id) continue;
      const numScore = item.score !== undefined && item.score !== null && item.score !== '' ? parseFloat(item.score) : null;
      let masteryStatus = item.mastery_status || null;

      if (!masteryStatus && numScore !== null) {
        if (numScore >= 85) masteryStatus = 'tercapai_optimal';
        else if (numScore >= 75) masteryStatus = 'tercapai';
        else if (numScore >= 60) masteryStatus = 'cukup';
        else masteryStatus = 'perlu_bimbingan';
      }

      const existing = await db('student_tp_scores')
        .where({
          student_id: item.student_id,
          learning_objective_id,
          subject_id,
          semester_id
        })
        .first();

      if (existing) {
        await db('student_tp_scores').where({ id: existing.id }).update({
          score: numScore,
          mastery_status: masteryStatus,
          notes: item.notes || existing.notes,
          recorded_by_employee_id: reviewerEmployeeId,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: item.student_id, score: numScore, mastery_status: masteryStatus });
      } else {
        const [id] = await db('student_tp_scores').insert({
          student_id: item.student_id,
          learning_objective_id,
          subject_id,
          semester_id,
          score: numScore,
          mastery_status: masteryStatus,
          notes: item.notes || null,
          recorded_by_employee_id: reviewerEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: item.student_id, score: numScore, mastery_status: masteryStatus });
      }
    }

    return {
      success: true,
      total_saved: results.length,
      items: results
    };
  }

  async listAttitudeScores(query = {}) {
    let baseQuery = db('student_attitude_scores')
      .join('students', 'student_attitude_scores.student_id', 'students.id')
      .join('semesters', 'student_attitude_scores.semester_id', 'semesters.id')
      .select(
        'student_attitude_scores.*',
        'students.full_name as student_name',
        'students.nis',
        'semesters.name as semester_name'
      );

    if (query.student_id) baseQuery = baseQuery.where('student_attitude_scores.student_id', query.student_id);
    if (query.semester_id) baseQuery = baseQuery.where('student_attitude_scores.semester_id', query.semester_id);

    return baseQuery.orderBy('student_attitude_scores.id', 'desc');
  }

  async createAttitudeScore(payload) {
    const { student_id, semester_id, aspect, predicate, description } = payload;
    if (!student_id || !semester_id || !aspect) {
      const error = new Error('Field student_id, semester_id, dan aspect wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('student_attitude_scores').insert({
      student_id,
      semester_id,
      aspect: aspect.trim(),
      predicate: predicate ? predicate.trim() : null,
      description: description || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('student_attitude_scores').where({ id }).first();
  }

  // ==========================================
  // 7. Penilaian Ekstrakurikuler (Extracurricular Scores)
  // ==========================================
  async listExtracurricularScores(query = {}) {
    let baseQuery = db('student_extracurricular_scores')
      .join('students', 'student_extracurricular_scores.student_id', 'students.id')
      .join('extracurriculars', 'student_extracurricular_scores.extracurricular_id', 'extracurriculars.id')
      .join('semesters', 'student_extracurricular_scores.semester_id', 'semesters.id')
      .select(
        'student_extracurricular_scores.*',
        'students.full_name as student_name',
        'students.nis',
        'extracurriculars.name as extracurricular_name',
        'semesters.name as semester_name'
      );

    if (query.extracurricular_id) baseQuery = baseQuery.where('student_extracurricular_scores.extracurricular_id', query.extracurricular_id);
    if (query.semester_id) baseQuery = baseQuery.where('student_extracurricular_scores.semester_id', query.semester_id);
    if (query.academic_year_id) baseQuery = baseQuery.where('student_extracurricular_scores.academic_year_id', query.academic_year_id);
    if (query.student_id) baseQuery = baseQuery.where('student_extracurricular_scores.student_id', query.student_id);

    const rows = await baseQuery.orderBy('students.full_name', 'asc');
    return rows.map(r => ({
      ...r,
      score: r.score !== null ? parseFloat(r.score) : null
    }));
  }

  async getExtracurricularScoringSheet(query = {}) {
    const { extracurricular_id, academic_year_id, semester_id, satuan_pendidikan_id } = query;
    if (!extracurricular_id || !semester_id) {
      const error = new Error('Field extracurricular_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const extra = await db('extracurriculars').where({ id: extracurricular_id }).first();
    if (!extra) {
      const error = new Error('Ekstrakurikuler tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // 1. Ambil anggota terdaftar dari extracurricular_members
    let membersQuery = db('extracurricular_members')
      .join('students', 'extracurricular_members.student_id', 'students.id')
      .where({ 'extracurricular_members.extracurricular_id': extracurricular_id });
    if (academic_year_id) {
      membersQuery = membersQuery.where({ 'extracurricular_members.academic_year_id': academic_year_id });
    }
    const members = await membersQuery.select(
      'students.id as student_id',
      'students.full_name as student_name',
      'students.nis',
      'students.gender'
    );

    // 2. Ambil nilai yang sudah tersimpan di student_extracurricular_scores
    const existingScores = await db('student_extracurricular_scores')
      .where({ extracurricular_id, semester_id });

    const scoreMap = {};
    for (const sc of existingScores) {
      scoreMap[sc.student_id] = {
        predicate: sc.predicate || 'Baik',
        score: sc.score !== null ? parseFloat(sc.score) : null,
        description: sc.description || '',
        notes: sc.notes || ''
      };
    }

    // 3. Gabungkan siswa terdaftar + siswa yang sudah dinilai
    const studentMap = {};
    for (const m of members) {
      studentMap[m.student_id] = { ...m };
    }

    if (existingScores.length > 0) {
      const scoredStudentIds = existingScores.map(sc => sc.student_id).filter(id => !studentMap[id]);
      if (scoredStudentIds.length > 0) {
        const extraStudents = await db('students')
          .whereIn('id', scoredStudentIds)
          .select('id as student_id', 'full_name as student_name', 'nis', 'gender');
        for (const st of extraStudents) {
          studentMap[st.student_id] = { ...st };
        }
      }
    }

    // Dapatkan rombel kelas masing-masing siswa
    const allStudentIds = Object.keys(studentMap).map(Number);
    const enrollments = allStudentIds.length > 0
      ? await db('student_class_enrollments')
          .join('class_groups', 'student_class_enrollments.class_group_id', 'class_groups.id')
          .whereIn('student_class_enrollments.student_id', allStudentIds)
          .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
          .select('student_class_enrollments.student_id', 'class_groups.name as class_group_name')
      : [];

    const enrollmentMap = {};
    for (const en of enrollments) {
      enrollmentMap[en.student_id] = en.class_group_name;
    }

    const formattedStudents = Object.values(studentMap).map(st => {
      const sc = scoreMap[st.student_id] || {
        predicate: 'Baik',
        score: null,
        description: '',
        notes: ''
      };

      return {
        student_id: st.student_id,
        student_name: st.student_name,
        nis: st.nis,
        gender: st.gender,
        class_name: enrollmentMap[st.student_id] || 'Belum ada rombel',
        predicate: sc.predicate,
        score: sc.score,
        description: sc.description,
        notes: sc.notes
      };
    });

    formattedStudents.sort((a, b) => a.student_name.localeCompare(b.student_name));

    return {
      extracurricular: extra,
      students: formattedStudents
    };
  }

  async saveExtracurricularScoresBulk(payload, user = null) {
    const { extracurricular_id, academic_year_id, semester_id, satuan_pendidikan_id, items } = payload;
    if (!extracurricular_id || !semester_id || !Array.isArray(items)) {
      const error = new Error('Field extracurricular_id, semester_id, dan items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const reviewerEmployeeId = user?.ref_type === 'staff' ? user.ref_id : 1;
    const schoolUnitId = satuan_pendidikan_id || 1;
    const ayId = academic_year_id || 1;

    const results = [];
    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const predicate = item.predicate || 'Baik';
      const numScore = item.score !== null && item.score !== undefined && item.score !== '' ? parseFloat(item.score) : null;
      const description = item.description || null;
      const notes = item.notes || null;

      // Upsert ke student_extracurricular_scores
      const existing = await db('student_extracurricular_scores')
        .where({
          extracurricular_id,
          semester_id,
          student_id: sId
        })
        .first();

      if (existing) {
        await db('student_extracurricular_scores').where({ id: existing.id }).update({
          predicate,
          score: numScore,
          description,
          notes,
          recorded_by_employee_id: reviewerEmployeeId,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: sId, predicate, score: numScore });
      } else {
        const [id] = await db('student_extracurricular_scores').insert({
          satuan_pendidikan_id: schoolUnitId,
          academic_year_id: ayId,
          semester_id,
          extracurricular_id,
          student_id: sId,
          predicate,
          score: numScore,
          description,
          notes,
          recorded_by_employee_id: reviewerEmployeeId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: sId, predicate, score: numScore });
      }

      // Pastikan tercatat juga di extracurricular_members
      const existingMember = await db('extracurricular_members')
        .where({ extracurricular_id, student_id: sId, academic_year_id: ayId })
        .first();

      if (!existingMember) {
        await db('extracurricular_members').insert({
          extracurricular_id,
          student_id: sId,
          academic_year_id: ayId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }

    return {
      success: true,
      total_saved: results.length,
      extracurricular_id,
      semester_id,
      items: results
    };
  }

  // ==========================================
  // 8. Dimensi Sikap & Nilai Sikap (Attitude Management)
  // ==========================================
  async listAttitudeDimensions(query = {}) {
    const unitId = query.satuan_pendidikan_id || 1;
    const academicYearId = query.academic_year_id || null;

    let q = db('attitude_dimensions').where('satuan_pendidikan_id', unitId);
    if (academicYearId) {
      q = q.where(function() {
        this.where('academic_year_id', academicYearId).orWhereNull('academic_year_id');
      });
    }

    let dimensions = await q.orderBy('order_index', 'asc');

    // Jika belum ada dimensi sama sekali untuk tahun ajaran ini, otomatis inisialisasi Profil Pelajar Pancasila
    if (dimensions.length === 0) {
      const defaults = [
        { code: 'DIM-1', name: 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia', order_index: 1 },
        { code: 'DIM-2', name: 'Berkebinekaan Global', order_index: 2 },
        { code: 'DIM-3', name: 'Bergotong Royong', order_index: 3 },
        { code: 'DIM-4', name: 'Mandiri', order_index: 4 },
        { code: 'DIM-5', name: 'Bernalar Kritis', order_index: 5 },
        { code: 'DIM-6', name: 'Kreatif', order_index: 6 }
      ];

      for (const d of defaults) {
        await db('attitude_dimensions').insert({
          satuan_pendidikan_id: unitId,
          academic_year_id: academicYearId,
          code: d.code,
          name: d.name,
          order_index: d.order_index,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }

      dimensions = await db('attitude_dimensions')
        .where('satuan_pendidikan_id', unitId)
        .where(function() {
          if (academicYearId) this.where('academic_year_id', academicYearId).orWhereNull('academic_year_id');
        })
        .orderBy('order_index', 'asc');
    }

    return dimensions;
  }

  async createAttitudeDimension(payload) {
    const { satuan_pendidikan_id, academic_year_id, code, name, description, order_index } = payload;
    if (!name) {
      const error = new Error('Nama dimensi sikap wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const [id] = await db('attitude_dimensions').insert({
      satuan_pendidikan_id: satuan_pendidikan_id || 1,
      academic_year_id: academic_year_id || null,
      code: code || `DIM-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      description: description || null,
      order_index: order_index || 1,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('attitude_dimensions').where({ id }).first();
  }

  async updateAttitudeDimension(id, payload) {
    const existing = await db('attitude_dimensions').where({ id }).first();
    if (!existing) {
      const error = new Error('Dimensi sikap tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('attitude_dimensions').where({ id }).update({
      name: payload.name !== undefined ? payload.name.trim() : existing.name,
      code: payload.code !== undefined ? payload.code : existing.code,
      description: payload.description !== undefined ? payload.description : existing.description,
      order_index: payload.order_index !== undefined ? payload.order_index : existing.order_index,
      is_active: payload.is_active !== undefined ? payload.is_active : existing.is_active,
      updated_at: db.fn.now()
    });

    return db('attitude_dimensions').where({ id }).first();
  }

  async deleteAttitudeDimension(id) {
    const existing = await db('attitude_dimensions').where({ id }).first();
    if (!existing) {
      const error = new Error('Dimensi sikap tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await db('attitude_dimensions').where({ id }).del();
    return { success: true, message: 'Dimensi sikap berhasil dihapus', deleted_id: id };
  }

  async getAttitudeScoresMatrix(query = {}) {
    const { class_group_id, semester_id, academic_year_id } = query;
    if (!class_group_id || !semester_id) {
      const error = new Error('Field class_group_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    const ayId = academic_year_id || classGroup?.academic_year_id;
    const unitId = classGroup?.satuan_pendidikan_id || 1;

    // 1. Ambil siswa
    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({ 'student_class_enrollments.class_group_id': class_group_id })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    // 2. Ambil dimensi sikap
    const dimensions = await this.listAttitudeDimensions({
      satuan_pendidikan_id: unitId,
      academic_year_id: ayId
    });

    // 3. Ambil nilai sikap yang sudah tersimpan
    const rawScores = await db('student_attitude_scores')
      .where({ semester_id })
      .whereIn('student_id', students.map(s => s.student_id));

    const scoresMap = {};
    for (const sc of rawScores) {
      if (!scoresMap[sc.student_id]) {
        scoresMap[sc.student_id] = {};
      }
      const key = sc.dimension_id ? String(sc.dimension_id) : (sc.aspect || 'general');
      scoresMap[sc.student_id][key] = {
        id: sc.id,
        aspect: sc.aspect,
        description: sc.description || ''
      };
    }

    return {
      class_group: classGroup,
      dimensions,
      students,
      scores_map: scoresMap
    };
  }

  async saveAttitudeScoresBulk(payload, user = null) {
    const { class_group_id, semester_id, academic_year_id, items } = payload;
    if (!class_group_id || !semester_id || !Array.isArray(items)) {
      const error = new Error('Field class_group_id, semester_id, dan array items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    const ayId = academic_year_id || classGroup?.academic_year_id || null;
    const results = [];

    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const dimId = item.dimension_id || null;
      const aspectName = item.aspect || (dimId ? `Dimensi ${dimId}` : 'Sikap & Karakter');
      const desc = item.description !== undefined ? item.description : '';

      let queryCheck = db('student_attitude_scores').where({
        student_id: sId,
        semester_id
      });
      if (dimId) {
        queryCheck = queryCheck.where('dimension_id', dimId);
      } else {
        queryCheck = queryCheck.where('aspect', aspectName);
      }
      const existing = await queryCheck.first();

      if (existing) {
        await db('student_attitude_scores').where({ id: existing.id }).update({
          aspect: aspectName,
          description: desc,
          class_group_id,
          academic_year_id: ayId,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: sId, dimension_id: dimId });
      } else {
        const [id] = await db('student_attitude_scores').insert({
          student_id: sId,
          semester_id,
          dimension_id: dimId,
          class_group_id,
          academic_year_id: ayId,
          aspect: aspectName,
          predicate: null, // User requirement: nilai sikap hanya berupa deskripsi
          description: desc,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: sId, dimension_id: dimId });
      }
    }

    return {
      success: true,
      total_saved: results.length,
      class_group_id,
      semester_id,
      items: results
    };
  }

  // ==========================================
  // 9. Nilai Ekstrakurikuler Wajib Pramuka
  // ==========================================
  async getScoutScores(query = {}) {
    const { class_group_id, semester_id } = query;
    if (!class_group_id || !semester_id) {
      const error = new Error('Field class_group_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();

    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({ 'student_class_enrollments.class_group_id': class_group_id })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    const scoutScores = await db('student_scout_scores')
      .where({ semester_id })
      .whereIn('student_id', students.map(s => s.student_id));

    const scoresMap = {};
    for (const sc of scoutScores) {
      scoresMap[sc.student_id] = {
        id: sc.id,
        predicate: sc.predicate || 'Baik',
        description: sc.description || ''
      };
    }

    return {
      class_group: classGroup,
      students,
      scores_map: scoresMap
    };
  }

  async saveScoutScoresBulk(payload, user = null) {
    const { class_group_id, semester_id, academic_year_id, items } = payload;
    if (!class_group_id || !semester_id || !Array.isArray(items)) {
      const error = new Error('Field class_group_id, semester_id, dan array items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();
    const ayId = academic_year_id || classGroup?.academic_year_id || null;
    const unitId = classGroup?.satuan_pendidikan_id || 1;
    const results = [];

    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const predicate = item.predicate || 'Baik';
      const description = item.description || `Melaksanakan kegiatan kepramukaan dengan predikat ${predicate}.`;

      const existing = await db('student_scout_scores')
        .where({ student_id: sId, semester_id })
        .first();

      if (existing) {
        await db('student_scout_scores').where({ id: existing.id }).update({
          predicate,
          description,
          class_group_id,
          academic_year_id: ayId,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: sId, predicate });
      } else {
        const [id] = await db('student_scout_scores').insert({
          satuan_pendidikan_id: unitId,
          student_id: sId,
          class_group_id,
          semester_id,
          academic_year_id: ayId,
          predicate,
          description,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: sId, predicate });
      }
    }

    return {
      success: true,
      total_saved: results.length,
      class_group_id,
      semester_id,
      items: results
    };
  }

  // ==========================================
  // 10. Catatan Wali Kelas (Homeroom Notes)
  // ==========================================
  async getHomeroomNotes(query = {}) {
    const { class_group_id, semester_id } = query;
    if (!class_group_id || !semester_id) {
      const error = new Error('Field class_group_id dan semester_id wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const classGroup = await db('class_groups').where({ id: class_group_id }).first();

    const students = await db('student_class_enrollments')
      .join('students', 'student_class_enrollments.student_id', 'students.id')
      .where({ 'student_class_enrollments.class_group_id': class_group_id })
      .whereNotIn('student_class_enrollments.status', ['dibatalkan', 'batal'])
      .select(
        'students.id as student_id',
        'students.full_name as student_name',
        'students.nis',
        'students.nisn',
        'students.gender'
      )
      .orderBy('students.full_name', 'asc');

    const reportCards = await db('report_cards')
      .where({ semester_id })
      .whereIn('student_id', students.map(s => s.student_id));

    const notesMap = {};
    for (const rc of reportCards) {
      notesMap[rc.student_id] = rc.homeroom_note || '';
    }

    return {
      class_group: classGroup,
      students,
      notes_map: notesMap
    };
  }

  async saveHomeroomNotesBulk(payload, user = null) {
    const { class_group_id, semester_id, items } = payload;
    if (!class_group_id || !semester_id || !Array.isArray(items)) {
      const error = new Error('Field class_group_id, semester_id, dan array items wajib diisi');
      error.statusCode = 422;
      throw error;
    }

    const empId = user?.ref_type === 'staff' ? user.ref_id : null;
    const results = [];

    for (const item of items) {
      if (!item.student_id) continue;
      const sId = item.student_id;
      const note = item.homeroom_note !== undefined ? item.homeroom_note : '';

      const existing = await db('report_cards')
        .where({ student_id: sId, semester_id })
        .first();

      if (existing) {
        await db('report_cards').where({ id: existing.id }).update({
          homeroom_note: note,
          generated_by_employee_id: empId || existing.generated_by_employee_id,
          updated_at: db.fn.now()
        });
        results.push({ id: existing.id, student_id: sId });
      } else {
        const [id] = await db('report_cards').insert({
          student_id: sId,
          semester_id,
          homeroom_note: note,
          generated_by_employee_id: empId,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
        results.push({ id, student_id: sId });
      }
    }

    return {
      success: true,
      total_saved: results.length,
      class_group_id,
      semester_id,
      items: results
    };
  }
}

module.exports = new ScoresService();

