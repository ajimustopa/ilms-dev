/**
 * Psychotest Scoring Engine Service
 * Implements scoring algorithms:
 * 1. dichotomy_4axis (MBTI: EI, SN, TF, JP)
 * 2. trait_average (Big Five: OCEAN)
 */
const db = require('../../../config/db/kepegawaian');

class PsychotestScoringService {
  /**
   * Hitung skor dan tentukan profil berdasarkan tipe tes
   * @param {number} sessionId 
   * @returns {Promise<Object>}
   */
  async calculateAndSaveResult(sessionId) {
    const session = await db('psychotest_sessions as ps')
      .leftJoin('psychotest_types as pt', 'ps.test_type_id', 'pt.id')
      .where('ps.id', sessionId)
      .select('ps.*', 'pt.code as type_code', 'pt.scoring_method')
      .first();

    if (!session) {
      throw new Error(`Sesi psikotes dengan ID ${sessionId} tidak ditemukan`);
    }

    // Ambil seluruh jawaban sesi beserta metadata butir soal & dimensi
    const answers = await db('psychotest_answers as pa')
      .join('psychotest_questions as pq', 'pa.question_id', 'pq.id')
      .join('psychotest_dimensions as pd', 'pq.dimension_id', 'pd.id')
      .where('pa.session_id', sessionId)
      .select(
        'pa.*',
        'pq.question_code',
        'pq.question_type',
        'pq.scoring_direction',
        'pq.option_a_pole',
        'pq.option_b_pole',
        'pd.id as dimension_id',
        'pd.code as dimension_code',
        'pd.name as dimension_name',
        'pd.pole_positive_code',
        'pd.pole_negative_code'
      );

    if (!answers || answers.length === 0) {
      throw new Error('Tidak ada data jawaban yang tersimpan untuk sesi ini');
    }

    let calculationResult;

    if (session.scoring_method === 'dichotomy_4axis' || session.type_code === 'mbti') {
      calculationResult = await this.scoreMbtiDichotomy(session, answers);
    } else if (session.scoring_method === 'trait_average' || session.type_code === 'big_five') {
      calculationResult = await this.scoreBigFiveTraitAverage(session, answers);
    } else {
      throw new Error(`Metode skoring '${session.scoring_method}' belum didukung`);
    }

    // Simpan atau update ke tabel psychotest_results
    const existingResult = await db('psychotest_results')
      .where('session_id', sessionId)
      .first();

    const resultPayload = {
      session_id: session.id,
      test_type_id: session.test_type_id,
      candidate_id: session.candidate_id || null,
      employee_id: session.employee_id || null,
      result_code: calculationResult.result_code,
      result_label: calculationResult.result_label,
      dimension_scores: JSON.stringify(calculationResult.dimension_scores),
      profile_summary: calculationResult.profile_summary,
      strengths_summary: calculationResult.strengths_summary,
      development_areas: calculationResult.development_areas,
      hrd_recommendation: calculationResult.hrd_recommendation,
      radar_chart_data: JSON.stringify(calculationResult.radar_chart_data),
      assessor_name: 'Sistem Skoring Otomatis Aldepos',
      assessor_evaluation: calculationResult.assessor_evaluation || 'Skoring kalkulasi otomatis berhasil dieksekusi dengan akurasi 100%.',
      updated_at: db.fn.now()
    };

    if (existingResult) {
      await db('psychotest_results')
        .where('id', existingResult.id)
        .update(resultPayload);
      resultPayload.id = existingResult.id;
    } else {
      resultPayload.created_at = db.fn.now();
      const [newId] = await db('psychotest_results').insert(resultPayload);
      resultPayload.id = newId;
    }

    // Update status sesi menjadi completed jika belum
    await db('psychotest_sessions')
      .where('id', session.id)
      .update({
        status: 'completed',
        completed_at: session.completed_at || db.fn.now(),
        updated_at: db.fn.now()
      });

    // Parse JSON fields dan buang raw Knex builder untuk return value aman
    const nowIso = new Date().toISOString();
    return {
      id: resultPayload.id,
      session_id: session.id,
      test_type_id: session.test_type_id,
      candidate_id: session.candidate_id || null,
      employee_id: session.employee_id || null,
      result_code: calculationResult.result_code,
      result_label: calculationResult.result_label,
      dimension_scores: calculationResult.dimension_scores,
      profile_summary: calculationResult.profile_summary,
      strengths_summary: calculationResult.strengths_summary,
      development_areas: calculationResult.development_areas,
      hrd_recommendation: calculationResult.hrd_recommendation,
      radar_chart_data: calculationResult.radar_chart_data,
      assessor_name: resultPayload.assessor_name,
      assessor_evaluation: resultPayload.assessor_evaluation,
      created_at: nowIso,
      updated_at: nowIso
    };
  }

