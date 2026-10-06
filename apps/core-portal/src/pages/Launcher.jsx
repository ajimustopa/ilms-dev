import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Shield,
  Clock,
  ChevronDown,
  Building2,
  ExternalLink,
  CheckCircle2,
  Home,
  Boxes,
  Settings,
  Bell,
  Sun,
  Moon,
  Trophy,
  Calculator,
  Laptop,
  Presentation,
  UserCheck,
  HeartHandshake,
  Lightbulb,
  ChevronRight,
  UserPlus
} from 'lucide-react';

/**
 * Pemetaan role standar untuk setiap modul aplikasi
 */
const MODULE_ACCESS_MAP = {
  core: ['super_admin', 'admin_yayasan', 'developer'],
  keuangan: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'bendahara'],
  kepegawaian: ['super_admin', 'admin_yayasan', 'kepegawaian', 'hrd', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staff_payroll', 'staf'],
  akademik: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'guru_bk', 'pelatih_ekskul', 'guru_tamu', 'tu'],
  kesiswaan: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'pelatih_ekskul', 'tu'],
  sarpras: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  perpustakaan: ['super_admin', 'admin_yayasan', 'pustakawan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'guru', 'tu', 'staf'],
  cbt: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'tu'],
  bk: ['super_admin', 'admin_yayasan', 'guru_bk', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'wali_kelas'],
  alumni: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  ppdb: ['super_admin', 'admin_yayasan', 'panitia_ppdb', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  alquran: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  manajemen: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'hrd', 'kepegawaian', 'keuangan', 'sarpras_manager'],
  'website-utama': ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'panitia_ppdb', 'tu'],
  guru: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu'],
  kantin: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu', 'kepala_kantin', 'bendahara'],
  dapur: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu']
};

