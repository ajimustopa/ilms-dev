import React, { useState } from 'react';
import { School, Calendar, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import BottomSheet from './BottomSheet';
import Button from './Button';

/**
 * SelectorKonteks Component - Design System Portal Guru
 * Komponen pemilih konteks kerja (Satuan Pendidikan, Tahun Ajaran, Semester) yang dipakai ulang di seluruh halaman.
 * Terintegrasi dengan endpoint Tahap 9 (my-teaching-assignments).
 */
export const SelectorKonteks = ({
  compact = false,
  className = '',
  onContextChange = null
}) => {
  const {
    activeContext,
    updateContext,
    availableUnits,
    availableAcademicYears,
    loadingContext
  } = useTeacherContext();

  const [isOpen, setIsOpen] = useState(false);
  const [draftContext, setDraftContext] = useState(activeContext);

  const handleOpen = () => {
    setDraftContext(activeContext);
    setIsOpen(true);
  };

  const handleApply = () => {
    updateContext(draftContext);
    onContextChange?.(draftContext);
    setIsOpen(false);
  };

  const currentUnitLabel = activeContext?.satuanPendidikanName || 'Semua Unit';
  const currentYearLabel = activeContext?.academicYearName || '2026/2027';
  const currentSemester = activeContext?.semester || 'Ganjil';

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Pilih Konteks Satuan Pendidikan dan Tahun Ajaran"
        className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[44px] bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      >
        <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <School className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {currentUnitLabel}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {currentYearLabel} • {currentSemester}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
      </button>

      {/* Bottom Sheet Switcher */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Pilih Konteks Akademik"
        description="Sesuaikan unit sekolah, tahun ajaran, dan semester aktif."
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleApply}
              className="flex-1"
            >
              Terapkan Konteks
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-1">
          {/* 1. Satuan Pendidikan */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              1. Satuan Pendidikan / Unit
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableUnits.length > 0 ? (
                availableUnits.map((u) => {
                  const isSelected = String(draftContext?.satuanPendidikanId) === String(u.id);
                  return (
                    <button
                      key={String(u.id)}
                      type="button"
                      onClick={() => setDraftContext((prev) => ({
                        ...prev,
                        satuanPendidikanId: u.id,
                        satuanPendidikanName: u.name
                      }))}
                      className={`flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <School className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{u.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-500 text-center">
                  Unit sekolah otomatis mengikuti akun penugasan guru.
                </div>
              )}
            </div>
          </div>

          {/* 2. Tahun Ajaran */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              2. Tahun Ajaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableAcademicYears.length > 0 ? (
                availableAcademicYears.map((yr) => {
                  const isSelected = String(draftContext?.academicYearId) === String(yr.id);
                  return (
                    <button
                      key={String(yr.id)}
                      type="button"
                      onClick={() => setDraftContext((prev) => ({
                        ...prev,
                        academicYearId: yr.id,
                        academicYearName: yr.name
                      }))}
                      className={`flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs font-mono">{yr.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                ['2026/2027', '2025/2026'].map((yrStr) => {
                  const isSelected = draftContext?.academicYearName === yrStr;
                  return (
                    <button
                      key={yrStr}
                      type="button"
                      onClick={() => setDraftContext((prev) => ({
                        ...prev,
                        academicYearName: yrStr
                      }))}
                      className={`flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs font-mono">{yrStr}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Semester */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              3. Semester
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Ganjil', 'Genap'].map((sem) => {
                const isSelected = draftContext?.semester === sem;
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setDraftContext((prev) => ({ ...prev, semester: sem }))}
                    className={`flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="text-xs font-medium">Semester {sem}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default SelectorKonteks;
