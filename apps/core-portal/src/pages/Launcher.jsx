import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/store/AuthContext';
import { isCashierOnlyUser } from '../shared/utils/authHelper';
import { useOnlineStatus } from '../shared/hooks/useOnlineStatus';
import {
  Boxes,
  Search,
  Sparkles,
  SearchX,
  RotateCcw,
  WifiOff
} from 'lucide-react';

import { LAUNCHER_MODULES } from './launcher/launcherModules';
import { getVisibleModules } from './launcher/accessControl';
import { useRecentModules } from './launcher/useRecentModules';
import LauncherTopBar from './launcher/components/LauncherTopBar';
import LauncherGreeting from './launcher/components/LauncherGreeting';
import UnitSwitcher from './launcher/components/UnitSwitcher';
import LauncherRecentShelf from './launcher/components/LauncherRecentShelf';
import ModuleTile from './launcher/components/ModuleTile';
import LauncherEmptyAccess from './launcher/components/LauncherEmptyAccess';
import LauncherSkeleton from './launcher/components/LauncherSkeleton';
import LauncherFooter from './launcher/components/LauncherFooter';
import FlatAlertBanner from '../shared/components/FlatAlertBanner';
import ErrorState from '../shared/components/ErrorState';

export default function Launcher() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const isOnline = useOnlineStatus();

  const {
    isAuthenticated,
    user,
    logout,
    schoolUnits,
    activeSchoolUnit,
    changeActiveSchoolUnit,
    isLoading,
    refreshUserData,
    refreshSchoolUnits
  } = useAuth();

  // Riwayat 4 modul terakhir dibuka (localStorage)
  const { recentModules, trackModuleOpen } = useRecentModules(user);

  // Darkmode & Lightmode state (Default: Light Mode, stored in 'portal_theme')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('portal_theme');
    return saved === 'dark';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Mark initial entrance complete
  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

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

  // Keyboard shortcut for search (Ctrl + K or Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          mobileSearchInputRef.current?.focus();
        } else {
          searchInputRef.current?.focus();
        }
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

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

  // Filter modul yang diizinkan untuk pengguna saat ini (Active & Coming Soon)
  const { active: accessibleActive, comingSoon: accessibleComingSoon } = useMemo(() => {
    return getVisibleModules(user, LAUNCHER_MODULES);
  }, [user]);

  const totalAccessibleCount = accessibleActive.length + accessibleComingSoon.length;

  // Filter real-time berdasarkan query pencarian
  const { filteredActive, filteredComingSoon } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        filteredActive: accessibleActive,
        filteredComingSoon: accessibleComingSoon
      };
    }

    const matchesQuery = (mod) => {
      return (
        mod.name?.toLowerCase().includes(q) ||
        mod.displayName?.toLowerCase().includes(q) ||
        mod.moduleName?.toLowerCase().includes(q) ||
        mod.description?.toLowerCase().includes(q) ||
        mod.code?.toLowerCase().includes(q)
      );
    };

    return {
      filteredActive: accessibleActive.filter(matchesQuery),
      filteredComingSoon: accessibleComingSoon.filter(matchesQuery)
    };
  }, [accessibleActive, accessibleComingSoon, searchQuery]);

  const hasFilteredResults = filteredActive.length > 0 || filteredComingSoon.length > 0;

  // Handler peluncuran modul: rekam riwayat lalu arahkan navigasi
  const handleLaunchModule = (app) => {
    trackModuleOpen(app.id);
    navigate(app.path || `/${app.id}/dashboard`);
  };

  const handleRetrySync = async () => {
    setSyncError(null);
    try {
      if (typeof refreshUserData === 'function') {
        await refreshUserData();
      } else if (typeof refreshSchoolUnits === 'function') {
        await refreshSchoolUnits();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setSyncError(err?.message || 'Gagal memuat ulang data sesi');
    }
  };

  return (
    <div
      className={`min-h-screen w-full font-sans antialiased transition-colors duration-200 ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      } flex flex-col`}
    >
      {/* Screen Reader Live Region for Search Results */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {searchQuery
          ? `${filteredActive.length + filteredComingSoon.length} modul ditemukan untuk pencarian "${searchQuery}"`
          : ''}
      </div>

      {/* ========================================================================= */}
      {/* 1. STICKY TOP BAR                                                         */}
      {/* ========================================================================= */}
      <LauncherTopBar
        user={user}
        schoolUnits={schoolUnits}
        activeSchoolUnit={activeSchoolUnit}
        onChangeUnit={changeActiveSchoolUnit}
        onLogout={logout}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
      />

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT BODY                                                      */}
      {/* ========================================================================= */}
      <div id="portal-main-scroll" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-between">
          <div className="space-y-6 sm:space-y-8">
            
            {/* OFFLINE STATUS BANNER */}
            {!isOnline && (
              <FlatAlertBanner
                variant="warning"
                icon={WifiOff}
                title="Koneksi Terputus (Mode Offline)"
                description="Perangkat Anda sedang tidak terhubung ke jaringan internet. Beberapa sinkronisasi modul memerlukan koneksi aktif."
                className="shadow-2xs"
              />
            )}

            {/* SYNC ERROR BANNER (JIKA ADA KENDALA SINKRONISASI) */}
            {syncError && (
              <ErrorState
                title="Kendala Sinkronisasi Sesi"
                message={syncError}
                onRetry={handleRetrySync}
                retryText="Coba Sinkron Ulang"
                compact={true}
              />
            )}

            {/* ===================================================================== */}
            {/* KONDISI 1: LOADING STATE (SKELETON LOADER)                            */}
            {/* ===================================================================== */}
            {isLoading && !user ? (
              <LauncherSkeleton />
            ) : (
              <>
                {/* 3. GREETING BANNER */}
                <LauncherGreeting
                  user={user}
                  activeSchoolUnit={activeSchoolUnit}
                />

                {/* 4. MOBILE SEARCH & MOBILE UNIT SWITCHER (Layar < 768px) */}
                <div className="block md:hidden space-y-3">
                  {/* Mobile Search Input */}
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      ref={mobileSearchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari modul..."
                      aria-label="Cari modul"
                      className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                    />
                  </div>

                  {/* Mobile Unit Switcher Chip */}
                  {schoolUnits && schoolUnits.length > 0 && (
                    <UnitSwitcher
                      schoolUnits={schoolUnits}
                      activeSchoolUnit={activeSchoolUnit}
                      onChangeUnit={changeActiveSchoolUnit}
                      variant="mobile-chip"
                    />
                  )}
                </div>

                {/* ================================================================= */}
                {/* KONDISI A: PENGGUNA BELUM PUNYA AKSES KE MODUL APAPUN (RBAC GUARD)*/}
                {/* ================================================================= */}
                {totalAccessibleCount === 0 ? (
                  <LauncherEmptyAccess user={user} className="my-8" />
                ) : !hasFilteredResults ? (
                  /* ================================================================= */
                  /* KONDISI B: PENCARIAN TIDAK MENEMUKAN HASIL                       */
                  /* ================================================================= */
                  <div className="py-14 px-4 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 max-w-lg mx-auto shadow-2xs ilms-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
                      <SearchX className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Tidak Ada Modul Ditemukan
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                      Tidak ada modul yang cocok dengan kata kunci <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">“{searchQuery}”</strong> pada hak akses akun Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Pencarian</span>
                    </button>
                  </div>
                ) : (
                  /* ================================================================= */
                  /* KONDISI C: DAFTAR MODUL UTAMA & SEGERA HADIR                     */
                  /* ================================================================= */
                  <div className="space-y-7 sm:space-y-9">
                    {/* 5. TERAKHIR DIBUKA (Hanya jika ada riwayat & tidak sedang mencari) */}
                    {!searchQuery && recentModules.length > 0 && (
                      <LauncherRecentShelf
                        recentModules={recentModules}
                        onLaunch={handleLaunchModule}
                      />
                    )}

                    {/* 6. MODUL UTAMA (ACTIVE MODULES) */}
                    {filteredActive.length > 0 && (
                      <section className="space-y-3.5 sm:space-y-4">
                        {/* Header Section */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <Boxes className="w-3.5 h-3.5" />
                          </div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Modul Utama
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/80">
                            {filteredActive.length} modul
                          </span>
                        </div>

                        {/* Responsive Grid ala Launcher HP Modern */}
                        <div className="grid grid-cols-3 min-[375px]:grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3.5 sm:gap-y-6 pt-1">
                          {filteredActive.map((module, idx) => (
                            <ModuleTile
                              key={module.id}
                              module={module}
                              onLaunch={handleLaunchModule}
                              index={idx}
                              animate={!hasLoaded}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 7. SEGERA HADIR (COMING SOON MODULES) */}
                    {filteredComingSoon.length > 0 && (
                      <section className="space-y-3.5 sm:space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* Header Section */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                            Segera Hadir
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/80">
                            {filteredComingSoon.length} modul
                          </span>
                        </div>

                        {/* Grid Coming Soon */}
                        <div className="grid grid-cols-3 min-[375px]:grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3.5 sm:gap-y-6 pt-1">
                          {filteredComingSoon.map((module, idx) => (
                            <ModuleTile
                              key={module.id}
                              module={module}
                              onLaunch={handleLaunchModule}
                              index={idx}
                              animate={!hasLoaded}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ===================================================================== */}
          {/* 8. FOOTER TIPIS & BERSIH                                              */}
          {/* ===================================================================== */}
          <LauncherFooter className="mt-8" />
        </main>
      </div>
    </div>
  );
}
