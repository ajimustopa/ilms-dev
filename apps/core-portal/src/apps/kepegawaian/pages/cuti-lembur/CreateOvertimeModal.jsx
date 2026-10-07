import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Clock,
  Briefcase,
  AlertCircle,
  Send,
  Loader2,
  Calendar,
  UserPlus,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Calculator,
  Timer,
  Info
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function CreateOvertimeModal({
  isOpen,
  onClose,
  employees = [],
  onSuccess
}) {
  // Form State
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);

  const [overtimeDate, setOvertimeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('16:30');
  const [endTime, setEndTime] = useState('19:30');
  const [spkNumber, setSpkNumber] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [requiresActualAttendance, setRequiresActualAttendance] = useState(true);

  // Day Type & HR Override
  const [dayTypeOverride, setDayTypeOverride] = useState(''); // '' | 'workday' | 'weekend' | 'holiday'
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  // Limit Bypass
  const [bypassLimits, setBypassLimits] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  // Live Preview State
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const dropdownRef = useRef(null);

  // Calculate planned hours from start & end time
  const plannedHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    let startMin = h1 * 60 + m1;
    let endMin = h2 * 60 + m2;
    if (endMin < startMin) endMin += 24 * 60; // overnight
    const diffHours = (endMin - startMin) / 60;
    return parseFloat(diffHours.toFixed(2));
  }, [startTime, endTime]);

  // Close employee search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsEmpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available employees
  const filteredAvailableEmployees = useMemo(() => {
    const selectedIds = new Set(selectedEmployees.map(e => e.id));
    return employees.filter(emp => {
      if (selectedIds.has(emp.id)) return false;
      const name = (emp.full_name || emp.name || '').toLowerCase();
      const nip = (emp.employee_number || emp.nip || '').toLowerCase();
      const q = empSearch.toLowerCase();
      return name.includes(q) || nip.includes(q);
    });
  }, [employees, selectedEmployees, empSearch]);

  const handleAddEmployee = (emp) => {
    setSelectedEmployees(prev => [...prev, emp]);
    setEmpSearch('');
    setIsEmpDropdownOpen(false);
  };

  const handleRemoveEmployee = (empId) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== empId));
  };

  // Debounced API call to /overtimes/preview for the primary or first selected employee
  useEffect(() => {
    if (!isOpen) return;

    const targetEmp = selectedEmployees.length > 0 ? selectedEmployees[0] : null;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const payload = {
          employee_id: targetEmp ? targetEmp.id : (employees[0]?.id || 1),
          overtime_date: overtimeDate,
          start_time: startTime,
          end_time: endTime,
          hours: plannedHours,
          day_type_override: dayTypeOverride || undefined,
          override_reason: dayTypeOverride ? overrideReason : undefined,
          requires_actual_attendance: requiresActualAttendance
        };

        const res = await api.post('/kepegawaian/overtimes/preview', payload);
        if (res.data?.success) {
          setPreviewData(res.data.data);
        } else {
          setPreviewError(res.data?.message || 'Gagal memuat pratinjau lembur');
        }
      } catch (err) {
        setPreviewError(err.response?.data?.message || 'Gagal memuat pratinjau');
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    selectedEmployees,
    overtimeDate,
    startTime,
    endTime,
    plannedHours,
    dayTypeOverride,
    overrideReason,
    requiresActualAttendance
  ]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      if (selectedEmployees.length === 0 && employees.length > 0) {
        setSelectedEmployees([employees[0]]);
      }
      setSubmitError('');
      setBypassLimits(false);
      setBypassReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      setSubmitError('Pilih minimal satu pegawai untuk ditugaskan lembur');
      return;
    }
    if (!overtimeDate) {
      setSubmitError('Tanggal lembur wajib diisi');
      return;
    }
    if (plannedHours <= 0) {
      setSubmitError('Durasi jam lembur harus lebih dari 0');
      return;
    }
    if (!taskDescription.trim()) {
      setSubmitError('Uraian tugas/keperluan lembur wajib diisi');
      return;
    }

    if (dayTypeOverride && !overrideReason.trim()) {
      setSubmitError('Alasan override jenis hari wajib diisi');
      return;
    }

    // Check if preview has limit errors and bypass is not set
    const hasLimitError = previewData?.errors?.some(e => e.code === 'OVERTIME_LIMIT_EXCEEDED');
    if (hasLimitError && !bypassLimits) {
      setSubmitError('Batas jam lembur terlampaui. Aktifkan dispensasi/bypass jika disetujui HRD.');
      return;
    }
    if (bypassLimits && !bypassReason.trim()) {
      setSubmitError('Alasan bypass batas jam lembur wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (selectedEmployees.length > 1) {
        // Bulk Create
        const payload = {
          employee_ids: selectedEmployees.map(e => e.id),
          overtime_date: overtimeDate,
          start_time: startTime,
          end_time: endTime,
          hours: plannedHours,
          task_description: taskDescription.trim(),
          spk_number: spkNumber.trim() || undefined,
          requires_actual_attendance: requiresActualAttendance,
          day_type_override: dayTypeOverride || undefined,
          override_reason: dayTypeOverride ? overrideReason.trim() : undefined,
          bypass_limits: bypassLimits,
          bypass_reason: bypassLimits ? bypassReason.trim() : undefined
        };

        const res = await api.post('/kepegawaian/overtimes/bulk', payload);
        if (res.data?.success) {
          if (onSuccess) onSuccess(`Penugasan lembur berhasil dibuat untuk ${selectedEmployees.length} pegawai`);
          onClose();
        } else {
          setSubmitError(res.data?.message || 'Gagal membuat penugasan lembur');
        }
      } else {
        // Single Create
        const payload = {
          employee_id: selectedEmployees[0].id,
          overtime_date: overtimeDate,
          start_time: startTime,
          end_time: endTime,
          hours: plannedHours,
          task_description: taskDescription.trim(),
          spk_number: spkNumber.trim() || undefined,
          requires_actual_attendance: requiresActualAttendance,
          day_type_override: dayTypeOverride || undefined,
          override_reason: dayTypeOverride ? overrideReason.trim() : undefined,
          bypass_limits: bypassLimits,
          bypass_reason: bypassLimits ? bypassReason.trim() : undefined
        };

        const res = await api.post('/kepegawaian/overtimes', payload);
        if (res.data?.success) {
          if (onSuccess) onSuccess('Penugasan lembur berhasil disimpan');
          onClose();
        } else {
          setSubmitError(res.data?.message || 'Gagal membuat penugasan lembur');
        }
      }
    } catch (err) {
      console.error('Submit overtime error:', err);
      setSubmitError(err.response?.data?.message || 'Gagal menyimpan penugasan lembur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayTypeDisplayName = (dt) => {
    if (dt === 'holiday') return 'Hari Libur Nasional';
    if (dt === 'weekend') return 'Akhir Pekan';
    return 'Hari Kerja';
  };

  const currentResolvedDayType = dayTypeOverride || previewData?.day_type || 'workday';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-surface-container-lowest border-b border-outline-variant/20 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-lg font-bold text-on-surface tracking-tight">Tugaskan Lembur</h2>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-semibold uppercase">
                  SPK Baru
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Buat surat perintah kerja lembur terencana bagi pegawai yayasan &amp; sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center -mr-1"
            title="Tutup"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-surface-bright">
          {submitError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Field 1: Multi-select Pegawai */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                <span>Pegawai yang Ditugaskan</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[11px] font-semibold text-primary bg-primary-fixed/20 px-2 py-0.5 rounded-full">
                {selectedEmployees.length} pegawai terpilih
              </span>
            </div>

            <div className="p-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest flex flex-wrap items-center gap-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all min-h-[46px]">
              {selectedEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface"
                >
                  <div className="w-6 h-6 rounded-md bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                    {(emp.full_name || emp.name || 'P').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-semibold text-on-surface truncate max-w-[160px]">
                      {emp.full_name || emp.name}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {emp.current_position || emp.position_name || `NIP: ${emp.employee_number || emp.nip || emp.id}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmployee(emp.id)}
                    className="hover:text-rose-600 text-outline transition-colors p-0.5 ml-1 rounded flex items-center justify-center"
                    title={`Hapus ${emp.full_name || emp.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add Pegawai Search input */}
              <div className="relative flex-1 min-w-[160px]">
                <input
                  type="text"
                  placeholder="+ Cari nama / NIP pegawai..."
                  value={empSearch}
                  onFocus={() => setIsEmpDropdownOpen(true)}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    setIsEmpDropdownOpen(true);
                  }}
                  className="w-full py-1 px-2 text-xs bg-transparent text-on-surface placeholder:text-outline outline-none"
                />

                {isEmpDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-72 max-h-56 overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-xl z-50 p-1 divide-y divide-outline-variant/15">
                    {filteredAvailableEmployees.length === 0 ? (
                      <div className="p-3 text-center text-xs text-on-surface-variant">
                        Tidak ada pegawai ditemukan
                      </div>
                    ) : (
                      filteredAvailableEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleAddEmployee(emp)}
                          className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(emp.full_name || emp.name || 'P').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-on-surface truncate">
                              {emp.full_name || emp.name}
                            </span>
                            <span className="text-[10px] text-on-surface-variant truncate">
                              {emp.employee_number || emp.nip ? `NIP: ${emp.employee_number || emp.nip} • ` : ''}
                              {emp.current_position || emp.position_name || 'Pegawai'}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Bisa memilih lebih dari 1 pegawai untuk penugasan tim serentak.
            </p>
          </div>

          {/* Field 2 & 3: Tanggal & Jenis Hari Operasional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Lembur */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                  <span>Tanggal Lembur</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  currentResolvedDayType === 'holiday' ? 'bg-rose-100 text-rose-800' :
                  currentResolvedDayType === 'weekend' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentResolvedDayType === 'holiday' ? 'bg-rose-600' :
                    currentResolvedDayType === 'weekend' ? 'bg-amber-600' :
                    'bg-emerald-600'
                  }`} />
                  {getDayTypeDisplayName(currentResolvedDayType)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={overtimeDate}
                  onChange={(e) => setOvertimeDate(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs font-semibold focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
                <Calendar className="w-4 h-4 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Segmented Day Type Override */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface">Jenis Hari Operasional</label>
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(!isOverrideOpen)}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {isOverrideOpen ? 'Tutup Override' : 'Override HR'}
                </button>
              </div>

              {isOverrideOpen ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 p-1 rounded-lg bg-surface-container border border-outline-variant/20 gap-1 text-center text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setDayTypeOverride('workday')}
                      className={`py-1.5 px-2 rounded-md transition-colors ${
                        dayTypeOverride === 'workday'
                          ? 'bg-secondary text-on-secondary font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Hari Kerja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTypeOverride('weekend')}
                      className={`py-1.5 px-2 rounded-md transition-colors ${
                        dayTypeOverride === 'weekend'
                          ? 'bg-secondary text-on-secondary font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Akhir Pekan
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayTypeOverride('holiday')}
                      className={`py-1.5 px-2 rounded-md transition-colors ${
                        dayTypeOverride === 'holiday'
                          ? 'bg-secondary text-on-secondary font-bold shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Libur
                    </button>
                  </div>

                  {dayTypeOverride && (
                    <input
                      type="text"
                      placeholder="Alasan override jenis hari (wajib)..."
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50/50 text-amber-900 placeholder:text-amber-700/60 outline-none"
                    />
                  )}
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface font-semibold flex items-center justify-between">
                  <span>{getDayTypeDisplayName(currentResolvedDayType)} (Otomatis)</span>
                  <span className="text-[10px] text-outline">Berdasarkan kalender</span>
                </div>
              )}
            </div>
          </div>

          {/* Time and Duration Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                <span>Jam Mulai</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs font-semibold focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
                <Clock className="w-4 h-4 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                <span>Jam Selesai</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 pl-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs font-semibold focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                />
                <Timer className="w-4 h-4 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="sm:col-span-4 pb-0.5">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-primary text-xs flex items-center justify-center gap-1.5 font-bold shadow-xs">
                <Timer className="w-4 h-4" />
                <span>Durasi: {plannedHours} Jam</span>
              </div>
            </div>
          </div>

          {/* SPK Number & Presensi Sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">No. Surat / SPK (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: SPK/LBR/2026/10/019"
                value={spkNumber}
                onChange={(e) => setSpkNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              />
            </div>

            <label className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest flex items-start gap-2.5 cursor-pointer hover:bg-surface-container-low transition-colors select-none self-end">
              <input
                type="checkbox"
                checked={requiresActualAttendance}
                onChange={(e) => setRequiresActualAttendance(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary border-outline-variant/60"
              />
              <span className="text-[11px] leading-snug text-on-surface">
                <strong className="font-semibold block text-on-surface">Wajib presensi fingerprint / GPS</strong>
                Sinkronisasi jam mulai &amp; selesai pada mesin absensi saat hari penugasan.
              </span>
            </label>
          </div>

          {/* Uraian Tugas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
              <span>Uraian Tugas / Keperluan Lembur</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              required
              rows={2.5}
              placeholder="Contoh: Perawatan darurat server CBT dan sterilisasi kelistrikan ruang laboratorium komputer..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none leading-relaxed resize-none"
            />
          </div>

          {/* ESTIMATION & PREVIEW CARD */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/50">
              <div className="flex items-center gap-2 text-primary text-xs font-bold">
                <Calculator className="w-4 h-4" />
                <span>Ringkasan &amp; Estimasi Upah</span>
              </div>
              {previewLoading ? (
                <span className="text-[10px] text-primary flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Menghitung...
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-primary font-semibold">
                  Formula Otomatis
                </span>
              )}
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-3 gap-2 text-left text-xs">
              <div className="bg-surface-container-lowest/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-on-surface-variant block text-[10px]">Total Jam / Orang</span>
                <span className="font-bold text-on-surface mt-0.5 block">{plannedHours} Jam</span>
              </div>
              <div className="bg-surface-container-lowest/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-on-surface-variant block text-[10px]">Pengali Tarif</span>
                <span className="font-bold text-secondary mt-0.5 block">
                  {currentResolvedDayType === 'holiday' ? '2.0x / 3.0x (Libur)' :
                   currentResolvedDayType === 'weekend' ? '2.0x / 3.0x (Akhir Pekan)' :
                   '1.5x / 2.0x (Hari Kerja)'}
                </span>
              </div>
              <div className="bg-surface-container-lowest/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-on-surface-variant block text-[10px]">Tarif Dasar Standar</span>
                <span className="font-bold text-on-surface mt-0.5 block">
                  {previewData?.estimated_wage != null ? 'Sesuai Kebijakan' : '— (Belum diisi)'}
                </span>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="bg-surface-container-lowest p-3 rounded-lg border border-emerald-200/60 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] text-on-surface-variant">
                  Estimasi per Pegawai:{' '}
                  <strong className="text-on-surface">
                    {previewData?.estimated_wage != null
                      ? `Rp ${Number(previewData.estimated_wage).toLocaleString('id-ID')}`
                      : '—'}
                  </strong>
                </span>
                <span className="text-xs text-on-surface font-bold mt-0.5">
                  Total Estimasi ({selectedEmployees.length} Pegawai Terpilih)
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary tracking-tight">
                  {previewData?.estimated_wage != null
                    ? `Rp ${Number(previewData.estimated_wage * selectedEmployees.length).toLocaleString('id-ID')}`
                    : '—'}
                </span>
                <span className="text-[10px] text-on-surface-variant block">
                  {previewData?.estimated_wage != null ? 'Estimasi Kas / Payroll' : 'Tarif belum dikonfigurasi'}
                </span>
              </div>
            </div>

            {/* Warnings or Errors from API */}
            {previewData?.warnings?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {previewData.warnings.map((w, idx) => (
                    <p key={idx}>{w.message || w}</p>
                  ))}
                </div>
              </div>
            )}

            {previewData?.errors?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    {previewData.errors.map((e, idx) => (
                      <p key={idx} className="font-semibold">{e.message}</p>
                    ))}
                  </div>
                </div>

                {/* Bypass limits control if limit exceeded */}
                {previewData.errors.some(e => e.code === 'OVERTIME_LIMIT_EXCEEDED') && (
                  <div className="pt-2 border-t border-rose-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bypassLimits}
                        onChange={(e) => setBypassLimits(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                      />
                      <span className="font-bold text-rose-800 text-[11px]">
                        Dispensasi HRD: Izinkan penugasan melampaui batas jam SOP
                      </span>
                    </label>

                    {bypassLimits && (
                      <input
                        type="text"
                        placeholder="Alasan dispensasi bypass limit (wajib)..."
                        required
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-300 bg-white text-rose-900 placeholder:text-rose-400 outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-outline" />
            <span>SOP Yayasan Aldepos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Simpan Penugasan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
