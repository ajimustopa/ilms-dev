import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Calculator,
  Timer,
  FileText,
  Loader2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function OvertimeReconcileModal({
  isOpen,
  onClose,
  overtime,
  onSuccess
}) {
  const [payableHours, setPayableHours] = useState('');
  const [realizationStatus, setRealizationStatus] = useState('matched');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial state setup on open
  useEffect(() => {
    if (overtime) {
      setPayableHours(overtime.payable_hours != null ? String(overtime.payable_hours) : String(overtime.hours || '2'));
      setRealizationStatus(overtime.realization_status || 'matched');
      setReason('');
      setErrorMsg('');
    }
  }, [overtime, isOpen]);

  if (!isOpen || !overtime) return null;

  const planHours = parseFloat(overtime.hours) || 0;
  const currentPayable = parseFloat(payableHours) || 0;
  const diffHours = (currentPayable - planHours).toFixed(1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payableHours || isNaN(payableHours) || parseFloat(payableHours) < 0) {
      setErrorMsg('Jam terbayar harus berupa angka valid >= 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.patch(`/kepegawaian/overtimes/${overtime.id}/reconcile`, {
        payable_hours: parseFloat(payableHours),
        realization_status: realizationStatus,
        reason: reason.trim() || undefined
      });

      if (res.data?.success) {
        if (onSuccess) onSuccess('Realisasi jam lembur berhasil disahkan');
        onClose();
      } else {
        setErrorMsg(res.data?.message || 'Gagal merekonsiliasi lembur');
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan rekonsiliasi lembur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDayTypeLabel = (type) => {
    if (type === 'holiday') return 'Hari Libur Nasional';
    if (type === 'weekend') return 'Akhir Pekan';
    return 'Hari Kerja';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-surface-container-lowest border-b border-outline-variant/20 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-md text-base font-bold text-on-surface">Rekonsiliasi Realisasi Lembur</h3>
                <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold uppercase">
                  SPK #{overtime.spk_number || overtime.id}
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Verifikasi jam kehadiran aktual terhadap surat perintah kerja lembur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm bg-surface-bright">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee & Date Summary Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                  {(overtime.employee_name || 'P').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-on-surface text-xs leading-tight">
                    {overtime.employee_name || 'Pegawai'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    NIP: {overtime.nip || `ID: ${overtime.employee_id}`}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                {getDayTypeLabel(overtime.day_type)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 text-xs">
              <div>
                <span className="text-on-surface-variant block text-[11px]">Tanggal Penugasan:</span>
                <span className="font-semibold text-on-surface">{overtime.overtime_date}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[11px]">Rencana Waktu:</span>
                <span className="font-semibold text-on-surface">
                  {overtime.start_time && overtime.end_time
                    ? `${overtime.start_time.slice(0, 5)} - ${overtime.end_time.slice(0, 5)} (${overtime.hours} jam)`
                    : `${overtime.hours} jam`}
                </span>
              </div>
            </div>

            {overtime.task_description && (
              <div className="pt-2 border-t border-outline-variant/20">
                <span className="text-on-surface-variant block text-[11px]">Uraian Tugas:</span>
                <p className="text-on-surface text-xs italic mt-0.5">{overtime.task_description}</p>
              </div>
            )}
          </div>

          {/* Reconciliation Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-on-surface flex items-center gap-1">
                  <span>Jam Lembur Disahkan (Payable Hours)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <span className="text-[11px] text-on-surface-variant">
                  Rencana awal: <strong>{planHours} jam</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    required
                    value={payableHours}
                    onChange={(e) => setPayableHours(e.target.value)}
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-semibold text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all"
                  />
                  <Timer className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-xs font-bold text-on-surface-variant">Jam</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setPayableHours(String(planHours))}
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-[11px] font-medium transition-colors"
                >
                  Sesuai Rencana ({planHours}j)
                </button>
                <button
                  type="button"
                  onClick={() => setPayableHours(String(Math.floor(planHours)))}
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-[11px] font-medium transition-colors"
                >
                  Bulatkan Bawah ({Math.floor(planHours)}j)
                </button>
                <button
                  type="button"
                  onClick={() => setPayableHours(String(Math.ceil(planHours)))}
                  className="px-2 py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-[11px] font-medium transition-colors"
                >
                  Bulatkan Atas ({Math.ceil(planHours)}j)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Status Hasil Realisasi *
              </label>
              <select
                value={realizationStatus}
                onChange={(e) => setRealizationStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-xs font-medium focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all"
              >
                <option value="matched">Sesuai Presensi (Matched) - Kehadiran valid</option>
                <option value="partial">Sebagian (Partial) - Waktu hadir tidak penuh</option>
                <option value="manual">Konfirmasi Manual HRD (Manual Override)</option>
                <option value="no_attendance">Tanpa Presensi (Dispensasi Tugas Lapangan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Catatan Rekonsiliasi / Alasan Penyesuaian
              </label>
              <textarea
                rows={2.5}
                placeholder="Tuliskan catatan verifikasi kehadiran atau alasan penyesuaian jam terbayar..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-xs focus:border-secondary focus:ring-2 focus:ring-secondary/15 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Calculation Info Card */}
          <div className="p-3.5 rounded-xl bg-secondary-fixed/15 border border-secondary/20 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-on-surface-variant">Estimasi Upah Lembur</span>
              <span className="text-xs text-on-surface-variant mt-0.5">
                {overtime.hourly_rate_snapshot || overtime.estimated_wage
                  ? `Pengali: ${overtime.day_type === 'workday' ? '1.5x / 2.0x' : '2.0x / 3.0x'}`
                  : 'Tarif dasar belum dikonfigurasi'}
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-sm text-secondary">
                {overtime.estimated_wage != null
                  ? `Rp ${(Math.round(overtime.estimated_wage * (currentPayable / (planHours || 1)))).toLocaleString('id-ID')}`
                  : '—'}
              </span>
              <span className="block text-[10px] text-on-surface-variant">
                {overtime.estimated_wage != null ? 'Estimasi Realisasi' : 'Tarif belum diisi'}
              </span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-secondary" />
            <span>SOP Yayasan Aldepos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !payableHours}
              className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sahkan Jam Lembur</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
