import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/store/AuthContext';
import { isCashierOnlyUser } from '../shared/utils/authHelper';
import {
  ShieldCheck,
  Globe,
  GraduationCap,
  Users2,
  Wallet,
  Building,
  Utensils,
  ChefHat,
  BookOpen,
  FileCheck2,
  Activity,
  Compass,
  BarChart3,
  BookMarked,
  ArrowRight,
  LogOut,
  Sparkles,
  Search,
  X,
  Cpu,
  Shield,
  Clock,
  ChevronDown,
  Building2,
  ExternalLink,
  Zap,
  Lock,
  Terminal,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

/**
 * Pemetaan role standar untuk setiap modul aplikasi
 */
const MODULE_ACCESS_MAP = {
  core: ['super_admin', 'admin_yayasan', 'developer'],
  keuangan: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  kepegawaian: ['super_admin', 'admin_yayasan', 'kepegawaian', 'hrd', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staff_payroll', 'staf'],
  akademik: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'guru_bk', 'pelatih_ekskul', 'guru_tamu', 'tu'],
  kesiswaan: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'pelatih_ekskul', 'tu'],
  sarpras: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  perpustakaan: ['super_admin', 'admin_yayasan', 'pustakawan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'guru', 'tu', 'staf'],
  cbt: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'tu'],
  cbe: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'tu'],
  bk: ['super_admin', 'admin_yayasan', 'guru_bk', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'wali_kelas'],
  alumni: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  ppdb: ['super_admin', 'admin_yayasan', 'panitia_ppdb', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  'calon-murid': ['super_admin', 'admin_yayasan', 'panitia_ppdb', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  alquran: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  al_quran: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  manajemen: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'hrd', 'kepegawaian', 'keuangan', 'sarpras_manager'],
  'website-utama': ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'panitia_ppdb', 'tu'],
  guru: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu'],
  kantin: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu'],
  dapur: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu']
};

