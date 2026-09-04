import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Loader2 } from 'lucide-react';
import useIsDarkMode from '../hooks/useIsDarkMode';

/**
 * SearchableSelect - Dropdown dengan live search realtime, multi-select, keyboard navigation & auto dark mode.
 *
 * Props:
 *  - options: array of { value, label, sublabel?, badge?, badgeClass? }
 *  - value: nilai terpilih saat ini (primitive atau array jika multiple/isMulti)
 *  - onChange: function(value) dipanggil saat item dipilih/diubah
 *  - placeholder: teks placeholder saat belum ada pilihan (default: '-- Pilih --')
 *  - searchPlaceholder: placeholder pada input pencarian (default: 'Ketik untuk mencari...')
 *  - disabled: boolean (nonaktifkan dropdown)
 *  - className: override kelas wrapper
 *  - variant: 'default' | 'header-white' | 'dark' (default: 'default', otomatis adaptif ke dark mode)
 *  - accentColor: 'indigo' | 'blue' | 'emerald' | 'violet' (default: 'indigo')
 *  - menuMinWidth: string CSS minWidth (default: '100%')
 *  - dropdownPosition: 'down' | 'up' | 'auto' (default: 'auto')
 *  - emptyText: teks saat tidak ada hasil pencarian
 *  - isError: boolean (menampilkan styling border merah untuk error validasi)
 *  - isLoading: boolean (menampilkan spinner saat memuat data)
 *  - multiple / isMulti: boolean (mengaktifkan mode multi-select dengan chips)
 *  - allowClear: boolean (menampilkan tombol X untuk mereset pilihan)
 *  - required: boolean
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Ketik untuk mencari...',
  disabled = false,
  className = '',
  variant = 'default',
  accentColor = 'indigo',
  menuMinWidth = '100%',
  dropdownPosition = 'auto',
  dropdownAlign = 'auto',
  emptyText = 'Tidak ada pilihan yang cocok',
  isError = false,
  isLoading = false,
  multiple = false,
  isMulti = false,
  allowClear = true,
  required = false,
}) {
  const isDarkMode = useIsDarkMode();
  const isMultiMode = Boolean(multiple || isMulti);
  const effectiveDark = variant === 'dark' || (variant !== 'header-white' && isDarkMode);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('down');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);

  // Normalisasi selected values (Array string untuk perbandingan akurat)
  const selectedValues = useMemo(() => {
    if (!isMultiMode) {
      return value !== undefined && value !== null && value !== '' ? [String(value)] : [];
    }
    if (Array.isArray(value)) return value.map(String);
    if (value !== undefined && value !== null && value !== '') return [String(value)];
    return [];
  }, [value, isMultiMode]);

  const [align, setAlign] = useState('left');

  // Posisi dan perataan dropdown dinamis (up / down, left / right)
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (dropdownPosition === 'auto') {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setPosition(spaceBelow < 280 && spaceAbove > spaceBelow ? 'up' : 'down');
      } else {
        setPosition(dropdownPosition);
      }

      if (dropdownAlign === 'auto') {
        setAlign(rect.left + rect.width / 2 > window.innerWidth / 2 ? 'right' : 'left');
      } else {
        setAlign(dropdownAlign);
      }
    }
  }, [open, dropdownPosition, dropdownAlign]);

  // Filter options berdasarkan live search (label, sublabel, badge, value)
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => {
      const labelMatch = String(opt.label || '').toLowerCase().includes(q);
      const subMatch = String(opt.sublabel || '').toLowerCase().includes(q);
      const badgeMatch = String(opt.badge || '').toLowerCase().includes(q);
      const valMatch = String(opt.value || '').toLowerCase().includes(q);
      return labelMatch || subMatch || badgeMatch || valMatch;
    });
  }, [options, search]);

  // Reset highlight index & focus search saat dibuka
  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
      const timer = setTimeout(() => {
        searchRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
      setHighlightIndex(0);
    }
  }, [open]);

  // Auto scroll item yang sedang di-highlight ke dalam viewport
  useEffect(() => {
    if (open && optionRefs.current[highlightIndex]) {
      optionRefs.current[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Handle seleksi opsi (Single atau Toggle Multi)
  const handleSelect = (opt) => {
    if (!onChange) return;
    const optVal = opt.value;
    const valStr = String(optVal);

    if (!isMultiMode) {
      onChange(optVal);
      setOpen(false);
      triggerRef.current?.focus();
    } else {
      const isSelected = selectedValues.includes(valStr);
      let updated;
      if (isSelected) {
        updated = selectedValues.filter((v) => v !== valStr);
      } else {
        updated = [...selectedValues, valStr];
      }
      // Re-cast ke nilai asli (misal number) jika cocok dengan options
      const castedUpdated = updated.map((v) => {
        const orig = options.find((o) => String(o.value) === String(v));
        return orig ? orig.value : v;
      });
      onChange(castedUpdated);
    }
  };

  // Handle clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    if (!onChange) return;
    if (isMultiMode) {
      onChange([]);
    } else {
      const hasAllOption = options.some((o) => String(o.value) === 'all');
      onChange(hasAllOption ? 'all' : '');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!open) {
      if (['Enter', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Mapping array objek terpilih
  const selectedOptionObjs = useMemo(() => {
    return selectedValues
      .map((val) => options.find((o) => String(o.value) === String(val)))
      .filter(Boolean);
  }, [selectedValues, options]);

  const hasSelection = selectedOptionObjs.length > 0;

  // Color mappings
  const accentClasses = {
    indigo: {
      ring: 'ring-indigo-500/30 border-indigo-500',
      focusRing: 'focus:ring-indigo-500/20 focus:border-indigo-500',
      selectedBg: effectiveDark ? 'bg-indigo-950/70 text-indigo-200 border-l-2 border-indigo-500' : 'bg-indigo-50 text-indigo-900 border-l-3 border-indigo-600',
      selectedText: effectiveDark ? 'text-indigo-200 font-bold' : 'text-indigo-950 font-bold',
      check: effectiveDark ? 'text-indigo-400' : 'text-indigo-600',
      chevronOpen: effectiveDark ? 'text-indigo-400 bg-indigo-500/10' : 'bg-indigo-50 text-indigo-600',
      chip: effectiveDark ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    blue: {
      ring: 'ring-blue-500/30 border-blue-500',
      focusRing: 'focus:ring-blue-500/20 focus:border-blue-500',
      selectedBg: effectiveDark ? 'bg-blue-950/70 text-blue-200 border-l-2 border-blue-500' : 'bg-blue-50 text-blue-900 border-l-3 border-blue-600',
      selectedText: effectiveDark ? 'text-blue-200 font-bold' : 'text-blue-950 font-bold',
      check: effectiveDark ? 'text-blue-400' : 'text-blue-600',
      chevronOpen: effectiveDark ? 'text-blue-400 bg-blue-500/10' : 'bg-blue-50 text-blue-600',
      chip: effectiveDark ? 'bg-blue-600/20 text-blue-200 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200',
    },
    emerald: {
      ring: 'ring-emerald-500/30 border-emerald-500',
      focusRing: 'focus:ring-emerald-500/20 focus:border-emerald-500',
      selectedBg: effectiveDark ? 'bg-emerald-950/70 text-emerald-200 border-l-2 border-emerald-500' : 'bg-emerald-50 text-emerald-900 border-l-3 border-emerald-600',
      selectedText: effectiveDark ? 'text-emerald-200 font-bold' : 'text-emerald-950 font-bold',
      check: effectiveDark ? 'text-emerald-400' : 'text-emerald-600',
      chevronOpen: effectiveDark ? 'text-emerald-400 bg-emerald-500/10' : 'bg-emerald-50 text-emerald-600',
      chip: effectiveDark ? 'bg-emerald-600/20 text-emerald-200 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    violet: {
      ring: 'ring-violet-500/30 border-violet-500',
      focusRing: 'focus:ring-violet-500/20 focus:border-violet-500',
      selectedBg: effectiveDark ? 'bg-violet-950/70 text-violet-200 border-l-2 border-violet-500' : 'bg-violet-50 text-violet-900 border-l-3 border-violet-600',
      selectedText: effectiveDark ? 'text-violet-200 font-bold' : 'text-violet-950 font-bold',
      check: effectiveDark ? 'text-violet-400' : 'text-violet-600',
      chevronOpen: effectiveDark ? 'text-violet-400 bg-violet-500/10' : 'bg-violet-50 text-violet-600',
      chip: effectiveDark ? 'bg-violet-600/20 text-violet-200 border-violet-500/30' : 'bg-violet-50 text-violet-800 border-violet-200',
    },
  }[accentColor] || {
    ring: 'ring-indigo-500/30 border-indigo-500',
    focusRing: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    selectedBg: effectiveDark ? 'bg-indigo-950/70 text-indigo-200 border-l-2 border-indigo-500' : 'bg-indigo-50 text-indigo-900 border-l-3 border-indigo-600',
    selectedText: effectiveDark ? 'text-indigo-200 font-bold' : 'text-indigo-950 font-bold',
    check: effectiveDark ? 'text-indigo-400' : 'text-indigo-600',
    chevronOpen: effectiveDark ? 'text-indigo-400 bg-indigo-500/10' : 'bg-indigo-50 text-indigo-600',
    chip: effectiveDark ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  // Trigger button styling
  const getTriggerClass = () => {
    if (variant === 'header-white') {
      return `
        w-full px-3 py-1.5 border rounded-xl bg-white hover:bg-slate-50 text-left flex items-center justify-between gap-2 transition duration-150 shadow-md group
        ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:shadow-lg'}
        ${isError ? 'border-rose-500 ring-2 ring-rose-500/20' : open ? `${accentClasses.ring} ring-2 bg-white` : 'border-white/90 hover:border-white'}
      `;
    }

    if (effectiveDark) {
      return `
        w-full px-3 py-2 border rounded-xl bg-slate-900 hover:bg-slate-850 text-left flex items-center justify-between gap-2 transition duration-150 shadow-inner group min-h-[38px]
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-600'}
        ${isError ? 'border-rose-500 ring-2 ring-rose-500/30' : open ? `${accentClasses.ring} ring-2 bg-slate-900` : 'border-slate-800'}
      `;
    }

    return `
      w-full px-3 py-2 border rounded-xl bg-slate-50 hover:bg-white text-left flex items-center justify-between gap-2 transition duration-150 shadow-2xs group min-h-[38px]
      ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:border-slate-400 hover:shadow-xs'}
      ${isError ? 'border-rose-500 ring-2 ring-rose-500/20' : open ? `${accentClasses.ring} ring-2 bg-white` : 'border-slate-200'}
    `;
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${open ? 'z-[500]' : 'z-10'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={getTriggerClass()}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {!hasSelection ? (
            <span className={`text-xs font-medium truncate ${effectiveDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {placeholder}
            </span>
          ) : isMultiMode ? (
            selectedOptionObjs.map((opt) => (
              <span
                key={opt.value}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-xs border ${accentClasses.chip}`}
              >
                <span className="truncate max-w-[130px]">{opt.label}</span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  className={`p-0.5 rounded transition cursor-pointer font-bold leading-none ${
                    effectiveDark ? 'text-slate-400 hover:text-rose-300' : 'text-slate-500 hover:text-rose-600'
                  }`}
                  title="Hapus pilihan"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </span>
            ))
          ) : (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {selectedOptionObjs[0].badge && (
                  <span
                    className={
                      selectedOptionObjs[0].badgeClass ||
                      (effectiveDark
                        ? 'font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0'
                        : 'font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0')
                    }
                  >
                    {selectedOptionObjs[0].badge}
                  </span>
                )}
                <span
                  className={`text-xs truncate ${
                    effectiveDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-800'
                  }`}
                >
                  {selectedOptionObjs[0].label}
                </span>
              </div>
              {selectedOptionObjs[0].sublabel && (
                <span
                  className={`text-[10px] truncate leading-tight mt-0.5 ${
                    effectiveDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {selectedOptionObjs[0].sublabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Controls Kanan */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isLoading && (
            <Loader2 className={`w-3.5 h-3.5 animate-spin ${effectiveDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          )}
          {allowClear && hasSelection && !disabled && (
            <span
              onClick={handleClear}
              title="Reset pilihan"
              className={`p-1 rounded-lg transition cursor-pointer ${
                effectiveDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'hover:bg-slate-200/80 text-slate-400 hover:text-slate-700'
              }`}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <div
            className={`p-1 rounded-lg transition duration-200 ${
              open
                ? `${accentClasses.chevronOpen} rotate-180`
                : effectiveDark
                ? 'text-slate-400 group-hover:text-slate-200'
                : 'text-slate-500 group-hover:text-slate-700'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={`
            absolute z-[1000] rounded-2xl shadow-2xl overflow-hidden border
            animate-in fade-in zoom-in-95 duration-100
            ${align === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'}
            ${position === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
            ${
              effectiveDark
                ? 'bg-slate-900 border-slate-700/90 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }
          `}
          style={{
            minWidth: menuMinWidth,
            ...(menuMinWidth === '100%' ? { width: '100%', maxWidth: '100%' } : { maxWidth: 'calc(100vw - 32px)' })
          }}
        >
          {/* Live Search Box */}
          <div
            className={`p-2.5 border-b ${
              effectiveDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50/90'
            }`}
          >
            <div className="relative flex items-center">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                  effectiveDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder={searchPlaceholder}
                className={`w-full pl-9 pr-7 py-1.5 text-xs rounded-xl focus:outline-none transition font-medium border ${
                  effectiveDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
                    : `bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 ${accentClasses.focusRing}`
                }`}
              />
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 animate-spin" />
              ) : (
                search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className={`absolute right-2 p-1 ${
                      effectiveDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className={`max-h-60 overflow-y-auto p-1.5 divide-y ${
              effectiveDark ? 'divide-slate-800/40' : 'divide-slate-50'
            }`}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                <Search className={`w-5 h-5 stroke-[1.5] ${effectiveDark ? 'text-slate-600' : 'text-slate-300'}`} />
                <span>{isLoading ? 'Memuat data...' : emptyText}</span>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedValues.includes(String(opt.value));
                const isHighlighted = idx === highlightIndex;

                return (
                  <button
                    key={opt.value + '-' + idx}
                    ref={(el) => (optionRefs.current[idx] = el)}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`
                      w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between gap-2 transition cursor-pointer
                      ${
                        isSelected
                          ? accentClasses.selectedBg
                          : isHighlighted
                          ? effectiveDark
                            ? 'bg-slate-800/90 text-white'
                            : 'bg-slate-100/90 text-slate-900'
                          : effectiveDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isMultiMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className={`w-3.5 h-3.5 rounded focus:ring-0 shrink-0 pointer-events-none ${
                            effectiveDark
                              ? 'border-slate-700 bg-slate-950 text-indigo-500'
                              : 'border-slate-300 bg-white text-indigo-600'
                          }`}
                        />
                      )}

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`leading-snug truncate ${
                              isSelected
                                ? accentClasses.selectedText
                                : effectiveDark
                                ? 'font-medium text-slate-200'
                                : 'font-semibold text-slate-800'
                            }`}
                          >
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span
                              className={
                                opt.badgeClass ||
                                (effectiveDark
                                  ? 'font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0'
                                  : 'font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0')
                              }
                            >
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <span
                            className={`text-[10px] leading-tight truncate mt-0.5 ${
                              isSelected
                                ? effectiveDark
                                  ? 'text-indigo-300'
                                  : 'text-indigo-700'
                                : effectiveDark
                                ? 'text-slate-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isMultiMode && isSelected && (
                      <Check className={`w-4 h-4 ${accentClasses.check} shrink-0`} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Status & Navigation Hint */}
          <div
            className={`px-3 py-1.5 border-t flex items-center justify-between text-[10px] font-medium ${
              effectiveDark ? 'bg-slate-950/90 border-slate-800 text-slate-400' : 'bg-slate-50/90 border-slate-100 text-slate-500'
            }`}
          >
            <span>
              {filteredOptions.length} dari {options.length} data
              {isMultiMode && selectedValues.length > 0 && ` (${selectedValues.length} dipilih)`}
            </span>
            <span className="font-mono text-[9px] opacity-70">↑↓ navigasi &bull; Enter pilih</span>
          </div>
        </div>
      )}
    </div>
  );
}
