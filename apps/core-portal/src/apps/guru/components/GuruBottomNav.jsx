import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Award,
  Menu,
  Clock,
  MapPin
} from 'lucide-react';

export function GuruBottomNav({ onOpenQuickAttendance, onOpenDrawer }) {
  const location = useLocation();

  const isHomeActive = location.pathname === '/guru' || location.pathname === '/guru/dashboard';
  const isJadwalActive = location.pathname.startsWith('/guru/jadwal');
  const isNilaiActive = location.pathname.startsWith('/guru/nilai') || location.pathname.startsWith('/guru/penilaian');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100/90 dark:border-slate-800/80 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      <div className="max-w-md md:max-w-lg mx-auto h-[64px] px-3 flex items-center justify-around relative">
        {/* 1. Beranda */}
        <NavLink
          to="/guru"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 text-center ${
              isHomeActive
                ? 'text-[#5B61F4] font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Beranda</span>
        </NavLink>

        {/* 2. Jadwal / KBM */}
        <NavLink
          to="/guru/jadwal"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 text-center ${
              isJadwalActive
                ? 'text-[#5B61F4] font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            }`
          }
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Jadwal</span>
        </NavLink>

        {/* 3. Aksi Cepat Absen (Tengah) - Tombol Bulat Solid Menonjol (Mirip Swap/Action Badge di Gambar) */}
        <div className="flex flex-col items-center justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenQuickAttendance}
            aria-label="Absen Cepat GPS"
            className="w-13 h-13 rounded-full bg-[#5B61F4] hover:bg-[#4E54E8] active:bg-[#4348D6] text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 transition-all duration-200 active:scale-90 border-4 border-white dark:border-slate-900 focus:outline-none"
          >
            <Clock className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">Absen</span>
        </div>

        {/* 4. Nilai Siswa */}
        <NavLink
          to="/guru/nilai"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 text-center ${
              isNilaiActive
                ? 'text-[#5B61F4] font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
            }`
          }
        >
          <Award className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Nilai</span>
        </NavLink>

        {/* 5. Menu Lainnya (Membuka Drawer / Bottom Sheet) */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 text-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium focus:outline-none"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Lainnya</span>
        </button>
      </div>
    </nav>
  );
}

export default GuruBottomNav;
