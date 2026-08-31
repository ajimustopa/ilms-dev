import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  LayoutDashboard,
  CalendarDays,
  MapPin,
  ClipboardCheck,
  Award,
  Target,
  Users2,
  BellRing,
  UserCircle,
  ExternalLink,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';

export const GURU_MENU_ITEMS = [
  {
    id: 'dashboard',
    name: 'Beranda Guru',
    subtitle: 'Ringkasan & Notifikasi',
    path: '/guru/dashboard',
    icon: LayoutDashboard,
    bgGradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/30',
    category: 'Utama'
  },
  {
    id: 'jadwal',
    name: 'Jadwal Mengajar',
    subtitle: 'Jadwal tatap muka',
    path: '/guru/jadwal',
    icon: CalendarDays,
    bgGradient: 'from-blue-500 to-indigo-600',
    shadowColor: 'shadow-blue-500/30',
    category: 'Akademik'
  },
  {
    id: 'absensi-diri',
    name: 'Absensi Diri (GPS)',
    subtitle: 'Check-In radius sekolah',
    path: '/guru/absensi',
    icon: MapPin,
    bgGradient: 'from-rose-500 to-red-600',
    shadowColor: 'shadow-rose-500/30',
    badge: 'GPS Active',
    category: 'Kepegawaian'
  },
  {
    id: 'absensi-kelas',
    name: 'Absensi Kelas',
    subtitle: 'Presensi pertemuan belajar',
    path: '/guru/absensi-kelas',
    icon: ClipboardCheck,
    bgGradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/30',
    category: 'Akademik'
  },
  {
    id: 'nilai',
    name: 'Input Nilai Siswa',
    subtitle: 'Tugas, Ulangan & TP',
    path: '/guru/nilai',
    icon: Award,
    bgGradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-purple-500/30',
    category: 'Akademik'
  },
  {
    id: 'tp',
    name: 'Tujuan Pembelajaran',
    subtitle: 'Kurikulum & Capaian (TP)',
    path: '/guru/tujuan-pembelajaran',
    icon: Target,
    bgGradient: 'from-teal-500 to-cyan-600',
    shadowColor: 'shadow-cyan-500/30',
    category: 'Akademik'
  },
  {
    id: 'siswa',
    name: 'Informasi Siswa',
    subtitle: 'Data rombel & wali murid',
    path: '/guru/siswa',
    icon: Users2,
    bgGradient: 'from-sky-500 to-blue-600',
    shadowColor: 'shadow-sky-500/30',
    category: 'Kesiswaan'
  },
  {
    id: 'pengumuman',
    name: 'Pengumuman',
    subtitle: 'Papan berita & info resmi',
    path: '/guru/pengumuman',
    icon: BellRing,
    bgGradient: 'from-fuchsia-500 to-pink-600',
    shadowColor: 'shadow-fuchsia-500/30',
    category: 'Komunikasi'
  },
  {
    id: 'profil',
    name: 'Profil & Akun',
    subtitle: 'Identitas & ganti sandi',
    path: '/guru/profil',
    icon: UserCircle,
    bgGradient: 'from-slate-700 to-slate-900',
    shadowColor: 'shadow-slate-600/30',
    category: 'Pengaturan'
  },
  {
    id: 'launcher',
    name: 'Pusat Portal Terpadu',
    subtitle: '15 Modul Sistem Sekolah',
    path: '/',
    icon: ExternalLink,
    bgGradient: 'from-amber-600 to-yellow-600',
    shadowColor: 'shadow-amber-600/30',
    isExternalLink: true,
    category: 'Sistem'
  }
];

export default function AndroidAppLauncher({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = GURU_MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    onClose();
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Container Kotak / Drawer Layar Android */}
      <div className="relative w-full max-w-xl max-h-[90vh] bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header App Drawer */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Menu Aplikasi Guru
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Aldepos OS
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pilih aplikasi atau fitur yang ingin dibuka</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Tutup Menu (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Android Style */}
        <div className="px-6 py-3 bg-slate-900/50">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari fitur aplikasi guru..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-800/90 text-slate-100 placeholder-slate-400 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Grid Ikon Layar Android */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="group flex flex-col items-center text-center p-2 rounded-2xl hover:bg-slate-800/60 active:scale-95 transition-all duration-150"
                >
                  <div className="relative mb-2">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${item.bgGradient} flex items-center justify-center text-white shadow-lg ${item.shadowColor} group-hover:scale-105 group-hover:rotate-2 transition duration-200`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-[9px] font-bold text-white border border-slate-900 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-emerald-400 leading-tight line-clamp-1">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada menu yang sesuai dengan kata kunci "{search}".
            </div>
          )}
        </div>

        {/* Footer Drawer Android */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aldepos Teacher Mobile OS</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
