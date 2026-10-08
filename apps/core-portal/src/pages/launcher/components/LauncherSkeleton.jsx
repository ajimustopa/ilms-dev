import React from 'react';

/**
 * LauncherSkeleton — Skeleton Loader untuk Launcher Grid & Greeting
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 6:
 * - Menampilkan placeholder layout selama verifikasi sesi atau sinkronisasi data berlangsung.
 * - Mendukung tema terang (slate-200/slate-100) dan tema gelap (slate-800/slate-850).
 */
export default function LauncherSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse w-full" aria-busy="true" aria-label="Memuat portal launcher...">
      {/* 1. Greeting Banner Skeleton */}
      <div className="rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-7 sm:h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-56 sm:w-72" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
          </div>
          <div className="h-4 bg-slate-200/70 dark:bg-slate-800/60 rounded w-48" />
        </div>
        <div className="hidden sm:block h-10 w-44 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl" />
      </div>

      {/* 2. Mobile Search Skeleton (Mobile only) */}
      <div className="block md:hidden space-y-2.5">
        <div className="h-11 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl w-full" />
        <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-full w-36" />
      </div>

      {/* 3. Section Title Skeleton */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-32" />
          <div className="h-5 bg-slate-200/70 dark:bg-slate-800/60 rounded-full w-16" />
        </div>

        {/* 4. Grid Tiles Skeleton (12 tiles matching launcher layout) */}
        <div className="grid grid-cols-3 min-[375px]:grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3.5 sm:gap-y-6 pt-1">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-1.5 sm:p-2.5"
            >
              {/* Tile Box */}
              <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-2xl bg-slate-100 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800" />
              {/* Label */}
              <div className="h-3.5 bg-slate-200/80 dark:bg-slate-800 rounded w-14 sm:w-16 mt-2.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
