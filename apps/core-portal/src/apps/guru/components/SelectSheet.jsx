import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import BottomSheet from './BottomSheet';

/**
 * SelectSheet Component - Mobile-First Picker
 * Menggantikan elemen select bawaan HP dengan Bottom Sheet yang mudah disentuh dengan satu tangan (44px per baris).
 */
export const SelectSheet = ({
  options = [], // [{ value: any, label: string, subtitle?: string, icon?: ReactNode }]
  value = '',
  onChange,
  label = null,
  placeholder = 'Pilih opsi...',
  title = 'Pilih Opsi',
  searchable = true,
  disabled = false,
  error = false,
  className = '',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleSelect = (val, opt) => {
    onChange?.(val, opt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const errorStyles = error
    ? 'border-rose-500 text-rose-600 focus:border-rose-600 focus:ring-rose-500/20'
    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20';

  return (
    <>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label || title}
        className={`w-full min-h-[44px] px-3.5 py-2 text-left bg-white dark:bg-slate-900 rounded-lg border transition-all flex items-center justify-between gap-2 outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 disabled:cursor-not-allowed ${errorStyles} ${className}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500 dark:text-slate-400">
              {selectedOption.icon}
            </span>
          )}
          <span className={`truncate text-sm ${selectedOption ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
      </button>

      {/* Picker Bottom Sheet */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
        title={title}
        description={label ? `Pilih salah satu ${label.toLowerCase()}` : undefined}
      >
        <div className="flex flex-col gap-3">
          {/* Search Box if list is long */}
          {searchable && options.length > 5 && (
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari dalam daftar..."
                className="w-full min-h-[40px] pl-9 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-8 h-8 flex items-center justify-center absolute right-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada pilihan yang cocok
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value, opt)}
                    className={`flex items-center justify-between gap-3 px-3 py-3 min-h-[44px] text-left transition-colors rounded-lg active:bg-slate-100 dark:active:bg-slate-800 ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && <span className="shrink-0 text-current">{opt.icon}</span>}
                      <div className="truncate">
                        <p className="text-sm truncate leading-snug">{opt.label}</p>
                        {opt.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                            {opt.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default SelectSheet;
