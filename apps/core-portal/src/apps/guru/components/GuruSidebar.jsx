import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { GURU_MENU_ITEMS, isMenuItemActive } from '../utils/guruNavigation';
import { GraduationCap } from 'lucide-react';

/**
 * GuruSidebar Component - Canonical Desktop Sidebar
 * Lebar tetap w-64, fixed left-0 top-0 h-screen z-50, border-r border-slate-200.
 * Sesuai PRD Bagian 3 & 4 dan mockup 01-dashboard desktop.
 */
export function GuruSidebar() {
  const location = useLocation();
  const { user, roleTitle, activeSchoolUnit } = useTeacherAuth();
  const { activeContext } = useTeacherContext();

  const displayName = user?.full_name || user?.name || user?.username || 'Ustadz / Guru';
  const unitLabel = activeContext?.satuanPendidikanName || activeSchoolUnit?.name || 'Yayasan Aldepos';
  const nipLabel = user?.nip || user?.nik || (user?.username ? `ID: ${user.username}` : null);

  const getInitials = (name) => {
    if (!name) return 'G';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside
      aria-label="Navigasi Utama Portal Guru"
      className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex-col z-50 shadow-xs"
    >
      {/* 1. Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
        <Link
          to="/guru/dashboard"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
          title="Beranda Portal Guru"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-slate-900 leading-tight tracking-tight truncate">
              Portal Guru
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono truncate">
              {unitLabel}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Navigation List (10 Canonical Menu Items) */}
      <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
        {GURU_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isMenuItemActive(item, location.pathname);

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors select-none ${
                isActive
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-700'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0 ml-2" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Sidebar Mini Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
        <Link
          to="/guru/profil"
          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition shadow-2xs group"
          title="Buka Profil & Pengaturan"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {getInitials(displayName)}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-emerald-700 transition-colors">
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 font-mono mt-0.5">
              <span>{nipLabel || roleTitle}</span>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export default GuruSidebar;
