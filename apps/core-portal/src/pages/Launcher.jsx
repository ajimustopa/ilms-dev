import React from 'react';
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
  School
} from 'lucide-react';

export default function Launcher() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleAppClick = (app) => {
    if (app.isExternal) {
      window.open(app.url, '_blank');
      return;
    }

    if (app.id === 'core') {
      if (isAuthenticated) {
        navigate('/core/dashboard');
      } else {
        navigate('/core/login');
      }
      return;
    }

    // Untuk modul-modul lain yang sedang dalam fase pengembangan
    if (app.available) {
      if (isAuthenticated) {
        navigate(`/${app.id}/dashboard`);
      } else {
        navigate(`/${app.id}/login`);
      }
    }
  };

  const apps = [
    {
      id: 'core',
      name: 'Administrasi Sistem',
      moduleName: 'Core Service',
      description: 'Pusat otentikasi SSO, manajemen pengguna, role izin, profil yayasan, satuan pendidikan & webhook.',
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-700',
      textColor: 'text-emerald-600',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      status: 'Aktif / Ready',
      available: true,
      category: 'Utilitas & Fondasi'
    },
    {
      id: 'website',
      name: 'Website Utama & PPDB',
      moduleName: 'Website Utama',
      description: 'Portal publik sekolah, pendaftaran siswa baru (PPDB daring), CMS berita & galeri kegiatan.',
      icon: Globe,
      color: 'from-blue-500 to-indigo-700',
      textColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      status: 'Publik (Next.js)',
      available: false,
      isExternal: true,
      url: 'https://aldeposibs.com',
      category: 'Publik'
    },
    {
      id: 'kepegawaian',
      name: 'SDM & Kepegawaian',
      moduleName: 'Kepegawaian',
      description: 'Data induk pegawai, presensi harian, pengajuan cuti, struktur organisasi & slip gaji.',
      icon: Users2,
      color: 'from-indigo-500 to-violet-700',
      textColor: 'text-indigo-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      status: 'Fase 1',
      available: false,
      category: 'Operasional Sekolah'
    },
    {
      id: 'akademik',
      name: 'Manajemen Akademik',
      moduleName: 'Akademik',
      description: 'Data induk siswa, kurikulum pembelajaran, jadwal pelajaran, penilaian, e-Rapor & kesiswaan.',
      icon: GraduationCap,
      color: 'from-cyan-500 to-blue-700',
      textColor: 'text-cyan-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      status: 'Fase 2',
      available: false,
      category: 'Operasional Sekolah'
    },
    {
      id: 'keuangan',
      name: 'Keuangan & Pembukuan',
      moduleName: 'Keuangan',
      description: 'Tagihan SPP, pos penerimaan kasir, penganggaran RAPBS, jurnal akuntansi & laporan keuangan.',
      icon: Wallet,
      color: 'from-amber-500 to-orange-700',
      textColor: 'text-amber-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      status: 'Fase 4',
      available: false,
      category: 'Finansial & Bisnis'
    },
    {
      id: 'ortu',
      name: 'Portal Orangtua',
      moduleName: 'Portal Orangtua',
      description: 'Monitoring nilai, absensi, tagihan sekolah anak, histori cashless kantin & komunikasi guru.',
      icon: HeartHandshake,
      color: 'from-rose-500 to-pink-700',
      textColor: 'text-rose-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      status: 'Fase 5',
      available: false,
      category: 'Portal Pengguna'
    },
    {
      id: 'kantin',
      name: 'Kasir & Kantin Sekolah',
      moduleName: 'Kantin',
      description: 'POS kasir kantin, transaksi digital kartu RFID/cashless santri & inventaris tenant.',
      icon: Utensils,
      color: 'from-orange-500 to-amber-700',
      textColor: 'text-orange-600',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      status: 'Fase 5',
      available: false,
      category: 'Finansial & Bisnis'
    },
    {
      id: 'sarpras',
      name: 'Sarana & Prasarana',
      moduleName: 'Sarpras',
      description: 'Inventaris aset, pemeliharaan fasilitas, jadwal peminjaman ruang & logistik pengadaan.',
      icon: Building,
      color: 'from-slate-600 to-slate-800',
      textColor: 'text-slate-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Operasional Sekolah'
    },
    {
      id: 'dapur',
      name: 'Dapur & Logistik Makan',
      moduleName: 'Dapur',
      description: 'Perencanaan menu makan santri, stok bahan pangan basah/kering & kontrol porsi harian.',
      icon: ChefHat,
      color: 'from-lime-600 to-emerald-800',
      textColor: 'text-lime-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Operasional Sekolah'
    },
    {
      id: 'perpustakaan',
      name: 'Perpustakaan (E-Library)',
      moduleName: 'Perpustakaan',
      description: 'Katalog buku perpustakaan digital (OPAC), sirkulasi peminjaman, tracking denda & barcode.',
      icon: BookOpen,
      color: 'from-teal-600 to-emerald-800',
      textColor: 'text-teal-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Akademik & Santri'
    },
    {
      id: 'cbe',
      name: 'Ujian Daring & Bank Soal',
      moduleName: 'CBE',
      description: 'Pembuatan bank soal, pelaksanaan Computer-Based Exam terjadwal & analisis butir soal.',
      icon: FileCheck2,
      color: 'from-blue-600 to-cyan-800',
      textColor: 'text-blue-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Akademik & Santri'
    },
    {
      id: 'notifikasi',
      name: 'Komunikasi & Notifikasi',
      moduleName: 'Komunikasi',
      description: 'Broadcast WhatsApp/SMS/Email, notifikasi presensi otomatis & integrasi gateway pesan.',
      icon: BellRing,
      color: 'from-purple-600 to-violet-800',
      textColor: 'text-purple-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Utilitas & Fondasi'
    },
    {
      id: 'tahfidz',
      name: 'Tahfidz & Al-Qur\'an',
      moduleName: 'Tahfidz',
      description: 'Rekap setoran hafalan Qur\'an, mutaba\'ah yaumiyah, ujian munaqasyah & kajian kitab.',
      icon: BookMarked,
      color: 'from-emerald-600 to-green-800',
      textColor: 'text-emerald-700',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 6',
      available: false,
      category: 'Akademik & Santri'
    },
    {
      id: 'pengelolaan',
      name: 'Manajemen & Mutu Sekolah',
      moduleName: 'Pengelolaan',
      description: 'Rencana kerja RKS/RIPS, pencapaian KPI mutu, supervisi guru & eksekutif dashboard.',
      icon: BarChart3,
      color: 'from-stone-600 to-stone-800',
      textColor: 'text-stone-600',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      status: 'Fase 7',
      available: false,
      category: 'Operasional Sekolah'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">ALDEPOS IBS</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Portal Terintegrasi
                </span>
              </div>
              <p className="text-xs text-slate-400">Sistem Manajemen Sekolah & Pesantren Multi-Satuan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-white">{user?.full_name || user?.username}</div>
                  <div className="text-[10px] text-emerald-400">{user?.account_type || 'User Terautentikasi'}</div>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/core/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition"
              >
                <User className="w-4 h-4" />
                <span>Masuk Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative py-10 px-6 overflow-hidden border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 text-emerald-400 border border-slate-700 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pusat Akses 14 Modul Aplikasi Sekolah</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Selamat Datang di Portal Manajemen Terpadu
          </h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl mx-auto mt-2">
            Pilih modul aplikasi yang ingin Anda akses di bawah ini. Sesi login terintegrasi (Single Sign-On)
            memungkinkan Anda berpindah antar aplikasi internal dengan lancar.
          </p>
        </div>
      </div>

      {/* Apps Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {apps.map((app) => {
            const Icon = app.icon;
            const isClickable = app.available || app.isExternal;
            return (
              <div
                key={app.id}
                onClick={() => handleAppClick(app)}
                className={`group relative rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                  isClickable
                    ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20 cursor-pointer'
                    : 'bg-slate-800/30 border-slate-800/80 opacity-75 cursor-not-allowed'
                }`}
              >
                <div>
                  {/* Card Header: Icon & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${app.badgeColor}`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {app.moduleName}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {app.description}
                  </p>
                </div>

                {/* Card Action Link */}
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-semibold">
                  <span className="text-[11px] text-slate-500">{app.category}</span>
                  <div className="flex items-center gap-1">
                    {isClickable ? (
                      app.isExternal ? (
                        <span className="text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Kunjungi</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>{isAuthenticated && app.id === 'core' ? 'Ke Dashboard' : 'Buka Aplikasi'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 Yayasan Pendidikan Al-Depok. Arsitektur 3 Domain Monorepo.</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Core Portal: <code className="text-emerald-400">core.aldeposibs.com</code></span>
            <span>API Backend: <code className="text-emerald-400">api.aldeposibs.com</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
