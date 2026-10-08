import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import {
  GraduationCap,
  ChevronDown,
  User,
  LogOut,
  Menu
} from 'lucide-react';
import SelectorKonteks from './SelectorKonteks';

/**
 * GuruHeader Component - Fixed Top App Bar
 * Tinggi h-16, fixed top-0 z-40, border-b border-slate-200, bg-white/95 backdrop-blur-md.
 * Desktop: left-64 right-0; Mobile: w-full left-0.
 * Responsive:
 * - Mobile: Hanya menampilkan Icon Aplikasi (tanpa teks "Portal Guru") di sisi kiri.
 * - Single SelectorKonteks: Pilihan konteks hanya ada satu di header dan responsif tidak menghalangi icon.
 */
export function GuruHeader({ onOpenDrawer }) {
  const navigate = useNavigate();
  const { user, logout, roleTitle } = useTeacherAuth();
  const { activeContext } = useTeacherContext();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const displayName = user?.full_name || user?.name || user?.username || 'Ustadz / Guru';

  const getInitials = (name) => {
    if (!name) return 'G';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md z-40 border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 shadow-2xs">
      {/* Sisi Kiri Header: App Icon (Mobile) & Single Konteks Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile App Icon (Tanpa tulisan 'Portal Guru') */}
        <div className="flex lg:hidden items-center shrink-0">
          <Link
            to="/guru/dashboard"
            className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs hover:bg-emerald-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
            title="Beranda Portal Guru"
            aria-label="Beranda Portal Guru"
          >
            <GraduationCap className="w-5 h-5" />
          </Link>
        </div>

        {/* SATU-SATUNYA Pilihan Konteks di Header (Desktop & Mobile) */}
        <div className="min-w-0 max-w-[200px] sm:max-w-xs md:max-w-md">
          <SelectorKonteks />
        </div>
      </div>

      {/* Sisi Kanan Header: Role Badge, Profile, Drawer Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Role Badge (Desktop & Tablet) */}
        <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 select-none">
          {roleTitle}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            aria-haspopup="true"
            aria-expanded={showProfileDropdown}
            aria-label="Menu Profil Pengguna"
            className="h-9 sm:h-10 px-1 sm:px-2 rounded-xl flex items-center gap-1.5 sm:gap-2 hover:bg-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {getInitials(displayName)}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <span className="hidden md:block text-xs font-semibold text-slate-800 max-w-[130px] truncate text-left">
              {displayName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${
                showProfileDropdown ? 'rotate-180 text-emerald-700' : ''
              }`}
            />
          </button>

          {showProfileDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-emerald-700 font-bold">{roleTitle}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    {user?.email || user?.username}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/guru/profil"
                    onClick={() => setShowProfileDropdown(false)}
                    className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profil Saya &amp; Sandi</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Drawer Button Trigger */}
        {onOpenDrawer && (
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Buka Menu Drawer"
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}

export default GuruHeader;
