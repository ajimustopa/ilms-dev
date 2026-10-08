import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';

/**
 * LauncherRecentShelf — Rak Riwayat Modul Terakhir Dibuka
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 5:
 * - Desktop: Baris chip ringkas (ikon 36px + nama modul + chevron tipis).
 * - Mobile: Baris scroll horizontal (scroll-snap, swipe sentuh mulus, tanpa scrollbar mencolok).
 * - Tampil HANYA jika ada riwayat `recentModules.length > 0`. Jika kosong, bagian ini disembunyikan otomatis.
 */
export default function LauncherRecentShelf({
  recentModules = [],
  onLaunch,
  className = ''
}) {
  if (!recentModules || recentModules.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-2.5 ${className}`}>
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Terakhir Dibuka
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline font-medium">
          Akses Cepat Modul Favorit
        </span>
      </div>

      {/* Chips Container: Desktop Grid (1-4 cols) & Mobile Horizontal Scroll */}
      <div
        className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 overflow-x-auto sm:overflow-visible pb-1.5 sm:pb-0 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {recentModules.map((module) => {
          const Icon = module.icon;
          const displayName = module.displayName || module.name;

          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onLaunch(module)}
              className="group flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600/60 shadow-2xs hover:shadow-xs transition-all text-left cursor-pointer shrink-0 min-w-[190px] sm:min-w-0 snap-start active:scale-[0.97]"
            >
              {/* Icon Box */}
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <Icon className="w-5 h-5 stroke-[1.75]" />
              </div>

              {/* Text info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {module.code || module.moduleName}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