  /**
   * Algoritma Skoring MBTI (4 Sumbu Dikotomi Jungian)
   */
  async scoreMbtiDichotomy(session, answers) {
    const tally = {
      EI: { positive: 0, negative: 0, label_pos: 'E', label_neg: 'I' },
      SN: { positive: 0, negative: 0, label_pos: 'S', label_neg: 'N' },
      TF: { positive: 0, negative: 0, label_pos: 'T', label_neg: 'F' },
      JP: { positive: 0, negative: 0, label_pos: 'J', label_neg: 'P' }
    };

    answers.forEach((ans) => {
      const dim = ans.dimension_code;
      if (tally[dim]) {
        const selectedPole = ans.selected_pole || (ans.selected_option === 'A' ? ans.option_a_pole : ans.option_b_pole);
        if (selectedPole === tally[dim].label_pos) {
          tally[dim].positive += 1;
        } else if (selectedPole === tally[dim].label_neg) {
          tally[dim].negative += 1;
        } else if (ans.selected_option === 'A') {
          tally[dim].positive += 1;
        } else {
          tally[dim].negative += 1;
        }
      }
    });

    const dimensionScores = {};
    let dominantType = '';

    const axisKeys = ['EI', 'SN', 'TF', 'JP'];
    axisKeys.forEach((axis) => {
      const posCount = tally[axis].positive;
      const negCount = tally[axis].negative;
      const total = posCount + negCount || 1;

      const posPct = Math.round((posCount / total) * 100);
      const negPct = 100 - posPct;

      const dominantPole = posCount >= negCount ? tally[axis].label_pos : tally[axis].label_neg;
      dominantType += dominantPole;

      dimensionScores[axis] = {
        axis,
        positive_pole: tally[axis].label_pos,
        negative_pole: tally[axis].label_neg,
        positive_count: posCount,
        negative_count: negCount,
        positive_percentage: posPct,
        negative_percentage: negPct,
        dominant_pole: dominantPole,
        clarity_level: Math.abs(posPct - negPct) > 30 ? 'Jelas/Tegas' : 'Moderat'
      };
    });

    // Cari profil di psychotest_type_profiles
    const profile = await db('psychotest_type_profiles')
      .where({
        test_type_id: session.test_type_id,
        profile_code: dominantType
      })
      .first();

    const radarChartData = [
      { axis: 'Extraversion (E)', value: dimensionScores.EI.positive_percentage },
      { axis: 'Introversion (I)', value: dimensionScores.EI.negative_percentage },
      { axis: 'Sensing (S)', value: dimensionScores.SN.positive_percentage },
      { axis: 'Intuition (N)', value: dimensionScores.SN.negative_percentage },
      { axis: 'Thinking (T)', value: dimensionScores.TF.positive_percentage },
      { axis: 'Feeling (F)', value: dimensionScores.TF.negative_percentage },
      { axis: 'Judging (J)', value: dimensionScores.JP.positive_percentage },
      { axis: 'Perceiving (P)', value: dimensionScores.JP.negative_percentage }
    ];

    return {
      result_code: dominantType,
      result_label: profile ? profile.profile_label : `Tipe Kepribadian ${dominantType}`,
      dimension_scores: dimensionScores,
      profile_summary: profile ? profile.description_text : `Individu memiliki preferensi dominan ${dominantType}.`,
      strengths_summary: profile ? profile.strengths_text : 'Kemampuan analisa dan adaptasi yang seimbang.',
      development_areas: profile ? profile.weaknesses_text : 'Peningkatan komunikasi antarpribadi dan manajemen stres.',
      hrd_recommendation: profile ? profile.hrd_recommendation_text : 'Dapat dipertimbangkan sesuai kualifikasi jabatan.',
      radar_chart_data: radarChartData,
      assessor_evaluation: `Kalkulasi MBTI 4-Axis selesai: Preferensi Dominan ${dominantType} (${profile ? profile.profile_label : ''}).`
    };
  }

