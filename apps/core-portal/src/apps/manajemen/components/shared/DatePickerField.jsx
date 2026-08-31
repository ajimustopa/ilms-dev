import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';
import { useManajemenTheme } from '../../theme';
import 'react-day-picker/style.css';
import './date-picker-theme.css';

// Helpers Format Tanggal Indonesia (DD/MM/YYYY <-> YYYY-MM-DD)
export function isoToDmy(isoStr) {
  if (!isoStr) return '';
  const clean = String(isoStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return isoStr;
}

export function dmyToIso(dmyStr) {
  if (!dmyStr) return '';
  const clean = String(dmyStr).trim();
  const parts = clean.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (d.length === 1) d = '0' + d;
    if (m.length === 1) m = '0' + m;
    if (y.length === 2) y = '20' + y;
    if (d && m && y && y.length === 4) {
      const dayNum = Number(d);
      const monNum = Number(m);
      if (dayNum >= 1 && dayNum <= 31 && monNum >= 1 && monNum <= 12) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }
  return '';
}

function parseIsoToDate(isoStr) {
  if (!isoStr) return undefined;
  try {
    const parsed = typeof isoStr === 'string' ? parse(isoStr.slice(0, 10), 'yyyy-MM-dd', new Date()) : new Date(isoStr);
    return isValid(parsed) ? parsed : undefined;
  } catch (e) {
    return undefined;
  }
}

function formatDateToIso(dateObj) {
  if (!dateObj || !isValid(dateObj)) return '';
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Reusable DatePickerField component with full theme support (Light & Dark mode),
 * custom DayPicker popover, smart auto-flip positioning, and range / single mode support.
 */
export default function DatePickerField({
  value, // 'YYYY-MM-DD' string (for mode="single")
  onChange, // callback(isoString, dateObj)
  mode = 'single', // 'single' | 'range'
  startDate, // 'YYYY-MM-DD' string (for mode="range")
  endDate, // 'YYYY-MM-DD' string (for mode="range")
  onRangeChange, // callback({ startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' })
  placeholder = 'HH/BB/TTTT (DD/MM/YY)',
  label,
  min, // 'YYYY-MM-DD'
  max, // 'YYYY-MM-DD'
  disabled = false,
  required = false,
  allowClear = true,
  className = '',
  inputClassName = '',
}) {
  const { isDark } = useManajemenTheme ? useManajemenTheme() : { isDark: true };
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  // Single Date state
  const singleDateObj = useMemo(() => parseIsoToDate(value), [value]);

  // Range Date state
  const rangeDateObj = useMemo(() => {
    return {
      from: parseIsoToDate(startDate),
      to: parseIsoToDate(endDate),
    };
  }, [startDate, endDate]);

  // Text display for input field
  const [textValue, setTextValue] = useState(() => {
    if (mode === 'range') {
      const s = isoToDmy(startDate);
      const e = isoToDmy(endDate);
      if (s && e) return `${s} - ${e}`;
      if (s) return `${s} - ...`;
      return '';
    }
    return isoToDmy(value);
  });

  // Sync text value when external props change
  useEffect(() => {
    if (mode === 'range') {
      const s = isoToDmy(startDate);
      const e = isoToDmy(endDate);
      if (s && e) setTextValue(`${s} - ${e}`);
      else if (s) setTextValue(`${s} - ...`);
      else setTextValue('');
    } else {
      setTextValue(isoToDmy(value));
    }
  }, [value, startDate, endDate, mode]);

  // Month shown in calendar
  const [month, setMonth] = useState(() => {
    if (mode === 'range' && rangeDateObj.from) return rangeDateObj.from;
    if (singleDateObj) return singleDateObj;
    return new Date();
  });

  // Auto flip positioning calculation
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const neededHeight = 370; // DayPicker approximate height

      if (spaceBelow < neededHeight && rect.top > neededHeight) {
        setOpenAbove(true);
      } else {
        setOpenAbove(false);
      }
    }
  }, [isOpen]);

  // Click outside and Esc listener
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Single date selection handler
  const handleDaySelect = (selectedDate) => {
    if (!selectedDate) {
      if (onChange) onChange('', null);
      setTextValue('');
      setIsOpen(false);
      return;
    }
    const iso = formatDateToIso(selectedDate);
    if (onChange) onChange(iso, selectedDate);
    setTextValue(isoToDmy(iso));
    setIsOpen(false);
  };

  // Range selection handler
  const handleRangeSelect = (range) => {
    if (!range) {
      if (onRangeChange) onRangeChange({ startDate: '', endDate: '' });
      return;
    }
    const isoFrom = range.from ? formatDateToIso(range.from) : '';
    const isoTo = range.to ? formatDateToIso(range.to) : '';

    if (onRangeChange) {
      onRangeChange({ startDate: isoFrom, endDate: isoTo });
    }

    if (range.from && range.to) {
      setTextValue(`${isoToDmy(isoFrom)} - ${isoToDmy(isoTo)}`);
      // Close after full range selected
      setTimeout(() => setIsOpen(false), 200);
    } else if (range.from) {
      setTextValue(`${isoToDmy(isoFrom)} - ...`);
    }
  };

  // Quick Shortcuts Handlers
  const handleSelectToday = () => {
    const today = new Date();
    setMonth(today);
    if (mode === 'single') {
      handleDaySelect(today);
    } else {
      const todayIso = formatDateToIso(today);
      if (onRangeChange) onRangeChange({ startDate: todayIso, endDate: todayIso });
      setIsOpen(false);
    }
  };

  const handleSelectTomorrow = () => {
    const tomorrow = addDays(new Date(), 1);
    setMonth(tomorrow);
    handleDaySelect(tomorrow);
  };

  const handleSelectThisWeek = () => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    setMonth(start);
    if (onRangeChange) {
      onRangeChange({
        startDate: formatDateToIso(start),
        endDate: formatDateToIso(end),
      });
    }
    setIsOpen(false);
  };

  const handleSelectThisMonth = () => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    setMonth(start);
    if (onRangeChange) {
      onRangeChange({
        startDate: formatDateToIso(start),
        endDate: formatDateToIso(end),
      });
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    if (mode === 'range') {
      if (onRangeChange) onRangeChange({ startDate: '', endDate: '' });
    } else {
      if (onChange) onChange('', null);
    }
    setTextValue('');
  };

  // Manual typing in single mode
  const handleTextChange = (e) => {
    if (mode === 'range') return; // Range is selected via picker
    let input = e.target.value.replace(/[^0-9/]/g, '');
    if (!input.includes('/') && input.length >= 2) {
      if (input.length <= 4) {
        input = `${input.slice(0, 2)}/${input.slice(2)}`;
      } else {
        input = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4, 8)}`;
      }
    }
    setTextValue(input);
    const iso = dmyToIso(input);
    if (iso && iso.length === 10) {
      if (onChange) onChange(iso, parseIsoToDate(iso));
    } else if (!input.trim()) {
      if (onChange) onChange('', null);
    }
  };

  const hasValue = mode === 'range' ? Boolean(startDate || endDate) : Boolean(value);

  // Min / Max Date constraints
  const minDateObj = useMemo(() => parseIsoToDate(min), [min]);
  const maxDateObj = useMemo(() => parseIsoToDate(max), [max]);

  const disabledMatcher = useMemo(() => {
    const matchers = [];
    if (minDateObj) matchers.push({ before: minDateObj });
    if (maxDateObj) matchers.push({ after: maxDateObj });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDateObj, maxDateObj]);

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Display Bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={mode === 'range' ? 'Pilih rentang tanggal...' : placeholder}
          disabled={disabled}
          required={required}
          readOnly={mode === 'range'}
          className={`w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-3.5 pr-14 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 font-mono tracking-wide transition cursor-pointer shadow-xs ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${inputClassName}`}
        />

        {/* Action icons right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
          {allowClear && hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 transition cursor-pointer"
              title="Bersihkan tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            className={`p-1 rounded-lg transition cursor-pointer ${
              isOpen ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-600/20' : 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Buka Kalender"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Custom DayPicker Popover */}
      {isOpen && !disabled && (
        <div
          ref={popoverRef}
          className={`absolute z-[99999] w-[310px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md animate-scaleUp text-left transition-all ${
            openAbove ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.15), 0 8px 16px -6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* DayPicker Container */}
          <div className="mj-daypicker-container">
            {mode === 'range' ? (
              <DayPicker
                mode="range"
                selected={rangeDateObj}
                onSelect={handleRangeSelect}
                month={month}
                onMonthChange={setMonth}
                locale={localeId}
                disabled={disabledMatcher}
                showOutsideDays={true}
              />
            ) : (
              <DayPicker
                mode="single"
                selected={singleDateObj}
                onSelect={handleDaySelect}
                month={month}
                onMonthChange={setMonth}
                locale={localeId}
                disabled={disabledMatcher}
                showOutsideDays={true}
              />
            )}
          </div>

          {/* Quick Shortcuts & Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2 py-1 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-500/30 transition cursor-pointer"
              >
                Hari Ini
              </button>

              {mode === 'single' ? (
                <button
                  type="button"
                  onClick={handleSelectTomorrow}
                  className="px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Besok
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSelectThisWeek}
                    className="px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Pekan Ini
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectThisMonth}
                    className="px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 rounded-lg font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                  title="Hapus pilihan"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
