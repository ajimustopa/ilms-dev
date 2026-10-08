import React from 'react';

/**
 * ModuleTile — Tile Modul Ekosistem Aldepos ILMS (Ala Launcher HP Modern)
 * 
 * Sesuai Panduan Desain Enterprise Aldepos & RENCANA-IMPLEMENTASI Tahap 5:
 * - Tile Ikon: Desktop 72px (sm:w-[72px] sm:h-[72px]), Mobile 60px (w-[60px] h-[60px]),
 *   radius 16px (rounded-2xl), latar emerald-50 (dark:bg-emerald-950/40),
 *   ikon Lucide emerald-700 (dark:text-emerald-300), border emerald-100 (dark:border-emerald-800/60).
 * - Label: displayName maksimal 2 baris (line-clamp-2), terpusat, teks jelas.
 * - Seluruh sel interaktif min. 44px dengan target sentuh ramah jempol.
 * - Efek Hover Desktop: terangkat (-translate-y-1), border emerald-500, tile terisi emerald solid dengan ikon putih.
 * - Efek Tekan: scale-[0.96] (desktop/mobile).
 * - Tooltip deskripsi ringan CSS di desktop.
 * - State Segera Hadir: tile redup slate, ikon slate-400, badge "Segera Hadir" (mobile "Segera"), non-interaktif (aria-disabled).
 */
export default function ModuleTile({
  module,
  onLaunch,
  index = 0,
  animate = true
}) {
  const Icon = module.icon;
  const isComingSoon = module.status === 'coming_soon' || module.available === false;
  const displayName = module.displayName || module.name;

  if (isComingSoon) {
    return (
      <div
        aria-disabled="true"
        className={`group relative flex flex-col items-center text-center p-1.5 sm:p-2.5 rounded-2xl select-none opacity-70 transition-opacity ${
          animate ? 'ilms-fade-up' : ''
        }`}
        style={animate ? { '--i': Math.min(index, 20) } : undefined}
      >
        {/* Coming Soon Icon Tile */}
        <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0 shadow-2xs">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
        </div>

        {/* Label */}
        <span className="font-semibold text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 text-center leading-snug line-clamp-2 max-w-[90px] sm:max-w-[110px]">
          {displayName}
        </span>

        {/* Badge Segera Hadir */}
        <span className="mt-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          <span className="sm:hidden">Segera</span>
          <span className="hidden sm:inline">Segera Hadir</span>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onLaunch(module)}
      aria-label={`Buka modul ${module.name}`}
      className={`group relative flex flex-col items-center text-center p-1.5 sm:p-2.5 rounded-2xl min-h-[96px] sm:min-h-[116px] min-w-[70px] sm:min-w-[90px] cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.96] hover:bg-slate-50/80 dark:hover:bg-slate-850/60 ${
        animate ? 'ilms-fade-up' : ''
      }`}
      style={animate ? { '--i': Math.min(index, 20) } : undefined}
    >
      {/* Desktop Pure CSS Lightweight Tooltip */}
      {module.description && (
        <div
          role="tooltip"
          className="absolute -top-10 z-30 pointer-events-none hidden md:group-hover:flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100"
        >
          <div className="bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-medium shadow-lg whitespace-nowrap text-center max-w-[240px] truncate border border-slate-700/60">
            {module.description}
          </div>
          <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 -mt-1" />
        </div>
      )}

      {/* Interactive Icon Tile */}
      <div className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs transition-all duration-200 sm:group-hover:-translate-y-1 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:shadow-md">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75] transition-transform duration-200 group-hover:scale-105" />
      </div>

      {/* Module Title Label (Max 2 Lines) */}
      <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 mt-2 text-center leading-snug line-clamp-2 max-w-[90px] sm:max-w-[110px] transition-colors">
        {displayName}
      </span>
    </button>
  );
}
