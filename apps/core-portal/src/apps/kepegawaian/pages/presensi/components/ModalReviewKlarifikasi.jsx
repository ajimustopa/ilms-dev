import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';

export default function ModalReviewKlarifikasi({
  isOpen,
  onClose,
  clarification,
  onReview
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !clarification) return null;

  const handleAction = async (status) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onReview(clarification.id, {
        status,
        review_notes: reviewNotes
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses review klarifikasi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full text-xs shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Review Klarifikasi Lupa Absen</h3>
              <p className="text-[11px] text-slate-500">Konfirmasi pengajuan presensi oleh pegawai</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Detail Pegawai & Tanggal */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Nama Pegawai</span>
              <span className="font-bold text-slate-800 text-xs">
                {clarification.employee_name || `#${clarification.employee_id}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Tanggal Presensi</span>
              <span className="font-mono font-bold text-slate-800 text-xs">
                {clarification.attendance_date?.split('T')[0]}
              </span>
            </div>
          </div>

          {/* Jam Masuk & Pulang yang Diajukan */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div>
              <span className="text-[10px] text-amber-800 font-semibold uppercase block">Jam Masuk Riil</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                {clarification.check_in_time ? clarification.check_in_time.slice(0, 5) : '--:--'} WIB
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-800 font-semibold uppercase block">Jam Pulang Riil</span>
              <span className="font-mono font-bold text-indigo-800 text-sm">
                {clarification.check_out_time ? clarification.check_out_time.slice(0, 5) : '--:--'} WIB
              </span>
            </div>
          </div>

          {/* Alasan Klarifikasi */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Alasan Terlewat / Lupa Absen
            </span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed text-xs">
              {clarification.clarification_reason || '-'}
            </div>
          </div>

          {/* Catatan Review HRD */}
          <div>
            <label className="text-[10px] text-slate-700 font-bold uppercase block mb-1">
              Catatan HRD / Reviewer (Opsional)
            </label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Contoh: Disetujui setelah konfirmasi dengan kepala unit..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('rejected')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Tolak Klarifikasi</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('approved')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Setujui Klarifikasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
