import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { updateBrowserTab } from './shared/utils/moduleTabHelper';

import ProtectedRoute from './shared/components/ProtectedRoute';

// Loading fallback component
const PageLoader = () => (
  <div className="h-full min-h-[60vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <span className="text-xs text-slate-500 font-medium tracking-wide">Memuat modul...</span>
    </div>
  </div>
);

// Helper for clean lazy loading with Suspense wrapper
const lazyLoad = (importFn) => {
  const LazyComponent = lazy(importFn);
  return <Suspense fallback={<PageLoader />}><LazyComponent /></Suspense>;
};

// 1. Launcher & Login Gates (Eagerly loaded for instant landing)
import Launcher from './pages/Launcher';
import Login from './apps/core/pages/Login';
import { useAuth } from './shared/store/AuthContext';
import { isCashierOnlyUser } from './shared/utils/authHelper';

// Gate for root path: If authenticated -> Launcher (or /kantin/pos if cashier); If unauthenticated -> Login
function RootGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return <PageLoader />;
  }
  if (!isAuthenticated) {
    return <Login />;
  }
  if (isCashierOnlyUser(user)) {
    return <Navigate to="/kantin/pos" replace />;
  }
  return <Launcher />;
}

// Gate for login path: If authenticated -> redirect to root or /kantin/pos; If unauthenticated -> Login
function LoginGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return <PageLoader />;
  }
  if (isAuthenticated) {
    if (isCashierOnlyUser(user)) {
      return <Navigate to="/kantin/pos" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

// 2. Website Utama CMS Routes
import websiteUtamaRoutes from './apps/website-utama/routes';

export const router = createBrowserRouter([
  // 1. Landing Page / Gate (Login jika belum masuk, Launcher jika sudah masuk)
  {
    path: '/',
    element: <RootGate />,
  },

  // 2. Core Login & Shortcut
  {
    path: '/core/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginGate />,
  },

  // 3. Core Service
  {
    path: '/core',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./shared/components/Layout')),
        children: [
          {
            index: true,
            element: <Navigate to="/core/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/core/pages/Dashboard')),
          },
          {
            path: 'users',
            element: lazyLoad(() => import('./apps/core/pages/ManajemenUser')),
          },
          {
            path: 'roles',
            element: lazyLoad(() => import('./apps/core/pages/RoleManagement')),
          },
          {
            path: 'foundation',
            element: lazyLoad(() => import('./apps/core/pages/ProfilYayasan')),
          },
          {
            path: 'yayasan',
            element: lazyLoad(() => import('./apps/core/pages/ProfilYayasan')),
          },
          {
            path: 'school-units',
            element: lazyLoad(() => import('./apps/core/pages/SatuanPendidikan')),
          },
          {
            path: 'satuan-pendidikan',
            element: lazyLoad(() => import('./apps/core/pages/SatuanPendidikan')),
          },
          {
            path: 'settings',
            element: lazyLoad(() => import('./apps/core/pages/PengaturanSistem')),
          },
          {
            path: 'webhooks',
            element: lazyLoad(() => import('./apps/core/pages/WebhookSubscribers')),
          },
          {
            path: 'api-clients',
            element: lazyLoad(() => import('./apps/core/pages/ApiClients')),
          },
          {
            path: 'audit-logs',
            element: lazyLoad(() => import('./apps/core/pages/AuditLog')),
          },
        ],
      },
    ],
  },

  // 4. Kepegawaian Login & Module
  {
    path: '/kepegawaian/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/kepegawaian',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/kepegawaian/components/KepegawaianLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/kepegawaian/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Dashboard')),
          },
          {
            path: 'employees',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/DataPegawai')),
          },
          {
            path: 'employees/:id',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/DetailPegawai')),
          },
          {
            path: 'employment-statuses',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/MasterStatusKepegawaian')),
          },
          {
            path: 'status-kepegawaian',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/MasterStatusKepegawaian')),
          },
          {
            path: 'pegawai',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/DataPegawai')),
          },
          {
            path: 'pegawai/:id',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/DetailPegawai')),
          },
          {
            path: 'recruitment',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Rekrutmen')),
          },
          {
            path: 'rekrutmen',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Rekrutmen')),
          },
          {
            path: 'organization',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/StrukturOrganisasi')),
          },
          {
            path: 'organisasi',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/StrukturOrganisasi')),
          },
          {
            path: 'attendance',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Presensi')),
          },
          {
            path: 'presensi',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Presensi')),
          },
          {
            path: 'attendance-settings',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/PengaturanAbsensi')),
          },
          {
            path: 'pengaturan-absensi',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/PengaturanAbsensi')),
          },
          {
            path: 'leaves-overtimes',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/CutiLembur')),
          },
          {
            path: 'cuti-lembur',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/CutiLembur')),
          },
          {
            path: 'payroll',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/Payroll')),
          },
          {
            path: 'performance',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/PenilaianKinerja')),
          },
          {
            path: 'kinerja',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/PenilaianKinerja')),
          },
          // Fitur Tes Psikologi (MBTI & Big Five OCEAN)
          {
            path: 'psikotes/bank-soal',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/BankSoal')),
          },
          {
            path: 'psikotes/sesi',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/DaftarSesi')),
          },
          {
            path: 'psikotes/laporan/:id',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/LaporanHasil')),
          },
          {
            path: 'psikotes/hasil/:id',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/LaporanHasil')),
          },
          {
            path: 'psikotes/saya',
            element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/IsiTesKaryawan')),
          },
        ],
      },
    ],
  },
  // Public Psychotest Taking Route (Kandidat Pelamar / Publik - Tanpa Login)
  {
    path: '/kepegawaian/psikotes/isi/:token',
    element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/IsiTesPublik')),
  },
  {
    path: '/kepegawaian/psikotes/exam/:token',
    element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/IsiTesPublik')),
  },
  {
    path: '/kepegawaian/psikotes/public/:token',
    element: lazyLoad(() => import('./apps/kepegawaian/pages/psikotes/IsiTesPublik')),
  },

  // 5. Akademik Login & Module
  {
    path: '/akademik/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/akademik',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/akademik/components/AkademikLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/akademik/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/akademik/pages/Dashboard')),
          },
          {
            path: 'students',
            element: lazyLoad(() => import('./apps/akademik/pages/DataSiswa')),
          },
          {
            path: 'students/:id',
            element: lazyLoad(() => import('./apps/akademik/pages/DetailSiswa')),
          },
          {
            path: 'siswa',
            element: lazyLoad(() => import('./apps/akademik/pages/DataSiswa')),
          },
          {
            path: 'siswa/:id',
            element: lazyLoad(() => import('./apps/akademik/pages/DetailSiswa')),
          },
          {
            path: 'rombel',
            element: lazyLoad(() => import('./apps/akademik/pages/RombelManagement')),
          },
          {
            path: 'class-groups',
            element: lazyLoad(() => import('./apps/akademik/pages/RombelManagement')),
          },
          {
            path: 'kenaikan-kelulusan',
            element: lazyLoad(() => import('./apps/akademik/pages/KenaikanKelulusan')),
          },
          {
            path: 'promotion-graduation',
            element: lazyLoad(() => import('./apps/akademik/pages/KenaikanKelulusan')),
          },
          {
            path: 'master',
            element: lazyLoad(() => import('./apps/akademik/pages/MasterAkademik')),
          },
          {
            path: 'master-data',
            element: lazyLoad(() => import('./apps/akademik/pages/MasterAkademik')),
          },
          {
            path: 'curriculum',
            element: lazyLoad(() => import('./apps/akademik/pages/Kurikulum')),
          },
          {
            path: 'kurikulum',
            element: lazyLoad(() => import('./apps/akademik/pages/Kurikulum')),
          },
          {
            path: 'scores',
            element: lazyLoad(() => import('./apps/akademik/pages/InputNilai')),
          },
          {
            path: 'nilai',
            element: lazyLoad(() => import('./apps/akademik/pages/InputNilai')),
          },
          {
            path: 'extracurricular-scores',
            element: lazyLoad(() => import('./apps/akademik/pages/InputNilaiEkstrakurikuler')),
          },
          {
            path: 'nilai-ekstrakurikuler',
            element: lazyLoad(() => import('./apps/akademik/pages/InputNilaiEkstrakurikuler')),
          },
          {
            path: 'report-cards',
            element: lazyLoad(() => import('./apps/akademik/pages/Rapor')),
          },
          {
            path: 'rapor',
            element: lazyLoad(() => import('./apps/akademik/pages/Rapor')),
          },
          {
            path: 'attendance',
            element: lazyLoad(() => import('./apps/akademik/pages/Presensi')),
          },
          {
            path: 'presensi',
            element: lazyLoad(() => import('./apps/akademik/pages/Presensi')),
          },
          {
            path: 'student-affairs',
            element: lazyLoad(() => import('./apps/akademik/pages/Kesiswaan')),
          },
          {
            path: 'kesiswaan',
            element: lazyLoad(() => import('./apps/akademik/pages/Kesiswaan')),
          },
          {
            path: 'extracurriculars',
            element: lazyLoad(() => import('./apps/akademik/pages/Ekstrakurikuler')),
          },
          {
            path: 'ekstrakurikuler',
            element: lazyLoad(() => import('./apps/akademik/pages/Ekstrakurikuler')),
          },
          {
            path: 'schedules',
            element: lazyLoad(() => import('./apps/akademik/pages/JadwalPelajaran')),
          },
          {
            path: 'jadwal',
            element: lazyLoad(() => import('./apps/akademik/pages/JadwalPelajaran')),
          },
          {
            path: 'calendar',
            element: lazyLoad(() => import('./apps/akademik/pages/KalenderAkademik')),
          },
          {
            path: 'kalender',
            element: lazyLoad(() => import('./apps/akademik/pages/KalenderAkademik')),
          },
          // PSB dialihkan ke Modul PPDB tersendiri (/ppdb)
          {
            path: 'psb',
            element: <Navigate to="/ppdb" replace />,
          },
          {
            path: 'psb/*',
            element: <Navigate to="/ppdb" replace />,
          },
          {
            path: 'riwayat-data',
            element: lazyLoad(() => import('./apps/akademik/pages/RiwayatAkademik')),
          },
          {
            path: 'academic-history',
            element: lazyLoad(() => import('./apps/akademik/pages/RiwayatAkademik')),
          },
        ],
      },
    ],
  },

  // 6. Website Utama CMS
  websiteUtamaRoutes,

  // 7. Keuangan Login & Module
  {
    path: '/keuangan/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/keuangan',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/keuangan/components/KeuanganLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/keuangan/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/keuangan/pages/Dashboard')),
          },
          {
            path: 'master-data',
            element: lazyLoad(() => import('./apps/keuangan/pages/MasterData')),
          },
          {
            path: 'master',
            element: lazyLoad(() => import('./apps/keuangan/pages/MasterData')),
          },
          {
            path: 'unit-consolidation',
            element: lazyLoad(() => import('./apps/keuangan/pages/UnitConsolidation')),
          },
          {
            path: 'pengelolaan-gabungan',
            element: lazyLoad(() => import('./apps/keuangan/pages/UnitConsolidation')),
          },
          {
            path: 'fee-schemes',
            element: lazyLoad(() => import('./apps/keuangan/pages/FeeSchemes')),
          },
          {
            path: 'schemes',
            element: lazyLoad(() => import('./apps/keuangan/pages/FeeSchemes')),
          },
          {
            path: 'fee-assignments',
            element: lazyLoad(() => import('./apps/keuangan/pages/StudentFeeAssignments')),
          },
          {
            path: 'assignments',
            element: lazyLoad(() => import('./apps/keuangan/pages/StudentFeeAssignments')),
          },
          {
            path: 'budget',
            element: lazyLoad(() => import('./apps/keuangan/pages/BudgetPlans')),
          },
          {
            path: 'bills',
            element: lazyLoad(() => import('./apps/keuangan/pages/StudentBills')),
          },
          {
            path: 'parent-facing/bills',
            element: lazyLoad(() => import('./apps/keuangan/pages/ParentBills')),
          },
          {
            path: 'portal-wali',
            element: lazyLoad(() => import('./apps/keuangan/pages/ParentBills')),
          },
          {
            path: 'tagihan-santri',
            element: lazyLoad(() => import('./apps/keuangan/pages/ParentBills')),
          },
          {
            path: 'ppdb-billing',
            element: lazyLoad(() => import('./apps/keuangan/pages/RegistrationBilling')),
          },
          {
            path: 'student-ledger',
            element: lazyLoad(() => import('./apps/keuangan/pages/StudentPaymentCard')),
          },
          {
            path: 'student-payment-card',
            element: lazyLoad(() => import('./apps/keuangan/pages/StudentPaymentCard')),
          },
          {
            path: 'canteen',
            element: lazyLoad(() => import('./apps/keuangan/pages/CanteenIntegration')),
          },
          {
            path: 'kantin',
            element: lazyLoad(() => import('./apps/keuangan/pages/CanteenIntegration')),
          },
          {
            path: 'legacy-migration',
            element: lazyLoad(() => import('./apps/keuangan/pages/LegacyMigration')),
          },
          {
            path: 'migrasi-historis',
            element: lazyLoad(() => import('./apps/keuangan/pages/LegacyMigration')),
          },
          {
            path: 'fund-balances',
            element: lazyLoad(() => import('./apps/keuangan/pages/FundBalances')),
          },
          {
            path: 'saldo-dana',
            element: lazyLoad(() => import('./apps/keuangan/pages/FundBalances')),
          },
          {
            path: 'pos-alokasi-dana',
            element: lazyLoad(() => import('./apps/keuangan/pages/FundBalances')),
          },
          {
            path: 'payments',
            element: lazyLoad(() => import('./apps/keuangan/pages/Payments')),
          },
          {
            path: 'penerimaan',
            element: lazyLoad(() => import('./apps/keuangan/pages/Payments')),
          },
          {
            path: 'bank-statements',
            element: lazyLoad(() => import('./apps/keuangan/pages/BankStatements')),
          },
          {
            path: 'rekening-koran',
            element: lazyLoad(() => import('./apps/keuangan/pages/BankStatements')),
          },
          {
            path: 'expenses',
            element: lazyLoad(() => import('./apps/keuangan/pages/Expenses')),
          },
          {
            path: 'other-incomes',
            element: lazyLoad(() => import('./apps/keuangan/pages/Payments')),
          },
          {
            path: 'incomes',
            element: lazyLoad(() => import('./apps/keuangan/pages/Payments')),
          },
          {
            path: 'payroll',
            element: lazyLoad(() => import('./apps/keuangan/pages/Expenses')),
          },
          {
            path: 'bookkeeping',
            element: lazyLoad(() => import('./apps/keuangan/pages/Bookkeeping')),
          },
          {
            path: 'accounting',
            element: lazyLoad(() => import('./apps/keuangan/pages/Bookkeeping')),
          },
          {
            path: 'reports',
            element: lazyLoad(() => import('./apps/keuangan/pages/Reports')),
          },
        ],
      },
    ],
  },

  // 8. Tahfidz Login & Module
  {
    path: '/alquran/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/alquran',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/alquran/components/AlquranLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/alquran/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/alquran/pages/Dashboard')),
          },
          {
            path: 'targets',
            element: lazyLoad(() => import('./apps/alquran/pages/TargetHafalan')),
          },
          {
            path: 'target',
            element: lazyLoad(() => import('./apps/alquran/pages/TargetHafalan')),
          },
          {
            path: 'records',
            element: lazyLoad(() => import('./apps/alquran/pages/CapaianHafalan')),
          },
          {
            path: 'capaian',
            element: lazyLoad(() => import('./apps/alquran/pages/CapaianHafalan')),
          },
          {
            path: 'exams',
            element: lazyLoad(() => import('./apps/alquran/pages/UjianMunaqasyah')),
          },
          {
            path: 'munaqasyah',
            element: lazyLoad(() => import('./apps/alquran/pages/UjianMunaqasyah')),
          },
          {
            path: 'books',
            element: lazyLoad(() => import('./apps/alquran/pages/KitabKuning')),
          },
          {
            path: 'kitab',
            element: lazyLoad(() => import('./apps/alquran/pages/KitabKuning')),
          },
          {
            path: 'reports',
            element: lazyLoad(() => import('./apps/alquran/pages/LaporanHafalan')),
          },
          {
            path: 'laporan',
            element: lazyLoad(() => import('./apps/alquran/pages/LaporanHafalan')),
          },
        ],
      },
    ],
  },

  // 9. Kantin Login & Module
  {
    path: '/kantin/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/kantin',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/kantin/components/KantinLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/kantin/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/kantin/pages/Dashboard')),
          },
          {
            path: 'pos',
            element: lazyLoad(() => import('./apps/kantin/pages/TransaksiPenjualan')),
          },
          {
            path: 'cashiers',
            element: lazyLoad(() => import('./apps/kantin/pages/PengelolaanKasir')),
          },
          {
            path: 'kasir',
            element: lazyLoad(() => import('./apps/kantin/pages/PengelolaanKasir')),
          },
          {
            path: 'wallet',
            element: lazyLoad(() => import('./apps/kantin/pages/TopUpTarikTunai')),
          },
          {
            path: 'topup',
            element: lazyLoad(() => import('./apps/kantin/pages/TopUpTarikTunai')),
          },
          {
            path: 'students',
            element: lazyLoad(() => import('./apps/kantin/pages/DataSiswaKantin')),
          },
          {
            path: 'saldo-siswa',
            element: lazyLoad(() => import('./apps/kantin/pages/DataSiswaKantin')),
          },
          {
            path: 'limits',
            element: lazyLoad(() => import('./apps/kantin/pages/LimitJajan')),
          },
          {
            path: 'limit-jajan',
            element: lazyLoad(() => import('./apps/kantin/pages/LimitJajan')),
          },
          {
            path: 'products',
            element: lazyLoad(() => import('./apps/kantin/pages/ProdukVendor')),
          },
          {
            path: 'produk',
            element: lazyLoad(() => import('./apps/kantin/pages/ProdukVendor')),
          },
          {
            path: 'categories',
            element: lazyLoad(() => import('./apps/kantin/pages/KategoriProduk')),
          },
          {
            path: 'kategori',
            element: lazyLoad(() => import('./apps/kantin/pages/KategoriProduk')),
          },
          {
            path: 'vendors',
            element: lazyLoad(() => import('./apps/kantin/pages/Vendor')),
          },
          {
            path: 'vendor',
            element: lazyLoad(() => import('./apps/kantin/pages/Vendor')),
          },
          {
            path: 'goods-receipts',
            element: lazyLoad(() => import('./apps/kantin/pages/PenerimaanBarang')),
          },
          {
            path: 'penerimaan',
            element: lazyLoad(() => import('./apps/kantin/pages/PenerimaanBarang')),
          },
          {
            path: 'product-returns',
            element: lazyLoad(() => import('./apps/kantin/pages/ReturBarang')),
          },
          {
            path: 'retur',
            element: lazyLoad(() => import('./apps/kantin/pages/ReturBarang')),
          },
          {
            path: 'receivables-canteen',
            element: lazyLoad(() => import('./apps/kantin/pages/PiutangHakKantin')),
          },
          {
            path: 'piutang-kantin',
            element: lazyLoad(() => import('./apps/kantin/pages/PiutangHakKantin')),
          },
          {
            path: 'receivables-vendor',
            element: lazyLoad(() => import('./apps/kantin/pages/HakVendor')),
          },
          {
            path: 'hak-vendor',
            element: lazyLoad(() => import('./apps/kantin/pages/HakVendor')),
          },
          {
            path: 'expenses',
            element: lazyLoad(() => import('./apps/kantin/pages/PengeluaranOperasional')),
          },
          {
            path: 'pengeluaran',
            element: lazyLoad(() => import('./apps/kantin/pages/PengeluaranOperasional')),
          },
          {
            path: 'akuntansi',
            element: lazyLoad(() => import('./apps/kantin/pages/AkuntansiKantin')),
          },
          {
            path: 'accounting',
            element: lazyLoad(() => import('./apps/kantin/pages/AkuntansiKantin')),
          },
          {
            path: 'reports',
            element: lazyLoad(() => import('./apps/kantin/pages/LaporanKantin')),
          },
          {
            path: 'laporan',
            element: lazyLoad(() => import('./apps/kantin/pages/LaporanKantin')),
          },
        ],
      },
    ],
  },

  // 10. Sarpras Login & Module
  {
    path: '/sarpras/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/sarpras',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/sarpras/components/SarprasLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/sarpras/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/sarpras/pages/Dashboard')),
          },
          {
            path: 'locations',
            element: lazyLoad(() => import('./apps/sarpras/pages/LokasiFisik')),
          },
          {
            path: 'lokasi',
            element: lazyLoad(() => import('./apps/sarpras/pages/LokasiFisik')),
          },
          {
            path: 'assets',
            element: lazyLoad(() => import('./apps/sarpras/pages/InventarisAset')),
          },
          {
            path: 'aset',
            element: lazyLoad(() => import('./apps/sarpras/pages/InventarisAset')),
          },
          {
            path: 'bookings',
            element: lazyLoad(() => import('./apps/sarpras/pages/PeminjamanFasilitas')),
          },
          {
            path: 'peminjaman',
            element: lazyLoad(() => import('./apps/sarpras/pages/PeminjamanFasilitas')),
          },
          {
            path: 'maintenance',
            element: lazyLoad(() => import('./apps/sarpras/pages/Pemeliharaan')),
          },
          {
            path: 'pemeliharaan',
            element: lazyLoad(() => import('./apps/sarpras/pages/Pemeliharaan')),
          },
          {
            path: 'procurement',
            element: lazyLoad(() => import('./apps/sarpras/pages/Pengadaan')),
          },
          {
            path: 'pengadaan',
            element: lazyLoad(() => import('./apps/sarpras/pages/Pengadaan')),
          },
          {
            path: 'consumables',
            element: lazyLoad(() => import('./apps/sarpras/pages/BahanHabisPakai')),
          },
          {
            path: 'bhp',
            element: lazyLoad(() => import('./apps/sarpras/pages/BahanHabisPakai')),
          },
          {
            path: 'reports',
            element: lazyLoad(() => import('./apps/sarpras/pages/Laporan')),
          },
          {
            path: 'laporan',
            element: lazyLoad(() => import('./apps/sarpras/pages/Laporan')),
          },
        ],
      },
    ],
  },

  // 11. Dapur Login & Module
  {
    path: '/dapur/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/dapur',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/dapur/components/DapurLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/dapur/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/dapur/pages/Dashboard')),
          },
          {
            path: 'master-data',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'master',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'menus',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'recipes',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'planning',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'budgets',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'procurement',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'receipts',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
          {
            path: 'inventory',
            element: lazyLoad(() => import('./apps/dapur/pages/MasterData')),
          },
        ],
      },
    ],
  },

  // 12. OPAC Publik Perpustakaan
  {
    path: '/perpustakaan/opac',
    element: lazyLoad(() => import('./apps/perpustakaan/pages/Opac')),
  },

  // 13. Perpustakaan Login & Module
  {
    path: '/perpustakaan/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/perpustakaan',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/perpustakaan/components/PerpustakaanLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/perpustakaan/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Dashboard')),
          },
          {
            path: 'books',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Katalog')),
          },
          {
            path: 'categories',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Katalog')),
          },
          {
            path: 'katalog',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Katalog')),
          },
          {
            path: 'members',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Anggota')),
          },
          {
            path: 'anggota',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Anggota')),
          },
          {
            path: 'loans',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Sirkulasi')),
          },
          {
            path: 'sirkulasi',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Sirkulasi')),
          },
          {
            path: 'reservations',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Reservasi')),
          },
          {
            path: 'reservasi',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Reservasi')),
          },
          {
            path: 'lost-damaged',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Katalog')),
          },
          {
            path: 'reminders',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Sirkulasi')),
          },
          {
            path: 'reports',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Katalog')),
          },
          {
            path: 'opac',
            element: lazyLoad(() => import('./apps/perpustakaan/pages/Opac')),
          },
        ],
      },
    ],
  },

  // 14. Manajemen Login & Module
  {
    path: '/manajemen/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/manajemen',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/manajemen/components/ManajemenLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/manajemen/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/manajemen/pages/Dashboard')),
          },
          {
            path: 'institution-profile',
            element: lazyLoad(() => import('./apps/manajemen/pages/InstitutionProfile')),
          },
          {
            path: 'planning',
            element: lazyLoad(() => import('./apps/manajemen/pages/Planning')),
          },
          {
            path: 'planning/rips',
            element: lazyLoad(() => import('./apps/manajemen/pages/RipsPlanning')),
          },
          {
            path: 'planning/rkjp-rkjm',
            element: lazyLoad(() => import('./apps/manajemen/pages/LongTermPlanning')),
          },
          {
            path: 'planning/rkt',
            element: lazyLoad(() => import('./apps/manajemen/pages/AnnualWorkPlan')),
          },
          {
            path: 'evadir',
            element: lazyLoad(() => import('./apps/manajemen/pages/SelfEvaluation')),
          },
          {
            path: 'bsc',
            element: lazyLoad(() => import('./apps/manajemen/pages/BalancedScorecard')),
          },
          {
            path: 'quality',
            element: lazyLoad(() => import('./apps/manajemen/pages/Quality')),
          },
          {
            path: 'risks',
            element: lazyLoad(() => import('./apps/manajemen/pages/RiskManagement')),
          },
          {
            path: 'tasks',
            element: lazyLoad(() => import('./apps/manajemen/pages/TaskProjectHub')),
          },
          {
            path: 'projects',
            element: <Navigate to="/manajemen/tasks" replace />,
          },
          {
            path: 'evaluation',
            element: lazyLoad(() => import('./apps/manajemen/pages/EvaluationMonev')),
          },
          {
            path: 'approvals',
            element: lazyLoad(() => import('./apps/manajemen/pages/ApprovalCenter')),
          },
          {
            path: 'documents',
            element: lazyLoad(() => import('./apps/manajemen/pages/DocumentRepository')),
          },
          {
            path: 'performance',
            element: lazyLoad(() => import('./apps/manajemen/pages/Performance')),
          },
          {
            path: 'supervision',
            element: lazyLoad(() => import('./apps/manajemen/pages/Supervision')),
          },
        ],
      },
    ],
  },

  // 15. Portal Guru (Mobile-First Modular Architecture)
  {
    path: '/guru/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/guru',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/guru/components/GuruLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/guru/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/guru/pages/Dashboard')),
          },
          {
            path: 'lainnya',
            element: lazyLoad(() => import('./apps/guru/pages/Lainnya')),
          },
          // F1 & F2. Presensi Guru (Masuk/Pulang GPS) & Pengajuan Izin / Cuti
          {
            path: 'absensi-diri',
            element: lazyLoad(() => import('./apps/guru/pages/AbsensiPage')),
          },
          {
            path: 'absensi',
            element: lazyLoad(() => import('./apps/guru/pages/AbsensiPage')),
          },
          {
            path: 'presensi',
            element: lazyLoad(() => import('./apps/guru/pages/AbsensiPage')),
          },
          {
            path: 'izin',
            element: lazyLoad(() => import('./apps/guru/pages/AbsensiPage')),
          },
          {
            path: 'cuti',
            element: lazyLoad(() => import('./apps/guru/pages/AbsensiPage')),
          },
          // F3. Jadwal Mengajar & Roster KBM
          {
            path: 'jadwal',
            element: lazyLoad(() => import('./apps/guru/pages/JadwalPage')),
          },
          // F4. Perencanaan Pembelajaran / TP & Silabus
          {
            path: 'perencanaan',
            element: lazyLoad(() => import('./apps/guru/pages/PerencanaanPage')),
          },
          {
            path: 'tujuan-pembelajaran',
            element: lazyLoad(() => import('./apps/guru/pages/PerencanaanPage')),
          },
          {
            path: 'tp',
            element: lazyLoad(() => import('./apps/guru/pages/PerencanaanPage')),
          },
          // F5. Presensi Santri (Jam KBM & Harian)
          {
            path: 'presensi-siswa',
            element: lazyLoad(() => import('./apps/guru/pages/PresensiSiswaPage')),
          },
          {
            path: 'absensi-kelas',
            element: lazyLoad(() => import('./apps/guru/pages/PresensiSiswaPage')),
          },
          // F6. Jurnal Mengajar Harian
          {
            path: 'jurnal-mengajar',
            element: lazyLoad(() => import('./apps/guru/pages/JurnalPage')),
          },
          {
            path: 'jurnal',
            element: lazyLoad(() => import('./apps/guru/pages/JurnalPage')),
          },
          // F7. Penilaian Siswa Terpadu
          {
            path: 'nilai',
            element: lazyLoad(() => import('./apps/guru/pages/NilaiPage')),
          },
          {
            path: 'penilaian',
            element: lazyLoad(() => import('./apps/guru/pages/NilaiPage')),
          },
          // F8. Direktori Santri & Kontak Wali
          {
            path: 'santri',
            element: lazyLoad(() => import('./apps/guru/pages/SantriPage')),
          },
          {
            path: 'siswa',
            element: lazyLoad(() => import('./apps/guru/pages/SantriPage')),
          },
          // F9. Pengumuman & Berita Guru
          {
            path: 'pengumuman',
            element: lazyLoad(() => import('./apps/guru/pages/PengumumanPage')),
          },
          // F9. Pencatatan Kejadian & Prestasi Santri
          {
            path: 'kejadian-siswa',
            element: lazyLoad(() => import('./apps/guru/pages/KejadianPage')),
          },
          {
            path: 'kejadian',
            element: lazyLoad(() => import('./apps/guru/pages/KejadianPage')),
          },
          {
            path: 'disiplin',
            element: lazyLoad(() => import('./apps/guru/pages/KejadianPage')),
          },
          // Layanan Bimbingan & Konseling Santri (BK / Wali Kelas)
          {
            path: 'konseling',
            element: lazyLoad(() => import('./apps/guru/pages/KonselingPage')),
          },
          // Profil Saya & Pengaturan Akun
          {
            path: 'profil',
            element: lazyLoad(() => import('./apps/guru/pages/ProfilPage')),
          },
          {
            path: 'profile',
            element: lazyLoad(() => import('./apps/guru/pages/ProfilPage')),
          },
        ],
      },
    ],
  },

  // Redirect rute legacy guru ke portal guru baru
  {
    path: '/guru-lama/*',
    element: <Navigate to="/guru" replace />,
  },
  {
    path: '/guru-lama',
    element: <Navigate to="/guru" replace />,
  },

  // 16. Portal Calon Murid & Santri (PSB)
  {
    path: '/calon-murid/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/calon-murid',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/calon-murid/components/CalonMuridLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/calon-murid/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/calon-murid/pages/Dashboard')),
          },
          {
            path: 'data-lengkap',
            element: lazyLoad(() => import('./apps/calon-murid/pages/DataLengkap')),
          },
          {
            path: 'dokumen',
            element: lazyLoad(() => import('./apps/calon-murid/pages/Dokumen')),
          },
          {
            path: 'test',
            element: lazyLoad(() => import('./apps/calon-murid/pages/TesSeleksi')),
          },
          {
            path: 'tes',
            element: <Navigate to="/calon-murid/test" replace />,
          },
        ],
      },
    ],
  },
  // Portal Orang Tua (Parent-Facing) Tagihan Biaya Pendidikan
  {
    path: '/portal-orangtua/tagihan',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        index: true,
        element: lazyLoad(() => import('./apps/keuangan/pages/ParentBills')),
      },
    ],
  },
  {
    path: '/orangtua/tagihan',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        index: true,
        element: lazyLoad(() => import('./apps/keuangan/pages/ParentBills')),
      },
    ],
  },

  // 17. Portal PSB / PPDB Online (Admin & Panitia)
  {
    path: '/ppdb',
    element: <ProtectedRoute redirectTo="/login" />,
    children: [
      {
        element: lazyLoad(() => import('./apps/ppdb/components/PpdbLayout')),
        children: [
          {
            index: true,
            element: <Navigate to="/ppdb/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: lazyLoad(() => import('./apps/ppdb/pages/Dashboard')),
          },
          {
            path: 'programs',
            element: lazyLoad(() => import('./apps/ppdb/pages/Programs')),
          },
          {
            path: 'registrants',
            element: lazyLoad(() => import('./apps/ppdb/pages/Registrants')),
          },
          {
            path: 'selection',
            element: lazyLoad(() => import('./apps/ppdb/pages/Selection')),
          },
          {
            path: 'enrollment',
            element: lazyLoad(() => import('./apps/ppdb/pages/Enrollment')),
          },
          {
            path: 'withdrawals',
            element: lazyLoad(() => import('./apps/ppdb/pages/Withdrawals')),
          },
        ],
      },
    ],
  },

  // 18. Fallback Not Found
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});

// Update title dan icon favicon otomatis saat navigasi antar modul
router.subscribe((state) => {
  if (state.location) {
    updateBrowserTab(state.location.pathname);
  }
});

// Inisialisasi awal saat pertama kali web dimuat
if (typeof window !== 'undefined') {
  updateBrowserTab(window.location.pathname);
}
