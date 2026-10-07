import React, { useState } from 'react';
import {
  X,
  Clock,
  Briefcase,
  AlertCircle,
  Send,
  Loader2
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function CreateOvertimeModal({
  isOpen,
  onClose,
  employees = [],
  onSuccess,
  isHr = false
}) {
  const [form, setForm] = useState({
    employee_id: '',
    overtime_date: new Date().toISOString().slice(0, 10),
    start_time: '16:30',
    end_time: '19:30',
    hours: '3',
    task_description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/kepegawaian/overtimes', form);
      if (res.data?.success) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengajukan lembur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Form Pengajuan / Penugasan Lembur</h3>
            <p className="text-xs text-slate-500">Penugasan lembur di luar jam kerja efektif</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isHr && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Pegawai *
              </label>
              <select
                required
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Pegawai --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name || emp.name} ({emp.employee_number || emp.nip || `ID: ${emp.id}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Lembur *
            </label>
            <input
              type="date"
              required
              value={form.overtime_date}
              onChange={(e) => setForm({ ...form, overtime_date: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Durasi Rencana (Jam) *
            </label>
            <input
              type="number"
              step="0.5"
              required
              min="0.5"
              max="12"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian Tugas / Pekerjaan Lembur *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Contoh: Rekapitulasi nilai rapor semester ganjil atau pengawasan try out"
              value={form.task_description}
              onChange={(e) => setForm({ ...form, task_description: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ajukan Lembur
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
