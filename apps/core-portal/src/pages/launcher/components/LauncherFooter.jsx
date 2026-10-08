import React from 'react';

/**
 * LauncherFooter — Footer Bersih & Tipis Aldepos ILMS
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 5:
 * - "Kolaborasi • Integrasi • Layanan Terbaik" dan "Aldepos ILMS" (tanpa nomor versi lama).
 * - Padding safe area bawah di mobile (`pb-safe`).
 */
export default function LauncherFooter({
  className = ''
}) {
  return (
    <footer
      className={`pt-6 pb-4 sm:pb-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Kolaborasi</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Integrasi</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Layanan Terbaik</span>
      </div>

      <div className="text-center sm:text-right">
        <span>© {new Date().getFullYear()} Yayasan Pondok Pesantren Terpadu Aldepos • </span>
        <strong className="font-semibold text-slate-700 dark:text-slate-300">Aldepos ILMS</strong>
      </div>
    </footer>
  );
}
