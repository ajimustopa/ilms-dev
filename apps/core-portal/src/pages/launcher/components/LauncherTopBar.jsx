import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import BrandLogo from '../../../shared/components/brand/BrandLogo';
import UnitSwitcher from './UnitSwitcher';
import AvatarMenu from './AvatarMenu';

/**
 * LauncherTopBar — Sticky Header Bar Aldepos ILMS
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 4:
 * - BrandLogo "Aldepos ILMS" (vektor resmi).
 * - UnitSwitcher desktop chip + dropdown.
 * - Kolom pencarian desktop "Cari modul..." + petunjuk kbd "Ctrl K".
 * - Theme toggle (Dark / Light) tersimpan di portal_theme.
 * - Avatar inisial dengan AvatarMenu.
 * - Lonceng notifikasi sengaja TIDAK dirender karena backend notifikasi belum ada (mencegah angka/badge palsu).
 */
export default function LauncherTopBar({
  user,
  schoolUnits,
  activeSchoolUnit,
  onChangeUnit,
  onLogout,
  isDarkMode,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  searchInputRef
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
      {/* ========================================================================= */}
      {/* SISI KIRI: BRAND LOGO & UNIT SWITCHER DESKTOP                             */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <BrandLogo
          variant="full"
          size="sm"
          theme={isDarkMode ? 'dark' : 'light'}
          className="cursor-default"
        />

        {/* Separator Line */}
        {schoolUnits && schoolUnits.length > 0 && (
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
        )}

        {/* Desktop School Unit Switcher */}
        <UnitSwitcher
          schoolUnits={schoolUnits}
          activeSchoolUnit={activeSchoolUnit}
          onChangeUnit={onChangeUnit}
          variant="desktop"
          className="hidden md:block"
        />
      </div>

      {/* ========================================================================= */}
      {/* TENGAH: PENCARIAN MODUL DESKTOP (DENGAN SHORTCUT CTRL+K)                  */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
        <div className="w-full relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari modul..."
            className="w-full pl-9 pr-16 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-850 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-2xs outline-none"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-sans font-semibold">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SISI KANAN: TOGGLE TEMA & AVATAR MENU                                     */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Darkmode / Lightmode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          className="p-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer active:scale-95"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Avatar Menu (Desktop dropdown & Mobile bottom sheet) */}
        <AvatarMenu
          user={user}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
