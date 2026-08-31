import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/store/AuthContext';
import {
  ShieldCheck,
  Globe,
  GraduationCap,
  Users2,
  Wallet,
  HeartHandshake,
  Building,
  Utensils,
  ChefHat,
  BookOpen,
  FileCheck2,
  BellRing,
  BookMarked,
  BarChart3,
  ExternalLink,
  Lock,
  ArrowRight,
  LogOut,
  User,
  Sparkles,
  Search,
  X,
  Sun,
  Moon,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';

export default function Launcher() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // Dual Theme State (Mode Terang & Mode Gelap Lembut)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('aldepos_portal_theme');
    if (saved) return saved === 'dark';
    return false; // Default: Soft clean light mode for pristine readability
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('aldepos_portal_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleAppClick = (app) => {
    if (app.isExternal) {
      window.open(app.url, '_blank');
      return;
    }

    if (app.id === 'core' || app.id === 'website-utama') {
      if (isAuthenticated) {
        navigate(`/${app.id}/dashboard`);
      } else {
        navigate('/core/login');
      }
      return;
    }

    // Untuk modul-modul lain yang ready
    if (app.available) {
      if (isAuthenticated) {
        navigate(`/${app.id}/dashboard`);
      } else {
        navigate(`/${app.id}/login`);
      }
    }
  };

  const apps = useMemo(
    () => [
      {
        id: 'core',
        name: 'Administrasi Sistem',
        moduleName: 'Core Service',
        description: 'Pusat otentikasi SSO, manajemen pengguna, role izin, profil yayasan, satuan pendidikan & webhook.',
        icon: ShieldCheck,
        color: 'from-emerald-500 to-teal-700',
        iconBg: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Utilitas & Fondasi',
      },
      {
        id: 'website-utama',
        name: 'Website Utama (CMS)',
        moduleName: 'CMS Website & PPDB',
        description: 'Panel administrasi konten website resmi sekolah, publikasi berita, galeri, PPDB online & layanan konsultasi.',
        icon: Globe,
        color: 'from-blue-500 to-indigo-700',
        iconBg: isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Publik & Portal',
      },
      {
        id: 'kepegawaian',
        name: 'SDM & Kepegawaian',
        moduleName: 'Kepegawaian',
        description: 'Data induk pegawai, presensi harian, pengajuan cuti, struktur organisasi & slip gaji.',
        icon: Users2,
        color: 'from-indigo-500 to-violet-700',
        iconBg: isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Operasional Sekolah',
      },
      {
        id: 'akademik',
        name: 'Manajemen Akademik',
        moduleName: 'Akademik',
        description: 'Data induk siswa, kurikulum pembelajaran, jadwal pelajaran, penilaian, e-Rapor & kesiswaan.',
        icon: GraduationCap,
        color: 'from-teal-500 to-emerald-700',
        iconBg: isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-600 border-teal-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Operasional Sekolah',
      },
      {
        id: 'keuangan',
        name: 'Keuangan & Pembukuan',
        moduleName: 'Keuangan',
        description: 'Tagihan SPP, pos penerimaan kasir, penganggaran RAPBS, jurnal akuntansi & laporan keuangan.',
        icon: Wallet,
        color: 'from-amber-500 to-orange-700',
        iconBg: isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Finansial & Bisnis',
      },
      {
        id: 'guru',
        name: 'Portal Guru',
        moduleName: 'Portal Pendidik',
        description: 'Presensi diri GPS radius HRD, jadwal mengajar pribadi, notifikasi jadwal, input nilai & absensi kelas.',
        icon: GraduationCap,
        color: 'from-emerald-500 to-teal-600',
        iconBg: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Portal Pengguna',
      },
      {
        id: 'ortu',
        name: 'Portal Orangtua',
        moduleName: 'Portal Orangtua',
        description: 'Monitoring nilai, absensi, tagihan sekolah anak, histori cashless kantin & komunikasi guru.',
        icon: HeartHandshake,
        color: 'from-rose-500 to-pink-700',
        iconBg: isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-600 border-rose-200',
        badgeBg: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
        status: 'Fase 5',
        available: false,
        category: 'Portal Pengguna',
      },
      {
        id: 'kantin',
        name: 'Kantin & Transaksi Digital',
        moduleName: 'Kantin',
        description: 'POS kasir kantin, transaksi digital cashless santri, pengelolaan vendor titipan & bagi hasil.',
        icon: Utensils,
        color: 'from-amber-500 to-orange-600',
        iconBg: isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Finansial & Bisnis',
      },
      {
        id: 'sarpras',
        name: 'Sarana & Prasarana',
        moduleName: 'Sarpras',
        description: 'Inventaris aset, pemeliharaan fasilitas, jadwal peminjaman ruang & logistik pengadaan.',
        icon: Building,
        color: 'from-indigo-600 to-sky-700',
        iconBg: isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Operasional Sekolah',
      },
      {
        id: 'dapur',
        name: 'Dapur & Logistik Makan',
        moduleName: 'Dapur',
        description: 'Perencanaan menu makan santri, stok bahan pangan basah/kering & kontrol porsi harian.',
        icon: ChefHat,
        color: 'from-amber-500 to-orange-700',
        iconBg: isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-600 border-amber-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Operasional Sekolah',
      },
      {
        id: 'perpustakaan',
        name: 'Perpustakaan Digital',
        moduleName: 'Perpustakaan',
        description: 'Katalog buku perpustakaan digital (OPAC), sirkulasi peminjaman, tracking denda & barcode.',
        icon: BookOpen,
        color: 'from-teal-600 to-emerald-800',
        iconBg: isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-600 border-teal-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Akademik & Santri',
      },
      {
        id: 'cbe',
        name: 'Ujian Daring & Bank Soal',
        moduleName: 'CBE',
        description: 'Pembuatan bank soal, pelaksanaan Computer-Based Exam terjadwal & analisis butir soal.',
        icon: FileCheck2,
        color: 'from-blue-600 to-cyan-800',
        iconBg: isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200',
        badgeBg: isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
        status: 'Fase 6',
        available: false,
        category: 'Akademik & Santri',
      },
      {
        id: 'notifikasi',
        name: 'Komunikasi & Notifikasi',
        moduleName: 'Komunikasi',
        description: 'Broadcast WhatsApp/SMS/Email, notifikasi presensi otomatis & integrasi gateway pesan.',
        icon: BellRing,
        color: 'from-purple-600 to-violet-800',
        iconBg: isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200',
        badgeBg: isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
        status: 'Fase 6',
        available: false,
        category: 'Utilitas & Fondasi',
      },
      {
        id: 'alquran',
        name: "Tahfidz & Al-Qur'an",
        moduleName: 'Tahfidz',
        description: "Rekap setoran hafalan Qur'an, mutaba'ah yaumiyah, ujian munaqasyah & kajian kitab.",
        icon: BookMarked,
        color: 'from-emerald-600 to-green-800',
        iconBg: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Akademik & Santri',
      },
      {
        id: 'manajemen',
        name: 'Manajemen & Mutu Sekolah',
        moduleName: 'Manajemen',
        description: 'Rencana kerja RKS/RIPS, pencapaian KPI mutu, Task Hub Gantt Chart & eksekutif dashboard.',
        icon: BarChart3,
        color: 'from-indigo-600 to-violet-800',
        iconBg: isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Operasional Sekolah',
      },
      {
        id: 'guru',
        name: 'Portal Guru & Pengajar',
        moduleName: 'Portal Guru',
        description: 'Presensi harian GPS radius, agenda mengajar kelas, input nilai rapor & monitoring tujuan pembelajaran.',
        icon: GraduationCap,
        color: 'from-teal-600 to-emerald-800',
        iconBg: isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-50 text-teal-600 border-teal-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Portal Pengguna',
      },
      {
        id: 'calon-murid',
        name: 'Portal Calon Santri & Murid',
        moduleName: 'Portal PSB',
        description: 'Layanan mandiri pendaftar PSB, pelacakan berkas, upload persyaratan, dan pelaksanaan ujian seleksi CBT online.',
        icon: GraduationCap,
        color: 'from-emerald-600 to-teal-800',
        iconBg: isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        status: 'Aktif / Ready',
        available: true,
        category: 'Portal Pengguna',
      },
    ],
    [isDark]
  );

  // Kategori Filter Options
  const categories = useMemo(() => [
    { id: 'all', label: 'Semua Modul' },
    { id: 'Operasional Sekolah', label: 'Operasional Sekolah' },
    { id: 'Akademik & Santri', label: 'Akademik & Santri' },
    { id: 'Finansial & Bisnis', label: 'Finansial & Bisnis' },
    { id: 'Portal Pengguna', label: 'Portal Pengguna' },
    { id: 'Utilitas & Fondasi', label: 'Utilitas & Fondasi' },
    { id: 'Publik & Portal', label: 'Publik & Portal' },
  ], []);

  // Filtered Apps List
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchCat = selectedCategory === 'all' || app.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.moduleName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [apps, selectedCategory, searchQuery]);

  const readyCount = apps.filter((a) => a.available).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex flex-col ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-gradient-to-br from-slate-50 via-slate-100/70 to-slate-50 text-slate-900'
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`sticky top-0 z-30 px-6 py-3.5 border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 shadow-lg'
            : 'bg-white/90 border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-emerald-500/20">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-base font-black tracking-wide ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  ALDEPOS IBS
                </h1>
                <span
                  className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold border ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Portal Terintegrasi
                </span>
              </div>
              <p
                className={`text-xs font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Sistem Manajemen Sekolah & Pesantren Multi-Satuan
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle & User Info */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Beralih ke ${isDark ? 'Mode Terang (Light Mode)' : 'Mode Gelap (Dark Mode)'}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-slate-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Mode Gelap</span>
                </>
              )}
            </button>

            {isAuthenticated ? (
              <div
                className={`flex items-center gap-3 px-3.5 py-1.5 rounded-2xl border ${
                  isDark
                    ? 'bg-slate-800/90 border-slate-700 text-white'
                    : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div
                    className={`text-xs font-bold ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {user?.full_name || user?.username}
                  </div>
                  <div
                    className={`text-[10px] font-semibold ${
                      isDark ? 'text-emerald-400' : 'text-emerald-700'
                    }`}
                  >
                    {user?.account_type || 'Super Admin'}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Keluar / Logout"
                  className={`p-1.5 rounded-lg transition cursor-pointer ml-1 ${
                    isDark
                      ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-700/50'
                      : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/core/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Masuk Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner with Soft Background */}
      <div
        className={`relative py-10 px-6 overflow-hidden border-b transition-colors ${
          isDark
            ? 'bg-gradient-to-b from-slate-900/90 via-slate-900/40 to-slate-950 border-slate-800/80'
            : 'bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 border-slate-200/80 shadow-xs'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border shadow-xs ${
              isDark
                ? 'bg-slate-900/90 text-emerald-300 border-slate-800'
                : 'bg-white text-emerald-700 border-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Pusat Akses 15 Modul Aplikasi Sekolah & Pesantren</span>
          </div>

          <h2
            className={`text-2xl md:text-4xl font-black tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Selamat Datang di Portal Manajemen Terpadu
          </h2>

          <p
            className={`text-xs md:text-sm max-w-2xl mx-auto leading-relaxed font-medium ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Pilih modul aplikasi yang ingin Anda akses di bawah ini. Sesi login terintegrasi (Single Sign-On)
            memungkinkan Anda berpindah antar modul operasional dengan mudah, aman, dan cepat.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {readyCount} Modul Siap Digunakan
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isDark
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Single Sign-On (SSO) Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Search, Filter Tabs & Apps Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap shadow-xs ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                      : isDark
                      ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input Box */}
          <div className="relative min-w-[260px] max-w-sm w-full">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari modul aplikasi..."
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border transition outline-none shadow-xs ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Apps Grid */}
        {filteredApps.length === 0 ? (
          <div
            className={`p-12 rounded-3xl border border-dashed text-center space-y-2 ${
              isDark
                ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            <p className="text-sm font-bold">Tidak ada modul aplikasi yang sesuai</p>
            <p className="text-xs">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer shadow-sm"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const Icon = app.icon;
              const isClickable = app.available || app.isExternal;

              return (
                <div
                  key={app.id}
                  onClick={() => handleAppClick(app)}
                  className={`group relative rounded-3xl border p-5 transition-all duration-300 flex flex-col justify-between shadow-xs ${
                    isClickable
                      ? isDark
                        ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-850 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-950/30 cursor-pointer hover:-translate-y-0.5'
                        : 'bg-white border-slate-200/90 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-600/10 cursor-pointer hover:-translate-y-0.5'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800/70 opacity-60 cursor-not-allowed'
                      : 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Card: Icon & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border shadow-xs ${app.badgeBg}`}
                      >
                        {app.status}
                      </span>
                    </div>

                    {/* Subtitle & Title */}
                    <div>
                      <div
                        className={`text-[10.5px] font-black uppercase tracking-wider mb-1 ${
                          isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}
                      >
                        {app.moduleName}
                      </div>
                      <h3
                        className={`text-base font-extrabold tracking-tight leading-snug transition-colors ${
                          isDark
                            ? 'text-white group-hover:text-emerald-300'
                            : 'text-slate-900 group-hover:text-emerald-700'
                        }`}
                      >
                        {app.name}
                      </h3>
                      <p
                        className={`text-xs mt-2 leading-relaxed line-clamp-3 font-normal ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom: Category & Action */}
                  <div
                    className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
                      isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {app.category}
                    </span>

                    <div className="flex items-center gap-1 font-bold">
                      {isClickable ? (
                        app.isExternal ? (
                          <span
                            className={`flex items-center gap-1 group-hover:translate-x-0.5 transition-transform ${
                              isDark ? 'text-blue-400' : 'text-blue-600'
                            }`}
                          >
                            <span>Kunjungi</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            className={`flex items-center gap-1 group-hover:translate-x-0.5 transition-transform ${
                              isDark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}
                          >
                            <span>{isAuthenticated ? 'Ke Dashboard' : 'Buka Aplikasi'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )
                      ) : (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Segera Hadir</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`border-t px-6 py-4 text-center text-xs transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800/80 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 Yayasan Pendidikan Al-Depok. Arsitektur 3 Domain Monorepo.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Core Portal: <code className="font-bold text-emerald-600 dark:text-emerald-400">core.aldeposibs.com</code>
            </span>
            <span>
              API Backend: <code className="font-bold text-emerald-600 dark:text-emerald-400">api.aldeposibs.com</code>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
