import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBottomNavItems, isMenuItemActive } from '../utils/guruNavigation';

/**
 * GuruBottomNav Component - Fixed Mobile Bottom Navigation (5 Slot Kanonis)
 * Beranda, Absen, Jadwal, Nilai, Profil (Touch target min 44x44px, rounded-lg/full icon pills).
 * Sesuai PRD Bagian 3, 4, 6 dan mockup 01-dashboard mobile.
 */
export function GuruBottomNav() {
  const location = useLocation();
  const navItems = getBottomNavItems();

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-sm"
    >
      <div className="h-16 max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isMenuItemActive(item, location.pathname);

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-[48px] min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 transition-colors select-none ${
                isActive ? 'text-emerald-800' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-100 border border-emerald-200 text-emerald-800 shadow-2xs'
                    : 'hover:bg-slate-100 text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              </div>
              <span
                className={`text-[11px] leading-none ${
                  isActive ? 'font-bold text-emerald-800' : 'font-medium text-slate-500'
                }`}
              >
                {item.id === 'absensi'
                  ? 'Absen'
                  : item.id === 'penilaian'
                  ? 'Nilai'
                  : item.id === 'profil'
                  ? 'Profil'
                  : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default GuruBottomNav;
