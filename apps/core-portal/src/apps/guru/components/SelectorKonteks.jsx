import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { School, Calendar, ChevronDown, Check, Sparkles, X } from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import Button from './Button';

/**
 * SelectorKonteks Component - Design System Portal Guru
 * Modal Dialog Pemilih Konteks Kerja (Satuan Pendidikan, Tahun Ajaran, Semester).
 * Menggunakan React Portal (document.body) berposisi fixed z-[99999] agar tidak terpengaruh oleh backdrop-blur/header.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDraftContext(activeContext);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, activeContext]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setDraftContext(activeContext);
    setIsOpen(true);
  };

  const handleApply = () => {
    updateContext(draftContext);
    onContextChange?.(draftContext);
    setIsOpen(false);
  };

  const currentUnitLabel = activeContext?.satuanPendidikanName || 'SMP IT Aldepos';
  const currentYearLabel = activeContext?.academicYearName || '2026/2027';
  const currentSemester = activeContext?.semester || 'Ganjil';

  const displayUnits = (availableUnits && availableUnits.length > 0) ? availableUnits : [
    { id: 1, name: 'SMP IT Aldepos Boarding School', code: 'SMP-IT', jenjang: 'SMP' },
    { id: 2, name: 'SMA IT Aldepos Boarding School', code: 'SMA-IT', jenjang: 'SMA' },
    { id: 3, name: 'SD IT Aldepos', code: 'SD-IT', jenjang: 'SD' },
    { id: 4, name: 'Pondok Pesantren Aldepos (Tahfidz)', code: 'PONTREN', jenjang: 'Pesantren' }
  ];

  const displayYears = (availableAcademicYears && availableAcademicYears.length > 0) ? availableAcademicYears : [
    { id: 1, name: '2026/2027' },
    { id: 2, name: '2025/2026' }
  ];

  const modalContent = isOpen && (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop Gelap Seluruh Layar */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal Dialog Card Tengah */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 my-auto max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Pilih Satuan Pendidikan &amp; Semester
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Konteks aktif yang digunakan pada seluruh menu Portal Guru
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup Dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">
          {/* 1. Satuan Pendidikan */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              1. Satuan Pendidikan / Unit Sekolah
            </label>
            <div className="grid grid-cols-1 gap-2">
              {displayUnits.map((u) => {
                const isSelected = String(draftContext?.satuanPendidikanId) === String(u.id) || draftContext?.satuanPendidikanName === u.name;
                return (
                  <button
                    key={String(u.id)}
                    type="button"
                    onClick={() => setDraftContext((prev) => ({
                      ...prev,
                      satuanPendidikanId: u.id,
                      satuanPendidikanName: u.name
                    }))}
                    className={`flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <School className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold block truncate">
                          {u.name}
                        </span>
                        {u.jenjang && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Jenjang: {u.jenjang}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tahun Ajaran */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              2. Tahun Ajaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              {displayYears.map((yr) => {
                const isSelected = String(draftContext?.academicYearId) === String(yr.id) || draftContext?.academicYearName === yr.name;
                return (
                  <button
                    key={String(yr.id || yr.name)}
                    type="button"
                    onClick={() => setDraftContext((prev) => ({
                      ...prev,
                      academicYearId: yr.id || 1,
                      academicYearName: yr.name
                    }))}
                    className={`flex items-center justify-between px-3 py-2 min-h-[38px] rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-mono">{yr.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
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
                    className={`flex items-center justify-between px-3 py-2 min-h-[38px] rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-medium">Semester {sem}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsOpen(false)}
            className="flex-1 text-xs min-h-[40px]"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            className="flex-1 text-xs font-bold min-h-[40px]"
          >
            Terapkan Konteks
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Pilih Konteks Satuan Pendidikan dan Tahun Ajaran"
        className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[40px] bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      >
        <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <School className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[150px] sm:max-w-[200px]">
            {currentUnitLabel}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {currentYearLabel} • {currentSemester}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
      </button>

      {/* Render via React Portal ke document.body */}
      {mounted && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
};

export default SelectorKonteks;
