import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../../../shared/services/api';
import { getLeaveErrorMessage } from './leaveErrorHelper';

export default function LeaveBulkActionModal({
  isOpen,
  onClose,
  actionType = 'approve', // 'approve' or 'reject'
  selectedIds = [],
  onSuccess
}) {
  if (!isOpen || selectedIds.length === 0) return null;

  const isApprove = actionType === 'approve';
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!isApprove && !comment.trim()) {
      setErrorMsg('Alasan penolakan wajib diisi untuk penolakan massal');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const endpoint = isApprove
        ? '/kepegawaian/leave-requests/bulk-approve'
        : '/kepegawaian/leave-requests/bulk-reject';

      const payload = isApprove
        ? { request_ids: selectedIds, comment: comment.trim() || undefined }
        : { request_ids: selectedIds, rejection_reason: comment.trim() };

      const res = await api.post(endpoint, payload);
      if (res.data?.success) {
        setResults(res.data.data);
      } else {
        setErrorMsg(res.data?.message || 'Gagal memproses aksi massal');
      }
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) onSuccess(`Aksi massal selesai: ${results?.success_count || 0} berhasil`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <h3 className="text-sm font-bold text-slate-900">
              {isApprove ? 'Setujui Pengajuan Terpilih' : 'Tolak Pengajuan Terpilih'} ({selectedIds.length} item)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {results ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              <span className="font-bold block">
                Hasil Proses: {results.success_count} Berhasil • {results.failure_count} Gagal
              </span>
            </div>

            {results.results && (
              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                {results.results.map((r, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded flex items-center justify-between text-[11px] ${
                      r.success ? 'bg-emerald-50/50 text-emerald-900' : 'bg-rose-50 text-rose-900'
                    }`}
                  >
                    <span>ID #{r.id}</span>
                    <span className="font-semibold">
                      {r.success ? 'Berhasil' : (r.error || 'Gagal')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleFinish}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleExecute} className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <p className="text-slate-600">
              Anda akan {isApprove ? 'menyetujui' : 'menolak'}{' '}
              <strong className="text-slate-900">{selectedIds.length} permohonan cuti/izin</strong> yang dipilih.
              Sistem akan memvalidasi hak otorisasi dan periode permohonan untuk setiap item secara mandiri.
            </p>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                {isApprove ? 'Catatan Persetujuan (Opsional)' : 'Alasan Penolakan Massal * (Wajib)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isApprove ? 'Tuliskan catatan persetujuan...' : 'Tuliskan alasan penolakan...'}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-600 resize-none"
                rows={3}
                required={!isApprove}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${
                  isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isApprove ? 'Setujui Semua Terpilih' : 'Tolak Semua Terpilih'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
