import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Send,
  Printer,
  ShieldAlert,
  UserX,
  Clock,
  FileCheck,
  CheckSquare,
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import presensiService from '../presensiService';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ModalTutupPeriode({
  isOpen,
  onClose,
  schoolUnitId,
  user,
  onNavigateTab,
  onExportDraft,
  onSuccess
}) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [periodMonth, setPeriodMonth] = useState(String(currentMonth));
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [activeStep, setActiveStep] = useState(1);

  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lock form inputs
  const [lockNotes, setLockNotes] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);

  // Unlock form modal state
  const [isUnlockPromptOpen, setIsUnlockPromptOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Submit to payroll form inputs
  const [payrollNotes, setPayrollNotes] = useState('');

  const isSuperAdmin = Boolean(
    user && (
      user.role === 'super_admin' ||
      user.role === 'admin_yayasan' ||
      user.is_admin ||
      (user.permissions && user.permissions.includes('superadmin'))
    )
  );

  useEffect(() => {
    if (isOpen) {
      fetchReadiness();
      setActiveStep(1);
      setErrorMsg('');
      setSuccessMsg('');
      setIsUnlockPromptOpen(false);
      setUnlockReason('');
    }
  }, [isOpen, periodMonth, periodYear, schoolUnitId]);

  const fetchReadiness = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await presensiService.getPeriodReadiness({
        school_unit_id: schoolUnitId || undefined,
        month: periodMonth,
        year: periodYear
      });
      if (res?.success) {
        setReadiness(res.data);
      }
    } catch (err) {
      console.error('Error fetching period readiness:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data kesiapan audit periode');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalFindings = readiness?.counts?.total_findings || 0;
  const isLocked = readiness?.is_locked || false;
  const periodStatus = readiness?.status || (totalFindings > 0 ? 'review' : 'open');
  const isSubmittedToPayroll = periodStatus === 'submitted_to_payroll';

  // Handle Lock Period Action
  const handleLockSubmit = async (e) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await presensiService.lockPeriod({
        school_unit_id: schoolUnitId || undefined,
        month: Number(periodMonth),
        year: Number(periodYear),
        notes: lockNotes,
        allow_override: allowOverride
      });
      if (res?.success) {
        setSuccessMsg(res.message || 'Periode presensi berhasil dikunci!');
        await fetchReadiness();
        setActiveStep(4);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengunci periode presensi');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unlock Period Action (Super Admin)
  const handleUnlockSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!unlockReason || unlockReason.trim().length < 5) {
      setErrorMsg('Alasan pembukaan kunci periode wajib diisi minimal 5 karakter');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await presensiService.unlockPeriod({
        school_unit_id: schoolUnitId || undefined,
        month: Number(periodMonth),
        year: Number(periodYear),
        reason: unlockReason.trim()
      });
      if (res?.success) {
        setSuccessMsg(res.message || 'Kunci periode presensi berhasil dibuka');
        setIsUnlockPromptOpen(false);
        setUnlockReason('');
        await fetchReadiness();
        setActiveStep(1);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuka kunci periode');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit to Payroll Action
  const handleSubmitToPayroll = async (e) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await presensiService.submitToPayroll({
        school_unit_id: schoolUnitId || undefined,
        month: Number(periodMonth),
        year: Number(periodYear),
        notes: payrollNotes
      });
      if (res?.success) {
        setSuccessMsg(res.message || 'Data presensi berhasil diserahkan ke modul Penggajian (Payroll)');
        await fetchReadiness();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyerahkan data ke modul Payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigateChecklist = (tabName, filterType) => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab(tabName, filterType);
    }
  };

  const getStatusBadge = () => {
    if (periodStatus === 'submitted_to_payroll') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          Status: Terkirim ke Payroll
        </span>
      );
    }
    if (periodStatus === 'locked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Status: Terkunci
        </span>
      );
    }
    if (periodStatus === 'review' || totalFindings > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Status: Ditinjau ({totalFindings} Temuan)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Status: Terbuka &amp; Siap Ditutup
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-[860px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto transition-all">
        
        {/* ==========================================
            1. MODAL HEADER
            ========================================== */}
        <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Tutup Periode Presensi
                  </h2>
                  {getStatusBadge()}
                </div>
                <p className="text-xs text-slate-500 max-w-xl leading-relaxed mt-0.5">
                  Rekonsiliasi akhir dan penguncian data absensi sebelum diproses ke modul Penggajian (Payroll).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Tutup Jendela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Period Selector & Pipeline Strip */}
          <div className="mt-3.5 pt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">Periode:</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-emerald-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={String(idx + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={periodYear}
                  onChange={(e) => setPeriodYear(e.target.value)}
                  className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs font-mono focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            {/* Cycle Status Pipeline Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="text-slate-400 font-semibold">Siklus:</span>
              <span className={`px-2 py-0.5 rounded-md ${periodStatus === 'open' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-200/70 text-slate-600'}`}>
                Terbuka
              </span>
              <span className="text-slate-300">›</span>
              <span className={`px-2 py-0.5 rounded-md ${periodStatus === 'review' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-200/70 text-slate-600'}`}>
                Ditinjau
              </span>
              <span className="text-slate-300">›</span>
              <span className={`px-2 py-0.5 rounded-md ${periodStatus === 'locked' ? 'bg-rose-100 text-rose-900 font-bold' : 'bg-slate-200/70 text-slate-600'}`}>
                Terkunci
              </span>
              <span className="text-slate-300">›</span>
              <span className={`px-2 py-0.5 rounded-md ${periodStatus === 'submitted_to_payroll' ? 'bg-sky-100 text-sky-900 font-bold' : 'bg-slate-200/70 text-slate-600'}`}>
                Payroll
              </span>
            </div>
          </div>
        </div>

        {/* ==========================================
            2. HORIZONTAL STEPPER (4 Langkah Sesuai Desain)
            ========================================== */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200">
          <div className="grid grid-cols-4 items-center gap-2">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-2 text-left transition-all p-1 rounded-lg ${activeStep === 1 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activeStep === 1 ? 'bg-emerald-600 text-white shadow-2xs ring-3 ring-emerald-600/20' : 'bg-slate-200 text-slate-600'}`}>
                1
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold truncate block ${activeStep === 1 ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Periksa Data
                </span>
                <span className="text-[10px] text-slate-500 block">Checklist Audit</span>
              </div>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-2 text-left transition-all p-1 rounded-lg ${activeStep === 2 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activeStep === 2 ? 'bg-emerald-600 text-white shadow-2xs ring-3 ring-emerald-600/20' : 'bg-slate-200 text-slate-600'}`}>
                2
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold truncate block ${activeStep === 2 ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Selesaikan Temuan
                </span>
                <span className="text-[10px] text-slate-500 block">{totalFindings} Item</span>
              </div>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`flex items-center gap-2 text-left transition-all p-1 rounded-lg ${activeStep === 3 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activeStep === 3 ? 'bg-emerald-600 text-white shadow-2xs ring-3 ring-emerald-600/20' : 'bg-slate-200 text-slate-600'}`}>
                3
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold truncate block ${activeStep === 3 ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Kunci Periode
                </span>
                <span className="text-[10px] text-slate-500 block">{isLocked ? 'Terkunci' : 'Otorisasi'}</span>
              </div>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className={`flex items-center gap-2 text-left transition-all p-1 rounded-lg ${activeStep === 4 ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${activeStep === 4 ? 'bg-emerald-600 text-white shadow-2xs ring-3 ring-emerald-600/20' : 'bg-slate-200 text-slate-600'}`}>
                4
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold truncate block ${activeStep === 4 ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Kirim ke Payroll
                </span>
                <span className="text-[10px] text-slate-500 block">{isSubmittedToPayroll ? 'Terkirim' : 'Sinkronisasi'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* ==========================================
            3. MESSAGES (Alert & Success)
            ========================================== */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ==========================================
            4. MODAL BODY (Steps Content)
            ========================================== */}
        <div className="px-6 py-4 space-y-4 max-h-[560px] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-medium">Memeriksa kesiapan audit &amp; status penguncian periode...</p>
            </div>
          ) : (
            <>
              {/* --- STEP 1 & 2: PERIKSA DATA & SELESAIKAN TEMUAN --- */}
              {(activeStep === 1 || activeStep === 2) && (
                <div className="space-y-4">
                  {/* Warning vs Ready Banner */}
                  {totalFindings > 0 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                          Perhatian: Masih terdapat {totalFindings} catatan presensi yang belum selesai diverifikasi
                        </h3>
                        <p className="text-xs text-amber-900/90 leading-relaxed">
                          Periode presensi {MONTH_NAMES[Number(periodMonth) - 1]} {periodYear} belum dapat dikunci dan diekspor ke modul Payroll sampai seluruh data anomali, koreksi, dan check-out terselesaikan atau disetujui.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                          Sempurna! Seluruh 4 kategori checklist audit telah lolos verifikasi
                        </h3>
                        <p className="text-xs text-emerald-900/90 leading-relaxed">
                          Tidak ada temuan anomali atau pengajuan tertunda pada bulan ini. Anda dapat melanjutkan ke langkah berikutnya untuk mengunci periode presensi.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SUMMARY STATS BAR */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Total Pegawai Aktif
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {readiness?.summary_stats?.total_active_employees || 0} Pegawai
                      </span>
                      <span className="text-[11px] text-slate-500 block">Unit Terpilih</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Hari Kerja Efektif
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {readiness?.summary_stats?.effective_work_days || 0} Hari
                      </span>
                      <span className="text-[11px] text-slate-500 block">Senin – Sabtu</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Kesiapan Audit
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-emerald-700">
                          {readiness?.summary_stats?.audit_readiness_percentage || 100}%
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          ({readiness?.summary_stats?.clean_records_count || 0} Bersih)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${readiness?.summary_stats?.audit_readiness_percentage || 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                        Perlu Tindakan
                      </span>
                      <span className="text-sm font-bold text-rose-700">
                        {totalFindings} Item
                      </span>
                      <span className="text-[11px] text-rose-600 block">
                        {totalFindings > 0 ? 'Menghambat Kunci' : 'Lolos Verifikasi'}
                      </span>
                    </div>
                  </div>

                  {/* AUDIT CHECKLIST SECTION (4 Kategori Sesuai Desain) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Daftar Rincian Anomali &amp; Audit (4 Kategori)
                      </span>
                      <span className="text-[11px] text-slate-400">Pembaruan sistem terverifikasi</span>
                    </div>

                    <div className="space-y-2">
                      {/* Item 1: Pegawai Tanpa Status */}
                      <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${readiness?.counts?.unspecified_status_count > 0 ? 'bg-rose-100/80 text-rose-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                            <UserX className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                Pegawai tanpa status / belum ada keterangan: {readiness?.counts?.unspecified_status_count || 0}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${readiness?.counts?.unspecified_status_count > 0 ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                                {readiness?.counts?.unspecified_status_count > 0 ? 'Perlu Ditentukan' : 'Lengkap'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              Presensi harian kosong tanpa surat izin, dinas luar, atau cuti resmi.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigateChecklist('absent')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        >
                          <span>Lihat Pegawai</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item 2: Pengajuan Koreksi Belum Diproses */}
                      <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${readiness?.counts?.pending_clarifications_count > 0 ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                Pengajuan koreksi belum diproses (Antrean): {readiness?.counts?.pending_clarifications_count || 0}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${readiness?.counts?.pending_clarifications_count > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                                {readiness?.counts?.pending_clarifications_count > 0 ? 'Menunggu HRD' : 'Bersih'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              Pengajuan lupa absen dan klaim kehadiran guru yang menunggu approval HRD.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigateChecklist('clarifications')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        >
                          <span>Lihat Antrean</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item 3: Presensi Masuk Tanpa Check-Out */}
                      <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${readiness?.counts?.missing_checkout_count > 0 ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                Presensi masuk tanpa check-out (Check-out kosong): {readiness?.counts?.missing_checkout_count || 0}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${readiness?.counts?.missing_checkout_count > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                                {readiness?.counts?.missing_checkout_count > 0 ? 'Belum Divalidasi' : 'Tervalidasi'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              Data scan masuk tercatat namun tidak ada pemindaian tap pulang.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigateChecklist('anomalies', 'missing_checkout')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        >
                          <span>Lihat Kasus</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item 4: Temuan Anomali Belum Selesai */}
                      <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${readiness?.counts?.unresolved_anomalies_count > 0 ? 'bg-amber-100/80 text-amber-700' : 'bg-emerald-100/80 text-emerald-700'}`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                Temuan anomali &amp; deviasi belum selesai: {readiness?.counts?.unresolved_anomalies_count || 0}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${readiness?.counts?.unresolved_anomalies_count > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                                {readiness?.counts?.unresolved_anomalies_count > 0 ? 'Investigasi Terbuka' : 'Selesai'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              Penyimpangan radius GPS, jam ganjil, atau anomali perangkat presensi.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleNavigateChecklist('anomalies')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                        >
                          <span>Lihat Anomali</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info Notice Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5 text-slate-700">
                    <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Setelah seluruh temuan diselesaikan, tombol <strong>"Kunci Periode"</strong> akan aktif otomatis. Data presensi yang telah dikunci tidak dapat diubah oleh staf atau supervisor satuan tanpa otorisasi Super Admin.
                    </p>
                  </div>
                </div>
              )}

              {/* --- STEP 3: KUNCI PERIODE --- */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-slate-800 text-xs">
                          Konfirmasi Penguncian Periode: {MONTH_NAMES[Number(periodMonth) - 1]} {periodYear}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {isLocked ? 'Status: Terkunci' : 'Status: Siap Dikunci'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Penguncian periode akan membekukan seluruh data presensi, izin, dan lembur pada bulan ini. Semua request check-in, check-out, atau edit data pada tanggal tersebut akan otomatis ditolak oleh sistem.
                    </p>

                    {/* Override Option if findings exist (Super Admin only) */}
                    {totalFindings > 0 && isSuperAdmin && (
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allowOverride}
                          onChange={(e) => setAllowOverride(e.target.checked)}
                          className="mt-0.5 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
                        />
                        <div className="text-amber-900 text-xs">
                          <span className="font-bold block">Otorisasi Super Admin: Kunci Paksa Periode</span>
                          <span className="text-[11px] text-amber-800/90 block">
                            Saya memahami masih terdapat {totalFindings} temuan dan memilih untuk mengunci periode ini untuk keperluan darurat/payroll.
                          </span>
                        </div>
                      </label>
                    )}

                    {/* Lock Notes */}
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 text-xs">
                        Catatan Penguncian Periode (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Rekonsiliasi presensi selesai diverifikasi HRD..."
                        value={lockNotes}
                        onChange={(e) => setLockNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* If already locked, show unlock button for Super Admin */}
                  {isLocked && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-rose-900 block text-xs">
                          Periode Ini Telah Terkunci
                        </span>
                        <span className="text-[11px] text-rose-700">
                          {readiness?.lock_record?.notes || 'Data presensi resmi terkunci'}
                        </span>
                      </div>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsUnlockPromptOpen(true)}
                          className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Kunci (Super Admin)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* --- STEP 4: KIRIM KE PAYROLL --- */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-sky-700" />
                        <span className="font-bold text-sky-950 text-xs">
                          Serahkan Rekap Presensi ke Modul Penggajian (Payroll)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
                        {isSubmittedToPayroll ? 'Sudah Terkirim' : 'Siap Sinkronisasi'}
                      </span>
                    </div>

                    <p className="text-xs text-sky-900/90 leading-relaxed">
                      Sistem akan mengambil snapshot seluruh kehadiran, keterlambatan, izin, sakit, dan lembur untuk diproses pada modul Penggajian (Payroll).
                    </p>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 text-xs">
                        Catatan Pengiriman ke Payroll (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Diserahkan untuk perhitungan gaji periode Oktober 2026..."
                        value={payrollNotes}
                        onChange={(e) => setPayrollNotes(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Unlock Reason Prompt Modal Overlay for Super Admin */}
              {isUnlockPromptOpen && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Otorisasi Buka Kunci Periode Presensi (Super Admin)</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Membuka kunci periode akan mengembalikan status ke 'Ditinjau' sehingga koreksi presensi dapat dilakukan kembali. Aksi ini wajib menyertakan alasan resmi dan akan dicatat secara permanen pada Audit Trail.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      Alasan Pembukaan Kunci (Wajib, min 5 karakter) *
                    </label>
                    <textarea
                      rows={2}
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      placeholder="Tuliskan alasan resmi pembukaan kunci periode..."
                      className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsUnlockPromptOpen(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlockSubmit}
                      disabled={actionLoading || unlockReason.trim().length < 5}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Konfirmasi Buka Kunci</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ==========================================
            5. MODAL FOOTER ACTIONS
            ========================================== */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Draft Audit Report Print / Export */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (onExportDraft) onExportDraft();
              }}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Audit Sementara (Draft)</span>
            </button>
          </div>

          {/* Right: Step Navigation & Primary Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Kembali
            </button>

            {/* Stepper Back */}
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}

            {/* Step 1 & 2 Primary Action: Go to Step 3 */}
            {(activeStep === 1 || activeStep === 2) && (
              <button
                type="button"
                disabled={totalFindings > 0 && !isSuperAdmin}
                onClick={() => setActiveStep(3)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                  totalFindings === 0 || isSuperAdmin
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lanjut Kunci Periode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Step 3 Primary Action: Lock Period */}
            {activeStep === 3 && (
              <button
                type="button"
                disabled={actionLoading || (totalFindings > 0 && !allowOverride)}
                onClick={handleLockSubmit}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                  totalFindings === 0 || allowOverride
                    ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Lock className="w-3.5 h-3.5" />
                <span>{isLocked ? 'Perbarui Kunci Periode' : 'Kunci Periode Presensi'}</span>
              </button>
            )}

            {/* Step 4 Primary Action: Submit to Payroll */}
            {activeStep === 4 && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmitToPayroll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Send className="w-3.5 h-3.5" />
                <span>Serahkan Data ke Modul Payroll</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
