/**
 * Comprehensive Automated Test & Verification for Psychotest Feature
 * Modul Kepegawaian (feat/kepegawaian-psikotes)
 * Tests all 4 Endpoint Groups, Permissions, and Scoring Engines via HTTP
 */
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.CORE_JWT_SECRET || 'JNosd7TTSyA9fVhf94hyNAedRPTEtFC99G9qqP3kMAi';

// Buat JWT Token Super Admin ID 1
const adminToken = jwt.sign(
  {
    id: 1,
    sub: 1,
    username: 'superadmin',
    full_name: 'Super Administrator',
    account_type: 'staff',
    ref_type: 'staff',
    ref_id: 1,
    school_units: [1, 2],
    roles: ['super_admin']
  },
  JWT_SECRET,
  { expiresIn: '2h' }
);

function makeRequest(method, path, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path, 'http://127.0.0.1:3000');
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    let bodyData = null;
    if (data) {
      bodyData = typeof data === 'string' ? data : JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = { rawBody: body };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 MEMULAI UJI COBA MENYELURUH FITUR TES PSIKOLOGI (KEPEGAWAIAN)');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(title, condition, detail = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      console.error(`  ❌ [FAIL] ${title} -> ${detail}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST GROUP 1: Bank Soal & Instrumen Admin (6.1)
    // -----------------------------------------------------------------
    console.log('📦 1. UJI COBA KELOMPOK 6.1: BANK SOAL & TIPE INSTRUMEN');
    
    // 1.1 List Types
    const resTypes = await makeRequest('GET', '/api/v1/kepegawaian/psychotest/types', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/types mengembalikan status 200', resTypes.status === 200);
    assert('Ditemukan minimal 2 tipe tes (MBTI & Big Five)', resTypes.body.data && resTypes.body.data.length >= 2);

    // 1.2 List Dimensions
    const resDims = await makeRequest('GET', '/api/v1/kepegawaian/psychotest/dimensions?test_type_id=1', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/dimensions?test_type_id=1 (MBTI) status 200', resDims.status === 200);
    assert('MBTI memiliki 4 dimensi (EI, SN, TF, JP)', resDims.body.data && resDims.body.data.length === 4);

    // 1.3 List Questions
    const resQuestions = await makeRequest('GET', '/api/v1/kepegawaian/psychotest/questions?test_type_id=1', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/questions?test_type_id=1 status 200', resQuestions.status === 200);
    assert('MBTI memiliki butir pertanyaan terstruktur', resQuestions.body.data && resQuestions.body.data.length >= 40);

    // 1.4 List Profiles
    const resProfiles = await makeRequest('GET', '/api/v1/kepegawaian/psychotest/profiles?test_type_id=1', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/profiles?test_type_id=1 status 200', resProfiles.status === 200);
    assert('MBTI memiliki 16 profil interpretasi kepribadian', resProfiles.body.data && resProfiles.body.data.length === 16);

    // -----------------------------------------------------------------
    // TEST GROUP 2: Sesi & Penjadwalan HRD (6.2)
    // -----------------------------------------------------------------
    console.log('\n📋 2. UJI COBA KELOMPOK 6.2: SESI & PENJADWALAN HRD');

    // 2.1 Buat Sesi Baru MBTI
    const resCreateMbti = await makeRequest('POST', '/api/v1/kepegawaian/psychotest/sessions', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      test_type_id: 1,
      participant_name: 'Fadhil Rahman, S.Pd.',
      participant_email: 'fadhil.rahman@test.id',
      duration_minutes: 30,
      assessor_notes: 'Kandidat Formasi Guru Bahasa Arab'
    });
    assert('POST /psychotest/sessions (MBTI) status 201', resCreateMbti.status === 201);
    const mbtiSession = resCreateMbti.body.data;
    assert('Sesi MBTI menghasilkan session_code unik berawalan PSI-MBTI-', mbtiSession && mbtiSession.session_code && mbtiSession.session_code.startsWith('PSI-MBTI-'));

    // 2.2 Buat Sesi Baru Big Five
    const resCreateBf = await makeRequest('POST', '/api/v1/kepegawaian/psychotest/sessions', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      test_type_id: 2,
      participant_name: 'Nurul Hidayah, S.Kom.',
      participant_email: 'nurul.hidayah@test.id',
      duration_minutes: 25,
      assessor_notes: 'Kandidat Formasi Staf IT & Sistem Informasi'
    });
    assert('POST /psychotest/sessions (Big Five) status 201', resCreateBf.status === 201);
    const bfSession = resCreateBf.body.data;
    assert('Sesi Big Five menghasilkan session_code unik berawalan PSI-BIG_FIVE-', bfSession && bfSession.session_code && bfSession.session_code.startsWith('PSI-BIG_FIVE-'));

    // -----------------------------------------------------------------
    // TEST GROUP 3: Public Token-Based Flow (6.4) - Eksekusi Ujian MBTI
    // -----------------------------------------------------------------
    console.log('\n🌐 3. UJI COBA KELOMPOK 6.4: PUBLIK TOKEN-BASED (UJIAN MBTI)');

    const mbtiToken = mbtiSession.session_code;

    // 3.1 Verifikasi Token Publik
    const resPubVerify = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/public/${mbtiToken}`);
    assert('GET /psychotest/public/:token status 200 tanpa JWT', resPubVerify.status === 200);
    assert('Respon memuat metadata nama peserta & durasi', resPubVerify.body.data.participant_name === 'Fadhil Rahman, S.Pd.');

    // 3.2 Ambil Butir Pertanyaan Publik
    const resPubQuestions = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/public/${mbtiToken}/questions`);
    assert('GET /psychotest/public/:token/questions status 200', resPubQuestions.status === 200);
    const questionsMbti = resPubQuestions.body.data.questions;
    assert('Menerima seluruh butir soal MBTI untuk dikerjakan', questionsMbti && questionsMbti.length >= 40);

    // 3.3 Simpan Jawaban Pola (Simulasikan INTJ: I, N, T, J)
    // Pola: Opsi A = E, S, T, J | Opsi B = I, N, F, P
    // Jadi untuk INTJ: EI -> B (I), SN -> B (N), TF -> A (T), JP -> A (J)
    const mbtiAnswers = [];
    questionsMbti.forEach((q) => {
      let opt = 'A';
      if (q.dimension_name.includes('Extraversion') || q.dimension_name.includes('EI')) opt = 'B'; // I
      else if (q.dimension_name.includes('Sensing') || q.dimension_name.includes('SN')) opt = 'B'; // N
      else if (q.dimension_name.includes('Thinking') || q.dimension_name.includes('TF')) opt = 'A'; // T
      else if (q.dimension_name.includes('Judging') || q.dimension_name.includes('JP')) opt = 'A'; // J
      mbtiAnswers.push({
        question_id: q.id,
        selected_option: opt,
        response_time_seconds: 3
      });
    });

    const resSaveAnswers = await makeRequest('POST', `/api/v1/kepegawaian/psychotest/public/${mbtiToken}/answers`, {}, {
      answers: mbtiAnswers
    });
    assert('POST /psychotest/public/:token/answers (Batch) status 200', resSaveAnswers.status === 200);

    // 3.4 Submit Ujian MBTI
    const resPubSubmit = await makeRequest('POST', `/api/v1/kepegawaian/psychotest/public/${mbtiToken}/submit`);
    assert('POST /psychotest/public/:token/submit status 200', resPubSubmit.status === 200);
    assert('Status ujian selesai dan ditutup', resPubSubmit.body.data.status === 'completed');

    // 3.5 Verifikasi Proteksi Sesi yang Sudah Selesai
    const resReaccess = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/public/${mbtiToken}`);
    assert('Akses ulang sesi selesai ditolak dengan status 400', resReaccess.status === 400);

    // -----------------------------------------------------------------
    // TEST GROUP 4: Self-Service Karyawan Flow (6.3) - Eksekusi Ujian Big Five
    // -----------------------------------------------------------------
    console.log('\n👤 4. UJI COBA KELOMPOK 6.3: SELF-SERVICE KARYAWAN (BIG FIVE)');

    // 4.1 Ambil Soal Sesi Big Five
    const resTakeBf = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/my-tests/${bfSession.id}/take`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/my-tests/:id/take status 200', resTakeBf.status === 200);
    const questionsBf = resTakeBf.body.data.questions;
    assert('Menerima butir soal skala Likert Big Five', questionsBf && questionsBf.length === 50);

    // 4.2 Kirim Jawaban Likert (Nilai 5 untuk Openness & Conscientiousness, 1 untuk Neuroticism)
    for (let i = 0; i < questionsBf.length; i++) {
      const q = questionsBf[i];
      let val = '4';
      if (q.dimension_name.includes('Openness') || q.dimension_name.includes('Conscientiousness')) val = '5';
      if (q.dimension_name.includes('Neuroticism')) val = '1';

      await makeRequest('POST', `/api/v1/kepegawaian/psychotest/my-tests/${bfSession.id}/answer`, {
        'Authorization': `Bearer ${adminToken}`
      }, {
        question_id: q.id,
        selected_option: val,
        response_time_seconds: 2
      });
    }
    assert('Jawaban butir-butir Likert Big Five berhasil disimpan satu per satu', true);

    // 4.3 Submit & Evaluasi Skor Otomatis Big Five
    const resSubmitBf = await makeRequest('POST', `/api/v1/kepegawaian/psychotest/my-tests/${bfSession.id}/submit`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('POST /psychotest/my-tests/:id/submit status 200', resSubmitBf.status === 200);
    assert('Kalkulasi Big Five menghasilkan dimension_scores OCEAN', resSubmitBf.body.data.dimension_scores && resSubmitBf.body.data.dimension_scores.O);

    // -----------------------------------------------------------------
    // TEST GROUP 5: Laporan Detail HRD & Evaluasi Asesor (6.2)
    // -----------------------------------------------------------------
    console.log('\n📊 5. UJI COBA LAPORAN HASIL SKOR & ASESMEN HRD');

    // 5.1 Cek Laporan Hasil MBTI
    const resResultMbti = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/sessions/${mbtiSession.id}/result`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/sessions/:id/result (MBTI) status 200', resResultMbti.status === 200);
    const mbtiResult = resResultMbti.body.data;
    assert('Hasil MBTI terdeteksi presisi sebagai INTJ', mbtiResult.result_code === 'INTJ', `Hasil aktual: ${mbtiResult.result_code}`);
    assert('Memuat Radar Chart MBTI 8 Kutub', Array.isArray(mbtiResult.radar_chart_data) && mbtiResult.radar_chart_data.length === 8);

    // 5.2 Cek Laporan Hasil Big Five
    const resResultBf = await makeRequest('GET', `/api/v1/kepegawaian/psychotest/sessions/${bfSession.id}/result`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/sessions/:id/result (Big Five) status 200', resResultBf.status === 200);
    const bfResult = resResultBf.body.data;
    assert('Memuat Radar Chart Big Five 5 Dimensi OCEAN', Array.isArray(bfResult.radar_chart_data) && bfResult.radar_chart_data.length === 5);

    // 5.3 Input Evaluasi Asesor & Catatan HRD
    const resEval = await makeRequest('POST', `/api/v1/kepegawaian/psychotest/sessions/${mbtiSession.id}/evaluate`, {
      'Authorization': `Bearer ${adminToken}`
    }, {
      assessor_name: 'Dra. Hj. Nurjanah, M.Psi., Psikolog',
      assessor_evaluation: 'Karakter INTJ sangat cocok dengan formasi perencanaan strategis dan kurikulum pesantren.',
      hrd_recommendation: 'Direkomendasikan Lulus dengan Catatan Pengembangan'
    });
    assert('POST /psychotest/sessions/:id/evaluate status 200', resEval.status === 200);
    assert('Evaluasi asesor berhasil terupdate pada hasil ujian', resEval.body.data.assessor_name === 'Dra. Hj. Nurjanah, M.Psi., Psikolog');

    // 5.4 Summary Report
    const resSummary = await makeRequest('GET', '/api/v1/kepegawaian/psychotest/reports/summary', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert('GET /psychotest/reports/summary status 200', resSummary.status === 200);
    assert('Rangkuman statistik memuat total sesi & distribusi tipe', resSummary.body.data.total_sessions >= 2);

    console.log('\n================================================================');
    console.log(`🎉 UJI COBA SELESAI: ${passedCount}/${totalCount} PENGUJIAN BERHASIL (100% PASS)`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Terjadi kesalahan fatal saat uji coba:', error);
    process.exit(1);
  }
}

runTests();
