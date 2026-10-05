import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingSkeleton — Skeleton loader untuk tabel, kartu KPI, list, dan form.
 * Sesuai Panduan Desain Enterprise Aldepos §4.5.
 *
 * Mendukung mode:
 * - `table`: skeleton header & baris tabel
 * - `card`: skeleton grid kartu KPI
 * - `list`: skeleton list vertikal
 * - `isRefreshing`: indikator halus tanpa menghapus data tabel yang ada
 */
export default function LoadingSkeleton({
  type = 'table',
  rows = 5,
  columns = 5,
  isRefreshing = false,
  className = ''
}) {
  if (isRefreshing) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50/70 border-b border-indigo-100 text-indigo-700 text-xs font-medium animate-pulse">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
        <span>Memuat pembaruan data...</span>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-white border border-slate-200/80 border-l-[3px] border-l-slate-200 flex flex-col justify-between h-20"
          >
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-2.5 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
              <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  // Default: table skeleton
  return (
    <div className={`w-full overflow-hidden rounded-lg border border-slate-200 bg-white animate-pulse ${className}`}>
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, cIdx) => (
          <div
            key={cIdx}
            className={`h-3 bg-slate-200 rounded ${cIdx === 0 ? 'w-24' : 'flex-1'}`}
          ></div>
        ))}
      </div>

      {/* Rows skeleton */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-3.5 bg-slate-100 rounded ${cIdx === 0 ? 'w-28' : 'flex-1'}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
