import React, { useState } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../../../shared/services/api';
import { getLeaveErrorMessage } from './leaveErrorHelper';

export default function LeaveReclassifyModal({
  isOpen,
  onClose,
  leave,
  leaveTypes = [],
  onSuccess
}) {
  if (!isOpen || !leave) return null;

  const [newLeaveType, setNewLeaveType] = useState(leaveTypes[0]?.code || 'cuti_tahunan');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Alasan reklasifikasi wajib diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/reclassify`, {
        new_leave_type: newLeaveType,
        reason: reason.trim()
      });
      if (onSuccess) onSuccess('Jenis cuti berhasil direklasifikasi');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Reklasifikasi Jenis Cuti</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] text-slate-500">Pegawai:</span>
            <p className="font-bold text-slate-900">{leave.employee_name}</p>
            <span className="text-[11px] text-slate-500">Jenis Saat Ini:</span>
            <p className="font-semibold text-indigo-700">{leave.leave_type_name || leave.leave_type}</p>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Jenis Cuti Baru <span className="text-rose-500">*</span>
            </label>
            <select
              value={newLeaveType}
              onChange={(e) => setNewLeaveType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-600"
              required
            >
              {leaveTypes.map(t => (
                <option key={t.id || t.code} value={t.code}>
                  {t.name} ({t.deducts_balance ? 'Potong Jatah' : 'Non-Potong'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Alasan Reklasifikasi <span className="text-rose-500">* (Wajib)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pegawai melampirkan surat dokter susulan sehingga dikonversi menjadi cuti sakit..."
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-600 resize-none"
              rows={3}
              required
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
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
