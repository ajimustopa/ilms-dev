import React, { useState } from 'react';
import { X, UserCheck, AlertTriangle } from 'lucide-react';
import api from '../../../../shared/services/api';
import { getLeaveErrorMessage } from './leaveErrorHelper';

export default function LeaveReassignModal({
  isOpen,
  onClose,
  leave,
  employees = [],
  onSuccess
}) {
  if (!isOpen || !leave) return null;

  const pendingSteps = (leave.approval_steps || []).filter(s => s.status === 'pending');
  const [selectedStepNo, setSelectedStepNo] = useState(pendingSteps[0]?.step_no || 1);
  const [newApproverId, setNewApproverId] = useState(employees[0]?.id || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newApproverId) {
      setErrorMsg('Pilih pegawai penilai pengganti');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Alasan pengalihan wajib diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/reassign-approver`, {
        step_no: Number(selectedStepNo),
        new_approver_employee_id: Number(newApproverId),
        reason: reason.trim()
      });
      if (onSuccess) onSuccess('Penugasan approver berhasil dialihkan');
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
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Alihkan Penugasan Approver</h3>
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

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Langkah yang Dialihkan <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStepNo}
              onChange={(e) => setSelectedStepNo(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-600"
              required
            >
              {pendingSteps.map(s => (
                <option key={s.step_no} value={s.step_no}>
                  Langkah {s.step_no}: {s.approver_source} (Saat ini: {s.assigned_employee_name || 'Belum ditugaskan'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Approver Pengganti <span className="text-rose-500">*</span>
            </label>
            <select
              value={newApproverId}
              onChange={(e) => setNewApproverId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-600"
              required
            >
              <option value="" disabled>Pilih Pegawai...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_number || `ID:${emp.id}`}) • {emp.position_name || 'Staf'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Alasan Pengalihan <span className="text-rose-500">* (Wajib)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Atasan langsung sedang dinas luar kota / berhalangan hadir..."
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
              {loading ? 'Menyimpan...' : 'Simpan Pengalihan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
