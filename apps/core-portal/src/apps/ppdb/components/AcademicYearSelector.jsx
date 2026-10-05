import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronDown, Check, Sparkles, Star } from 'lucide-react';

/**
 * AcademicYearSelector
 * Komponen Dropdown Pilihan Tahun Ajaran PPDB dengan Desain Modern & Anti-Duplikasi.
 *
 * Variants:
 * - 'navbar': Khusus Header Navbar Utama (Clean, Emerald Soft)
 * - 'banner': Khusus Header Banner Dashboard (Glassmorphism, White/Emerald Accent)
 * - 'filter': Khusus Toolbar Filter Halaman (Compact, Slate/Emerald Ring)
 */
export default function AcademicYearSelector({
  value,
  onChange,
  years = [],
  allowAll = false,
  allLabel = 'Semua Tahun Ajaran',
  variant = 'navbar',
  className = '',
  dropdownAlign = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Deduplikasi data tahun ajaran berdasarkan nama
  const uniqueYears = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(years) && years.length > 0 ? years : [
      { id: 1, name: '2026/2027', is_active: 1, start_date: '2026-07-15', end_date: '2027-06-20' },
      { id: 2, name: '2025/2026', is_active: 0, start_date: '2025-07-15', end_date: '2026-06-20' },
      { id: 3, name: '2024/2025', is_active: 0, start_date: '2024-07-01', end_date: '2025-06-30' }
    ];

    list.forEach(item => {
      const name = item.name ? String(item.name).trim() : null;
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, { ...item });
      } else {
        const existing = map.get(name);
        if (item.is_active) existing.is_active = 1;
        if (!existing.start_date && item.start_date) existing.start_date = item.start_date;
        if (!existing.end_date && item.end_date) existing.end_date = item.end_date;
      }
    });

    return Array.from(map.values());
  }, [years]);

  const activeItem = uniqueYears.find(y => y.name === value);
  const isSelectedAll = allowAll && value === 'all';

  const handleSelect = (val) => {
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  // Styling per Variant
  const getButtonStyles = () => {
    if (variant === 'banner') {
      return 'bg-black/30 hover:bg-black/40 text-white border-white/20 hover:border-white/35 backdrop-blur-md shadow-sm';
    }
    if (variant === 'filter') {
      return 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200 hover:border-emerald-300 shadow-2xs focus:ring-2 focus:ring-emerald-500/20';
    }
    // Default 'navbar'
    return 'bg-gradient-to-r from-emerald-50 to-teal-50/80 hover:from-emerald-100/70 hover:to-teal-100/80 text-emerald-950 border-emerald-200/90 hover:border-emerald-300 shadow-2xs';
  };

  const getIconColor = () => {
    if (variant === 'banner') return 'text-emerald-300';
    if (variant === 'filter') return 'text-emerald-600';
    return 'text-emerald-700';
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${getButtonStyles()}`}
        title="Pilih Tahun Ajaran PPDB"
      >
        <CalendarDays className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${getIconColor()}`} />

        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight">
            {isSelectedAll ? allLabel : `TA ${value || '2026/2027'}`}
          </span>

          {!isSelectedAll && Boolean(activeItem?.is_active) && (
            <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide ${
              variant === 'banner'
                ? 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/30'
                : 'bg-emerald-200/80 text-emerald-800'
            }`}>
              <Star className="w-2.5 h-2.5 fill-current" />
              <span>Aktif</span>
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
          isOpen ? 'rotate-180' : ''
        } ${variant === 'banner' ? 'text-white/70' : 'text-slate-400'}`} />
      </button>

      {/* Dropdown Menu Modal/Popover */}
      {isOpen && (
        <div
          className={`absolute mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden ${
            dropdownAlign === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Header Panel */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tahun Ajaran PSB</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              Modul Akademik
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {/* Opsi "Semua Tahun Ajaran" jika diizinkan */}
            {allowAll && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  value === 'all'
                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    value === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{allLabel}</div>
                    <div className="text-[10px] text-slate-400">Tampilkan seluruh program lintas periode</div>
                  </div>
                </div>
                {value === 'all' && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </button>
            )}

            {/* List Tahun Ajaran Unik */}
            {uniqueYears.map(ay => {
              const isSelected = value === ay.name;
              const isAktif = Boolean(ay.is_active);

              return (
                <button
                  key={ay.name}
                  type="button"
                  onClick={() => handleSelect(ay.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isAktif
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      <CalendarDays className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">Tahun Ajaran {ay.name}</span>
                        {isAktif && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>Aktif</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {ay.start_date && ay.end_date
                          ? `Periode: ${ay.start_date.substring(0, 4)} - ${ay.end_date.substring(0, 4)}`
                          : (isAktif ? 'Tahun ajaran aktif berjalan' : 'Periode arsip akademik')}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 ml-2">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3.5 py-1.5 bg-slate-50/80 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Pilihan berlaku untuk seluruh halaman PPDB</span>
            <span className="font-semibold text-emerald-600">Terpadu</span>
          </div>
        </div>
      )}
    </div>
  );
}
