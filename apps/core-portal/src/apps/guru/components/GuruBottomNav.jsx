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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200">
      <div className="max-w-md md:max-w-lg mx-auto h-[60px] px-2 flex items-center justify-around relative">
        {/* 1. Beranda */}
        <NavLink
          to="/guru"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-lg transition text-center ${
              isHomeActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
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
            `flex flex-col items-center justify-center w-14 h-12 rounded-lg transition text-center ${
              isJadwalActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Jadwal</span>
        </NavLink>

        {/* 3. Aksi Cepat Absen (Tengah) - Tombol Bulat Solid 44px Menonjol */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenQuickAttendance}
            aria-label="Absen Cepat GPS"
            className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-transform active:scale-95 border-2 border-white focus:outline-none"
          >
            <Clock className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-semibold text-slate-700 mt-1">Absen</span>
        </div>

        {/* 4. Nilai Siswa */}
        <NavLink
          to="/guru/nilai"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-lg transition text-center ${
              isNilaiActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
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
          className="flex flex-col items-center justify-center w-14 h-12 rounded-lg transition text-center text-slate-500 hover:text-slate-800 focus:outline-none"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Lainnya</span>
        </button>
      </div>
    </nav>
  );
}

export default GuruBottomNav;
