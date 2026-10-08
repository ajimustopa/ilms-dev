import React, { useState, useRef, useEffect } from 'react';
import { Building2, Check, ChevronDown, School } from 'lucide-react';
import BottomSheet from '../../../shared/components/BottomSheet';

/**
 * UnitSwitcher — Komponen Pemilih Satuan Pendidikan Aktif (Desktop & Mobile)
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 4:
 * - Desktop: chip + dropdown popover dengan centang pada unit aktif.
 * - Mobile: chip yang membuka BottomSheet dengan safe area dan drag handle.
 * - Logika memilih unit tetap memanggil `changeActiveSchoolUnit(unit)` (disinkronkan ke X-School-Unit-ID oleh api.js).
 * - Saat hanya ada 1 unit atau user tidak punya unit, tampilkan chip informatif tanpa memunculkan elemen kosong.
 */
export default function UnitSwitcher({
  schoolUnits = [],
  activeSchoolUnit = null,
  onChangeUnit,
  variant = 'desktop', // 'desktop' | 'mobile-chip'
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hasMultipleUnits = schoolUnits && schoolUnits.length > 1;
  const unitCount = schoolUnits?.length || 0;

  // Active unit name display
  const activeUnitName = activeSchoolUnit?.name || (unitCount > 0 ? 'Semua Unit' : 'Aldepos ILMS');

  // Close desktop dropdown on click outside or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectUnit = (unit) => {
    onChangeUnit(unit);
    setIsOpen(false);
  };

  if (!schoolUnits || schoolUnits.length === 0) {
    return null;
  }

  // --- MOBILE CHIP & BOTTOM SHEET ---
  if (variant === 'mobile-chip') {
    return (
      <>
        <div className={`flex items-center ${className}`}>
          <button
            type="button"
            onClick={() => hasMultipleUnits && setIsOpen(true)}
            disabled={!hasMultipleUnits}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs transition-all ${
              hasMultipleUnits
                ? 'active:scale-95 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                : 'cursor-default opacity-90'
            }`}
          >
            <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px]">{activeUnitName}</span>
            {hasMultipleUnits && (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Mobile Bottom Sheet for Unit Selection */}
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Pilih Satuan Pendidikan"
          subtitle="Pilih unit madrasah/sekolah aktif untuk sesi ini"
        >
          <div className="flex flex-col gap-2 py-1">
            {/* Opsi: Semua Satuan (Gabungan) bila unit > 1 */}
            {hasMultipleUnits && (
              <button
                type="button"
                onClick={() => handleSelectUnit(null)}
                className={`min-h-[52px] p-3 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer ${
                  !activeSchoolUnit || activeSchoolUnit.id === 'all'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      !activeSchoolUnit || activeSchoolUnit.id === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-snug truncate">
                      Semua Satuan (Gabungan)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Akses agregat seluruh unit yayasan
                    </p>
                  </div>
                </div>
                {(!activeSchoolUnit || activeSchoolUnit.id === 'all') && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}
              </button>
            )}

            {/* List of Units */}
            {schoolUnits.map((u) => {
              const isSelected = activeSchoolUnit?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUnit(u)}
                  className={`min-h-[52px] p-3 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <School className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-snug truncate">
                        {u.name}
                      </p>
                      {u.code && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Kode: {u.code}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </>
    );
  }

  // --- DESKTOP DROPDOWN VIEW ---
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => hasMultipleUnits && setIsOpen(!isOpen)}
        disabled={!hasMultipleUnits}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-2xs ${
          hasMultipleUnits
            ? 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer active:scale-[0.98]'
            : 'cursor-default opacity-90'
        }`}
      >
        <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="max-w-[150px] lg:max-w-[180px] truncate">
          {activeUnitName}
        </span>
        {hasMultipleUnits && (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
            }`}
          />
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && hasMultipleUnits && (
        <div
          role="listbox"
          className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-xl z-50 ilms-fade-in"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
            Pilih Satuan Pendidikan
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-1">
            {/* Opsi: Semua Satuan */}
            <button
              type="button"
              role="option"
              aria-selected={!activeSchoolUnit || activeSchoolUnit.id === 'all'}
              onClick={() => handleSelectUnit(null)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                !activeSchoolUnit || activeSchoolUnit.id === 'all'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Semua Satuan (Gabungan)</span>
              </div>
              {(!activeSchoolUnit || activeSchoolUnit.id === 'all') && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
              )}
            </button>

            {/* List Units */}
            {schoolUnits.map((u) => {
              const isSelected = activeSchoolUnit?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectUnit(u)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
