import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import {
  format,
  parse,
  isValid,
  addMonths,
  subMonths,
  addYears,
  subYears,
  getYear,
  setYear
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import 'react-day-picker/style.css';

// Helpers Format Tanggal Indonesia (DD/MM/YYYY <-> YYYY-MM-DD)
export function isoToDmy(isoStr) {
  if (!isoStr) return '';
  const clean = String(isoStr).trim().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD/MM/YYYY
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY -> DD/MM/YYYY
      const [d, m, y] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  return clean;
}

export function dmyToIso(dmyStr) {
  if (!dmyStr) return '';
  const clean = String(dmyStr).trim();
  
  // Pisahkan komponen tanggal dan jam jika ada (misal: "01/07/2024 6:01:48" atau "01/07/2024 06:01")
  const spaceIdx = clean.indexOf(' ');
  let datePart = clean;
  let timePart = '';
  if (spaceIdx !== -1) {
    datePart = clean.slice(0, spaceIdx).trim();
    timePart = clean.slice(spaceIdx + 1).trim();
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  
  const parts = datePart.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
      const [y, m, d] = parts;
      const monNum = Number(m);
      const dayNum = Number(d);
      if (monNum >= 1 && monNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${y}-${String(monNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    } else {
      // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY
      let [d, m, y] = parts;
      if (d.length === 1) d = '0' + d;
      if (m.length === 1) m = '0' + m;
      if (y.length === 2) y = '20' + y;
      if (d && m && y && y.length === 4) {
        const dayNum = Number(d);
        const monNum = Number(m);
        const yearNum = Number(y);
        if (dayNum >= 1 && dayNum <= 31 && monNum >= 1 && monNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          return `${y}-${String(monNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        }
      }
    }
  }
  // 8 digits without separator: e.g. 10072024 or 20240710
  if (/^\d{8}$/.test(datePart)) {
    const first4 = Number(datePart.slice(0, 4));
    if (first4 >= 1900 && first4 <= 2100) {
      const y = datePart.slice(0, 4);
      const m = datePart.slice(4, 6);
      const d = datePart.slice(6, 8);
      const monNum = Number(m);
      const dayNum = Number(d);
      if (monNum >= 1 && monNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${y}-${m}-${d}`;
      }
    } else {
      const d = datePart.slice(0, 2);
      const m = datePart.slice(2, 4);
      const y = datePart.slice(4, 8);
      const dayNum = Number(d);
      const monNum = Number(m);
      const yearNum = Number(y);
      if (dayNum >= 1 && dayNum <= 31 && monNum >= 1 && monNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        return `${y}-${m}-${d}`;
      }
    }
  }
  return '';
}

// Ekstrak time string format HH:mm atau HH:mm:ss dari berbagai format input (misal "6:01:48", "17.49.54", "06:01", "17.49")
export function extractTimeFromInput(inputStr) {
  if (!inputStr) return '';
  const clean = String(inputStr).trim();
  const spaceIdx = clean.indexOf(' ');
  const tStr = spaceIdx !== -1 ? clean.slice(spaceIdx + 1).trim() : clean;
  // Match HH:mm:ss atau HH.mm.ss atau HH:mm atau HH.mm
  const timeMatch = tStr.match(/(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?/);
  if (timeMatch) {
    const hh = String(timeMatch[1]).padStart(2, '0');
    const mm = String(timeMatch[2]).padStart(2, '0');
    const ss = timeMatch[3] !== undefined ? String(timeMatch[3]).padStart(2, '0') : null;
    return ss ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }
  return '';
}

function parseIsoToDate(isoStr) {
  if (!isoStr) return undefined;
  try {
    const clean = String(isoStr).trim();
    const spaceIdx = clean.indexOf(' ');
    const datePart = spaceIdx !== -1 ? clean.slice(0, spaceIdx).trim() : clean;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
      const parts = datePart.split('/');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      const parsed = parse(`${d}/${m}/${y}`, 'dd/MM/yyyy', new Date());
      return isValid(parsed) ? parsed : undefined;
    }
    const isoClean = datePart.slice(0, 10);
    const parsed = typeof isoClean === 'string' ? parse(isoClean, 'yyyy-MM-dd', new Date()) : new Date(isoClean);
    return isValid(parsed) ? parsed : undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Reusable DatePickerField component using react-day-picker + date-fns + createPortal
 * Diposisikan secara akurat tepat di bawah inputan teks tanpa menghalangi input field dan tanpa flicker di sudut kiri atas.
 */
export default function DatePickerField({
  value, // 'YYYY-MM-DD'
  onChange, // callback(isoString, dateObj)
  onTimeExtracted, // optional callback(timeStr "HH:mm" atau "HH:mm:ss")
  placeholder = 'DD/MM/YYYY',
  label,
  disabled = false,
  required = false,
  allowClear = true,
  align = 'auto', // 'auto' | 'left' | 'right'
  className = '',
  inputClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const isTypingRef = useRef(false);

  const selectedDate = useMemo(() => parseIsoToDate(value), [value]);
  const [textValue, setTextValue] = useState(() => isoToDmy(value));
  const [currentMonth, setCurrentMonth] = useState(() => selectedDate || new Date());
  const [popoverCoords, setPopoverCoords] = useState(null);

  useEffect(() => {
    if (!isTypingRef.current) {
      setTextValue(isoToDmy(value));
    }
  }, [value]);

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  // Hitung posisi tepat di atas atau di bawah inputan TANPA pernah menutupi/menghalangi kotak input
  const calculateCoords = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // Gunakan tinggi & lebar aktual popover bila sudah ter-render, atau default proporsional
    const popoverH = popoverRef.current?.offsetHeight || 345;
    const popoverW = popoverRef.current?.offsetWidth || 304;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Logika Auto-Flip Pintar: Utamakan sisi yang memiliki ruang paling lega jika salah satu sisi tidak cukup
    const neededHeight = popoverH + 10;
    let shouldOpenAbove = false;

    if (spaceBelow >= neededHeight) {
      // Ruang bawah sangat leluasa
      shouldOpenAbove = false;
    } else if (spaceAbove >= neededHeight) {
      // Ruang bawah sempit, tapi ruang atas leluasa
      shouldOpenAbove = true;
    } else {
      // Kedua sisi sempit (layar kecil/laptop), pilih sisi yang lebih luas
      shouldOpenAbove = spaceAbove > spaceBelow;
    }

    let top = 0;
    let maxHeight = popoverH;

    if (shouldOpenAbove) {
      top = Math.max(8, rect.top - popoverH - 6);
      const availableAbove = rect.top - 12;
      maxHeight = Math.min(popoverH, Math.max(240, availableAbove));
    } else {
      top = rect.bottom + 6;
      const availableBelow = viewportHeight - top - 12;
      maxHeight = Math.min(popoverH, Math.max(240, availableBelow));
    }

    let left = rect.left;
    if (align === 'right' || (align !== 'left' && rect.left + popoverW > viewportWidth - 12)) {
      left = rect.right - popoverW;
    }
    if (left < 12) left = 12;
    if (left + popoverW > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popoverW - 12);
    }

    return {
      top: Math.round(top),
      left: Math.round(left),
      maxHeight: Math.round(maxHeight)
    };
  }, [align]);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const coords = calculateCoords();
    if (coords) {
      setPopoverCoords(coords);
    }
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
    setIsOpen(true);
  }, [disabled, calculateCoords, selectedDate]);

  // Pastikan posisi terhitung sebelum browser painting (mencegah muncul di 0,0)
  useLayoutEffect(() => {
    if (isOpen) {
      const coords = calculateCoords();
      if (coords) {
        setPopoverCoords(coords);
      }
    }
  }, [isOpen, calculateCoords]);

  // Re-adjust posisi begitu popoverRef ter-mount dengan tinggi DOM yang terukur akurat
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const coords = calculateCoords();
      if (coords) {
        setPopoverCoords(coords);
      }
    }
  }, [isOpen, calculateCoords, currentMonth]);

  // Handle outside click & update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        isTypingRef.current = false;
        // Clean up on blur / click outside
        const iso = dmyToIso(textValue);
        if (iso) {
          setTextValue(isoToDmy(iso));
        } else if (!textValue.trim() && allowClear) {
          setTextValue('');
        } else {
          setTextValue(isoToDmy(value));
        }
      }
    };

    const handleScrollOrResize = () => {
      const coords = calculateCoords();
      if (coords) {
        setPopoverCoords(coords);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, textValue, value, allowClear, calculateCoords]);

  const handleSelectDay = (day) => {
    isTypingRef.current = false;
    if (!day) {
      if (allowClear) {
        onChange?.('', undefined);
        setTextValue('');
      }
    } else {
      const isoStr = format(day, 'yyyy-MM-dd');
      const dmyStr = format(day, 'dd/MM/yyyy');
      setTextValue(dmyStr);
      onChange?.(isoStr, day);
    }
    setIsOpen(false);
  };

  const handleTextChange = (e) => {
    isTypingRef.current = true;
    const raw = e.target.value;
    setTextValue(raw);
    
    // Auto-extract time jika user menempelkan string datetime lengkap
    const extractedTime = extractTimeFromInput(raw);
    if (extractedTime && onTimeExtracted) {
      onTimeExtracted(extractedTime);
    }

    const iso = dmyToIso(raw);
    if (iso) {
      const parsed = parseIsoToDate(iso);
      onChange?.(iso, parsed);
      if (parsed) setCurrentMonth(parsed);
    }
  };

  const handleInputBlur = () => {
    isTypingRef.current = false;
    const raw = textValue;
    const extractedTime = extractTimeFromInput(raw);
    if (extractedTime && onTimeExtracted) {
      onTimeExtracted(extractedTime);
    }

    const iso = dmyToIso(raw);
    if (iso) {
      const parsed = parseIsoToDate(iso);
      setTextValue(isoToDmy(iso));
      onChange?.(iso, parsed);
    } else if (!textValue.trim()) {
      if (allowClear) {
        onChange?.('', undefined);
        setTextValue('');
      }
    } else {
      // Revert if invalid
      setTextValue(isoToDmy(value));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      isTypingRef.current = false;
      const raw = textValue;
      const extractedTime = extractTimeFromInput(raw);
      if (extractedTime && onTimeExtracted) {
        onTimeExtracted(extractedTime);
      }

      const iso = dmyToIso(raw);
      if (iso) {
        const parsed = parseIsoToDate(iso);
        setTextValue(isoToDmy(iso));
        onChange?.(iso, parsed);
        if (parsed) setCurrentMonth(parsed);
      } else if (!textValue.trim() && allowClear) {
        onChange?.('', undefined);
        setTextValue('');
      } else {
        setTextValue(isoToDmy(value));
      }
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    isTypingRef.current = false;
    onChange?.('', undefined);
    setTextValue('');
  };

  const currentYear = getYear(currentMonth);

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 transition hover:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        } ${inputClassName}`}
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                } else {
                  openCalendar();
                }
              }
            }}
            className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded cursor-pointer shrink-0"
            title="Buka Kalender"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={textValue}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            onFocus={() => {
              if (!disabled && !isOpen) {
                openCalendar();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent border-none p-0 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-1">
          {allowClear && textValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              title="Hapus tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && popoverCoords && (
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              maxHeight: popoverCoords.maxHeight ? `${popoverCoords.maxHeight}px` : undefined,
              zIndex: 99999
            }}
            className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 w-[304px] text-left select-none pointer-events-auto overflow-y-auto overflow-x-hidden"
          >
            {/* Header Navigasi Tahun & Bulan Cepat */}
            <div className="flex items-center justify-between gap-1 pb-2 mb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => subYears(prev, 1))}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  title="Mundur 1 Tahun"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  title="Mundur 1 Bulan"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Pilihan Tahun Cepat (1950 - 2040) */}
              <div className="flex items-center gap-1">
                <select
                  value={currentYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setCurrentMonth((prev) => setYear(prev, y));
                  }}
                  className="px-2 py-1 text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
                  title="Pilih Tahun Secara Cepat"
                >
                  {Array.from({ length: 91 }, (_, i) => 1950 + i).map((y) => (
                    <option key={y} value={y}>Tahun {y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  title="Maju 1 Bulan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => addYears(prev, 1))}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  title="Maju 1 Tahun"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="core-daypicker">
              <DayPicker
                mode="single"
                locale={localeId}
                selected={selectedDate}
                onSelect={handleSelectDay}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                hideNavigation={true}
                captionLayout="label"
                startMonth={new Date(1950, 0)}
                endMonth={new Date(2040, 11)}
                className="m-0 text-slate-700 text-xs"
                modifiersClassNames={{
                  selected: 'bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700',
                  today: 'text-emerald-700 font-bold underline'
                }}
              />
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  handleSelectDay(now);
                }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Hari Ini ({format(new Date(), 'dd/MM/yyyy')})
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
