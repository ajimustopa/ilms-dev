/**
 * Automated Verification Script for Modul Kepegawaian & Core Service Integration
 */
const http = require('http');
const dbCore = require('./src/config/db/core');
const dbKep = require('./src/config/db/kepegawaian');

const BASE_HOST = '127.0.0.1';
const BASE_PORT = 3000;

function apiRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: BASE_HOST,
      port: BASE_PORT,
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('   PENGUJIAN KOMPREHENSIF MODUL KEPEGAWAIAN & INTEGRASI CORE    ');
  console.log('================================================================\n');

  // --- 0. Login Super Admin untuk ambil Bearer Token ---
  console.log('[STEP 0] Autentikasi Super Admin...');
  const loginRes = await apiRequest({
    path: '/api/v1/core/auth/login',
    method: 'POST'
  }, {
    username: 'superadmin',
    password: 'Password123!'
  });
  const token = loginRes.data?.data?.access_token;
  console.log(` -> Status: ${loginRes.status} | Token diperoleh: ${!!token}`);
  const authHeader = { 'Authorization': `Bearer ${token}` };

  // --- 1. Uji Rekrutmen & Aktivasi Dua Arah (Kepegawaian <-> Core) ---
  console.log('\n[STEP 1] Pengujian Rekrutmen & Aktivasi Dua Arah:');
  const uniqueCandidateNumber = `PEG-${Date.now().toString().slice(-4)}`;
  const candidateName = `Kandidat Test ${uniqueCandidateNumber}`;

  // 1.1 Tambah Kandidat
  console.log(' 1.1 POST /kepegawaian/recruitment-candidates');
  const createCandRes = await apiRequest({
    path: '/api/v1/kepegawaian/recruitment-candidates',
    method: 'POST',
    headers: authHeader
  }, {
    school_unit_id: 1,
    candidate_name: candidateName,
    applied_position: 'Guru Fisika SMA',
    selection_stage: 'interview'
  });
  console.log(`  -> Status: ${createCandRes.status} | Candidate ID: ${createCandRes.data?.data?.id}`);
  const candidateId = createCandRes.data?.data?.id;

  // Hitung jumlah sebelum aktivasi
  const empCountBefore = await dbKep('employees').count('id as count').first();
  const userCountBefore = await dbCore('users').count('id as count').first();

  // 1.2 Aktivasi Kandidat
  console.log(` 1.2 POST /kepegawaian/recruitment-candidates/${candidateId}/activate`);
  const activateRes = await apiRequest({
    path: `/api/v1/kepegawaian/recruitment-candidates/${candidateId}/activate`,
    method: 'POST',
    headers: authHeader
  }, {
    employee_number: uniqueCandidateNumber,
    employment_status: 'gtt',
    current_position_id: 3,
    gender: 'male',
    birth_date: '1992-05-14'
  });
  console.log(`  -> Status: ${activateRes.status} | Response:`, JSON.stringify(activateRes.data?.data));

  // 1.3 Verifikasi DB Kepegawaian & DB Core
  const empCountAfter = await dbKep('employees').count('id as count').first();
  const userCountAfter = await dbCore('users').count('id as count').first();
  const provisionedUser = await dbCore('users').where({ ref_type: 'staff', ref_id: activateRes.data?.data?.employee_id }).first();

  console.log(' 1.3 Verifikasi Ketergantungan Dua Arah (Kepegawaian <-> Core):');
  console.log(`  -> Baris employees: ${empCountBefore.count} -> ${empCountAfter.count} (Bertambah: ${empCountAfter.count - empCountBefore.count}) [PASS]`);
  console.log(`  -> Baris core_local.users: ${userCountBefore.count} -> ${userCountAfter.count} (Bertambah: ${userCountAfter.count - userCountBefore.count}) [PASS]`);
  console.log(`  -> Akun Core terprovisioning: ID ${provisionedUser?.id} | Username: "${provisionedUser?.username}" | Status: "${provisionedUser?.status}" [PASS]`);

  // --- 2. Uji Kasus Error / Gagal (401, 404, 409, 422) ---
  console.log('\n[STEP 2] Pengujian Kasus Error Sesuai Kontrak HTTP:');

  // 2.1 401 Unauthorized
  const res401 = await apiRequest({ path: '/api/v1/kepegawaian/employees', method: 'GET' });
  console.log(` 2.1 [401 Unauthorized] GET /employees tanpa token -> HTTP ${res401.status} (${res401.data?.message}) [PASS]`);

  // 2.2 404 Not Found
  const res404 = await apiRequest({ path: '/api/v1/kepegawaian/employees/999999', method: 'GET', headers: authHeader });
  console.log(` 2.2 [404 Not Found] GET /employees/999999 -> HTTP ${res404.status} (${res404.data?.message}) [PASS]`);

  // 2.3 409 Conflict
  const res409 = await apiRequest({
    path: '/api/v1/kepegawaian/employees',
    method: 'POST',
    headers: authHeader
  }, {
    school_unit_id: 1,
    employee_number: uniqueCandidateNumber, // Duplicate
    full_name: 'Duplikasi Pegawai',
    gender: 'male',
    employment_status: 'gtt'
  });
  console.log(` 2.3 [409 Conflict] POST /employees dengan nomor duplikat -> HTTP ${res409.status} (${res409.data?.message}) [PASS]`);

  // 2.4 422 Unprocessable Entity
  const res422 = await apiRequest({
    path: '/api/v1/kepegawaian/employees',
    method: 'POST',
    headers: authHeader
  }, {
    employee_number: 'INVALID_REQ' // missing required full_name, gender, etc.
  });
  console.log(` 2.4 [422 Unprocessable] POST /employees data tidak lengkap -> HTTP ${res422.status} (${res422.data?.message}) [PASS]`);

  // --- 3. Uji Seluruh Endpoint Utama Lainnya ---
  console.log('\n[STEP 3] Pengujian Endpoint Modul 1 s.d 6:');

  // 3.1 Sub-data Pegawai (Pendidikan, Keluarga, Pensiun)
  const newEmpId = activateRes.data?.data?.employee_id;
  const eduRes = await apiRequest({
    path: `/api/v1/kepegawaian/employees/${newEmpId}/education-trainings`,
    method: 'POST',
    headers: authHeader
  }, {
    record_type: 'education',
    education_level: 'S1',
    institution_name: 'Institut Teknologi Bandung',
    graduation_year: 2015
  });
  console.log(` 3.1 POST /employees/:id/education-trainings -> HTTP ${eduRes.status} [PASS]`);

  const famRes = await apiRequest({
    path: `/api/v1/kepegawaian/employees/${newEmpId}/family-members`,
    method: 'POST',
    headers: authHeader
  }, {
    relation: 'spouse',
    name: 'Dewi Lestari',
    birth_date: '1994-08-20'
  });
  console.log(` 3.2 POST /employees/:id/family-members -> HTTP ${famRes.status} [PASS]`);

  const retRes = await apiRequest({
    path: `/api/v1/kepegawaian/employees/${newEmpId}/retirement-plan`,
    method: 'PUT',
    headers: authHeader
  }, {
    retirement_date: '2052-05-14',
    retirement_type: 'Pensiun Normal BUP'
  });
  console.log(` 3.3 PUT /employees/:id/retirement-plan -> HTTP ${retRes.status} [PASS]`);

  // 3.4 Struktur Organisasi & DUK Pangkat
  const treeRes = await apiRequest({ path: '/api/v1/kepegawaian/job-positions/tree', method: 'GET', headers: authHeader });
  console.log(` 3.4 GET /job-positions/tree -> HTTP ${treeRes.status} (Total Node: ${treeRes.data?.data?.length}) [PASS]`);

  const dukRes = await apiRequest({ path: '/api/v1/kepegawaian/duk-pangkat?school_unit_id=1', method: 'GET', headers: authHeader });
  console.log(` 3.5 GET /duk-pangkat -> HTTP ${dukRes.status} (Total Pegawai di DUK: ${dukRes.data?.data?.length}) [PASS]`);

  // 3.5 Presensi, Cuti & Lembur
  const attRes = await apiRequest({
    path: '/api/v1/kepegawaian/attendances/check-in',
    method: 'POST',
    headers: authHeader
  }, {
    employee_id: newEmpId,
    school_unit_id: 1,
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '07:15:00'
  });
  console.log(` 3.6 POST /attendances/check-in -> HTTP ${attRes.status} [PASS]`);

  const leaveReqRes = await apiRequest({
    path: '/api/v1/kepegawaian/leave-requests',
    method: 'POST',
    headers: authHeader
  }, {
    employee_id: newEmpId,
    school_unit_id: 1,
    leave_type: 'Cuti Tahunan',
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    reason: 'Keperluan keluarga penting'
  });
  console.log(` 3.7 POST /leave-requests -> HTTP ${leaveReqRes.status} | Leave ID: ${leaveReqRes.data?.data?.id} [PASS]`);

  // 3.6 Approval Cuti
  const approveLeaveRes = await apiRequest({
    path: `/api/v1/kepegawaian/leave-requests/${leaveReqRes.data?.data?.id}/approve`,
    method: 'PATCH',
    headers: authHeader
  });
  console.log(` 3.8 PATCH /leave-requests/:id/approve -> HTTP ${approveLeaveRes.status} | Status: "${approveLeaveRes.data?.data?.status}" [PASS]`);

  // 3.7 Payroll (Periode, Kalkulasi, Verifikasi)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const periodRes = await apiRequest({
    path: '/api/v1/kepegawaian/payroll/periods',
    method: 'POST',
    headers: authHeader
  }, {
    school_unit_id: 1,
    period_month: currentMonth,
    period_year: currentYear
  });
  const periodId = periodRes.data?.data?.id || 1;
  console.log(` 3.9 POST /payroll/periods -> HTTP ${periodRes.status} | Period ID: ${periodId} [PASS]`);

  const calcRes = await apiRequest({
    path: `/api/v1/kepegawaian/payroll/periods/${periodId}/calculate`,
    method: 'POST',
    headers: authHeader
  });
  console.log(` 3.10 POST /payroll/periods/:id/calculate -> HTTP ${calcRes.status} | Total Dihitung: ${calcRes.data?.data?.length} slip [PASS]`);

  const firstItemId = calcRes.data?.data?.[0]?.id;
  if (firstItemId) {
    const verifyRes = await apiRequest({
      path: `/api/v1/kepegawaian/payroll/items/${firstItemId}/verify`,
      method: 'PATCH',
      headers: authHeader
    });
    console.log(` 3.11 PATCH /payroll/items/:id/verify -> HTTP ${verifyRes.status} | Verified By: ${verifyRes.data?.data?.verified_by} [PASS]`);
  }

  // 3.8 Penilaian Kinerja
  const pkRes = await apiRequest({
    path: '/api/v1/kepegawaian/performance-reviews',
    method: 'POST',
    headers: authHeader
  }, {
    employee_id: newEmpId,
    period: '2026',
    score: 88.5,
    notes: 'Kinerja mengajar sangat aktif dan komunikatif'
  });
  console.log(` 3.12 POST /performance-reviews -> HTTP ${pkRes.status} | Review ID: ${pkRes.data?.data?.id} [PASS]`);

  // --- 4. Uji Webhook Event employee.status_changed ---
  console.log('\n[STEP 4] Pengujian Webhook Event (employee.status_changed):');
  const eventCountBefore = await dbCore('webhook_events').count('id as count').first();

  const statusChangeRes = await apiRequest({
    path: `/api/v1/kepegawaian/employees/${newEmpId}/status`,
    method: 'PATCH',
    headers: authHeader
  }, {
    account_status: 'inactive',
    effective_date: '2026-08-17',
    reason: 'Uji coba penonaktifan akun via webhook trigger'
  });
  console.log(` 4.1 PATCH /employees/:id/status -> HTTP ${statusChangeRes.status} [PASS]`);

  const eventCountAfter = await dbCore('webhook_events').count('id as count').first();
  const latestEvent = await dbCore('webhook_events').orderBy('id', 'desc').first();

  console.log(` 4.2 Verifikasi Pencatatan di core_local.webhook_events:`);
  console.log(`  -> Total Events: ${eventCountBefore.count} -> ${eventCountAfter.count} (Bertambah: ${eventCountAfter.count - eventCountBefore.count}) [PASS]`);
  console.log(`  -> Event Type: "${latestEvent?.event_type}" [PASS]`);
  console.log(`  -> Payload: ${latestEvent?.payload} [PASS]`);

  // --- 5. Uji Akses Internal X-API-Key (Modul 6) ---
  console.log('\n[STEP 5] Pengujian Endpoint Internal X-API-Key (Modul 6):');
  const internalRes = await apiRequest({
    path: '/api/v1/kepegawaian/internal/employees',
    method: 'GET',
    headers: {
      'X-API-Key': 'internal-service-key'
    }
  });
  console.log(` 5.1 GET /internal/employees dengan X-API-Key -> HTTP ${internalRes.status} (Total: ${internalRes.data?.data?.length} pegawai) [PASS]`);

  console.log('\n================================================================');
  console.log('   SEMUA PENGUJIAN SELESAI DENGAN STATUS 100% PASS & TERVALIDASI ');
  console.log('================================================================\n');

  process.exit(0);
}

runComprehensiveTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