export default function Launcher() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const {
    isAuthenticated,
    user,
    logout,
    schoolUnits,
    activeSchoolUnit,
    changeActiveSchoolUnit
  } = useAuth();

  // Darkmode & Lightmode state (Default: Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('portal_theme');
    return saved === 'dark'; // Default: false (Light Mode)
  });

  const [activeSidebarNav, setActiveSidebarNav] = useState('beranda'); // 'beranda' | 'modul' | 'pengaturan'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('portal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('portal_theme', 'light');
    }
  }, [isDarkMode]);

  // Keyboard shortcut for search (Ctrl + K or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Master Ecosystem Apps Definition (17 Modul Komprehensif)
  const allApps = useMemo(
    () => [
      {
        id: 'core',
        code: 'CORE-01',
        name: 'Administrasi Sistem & RBAC',
        moduleName: 'Core Management',
        description: 'Kelola hak akses, peran dan pengguna sistem.',
        icon: ShieldCheck,
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        arrowBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/40 dark:text-blue-300 dark:group-hover:bg-blue-600',
        category: 'Utilitas & Fondasi',
        available: true,
        path: '/core/dashboard'
      },
      {
        id: 'keuangan',
        code: 'FIN-02',
        name: 'Keuangan & Kasir Digital',
        moduleName: 'Keuangan & SPP',
        description: 'Transaksi, laporan keuangan dan kasir digital.',
        icon: Calculator,
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
        arrowBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:group-hover:bg-emerald-600',
        category: 'Finansial & Bisnis',
        available: true,
        path: '/keuangan/dashboard'
      },
      {
        id: 'akademik',
        code: 'AKD-03',
        name: 'Akademik & Kurikulum',
        moduleName: 'Manajemen Akademik',
        description: 'Kelola data akademik dan kurikulum sekolah.',
        icon: GraduationCap,
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
        arrowBg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-900/40 dark:text-indigo-300 dark:group-hover:bg-indigo-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/akademik/dashboard'
      },
      {
        id: 'kepegawaian',
        code: 'SDM-04',
        name: 'SDM & Human Resource',
        moduleName: 'Kepegawaian & HRD',
        description: 'Manajemen guru, karyawan dan kepegawaian.',
        icon: Users2,
        iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
        arrowBg: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-900/40 dark:text-orange-300 dark:group-hover:bg-orange-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/kepegawaian/dashboard'
      },
      {
        id: 'kesiswaan',
        code: 'KSS-05',
        name: 'Kesiswaan & Prestasi',
        moduleName: 'Kesiswaan & Disiplin',
        description: 'Data siswa, kegiatan dan prestasi.',
        icon: Trophy,
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
        arrowBg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-900/40 dark:text-rose-300 dark:group-hover:bg-rose-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/kesiswaan/dashboard'
      },
      {
        id: 'sarpras',
        code: 'SAR-06',
        name: 'Sarana & Prasarana',
        moduleName: 'Sarpras & Aset',
        description: 'Inventaris, fasilitas dan aset sekolah.',
        icon: Building2,
        iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
        arrowBg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white dark:bg-teal-900/40 dark:text-teal-300 dark:group-hover:bg-teal-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/sarpras/dashboard'
      },
      {
        id: 'perpustakaan',
        code: 'LIB-07',
        name: 'Perpustakaan Digital OPAC',
        moduleName: 'Perpustakaan & OPAC',
        description: 'Katalog buku dan sirkulasi perpustakaan.',
        icon: Laptop,
        iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
        arrowBg: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-900/40 dark:text-sky-300 dark:group-hover:bg-sky-600',
        category: 'Akademik & Santri',
        available: true,
        path: '/perpustakaan/dashboard'
      },
      {
        id: 'cbt',
        code: 'CBT-08',
        name: 'Ujian Daring & Bank Soal',
        moduleName: 'Computer-Based Test',
        description: 'Pelaksanaan ujian dan manajemen soal.',
        icon: BookMarked,
        iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
        arrowBg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-900/40 dark:text-purple-300 dark:group-hover:bg-purple-600',
        category: 'Akademik & Santri',
        available: true,
        path: '/cbt/dashboard'
      },
      {
        id: 'manajemen',
        code: 'MNJ-09',
        name: 'Manajemen & Mutu Sekolah',
        moduleName: 'Eksekutif Dashboard',
        description: 'Monitoring, evaluasi dan penjaminan mutu.',
        icon: BarChart3,
        iconBg: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/60 dark:text-yellow-400',
        arrowBg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-900/40 dark:text-amber-300 dark:group-hover:bg-amber-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/manajemen/dashboard'
      },
      {
        id: 'guru',
        code: 'GUR-10',
        name: 'Portal Pendidik / Guru',
        moduleName: 'Portal Pengajar',
        description: 'Fitur untuk guru dan tenaga pendidik.',
        icon: Presentation,
        iconBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400',
        arrowBg: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:group-hover:bg-cyan-600',
        category: 'Portal Pengguna',
        available: true,
        path: '/guru/dashboard'
      },
      {
        id: 'kantin',
        code: 'KTN-11',
        name: 'Kantin Digital & POS',
        moduleName: 'Kantin Cashless',
        description: 'Transaksi kantin dan sistem pembayaran.',
        icon: Utensils,
        iconBg: 'bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400',
        arrowBg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-900/40 dark:text-rose-300 dark:group-hover:bg-rose-600',
        category: 'Finansial & Bisnis',
        available: true,
        path: '/kantin/dashboard'
      },
      {
        id: 'dapur',
        code: 'DAP-12',
        name: 'Dapur & Logistik Makanan',
        moduleName: 'Dapur Santri',
        description: 'Pengelolaan dapur dan logistik makanan.',
        icon: ChefHat,
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
        arrowBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:group-hover:bg-emerald-600',
        category: 'Operasional Sekolah',
        available: true,
        path: '/dapur/dashboard'
      },
      {
        id: 'website-utama',
        code: 'CMS-13',
        name: 'Website Utama & Portal Berita',
        moduleName: 'CMS Website & Berita',
        description: 'Kelola konten website sekolah.',
        icon: Globe,
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        arrowBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/40 dark:text-blue-300 dark:group-hover:bg-blue-600',
        category: 'Publik & Portal',
        available: true,
        path: '/website-utama'
      },
      {
        id: 'alquran',
        code: 'QUR-14',
        name: "Tahfidz & Al-Qur'an",
        moduleName: "Tahfidz Al-Qur'an",
        description: "Setoran hafalan, mutaba'ah & tilawah Al-Qur'an.",
        icon: BookOpen,
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
        arrowBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:group-hover:bg-emerald-600',
        category: 'Akademik & Santri',
        available: true,
        path: '/alquran/dashboard'
      },
      {
        id: 'ppdb',
        code: 'PSB-15',
        name: 'PPDB & Seleksi Masuk',
        moduleName: 'Penerimaan Santri Baru',
        description: 'Pendaftaran santri baru & administrasi formulir.',
        icon: UserPlus,
        iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
        arrowBg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white dark:bg-teal-900/40 dark:text-teal-300 dark:group-hover:bg-teal-600',
        category: 'Publik & Portal',
        available: true,
        path: '/ppdb/dashboard'
      },
      {
        id: 'bk',
        code: 'BK-16',
        name: 'Bimbingan & Konseling',
        moduleName: 'Konseling & Karir',
        description: 'Catatan konseling santri & pemetaan karir.',
        icon: Compass,
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
        arrowBg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-900/40 dark:text-rose-300 dark:group-hover:bg-rose-600',
        category: 'Akademik & Santri',
        available: true,
        path: '/bk/dashboard'
      },
      {
        id: 'alumni',
        code: 'ALM-17',
        name: 'Tracer Study & Alumni',
        moduleName: 'Portal Alumni',
        description: 'Basis data alumni & rekam jejak karir.',
        icon: HeartHandshake,
        iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
        arrowBg: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-900/40 dark:text-violet-300 dark:group-hover:bg-violet-600',
        category: 'Publik & Portal',
        available: true,
        path: '/alumni/dashboard'
      }
    ],
    []
  );

  // Kumpulkan role & permissions user yang sedang aktif
  const userRoleNames = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles)) {
      return user.roles.map((r) => (typeof r === 'object' ? r.role_name : r)).filter(Boolean);
    }
    return user.account_type ? [user.account_type] : [];
  }, [user]);

  // SUPER ADMIN CHECK (Menu sisi kiri hanya tampil untuk superadmin)
  const isSuperAdmin = useMemo(() => {
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
    if (isSuperAdmin) return true;

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
  }, [allApps, user, userRoleNames, isSuperAdmin]);

  // Filter pencarian dan kategori
  const filteredApps = useMemo(() => {
    return permittedApps.filter((app) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || app.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [permittedApps, searchQuery, selectedCategory]);

  const handleAppLaunch = (app) => {
    navigate(app.path || `/${app.id}/dashboard`);
  };

  // User display name & role title
  const userName = user?.full_name || user?.username || 'Super Admin';
  const roleDisplay = isSuperAdmin
    ? 'Level 1'
    : userRoleNames[0]?.replace(/_/g, ' ').toUpperCase() || 'Staf';

  return (
    <div className={`h-screen w-full overflow-hidden font-sans antialiased transition-colors duration-200 ${
      isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
    } flex flex-col md:flex-row`}>

      {/* ========================================================================= */}
      {/* SISI KIRI (SIDEBAR) - HANYA TAMPIL UNTUK SUPER ADMIN (FIXED IN PLACE)     */}
      {/* ========================================================================= */}
      {isSuperAdmin && (
        <aside className="w-full md:w-64 lg:w-72 shrink-0 h-full md:h-screen overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between z-20 shadow-xs custom-scrollbar">
          <div className="space-y-6">
            {/* Logo & Brand Header */}
            <div className="flex items-center gap-3 px-2 py-1">
              {/* Stylized 'A' Geometric Logo */}
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-sm">
                  <defs>
                    <linearGradient id="aldeposGold" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                    <linearGradient id="aldeposNavy" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1E3A8A" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  {/* Left Triangle - Gold */}
                  <polygon points="15,85 45,20 52,38 28,85" fill="url(#aldeposGold)" />
                  {/* Right Triangle - Navy */}
                  <polygon points="85,85 45,20 62,20 95,85" fill="url(#aldeposNavy)" />
                  {/* Center Crossbar */}
                  <polygon points="32,60 78,60 73,70 37,70" fill="#1E40AF" />
                </svg>
              </div>

              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  ALDEPOS <span className="text-blue-600 dark:text-blue-400">QUANTUM</span>
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Sistem Informasi Sekolah
                </p>
              </div>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarNav('beranda');
                  setSelectedCategory('all');
                  document.getElementById('portal-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSidebarNav === 'beranda'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSidebarNav('modul');
                  document.getElementById('modul-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeSidebarNav === 'modul'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Modul</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/core/users')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
              >
                <Settings className="w-4 h-4" />
                <span>Pengaturan</span>
              </button>
            </nav>

            {/* Inspirational Quote Card with Mosque Watermark */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-indigo-50/40 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-blue-950/30 border border-blue-100/80 dark:border-slate-700/60 shadow-2xs">
              {/* Quote Mark */}
              <div className="text-2xl font-serif text-amber-500/80 leading-none mb-1 select-none">
                “
              </div>

              {/* Quote Text */}
              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed relative z-10">
                Ilmu adalah cahaya yang menerangi jalan menuju ridha-Nya.
              </p>

              {/* Gold Accent Bar */}
              <div className="w-6 h-0.5 bg-amber-400 rounded-full my-2.5" />

              {/* Mosque Dome Silhouette Watermark */}
              <div className="mt-2 flex justify-center opacity-25 dark:opacity-15 pointer-events-none">
                <svg viewBox="0 0 200 80" className="w-32 h-12 fill-blue-600 dark:fill-sky-400">
                  <path d="M100 10 C92 22 86 38 86 55 L86 80 L114 80 L114 55 C114 38 108 22 100 10 Z" />
                  <path d="M50 35 C45 45 40 55 40 68 L40 80 L60 80 L60 68 C60 55 55 45 50 35 Z" />
                  <path d="M150 35 C145 45 140 55 140 68 L140 80 L160 80 L160 68 C160 55 155 45 150 35 Z" />
                  <rect x="15" y="45" width="6" height="35" rx="2" />
                  <rect x="179" y="45" width="6" height="35" rx="2" />
                  <circle cx="18" cy="42" r="3" />
                  <circle cx="182" cy="42" r="3" />
                  <circle cx="100" cy="6" r="3.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] font-bold">
              <Settings className="w-3.5 h-3.5" />
              <span>CORE v3.0</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Aldepos Quantum<br />Build for a Better Education
            </p>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* SISI KANAN / KONTEN UTAMA (SCROLLABLE AREA DENGAN HEADER STICKY)          */}
      {/* ========================================================================= */}
      <div id="portal-main-scroll" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top App Header (Fixed / Sticky in place) */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
          {/* Search Box */}
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari modul, menu, atau fitur..."
              className="w-full pl-9 pr-16 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs outline-none"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-sans font-semibold">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* School Unit Switcher */}
            {schoolUnits && schoolUnits.length > 0 && (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="max-w-[130px] truncate">
                    {activeSchoolUnit?.name || 'Semua Unit'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUnitDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      Pilih Lingkup Satuan
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveSchoolUnit(null);
                          setShowUnitDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                          !activeSchoolUnit || activeSchoolUnit.id === 'all'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">Semua Satuan (Gabungan)</span>
                        </div>
                        {(!activeSchoolUnit || activeSchoolUnit.id === 'all') && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                      </button>
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
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          {activeSchoolUnit?.id === u.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Darkmode & Lightmode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                title="Pemberitahuan & Notifikasi"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  3
                </span>
              </button>
            </div>

            {/* User Profile Badge & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              >
                {/* User Avatar Circle */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-white dark:ring-slate-800">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                    {userName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {roleDisplay}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.username}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/core/dashboard');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Panel Pengguna</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body Container */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* ========================================================================= */}
          {/* HERO BANNER - SELAMAT DATANG DENGAN FOTO KAMPUS ALDEPOS                   */}
          {/* ========================================================================= */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#E0F2FE] via-[#EBF4FE] to-[#F1F5F9] dark:from-slate-900 dark:via-slate-850 dark:to-blue-950/40 border border-sky-200/60 dark:border-slate-800 shadow-xs p-6 sm:p-8">
            {/* Subtle Sunbeam & Cloud Backdrops */}
            <div className="absolute top-0 right-1/3 w-80 h-80 bg-sky-300/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Left Greetings & Stats */}
              <div className="space-y-4 max-w-xl w-full">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 text-sm font-semibold mb-1">
                    <span className="text-base">👋</span>
                    <span>Selamat Datang,</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {userName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-normal">
                    Kelola modul dan aktivitas sekolah Anda dengan mudah di sini.
                  </p>
                </div>

                {/* 3 Metric Pills matching screenshot */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Total Modul */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 shadow-xs backdrop-blur-md">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium leading-none">
                        Total Modul
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-white font-mono mt-0.5">
                        {isSuperAdmin ? allApps.length : permittedApps.length}
                      </div>
                    </div>
                  </div>

                  {/* Pengguna Aktif */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 shadow-xs backdrop-blur-md">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium leading-none">
                        Pengguna Aktif
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-white font-mono mt-0.5">
                        12
                      </div>
                    </div>
                  </div>

                  {/* Tahun Ajaran */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 shadow-xs backdrop-blur-md">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium leading-none">
                        Tahun Ajaran
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white font-mono mt-0.5">
                        2025/2026
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual & Tagline */}
              <div className="relative flex flex-col items-center lg:items-end w-full lg:w-auto">
                {/* Handwritten Tagline */}
                <div className="text-blue-700 dark:text-sky-300 font-serif italic text-sm sm:text-base font-semibold tracking-wide mb-2 drop-shadow-2xs select-none text-center lg:text-right">
                  ~ Bersama Membangun Generasi Terbaik ~
                </div>

                {/* Campus Building Showcase Image with Soft Fade Frame */}
                <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-white/80 dark:border-slate-700/80 max-w-sm sm:max-w-md w-full aspect-16/9 group">
                  <img
                    src="/aldepos-campus.jpg"
                    alt="Kampus Aldepos Quantum"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      // Fallback gradient if image not loaded
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DAFTAR MODUL UTAMA                                                       */}
          {/* ========================================================================= */}
          <div id="modul-section" className="space-y-4 pt-2">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Modul Utama
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Akses semua modul sesuai kebutuhan sekolah Anda.
                  </p>
                </div>
              </div>

              {/* Category Filter or View All */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    selectedCategory === 'all'
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Lihat Semua ({permittedApps.length})
                </button>
              </div>
            </div>

            {/* Modules Grid (4 Columns on large screen as per screenshot) */}
            {filteredApps.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Tidak Ada Modul Ditemukan
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Modul yang Anda cari tidak tersedia atau belum diberikan hak akses pada peran akun Anda.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-blue-700 transition"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.id}
                      onClick={() => handleAppLaunch(app)}
                      className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[145px]"
                    >
                      <div className="space-y-3">
                        {/* Icon Box */}
                        <div className={`w-11 h-11 rounded-xl ${app.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-2xs`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {app.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 line-clamp-2">
                            {app.description}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Code & Arrow Circle Button */}
                      <div className="pt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/60 mt-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                          {app.code}
                        </span>
                        <div className={`w-6 h-6 rounded-full ${app.arrowBg} flex items-center justify-center transition-all duration-200 shadow-2xs group-hover:translate-x-0.5`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM MOTTO BANNER DENGAN AKSEN BOTANIK                                 */}
          {/* ========================================================================= */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/60 via-blue-50/50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-blue-950/30 border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="text-blue-600 dark:text-blue-400">Kolaborasi</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-indigo-600 dark:text-indigo-400">Integrasi</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Layanan Terbaik</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sistem yang mendukung manajemen sekolah secara efektif, efisien dan modern.
                </p>
              </div>
            </div>

            {/* Subtle Leaf / Botanical SVG Illustration */}
            <div className="hidden sm:block opacity-30 dark:opacity-20 pointer-events-none shrink-0 pr-2">
              <svg width="70" height="40" viewBox="0 0 70 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M70 40C50 40 40 25 35 15C30 5 15 0 0 0C20 0 30 15 35 25C40 35 55 40 70 40Z" fill="#3B82F6" />
                <path d="M45 40C35 40 30 30 25 22C20 14 10 10 0 10C12 10 20 20 25 28C30 36 40 40 45 40Z" fill="#F59E0B" />
              </svg>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
