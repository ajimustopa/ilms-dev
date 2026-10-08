import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { School, Calendar, ChevronDown, Check, Sparkles, X, Loader2, CheckSquare, Square, Layers } from 'lucide-react';
import { useTeacherContext, formatUnitsLabel } from '../context/TeacherContext';
import Button from './Button';

/**
 * SelectorKonteks Component - Design System Portal Guru
 * Modal Dialog Pemilih Konteks Kerja (Satuan Pendidikan, Tahun Ajaran, Semester).
 * Mendukung Multi-Select Satuan Pendidikan (Guru dapat mengajar di beberapa unit sekaligus).
 * Rujukan Data Terintegrasi:
 * - Satuan Pendidikan: Data riil dari Core Admin (/core/school-units)
 * - Tahun Ajaran & Semester: Data riil dari Master Akademik (/akademik/master)
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
    availableSemesters,
    fetchAcademicDataForUnit,
    loadingContext
  } = useTeacherContext();

  const [isOpen, setIsOpen] = useState(false);
  const [draftContext, setDraftContext] = useState(activeContext);
  const [unitYears, setUnitYears] = useState(availableAcademicYears);
  const [unitSemesters, setUnitSemesters] = useState(availableSemesters);
  const [loadingAcademic, setLoadingAcademic] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load academic years & semesters when draft unit changes
  const loadAcademicForUnit = useCallback(async (unitId) => {
    if (!fetchAcademicDataForUnit) return;
    setLoadingAcademic(true);
    try {
      const { years, semesters } = await fetchAcademicDataForUnit(unitId);
      setUnitYears(years && years.length > 0 ? years : availableAcademicYears);
      setUnitSemesters(semesters && semesters.length > 0 ? semesters : availableSemesters);
    } catch {
      setUnitYears(availableAcademicYears);
      setUnitSemesters(availableSemesters);
    } finally {
      setLoadingAcademic(false);
    }
  }, [fetchAcademicDataForUnit, availableAcademicYears, availableSemesters]);

  useEffect(() => {
    if (isOpen) {
      setDraftContext(activeContext);
      const primaryId = activeContext?.satuanPendidikanIds?.[0] || activeContext?.satuanPendidikanId;
      loadAcademicForUnit(primaryId);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, activeContext, loadAcademicForUnit]);

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

  // Toggle unit satuan pendidikan (Multi-Select)
  const handleToggleUnit = async (u) => {
    const currentIds = draftContext?.satuanPendidikanIds || (draftContext?.satuanPendidikanId ? [draftContext.satuanPendidikanId] : [u.id]);
    const isCurrentlySelected = currentIds.some((id) => String(id) === String(u.id));

    let nextIds = [];
    if (isCurrentlySelected) {
      // Jangan izinkan uncheck jika ini unit terakhir yang terpilih
      if (currentIds.length <= 1) {
        return;
      }
      nextIds = currentIds.filter((id) => String(id) !== String(u.id));
    } else {
      nextIds = [...currentIds, u.id];
    }

    const isAll = availableUnits.length > 0 && nextIds.length >= availableUnits.length;
    const computedName = formatUnitsLabel(nextIds, availableUnits);

    setDraftContext((prev) => ({
      ...prev,
      satuanPendidikanIds: nextIds,
      satuanPendidikanId: nextIds.length === 1 ? nextIds[0] : (nextIds[0] || null),
      satuanPendidikanName: computedName,
      isAllUnits: isAll
    }));

    // Muat tahun ajaran dari unit pertama terpilih
    if (nextIds.length > 0) {
      loadAcademicForUnit(nextIds[0]);
    }
  };

  // Pilih Semua Satuan Pendidikan
  const handleSelectAllUnits = () => {
    const allIds = availableUnits.map((u) => u.id);
    const computedName = formatUnitsLabel(allIds, availableUnits);

    setDraftContext((prev) => ({
      ...prev,
      satuanPendidikanIds: allIds,
      satuanPendidikanId: allIds[0] || 1,
      satuanPendidikanName: computedName,
      isAllUnits: true
    }));

    if (allIds.length > 0) {
      loadAcademicForUnit(allIds[0]);
    }
  };

  const handleApply = () => {
    updateContext(draftContext);
    onContextChange?.(draftContext);
    setIsOpen(false);
  };

  const currentUnitLabel = activeContext?.satuanPendidikanName || formatUnitsLabel(activeContext?.satuanPendidikanIds, availableUnits);
  const currentYearLabel = activeContext?.academicYearName || availableAcademicYears[0]?.name || '2026/2027';
  const currentSemester = activeContext?.semester || 'Ganjil';

  const displayUnits = (availableUnits && availableUnits.length > 0) ? availableUnits : [];
  const displayYears = (unitYears && unitYears.length > 0) ? unitYears : availableAcademicYears;
  const displaySemesters = (unitSemesters && unitSemesters.length > 0) ? unitSemesters : availableSemesters;

  const selectedUnitIds = draftContext?.satuanPendidikanIds || (draftContext?.satuanPendidikanId ? [draftContext.satuanPendidikanId] : []);
  const isAllSelected = displayUnits.length > 0 && selectedUnitIds.length >= displayUnits.length;

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
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 my-auto max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Pilih Satuan Pendidikan &amp; Semester
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih satu atau beberapa satuan pendidikan tempat Anda mengajar
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
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4.5 overscroll-contain">
          {/* 1. Satuan Pendidikan (Multi-Select) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  1. Satuan Pendidikan / Unit Sekolah
                </label>
                {selectedUnitIds.length > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold">
                    {selectedUnitIds.length} Unit Terpilih
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSelectAllUnits}
                className={`text-[11px] font-semibold transition-colors ${
                  isAllSelected
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400'
                }`}
              >
                {isAllSelected ? '✓ Semua Terpilih' : 'Pilih Semua Unit'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {displayUnits.map((u) => {
                const isSelected = selectedUnitIds.some((id) => String(id) === String(u.id));
                return (
                  <button
                    key={String(u.id)}
                    type="button"
                    onClick={() => handleToggleUnit(u)}
                    className={`flex items-center justify-between px-3.5 py-2.5 min-h-[48px] rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/20 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold block truncate">
                          {u.name}
                        </span>
                        {(u.jenjang || u.level || u.code) && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Jenjang: {u.jenjang || u.level || u.code} {u.npsn ? `• NPSN: ${u.npsn}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-900/50">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              * Centang lebih dari satu unit jika Anda mengajar lintas jenjang sekolah.
            </p>
          </div>

          {/* 2. Tahun Ajaran (dari Master Akademik) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Tahun Ajaran
              </label>
              {loadingAcademic ? (
                <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Memuat tahun...
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Master Akademik</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {displayYears.map((yr) => {
                const isSelected = String(draftContext?.academicYearId) === String(yr.id) || draftContext?.academicYearName === yr.name;
                return (
                  <button
                    key={String(yr.id || yr.name)}
                    type="button"
                    onClick={() => setDraftContext((prev) => ({
                      ...prev,
                      academicYearId: yr.id,
                      academicYearName: yr.name
                    }))}
                    className={`flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono font-medium">{yr.name}</span>
                      {yr.is_active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
                          Aktif
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Semester (dari Master Akademik) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                3. Semester
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Master Akademik</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {displaySemesters.map((sem) => {
                const semNormalized = sem.name?.toLowerCase().includes('genap') || sem.semester_type === 'genap' ? 'Genap' : 'Ganjil';
                const isSelected = draftContext?.semester === semNormalized || String(draftContext?.semesterId) === String(sem.id);

                return (
                  <button
                    key={String(sem.id || sem.name)}
                    type="button"
                    onClick={() => setDraftContext((prev) => ({
                      ...prev,
                      semester: semNormalized,
                      semesterId: sem.id || null,
                      semesterName: sem.name || `Semester ${semNormalized}`
                    }))}
                    className={`flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium">{sem.name || `Semester ${semNormalized}`}</span>
                      {sem.is_active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
                          Aktif
                        </span>
                      )}
                    </div>
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
            className="flex-1 text-xs min-h-[40px] rounded-xl"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            className="flex-1 text-xs font-bold min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
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
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 min-h-[38px] sm:min-h-[40px] max-w-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${className}`}
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <School className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 pr-0.5 sm:pr-1">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]">
            {currentUnitLabel}
          </p>
          <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {currentYearLabel} • {currentSemester}
          </p>
        </div>
        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
      </button>

      {/* Render via React Portal ke document.body */}
      {mounted && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
};

export default SelectorKonteks;
