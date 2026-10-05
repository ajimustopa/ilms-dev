/**
 * Express Application Setup for Aldepos API Backend (Modular Monolith)
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { authenticate, verifyJwt, requirePermission, requireApiKey } = require('./middlewares/auth');

// Module Routes & Controllers for Core Service
const authRoutes = require('./modules/core/auth/routes');
const authController = require('./modules/core/auth/controller');
const usersRoutes = require('./modules/core/users/routes');
const usersController = require('./modules/core/users/controller');
const rolesRoutes = require('./modules/core/roles/routes');
const rolesController = require('./modules/core/roles/controller');
const foundationRoutes = require('./modules/core/foundation/routes');
const schoolUnitsRoutes = require('./modules/core/school-units/routes');
const systemSettingsRoutes = require('./modules/core/system-settings/routes');
const webhooksRoutes = require('./modules/core/webhooks/routes');
const apiClientsRoutes = require('./modules/core/api-clients/routes');
const activityLogsRoutes = require('./modules/core/activity-logs/routes');

// Module Routes for Kepegawaian Service
const kepegawaianEmployeesRoutes = require('./modules/kepegawaian/employees/routes');
const kepegawaianEmploymentStatusesRoutes = require('./modules/kepegawaian/employment-statuses/routes');
const kepegawaianDetailsRoutes = require('./modules/kepegawaian/employee-details/routes');
const kepegawaianRecruitmentRoutes = require('./modules/kepegawaian/recruitment/routes');
const kepegawaianOrgRoutes = require('./modules/kepegawaian/organization/routes');
const kepegawaianAttendanceRoutes = require('./modules/kepegawaian/attendance/routes');
const kepegawaianPayrollRoutes = require('./modules/kepegawaian/payroll/routes');
const kepegawaianPerformanceRoutes = require('./modules/kepegawaian/performance/routes');
const kepegawaianPsychotestRoutes = require('./modules/kepegawaian/psychotest/routes');
const kepegawaianInternalRoutes = require('./modules/kepegawaian/internal/routes');

// Module Routes for Akademik Service
const akademikStudentsRoutes = require('./modules/akademik/students/routes');
const akademikCurriculumRoutes = require('./modules/akademik/curriculum/routes');
const akademikTimetableRoutes = require('./modules/akademik/timetable/routes');
const akademikScoresRoutes = require('./modules/akademik/scores/routes');
const akademikReportCardsRoutes = require('./modules/akademik/report-cards/routes');
const akademikAttendanceRoutes = require('./modules/akademik/attendance/routes');
const akademikStudentAffairsRoutes = require('./modules/akademik/student-affairs/routes');
const akademikReportsRoutes = require('./modules/akademik/reports/routes');
const akademikSecurityRoutes = require('./modules/akademik/security/routes');
const akademikPsbRoutes = require('./modules/akademik/psb/routes');
const akademikPsbPortalRoutes = require('./modules/akademik/psb/portal/routes');
const akademikCalendarRoutes = require('./modules/akademik/calendar/routes');
const akademikInternalRoutes = require('./modules/akademik/internal/routes');

// Module Routes for Website Utama & PPDB Service
const websiteUtamaPublicRoutes = require('./modules/website-utama/public/routes');
const websiteUtamaAdminRoutes = require('./modules/website-utama/admin/routes');
const websiteUtamaWebhooksRoutes = require('./modules/website-utama/webhooks/routes');

// Module Routes for Keuangan Service
const keuanganMasterRoutes = require('./modules/keuangan/master-data/routes');
const keuanganBudgetRoutes = require('./modules/keuangan/budget/routes');
const keuanganBillsRoutes = require('./modules/keuangan/bills/routes');
const keuanganPaymentsRoutes = require('./modules/keuangan/payments/routes');
const keuanganExpensesRoutes = require('./modules/keuangan/expenses/routes');
const keuanganOtherIncomesRoutes = require('./modules/keuangan/other-incomes/routes');
const keuanganPayrollRoutes = require('./modules/keuangan/payroll/routes');
const keuanganBookkeepingRoutes = require('./modules/keuangan/bookkeeping/routes');
const keuanganReportsRoutes = require('./modules/keuangan/reports/routes');
const keuanganDashboardRoutes = require('./modules/keuangan/dashboard/routes');
const keuanganParentFacingRoutes = require('./modules/keuangan/parent-facing/routes');
const keuanganSchemesRoutes = require('./modules/keuangan/schemes/routes');
const keuanganLegacyMigrationRoutes = require('./modules/keuangan/legacy-migration/routes');
const keuanganCashTransfersRoutes = require('./modules/keuangan/cash-transfers/routes');
const keuanganPpdbBillingRoutes = require('./modules/keuangan/ppdb-billing/routes');
const keuanganBankStatementsRoutes = require('./modules/keuangan/bank-statements/routes');
const keuanganCanteenRoutes = require('./modules/keuangan/canteen-integration/routes');

const path = require('path');

const app = express();

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true, // Allow requests from any local/LAN IP origin dynamically
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets Storage (Uploads, Canteen QR Images, Documents)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Aldepos API Backend (Modular Monolith)',
      version: '1.0.0',
      status: 'healthy'
    },
    message: 'API Backend is running',
    errors: null
  });
});

// ==========================================
// 1. Core Service Router (/api/v1/core)
// ==========================================
const coreV1Router = express.Router();

// 1.1 Autentikasi (Fitur #1 & #2)
coreV1Router.use('/auth', authRoutes);

// 1.2 Password Resets (Nempel langsung di router Core sesuai api-contract-coreservice.md)
coreV1Router.get(
  '/password-resets',
  verifyJwt,
  requirePermission('core.auth.password_resets.view'),
  authController.listPasswordResets
);
coreV1Router.patch(
  '/password-resets/:id/process',
  verifyJwt,
  requirePermission('core.auth.password_resets.process'),
  authController.processPasswordReset
);

// 1.3 Users (Fitur #3)
coreV1Router.post('/internal/users', requireApiKey, usersController.internalCreate);
coreV1Router.patch('/internal/users/sync', requireApiKey, usersController.internalSync);
coreV1Router.use('/users', usersRoutes);

// 1.4 Role & Permission (Fitur #4)
coreV1Router.use('/roles', rolesRoutes);
coreV1Router.get('/permissions', authenticate, rolesController.listPermissions);
coreV1Router.post('/users/:id/school-roles', authenticate, rolesController.assignUserSchoolRoles);
coreV1Router.delete('/users/:id/school-roles/:role_id', authenticate, rolesController.removeUserSchoolRole);

// 1.5 Data Master: Profil Yayasan (Fitur #6)
coreV1Router.use('/foundation', foundationRoutes);

// 1.6 Data Master: Satuan Pendidikan (Fitur #7)
coreV1Router.use('/school-units', schoolUnitsRoutes);

// 1.7 Data Master: Pengaturan Sistem (Fitur #8)
coreV1Router.use('/system-settings', systemSettingsRoutes);

// 1.8 Integrasi: Webhooks Publisher & Subscriber (Fitur #9 & #10)
coreV1Router.use('/webhooks', webhooksRoutes);

// 1.9 Integrasi: OpenAPI Docs (Fitur #11)
coreV1Router.get('/docs/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Aldepos Core Service API',
      version: '1.0.0'
    },
    paths: {}
  });
});

// 1.10 Integrasi: API Clients & Rate Limiting (Fitur #12)
coreV1Router.use('/', apiClientsRoutes);

// 1.11 Keamanan: Audit Logs (Fitur #5 & #13)
coreV1Router.use('/activity-logs', activityLogsRoutes);
coreV1Router.use('/internal/activity-logs', activityLogsRoutes);

// Mount Core Service Router ke /api/v1/core
app.use('/api/v1/core', coreV1Router);

// ==========================================
// 2. Kepegawaian Service Router (/api/v1/kepegawaian)
// ==========================================
const kepegawaianV1Router = express.Router();

// 2.1 Modul 1: Data Pegawai
kepegawaianV1Router.use('/employees', kepegawaianEmployeesRoutes);
kepegawaianV1Router.use('/employment-statuses', kepegawaianEmploymentStatusesRoutes);
kepegawaianV1Router.use('/', kepegawaianDetailsRoutes);
kepegawaianV1Router.use('/', kepegawaianRecruitmentRoutes);

// 2.2 Modul 2: Organisasi (DUK Pangkat, Jabatan, Riwayat Jabatan, Mutasi)
kepegawaianV1Router.use('/', kepegawaianOrgRoutes);

// 2.3 Modul 3: Kehadiran (Presensi, Cuti & Izin, Lembur)
kepegawaianV1Router.use('/', kepegawaianAttendanceRoutes);

// 2.4 Modul 4: Penggajian (Payroll)
kepegawaianV1Router.use('/', kepegawaianPayrollRoutes);

// 2.5 Modul 5: Kinerja (Penilaian Kinerja & Statistik)
kepegawaianV1Router.use('/', kepegawaianPerformanceRoutes);

// 2.6 Modul Psikotes: Tes Psikologi (MBTI & Big Five OCEAN)
kepegawaianV1Router.use('/psychotest', kepegawaianPsychotestRoutes);

// 2.7 Modul Integrasi: Endpoint X-API-Key untuk modul lain
kepegawaianV1Router.use('/', kepegawaianInternalRoutes);

// Mount Kepegawaian Router ke /api/v1/kepegawaian
app.use('/api/v1/kepegawaian', kepegawaianV1Router);

// ==========================================
// 3. Akademik Service Router (/api/v1/akademik)
// ==========================================
const akademikV1Router = express.Router();

// 3.1 Data Master Siswa
akademikV1Router.use('/', akademikStudentsRoutes);

// 3.2 Kurikulum & Timetable Engine
akademikV1Router.use('/', akademikCurriculumRoutes);
akademikV1Router.use('/timetable', akademikTimetableRoutes);

// 3.3 Penilaian
akademikV1Router.use('/', akademikScoresRoutes);

// 3.4 Rapor
akademikV1Router.use('/', akademikReportCardsRoutes);

// 3.5 Presensi
akademikV1Router.use('/', akademikAttendanceRoutes);

// 3.6 Kesiswaan
akademikV1Router.use('/', akademikStudentAffairsRoutes);

// 3.7 Laporan
akademikV1Router.use('/', akademikReportsRoutes);

// 3.8 Keamanan
akademikV1Router.use('/', akademikSecurityRoutes);

// 3.9 PSB (Penerimaan Murid Baru)
akademikV1Router.use('/', akademikPsbRoutes);
akademikV1Router.use('/psb-portal', akademikPsbPortalRoutes);

// 3.10 Kalender Pendidikan
akademikV1Router.use('/', akademikCalendarRoutes);

// 3.11 Internal Endpoint (X-API-Key)
akademikV1Router.use('/', akademikInternalRoutes);

// Mount Akademik Router ke /api/v1/akademik
app.use('/api/v1/akademik', akademikV1Router);

// ==========================================
// 4. Website Utama & PPDB Service Router (/api/v1/website-utama)
// ==========================================
const websiteUtamaV1Router = express.Router();

// 4.1 Endpoint Publik
websiteUtamaV1Router.use('/public', websiteUtamaPublicRoutes);

// 4.2 Endpoint Admin
websiteUtamaV1Router.use('/admin', websiteUtamaAdminRoutes);

// 4.3 Webhook Endpoint
websiteUtamaV1Router.use('/webhooks', websiteUtamaWebhooksRoutes);

// Mount Website Utama Router ke /api/v1/website-utama
app.use('/api/v1/website-utama', websiteUtamaV1Router);

// ==========================================
// 5. Keuangan Service Router (/api/v1/keuangan)
// ==========================================
const keuanganV1Router = express.Router();

keuanganV1Router.use('/', keuanganMasterRoutes);
keuanganV1Router.use('/', keuanganBudgetRoutes);
keuanganV1Router.use('/', keuanganBillsRoutes);
keuanganV1Router.use('/', keuanganPaymentsRoutes);
keuanganV1Router.use('/', keuanganExpensesRoutes);
keuanganV1Router.use('/', keuanganOtherIncomesRoutes);
keuanganV1Router.use('/', keuanganPayrollRoutes);
keuanganV1Router.use('/', keuanganBookkeepingRoutes);
keuanganV1Router.use('/', keuanganReportsRoutes);
keuanganV1Router.use('/', keuanganDashboardRoutes);
keuanganV1Router.use('/', keuanganParentFacingRoutes);
keuanganV1Router.use('/', keuanganSchemesRoutes);
keuanganV1Router.use('/', keuanganLegacyMigrationRoutes);
keuanganV1Router.use('/', keuanganCashTransfersRoutes);
keuanganV1Router.use('/', keuanganPpdbBillingRoutes);
keuanganV1Router.use('/', keuanganBankStatementsRoutes);
keuanganV1Router.use('/', keuanganCanteenRoutes);

// Mount Keuangan Router ke /api/v1/keuangan
app.use('/api/v1/keuangan', keuanganV1Router);

// Module Routes for Tahfidz & Al-Quran (Alquran) Service
const alquranV1Router = require('./modules/alquran/routes');

// ==========================================
// 6. Tahfidz & Al-Quran Service Router (/api/v1/alquran)
// ==========================================
app.use('/api/v1/alquran', alquranV1Router);

// Module Routes for Kantin Service
const kantinV1Router = require('./modules/kantin/routes');

// ==========================================
// 7. Kantin Service Router (/api/v1/kantin)
// ==========================================
app.use('/api/v1/kantin', kantinV1Router);

// Module Routes for Sarpras Service
const sarprasV1Router = require('./modules/sarpras/routes');

// ==========================================
// 8. Sarpras Service Router (/api/v1/sarpras)
// ==========================================
app.use('/api/v1/sarpras', sarprasV1Router);

// Module Routes for Dapur Service
const dapurV1Router = require('./modules/dapur/routes');

// ==========================================
// 9. Dapur Service Router (/api/v1/dapur)
// ==========================================
app.use('/api/v1/dapur', dapurV1Router);

// Module Routes for Perpustakaan Service
const perpustakaanV1Router = require('./modules/perpustakaan/routes');

// ==========================================
// 9. Perpustakaan Service Router (/api/v1/perpustakaan)
// ==========================================
app.use('/api/v1/perpustakaan', perpustakaanV1Router);

// Module Routes for Manajemen & Mutu Sekolah Service
const manajemenV1Router = require('./modules/manajemen/routes');

// ==========================================
// 10. Manajemen Service Router (/api/v1/manajemen)
// ==========================================
app.use('/api/v1/manajemen', manajemenV1Router);

// Module Routes for PSB (Penerimaan Siswa Baru) Service
const psbRoutes = require('./modules/psb/routes');

// ==========================================
// 11. PSB Service Router (/api/v1/psb)
// ==========================================
app.use('/api/v1/psb', psbRoutes);

// 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