  /**
   * Algoritma Skoring Big Five (OCEAN: Trait Average & Normalized Percentage)
   */
  async scoreBigFiveTraitAverage(session, answers) {
    const traitGroups = {
      O: { name: 'Openness to Experience', scores: [] },
      C: { name: 'Conscientiousness', scores: [] },
      E: { name: 'Extraversion', scores: [] },
      A: { name: 'Agreeableness', scores: [] },
      N: { name: 'Neuroticism (Emotional Stability)', scores: [] }
    };

    answers.forEach((ans) => {
      const dim = ans.dimension_code;
      if (traitGroups[dim]) {
        let val = parseFloat(ans.selected_option || ans.raw_score || 3);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 5) val = 5;

        // Jika scoring_direction reverse, balik nilainya (Likert 1-5 => 6 - val)
        if (ans.scoring_direction === 'reverse') {
          val = 6 - val;
        }

        traitGroups[dim].scores.push(val);
      }
    });

    const dimensionScores = {};
    const radarChartData = [];
    const dominantProfiles = [];

    const traitCodes = ['O', 'C', 'E', 'A', 'N'];

    for (const code of traitCodes) {
      const arr = traitGroups[code].scores;
      const count = arr.length || 1;
      const sum = arr.reduce((acc, curr) => acc + curr, 0);
      const avg = parseFloat((sum / count).toFixed(2));
      // Normalisasi ke skala 0 - 100: (avg - 1) / 4 * 100
      const pct = Math.round(((avg - 1) / 4) * 100);

      let level = 'sedang';
      if (avg >= 3.67) {
        level = 'tinggi';
      } else if (avg <= 2.33) {
        level = 'rendah';
      }

      const profileCode = `${code}_${level}`;
      const profile = await db('psychotest_type_profiles')
        .where({
          test_type_id: session.test_type_id,
          profile_code: profileCode
        })
        .first();

      if (profile) {
        dominantProfiles.push(profile);
      }

      dimensionScores[code] = {
        code,
        name: traitGroups[code].name,
        average_score: avg,
        percentage: pct,
        level,
        profile_code: profileCode,
        label: profile ? profile.profile_label : `${traitGroups[code].name} (${level.toUpperCase()})`,
        description: profile ? profile.description_text : ''
      };

      radarChartData.push({
        trait: code,
        name: traitGroups[code].name,
        score: avg,
        percentage: pct,
        level
      });
    }

    // Ambil profil penutup SUMMARY
    const summaryProfile = await db('psychotest_type_profiles')
      .where({
        test_type_id: session.test_type_id,
        profile_code: 'SUMMARY'
      })
      .first();

    const highTraits = Object.values(dimensionScores)
      .filter(d => d.level === 'tinggi')
      .map(d => d.code);

    const resultCode = `OCEAN_${highTraits.length > 0 ? highTraits.join('') : 'BALANCED'}`;

    const profileSummaries = dominantProfiles.map(p => `• ${p.profile_label}: ${p.description_text}`).join('\n\n');
    const strengthsSummaries = dominantProfiles.filter(p => p.strengths_text).map(p => `• ${p.profile_label}: ${p.strengths_text}`).join('\n');
    const weaknessesSummaries = dominantProfiles.filter(p => p.weaknesses_text).map(p => `• ${p.profile_label}: ${p.weaknesses_text}`).join('\n');
    const hrdRecommendations = dominantProfiles.map(p => `• [${p.profile_code}] ${p.hrd_recommendation_text}`).join('\n');

    return {
      result_code: resultCode,
      result_label: `Profil Evaluasi OCEAN (${highTraits.length > 0 ? highTraits.join(', ') + ' Tinggi' : 'Karakter Seimbang'})`,
      dimension_scores: dimensionScores,
      profile_summary: `${summaryProfile ? summaryProfile.description_text + '\n\n' : ''}${profileSummaries}`,
      strengths_summary: strengthsSummaries || 'Memiliki kekuatan adaptasi emosi dan ketelitian yang memadai.',
      development_areas: weaknessesSummaries || 'Memerlukan pembinaan komunikasi dan manajemen ritme kerja berkesinambungan.',
      hrd_recommendation: hrdRecommendations || (summaryProfile ? summaryProfile.hrd_recommendation_text : 'Direkomendasikan sesuai formasi.'),
      radar_chart_data: radarChartData,
      assessor_evaluation: `Kalkulasi Big Five OCEAN selesai: Dominansi Trait [${highTraits.join(', ') || 'Moderat'}].`
    };
  }
}

module.exports = new PsychotestScoringService();
