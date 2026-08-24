import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableSelect - Dropdown dengan live search realtime
 *
 * Props:
 *  - options: array of { value, label, sublabel? }
 *  - value: nilai terpilih saat ini
 *  - onChange: function(value) dipanggil saat item dipilih
 *  - placeholder: teks placeholder saat belum ada pilihan
 *  - searchPlaceholder: placeholder pada input pencarian
 *  - disabled: nonaktifkan dropdown
 *  - className: override kelas wrapper
 *  - dropdownPosition: 'down' | 'up' | 'auto' (default: 'auto')
 *  - emptyText: teks saat tidak ada hasil pencarian
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Ketik untuk mencari...',
  disabled = false,
  className = '',
  dropdownPosition = 'auto',
  emptyText = 'Tidak ada hasil yang cocok',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('down');
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  // Hitung posisi dropdown secara otomatis
  useEffect(() => {
    if (open && dropdownPosition === 'auto' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPosition(spaceBelow < 220 && spaceAbove > spaceBelow ? 'up' : 'down');
    } else if (dropdownPosition !== 'auto') {
      setPosition(dropdownPosition);
    }
  }, [open, dropdownPosition]);

  // Fokus ke input pencarian saat dropdown terbuka
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) setSearch('');
  }, [open]);

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

  // Filter opsi berdasarkan search
  const filtered = options.filter((opt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(opt.label).toLowerCase().includes(q) ||
      String(opt.sublabel || '').toLowerCase().includes(q) ||
      String(opt.value).toLowerCase().includes(q)
    );
  });

  const selected = options.find((o) => String(o.value) === String(value));

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          w-full px-3 py-2 border rounded-xl bg-white text-left flex items-center justify-between gap-2 transition shadow-2xs
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-teal-400'}
          ${open ? 'border-teal-500 ring-1 ring-teal-300' : 'border-slate-300'}
        `}
      >
        <span className={`text-xs truncate flex-1 ${selected ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-teal-600' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={`
            absolute left-0 right-0 z-[200] bg-white border border-slate-200 rounded-xl shadow-xl
            animate-in fade-in zoom-in-95 duration-100
            ${position === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
          `}
          style={{ minWidth: '100%' }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 transition
                      ${isSelected
                        ? 'bg-teal-50 text-teal-800 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                      }
                    `}
                  >
                    <span className="font-semibold leading-snug">{opt.label}</span>
                    {opt.sublabel && (
                      <span className={`text-[10px] ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>
                        {opt.sublabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400 text-right">
              {filtered.length} dari {options.length} data
            </div>
          )}
        </div>
      )}
    </div>
  );
}