export default function Launcher() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    user,
    logout,
    schoolUnits,
    activeSchoolUnit,
    changeActiveSchoolUnit
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentTime, setCurrentTime] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  // Update clock every 10 seconds
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      setCurrentTime(new Intl.DateTimeFormat('id-ID', options).format(now));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if not logged in or if user is cashier only
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (isCashierOnlyUser(user)) {
      navigate('/kantin/pos', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && isCashierOnlyUser(user)) {
    return <Navigate to="/kantin/pos" replace />;
  }

  // Master Ecosystem Apps Definition
  const allApps = useMemo(
    () => [
      {
        id: 'core',
        code: 'CORE-01',
        name: 'Administrasi Sistem & RBAC',
        moduleName: 'Core Management',
        description: 'Pusat otentikasi SSO, manajemen akun, role izin RBAC, profil yayasan, satuan pendidikan & webhook log.',
        icon: ShieldCheck,
        accentColor: 'from-cyan-500 to-blue-600',
        glowColor: 'cyan',
        category: 'Utilitas & Fondasi',
        available: true,
        path: '/core/dashboard'
      },
      {
        id: 'keuangan',
        code: 'FIN-02',
        name: 'Keuangan & Kasir Digital',
        moduleName: 'Keuangan & SPP',
        description: 'Tagihan SPP multi-siswa, pos penerimaan kasir, rekening koran bank, jurnal akuntansi & laporan laba rugi.',
        icon: Wallet,
        accentColor: 'from-amber-500 to-orange-600',
        glowColor: 'amber',
        category: 'Finansial & Bisnis',
        available: true,
        path: '/keuangan/dashboard'
      },
      {
        id: 'akademik',
        code: 'AKD-03',
        name: 'Akademik & Kurikulum',
        moduleName: 'Manajemen Akademik',
        description: 'Data induk siswa Dapodik, rombel/kelas, jadwal pelajaran, penilaian, e-Rapor & kalender akademik.',
        icon: GraduationCap,
        accentColor: 'from-emerald-500 to-teal-600',
        glowColor: 'emerald',
        category: 'Operasional Sekolah',
        available: true,
        path: '/akademik/dashboard'
      },
      {
        id: 'kepegawaian',
        code: 'SDM-04',
        name: 'SDM & Human Resource',
        moduleName: 'Kepegawaian & HRD',
        description: 'Data induk pegawai, presensi harian radius GPS, pengajuan cuti, struktur organisasi, payroll & psikotes.',
        icon: Users2,
        accentColor: 'from-indigo-500 to-purple-600',
        glowColor: 'indigo',
        category: 'Operasional Sekolah',
        available: true,
        path: '/kepegawaian/dashboard'
      },
      {
        id: 'kesiswaan',
        code: 'KSS-05',
        name: 'Kesiswaan & Prestasi',
        moduleName: 'Kesiswaan & Disiplin',
        description: 'Data ekstrakurikuler, rekam prestasi santri, tata tertib, pelanggaran & poin kedisiplinan santri.',
        icon: Activity,
        accentColor: 'from-violet-500 to-fuchsia-600',
        glowColor: 'violet',
        category: 'Operasional Sekolah',
        available: true,
        path: '/kesiswaan/dashboard'
      },
      {
        id: 'sarpras',
        code: 'SAR-06',
        name: 'Sarana & Prasarana',
        moduleName: 'Sarpras & Aset',
        description: 'Inventaris aset gedung & ruang, pemeliharaan fasilitas, jadwal peminjaman sarana & logistik barang.',
        icon: Building,
        accentColor: 'from-sky-500 to-cyan-600',
        glowColor: 'sky',
        category: 'Operasional Sekolah',
        available: true,
        path: '/sarpras/dashboard'
      },
      {
        id: 'perpustakaan',
        code: 'LIB-07',
        name: 'Perpustakaan Digital OPAC',
        moduleName: 'Perpustakaan & OPAC',
        description: 'Katalog buku perpustakaan digital (OPAC), barcode buku, sirkulasi peminjaman & tracking denda buku.',
        icon: BookOpen,
        accentColor: 'from-teal-500 to-emerald-600',
        glowColor: 'teal',
        category: 'Akademik & Santri',
        available: true,
        path: '/perpustakaan/dashboard'
      },
      {
        id: 'cbt',
        code: 'CBT-08',
        name: 'Ujian Daring & Bank Soal',
        moduleName: 'Computer-Based Test',
        description: 'Bank soal online, jadwal ujian terstruktur, anti-cheat monitoring, dan koreksi otomatis butir soal.',
        icon: FileCheck2,
        accentColor: 'from-blue-600 to-indigo-600',
        glowColor: 'blue',
        category: 'Akademik & Santri',
        available: true,
        path: '/cbt/dashboard'
      },
      {
        id: 'bk',
        code: 'BK-09',
        name: 'Bimbingan & Konseling',
        moduleName: 'Konseling & Karir',
        description: 'Catatan konseling santri, pemetaan sosiometri, kunjungan rumah (home visit) & rekomendasi karir.',
        icon: Compass,
        accentColor: 'from-rose-500 to-pink-600',
        glowColor: 'rose',
        category: 'Akademik & Santri',
        available: true,
        path: '/bk/dashboard'
      },
      {
        id: 'alumni',
        code: 'ALM-10',
        name: 'Tracer Study & Alumni',
        moduleName: 'Portal Alumni',
        description: 'Basis data alumni, rekam jejak karir/kuliah, jaringan donasi & forum komunikasi lintas angkatan.',
        icon: Users2,
        accentColor: 'from-indigo-600 to-sky-600',
        glowColor: 'indigo',
        category: 'Publik & Portal',
        available: true,
        path: '/alumni/dashboard'
      },
      {
        id: 'ppdb',
        code: 'PSB-11',
        name: 'PPDB & Seleksi Masuk',
        moduleName: 'Penerimaan Santri Baru',
        description: 'Pendaftaran santri baru, verifikasi berkas formulir, tes seleksi online & administrasi daftar ulang.',
        icon: GraduationCap,
        accentColor: 'from-emerald-600 to-teal-700',
        glowColor: 'emerald',
        category: 'Publik & Portal',
        available: true,
        path: '/ppdb/dashboard'
      },
      {
        id: 'alquran',
        code: 'QUR-12',
        name: "Tahfidz & Al-Qur'an",
        moduleName: 'Tahfidz Al-Qur\'an',
        description: "Setoran hafalan Qur'an, mutaba'ah ziyadah & muraja'ah harian, penilaian tajwid & ujian munaqasyah.",
        icon: BookMarked,
        accentColor: 'from-emerald-500 to-green-600',
        glowColor: 'emerald',
        category: 'Akademik & Santri',
        available: true,
        path: '/alquran/dashboard'
      },
      {
        id: 'manajemen',
        code: 'MNJ-13',
        name: 'Manajemen & Mutu Sekolah',
        moduleName: 'Eksekutif Dashboard',
        description: 'Rencana kerja anggaran RKS/RAPBS, KPI mutu satuan pendidikan, Gantt Chart Task Hub & monitoring pimpinan.',
        icon: BarChart3,
        accentColor: 'from-violet-600 to-indigo-700',
        glowColor: 'violet',
        category: 'Operasional Sekolah',
        available: true,
        path: '/manajemen/dashboard'
      },
      {
        id: 'guru',
        code: 'GUR-14',
        name: 'Portal Pendidik / Guru',
        moduleName: 'Portal Pengajar',
        description: 'Presensi mandiri GPS radius HRD, agenda mengajar kelas, pengisian nilai harian & monitoring materi.',
        icon: GraduationCap,
        accentColor: 'from-teal-500 to-cyan-600',
        glowColor: 'teal',
        category: 'Portal Pengguna',
        available: true,
        path: '/guru/dashboard'
      },
      {
        id: 'kantin',
        code: 'KTN-15',
        name: 'Kantin Digital & POS',
        moduleName: 'Kantin Cashless',
        description: 'Point of Sales kasir kantin, pembayaran cashless kartu santri, bagi hasil pengelola & tracking konsumsi.',
        icon: Utensils,
        accentColor: 'from-amber-500 to-yellow-600',
        glowColor: 'amber',
        category: 'Finansial & Bisnis',
        available: true,
        path: '/kantin/dashboard'
      },
      {
        id: 'dapur',
        code: 'DAP-16',
        name: 'Dapur & Logistik Makanan',
        moduleName: 'Dapur Santri',
        description: 'Manajemen menu gizi santri, stok bahan pangan basah/kering & pengawasan porsi harian asrama.',
        icon: ChefHat,
        accentColor: 'from-orange-500 to-red-600',
        glowColor: 'orange',
        category: 'Operasional Sekolah',
        available: true,
        path: '/dapur/dashboard'
      },
      {
        id: 'website-utama',
        code: 'CMS-17',
        name: 'Website Utama & Portal Berita',
        moduleName: 'CMS Website & Berita',
        description: 'Panel administrasi konten website resmi sekolah, publikasi berita, galeri santri & layanan konsultasi.',
        icon: Globe,
        accentColor: 'from-blue-500 to-indigo-600',
        glowColor: 'blue',
        category: 'Publik & Portal',
        available: true,
        path: '/website-utama'
      }
    ],
    []
  );

  // Kumpulkan role & permissions user yang sedang aktif
  const userRoleNames = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles)) {
      return user.roles.map((r) => r.role_name).filter(Boolean);
    }
    return user.account_type ? [user.account_type] : [];
  }, [user]);

  const isUniversalAdmin = useMemo(() => {
    if (!user) return false;
    return (
      user.account_type === 'super_admin' ||
      user.account_type === 'admin' ||
      userRoleNames.includes('super_admin') ||
      userRoleNames.includes('admin_yayasan')
    );
  }, [user, userRoleNames]);

  // Fungsi pengecekan otorisasi modul per user
  const canAccessModule = (app) => {
    if (isUniversalAdmin) return true;

    const normalized = app.id.replace(/-/g, '_');

    // 1. Cek dari daftar user.modules (dihitung langsung oleh backend)
    if (Array.isArray(user?.modules)) {
      if (user.modules.includes(app.id) || user.modules.includes(normalized)) {
        return true;
      }
    }

    // 2. Cek dari daftar user.permissions (kode permission granular)
    if (Array.isArray(user?.permissions)) {
      const hasPerm = user.permissions.some(
        (p) =>
          typeof p === 'string' &&
          (p.startsWith(`${app.id}.`) || p.startsWith(`${normalized}.`))
      );
      if (hasPerm) return true;
    }

    // 3. Cek dari pemetaan role standar
    const allowedRoles = MODULE_ACCESS_MAP[app.id] || MODULE_ACCESS_MAP[normalized] || [];
    if (userRoleNames.some((r) => allowedRoles.includes(r))) {
      return true;
    }

    return false;
  };

  // Filter modul yang diizinkan untuk user ini
  const permittedApps = useMemo(() => {
    return allApps.filter(canAccessModule);
  }, [allApps, user, userRoleNames, isUniversalAdmin]);

  // Kategori filter dinamis berdasarkan modul yang diizinkan
  const categories = useMemo(() => {
    const cats = new Set(permittedApps.map((a) => a.category));
    return [
      { id: 'all', label: 'Semua Modul', count: permittedApps.length },
      ...Array.from(cats).map((c) => ({
        id: c,
        label: c,
        count: permittedApps.filter((a) => a.category === c).length
      }))
    ];
  }, [permittedApps]);

  // Filter pencarian dan kategori
  const filteredApps = useMemo(() => {
    return permittedApps.filter((app) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || app.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [permittedApps, searchQuery, selectedCategory]);

  const handleAppLaunch = (app) => {
    navigate(app.path || `/${app.id}/dashboard`);
  };

  // User badge info
  const getPrimaryRoleBadge = () => {
    if (isUniversalAdmin) {
      return {
        label: 'SUPER ADMIN • CLEARANCE LEVEL 10',
        shortLabel: 'Super Admin',
        color: 'from-cyan-400 to-emerald-400',
        pill: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
      };
    }
    const primary = userRoleNames[0] || user?.account_type || 'User';
    return {
      label: `${primary.replace(/_/g, ' ').toUpperCase()} • LEVEL OTORISASI`,
      shortLabel: primary.replace(/_/g, ' ').toUpperCase(),
      color: 'from-indigo-400 to-purple-400',
      pill: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
    };
  };

  const roleBadge = getPrimaryRoleBadge();

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black flex flex-col">
      {/* ======================================================== */}
      {/* FUTURISTIC NEBULA GLOWS & CYBER GRID                     */}
      {/* ======================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute top-1/4 right-0 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[180px]" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-emerald-500/10 rounded-full blur-[170px]" />

        {/* Matrix Perspective Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, #06b6d4 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Horizontal Laser Glow Accent */}
        <div className="absolute top-20 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>

      {/* ======================================================== */}
      {/* TOP CYBER COMMAND NAVBAR                                 */}
      {/* ======================================================== */}
      <header className="relative z-20 border-b border-slate-800/90 bg-[#030712]/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand & System Node Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 opacity-60 blur-sm group-hover:opacity-100 transition duration-300" />
              <div className="relative w-11 h-11 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <ShieldCheck className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white flex items-center gap-1.5">
                  ALDEPOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">QUANTUM</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  CORE v3.0
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wide flex items-center gap-2">
                <span>Pusat Komando Ekosistem Terpadu</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono hidden md:inline">{currentTime}</span>
              </p>
            </div>
          </div>

          {/* Right Controls: School Unit Switcher & User Profile HUD */}
          <div className="flex items-center gap-3">
            {/* Satuan Pendidikan Selector Dropdown */}
            {schoolUnits && schoolUnits.length > 0 && (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 transition cursor-pointer shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="max-w-[130px] truncate">
                    {activeSchoolUnit?.name || 'Semua Unit'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUnitDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 border border-slate-700/80 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Pilih Lingkup Satuan
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 space-y-1">
                      {isUniversalAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            changeActiveSchoolUnit(null);
                            setShowUnitDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            !activeSchoolUnit
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>Pusat Yayasan (Gabungan)</span>
                          {!activeSchoolUnit && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      )}
                      {schoolUnits.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            changeActiveSchoolUnit(u);
                            setShowUnitDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                            activeSchoolUnit?.id === u.id
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          {activeSchoolUnit?.id === u.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile HUD */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="truncate max-w-[140px]">{user?.full_name || user?.username}</span>
                </div>
                <div className="text-[10px] font-mono text-cyan-400 font-semibold truncate max-w-[140px]">
                  {roleBadge.shortLabel}
                </div>
              </div>
              <button
                onClick={logout}
                title="Keluar dari sesi (Logout)"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO COMMAND MATRIX BANNER                               */}
      {/* ======================================================== */}
      <section className="relative z-10 pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-slate-950/90 via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Status & Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>ALDEPOS COMMAND MATRIX • SESI AKTIF TERSINKRON</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Selamat Datang,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">
                  {user?.full_name || user?.username}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
                Pilih modul di bawah untuk memulai sesi kerja. Akses sistem dibatasi secara ketat berdasarkan peran & hak akses (RBAC) akun Anda.
              </p>
            </div>

            {/* Quick Telemetry Indicators */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="px-3.5 py-2 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modul Terotorisasi</div>
                <div className="text-sm font-black text-cyan-400 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {permittedApps.length} / {allApps.length} Modul
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tingkat Izin</div>
                <div className="text-sm font-black text-indigo-400 font-mono">
                  {roleBadge.shortLabel}
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Keamanan</div>
                <div className="text-sm font-black text-emerald-400 flex items-center gap-1 font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  SSO ACTIVE
                </div>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Navigation */}
          <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                        isSelected
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cyber Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari modul atau fungsi..."
                className="w-full pl-9 pr-9 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700/80 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* MODULE CARDS GRID                                        */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full z-10 space-y-6">
        {filteredApps.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-base font-bold text-white">Modul Tidak Ditemukan</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tidak ada modul yang cocok dengan kata kunci "{searchQuery}" pada kategori ini, atau akun Anda belum diberikan hak akses untuk modul tersebut.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              Reset Filter Pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredApps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  onClick={() => handleAppLaunch(app)}
                  className="group relative rounded-3xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-900/95 backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/50 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Neon Top Light Bar on Hover */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="space-y-4">
                    {/* Top Row: Cyber Code & Icon */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 opacity-0 group-hover:opacity-75 blur-sm transition duration-300" />
                        <div
                          className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${app.accentColor} p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300`}
                        >
                          <div className="w-full h-full bg-slate-950/70 rounded-[14px] flex items-center justify-center text-white backdrop-blur-xs">
                            <Icon className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block font-mono text-[10.5px] font-bold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 group-hover:text-cyan-300 group-hover:border-cyan-500/40 transition">
                          {app.code}
                        </span>
                        <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center justify-end gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:animate-ping" />
                          ONLINE
                        </div>
                      </div>
                    </div>

                    {/* Module Title & Description */}
                    <div>
                      <div className="text-[10.5px] font-bold tracking-widest text-cyan-400 uppercase mb-1">
                        {app.moduleName}
                      </div>
                      <h3 className="text-base font-extrabold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed font-normal">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-400 transition">
                      {app.category}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider">Akses Portal</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security / RBAC Information Notice */}
        {!isUniversalAdmin && (
          <div className="mt-8 p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center gap-3.5 text-xs text-slate-400">
            <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-200">Hak Akses Terproteksi: </span>
              Daftar modul yang ditampilkan di atas disaring otomatis sesuai peran dan hak akses akun Anda. Apabila Anda memerlukan akses ke modul lain, silakan ajukan otorisasi ke Administrator Yayasan.
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* FUTURISTIC TELEMETRY FOOTER                              */}
      {/* ======================================================== */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            <span>&copy; 2026 ALDEPOS QUANTUM CORE • INTEGRATED MULTI-UNIT SYSTEM</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SSO GATEWAY: <strong className="text-cyan-400">ONLINE</strong></span>
            <span>ENCRYPTION: <strong className="text-emerald-400">TLS 1.3 / AES-256</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
