import React from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';

/**
 * FilterBar — Toolbar filter satu baris terstandarisasi.
 * Sesuai Panduan Desain Enterprise Aldepos §4.2.
 * 
 * Target: area filter kompak (~48-54px), tidak memakan ruang vertikal.
 * Filter tambahan/lanjutan dibuka via tombol "Filter Lanjutan" (Drawer), bukan menambah baris di halaman.
 */
export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  children,
  filters,
  moreFiltersCount = 0,
  onMoreFiltersClick,
  onReset,
  hasActiveFilters = false,
  actions,
  className = ''
}) {
  const isSearchControlled = typeof onSearchChange === 'function';

  return (
    <div
      className={`p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap ${className}`}
    >
      {/* Search and Filter Inputs Group */}
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
        {/* Search Input */}
        {isSearchControlled && (
          <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Quick Filter Slots */}
        {(children || filters) && (
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {children || filters}
          </div>
        )}

        {/* More Filters Trigger */}
        {onMoreFiltersClick && (
          <button
            type="button"
            onClick={onMoreFiltersClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shrink-0 ${
              moreFiltersCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Lanjutan</span>
            {moreFiltersCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                {moreFiltersCount}
              </span>
            )}
          </button>
        )}

        {/* Reset / Clear Button */}
        {(hasActiveFilters || Boolean(searchValue) || moreFiltersCount > 0) && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
            title="Reset semua filter"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline text-[11px]">Reset</span>
          </button>
        )}
      </div>

      {/* Right Action Buttons */}
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
