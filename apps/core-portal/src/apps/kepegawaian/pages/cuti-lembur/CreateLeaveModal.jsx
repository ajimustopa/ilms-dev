import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function CreateLeaveModal({
  isOpen,
  onClose,
  leaveTypes = [],
  employees = [],
  onSuccess,
  isHr = false
}) {
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'cuti_tahunan',
    start_date: '',
    end_date: '',
    start_portion: 'full',
    end_portion: 'full',
    reason: '',
    bypass_approval: false,
    bypass_reason: ''
  });

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Selected leave type metadata
  const currentType = leaveTypes.find(t => t.code === form.leave_type);

  // Trigger preview calculation whenever date / portion changes
  useEffect(() => {
    if (!form.start_date || !form.end_date) {
      setPreview(null);
      setPreviewError('');
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setPreviewError('');
      try {
        const payload = {
          employee_id: form.employee_id || undefined,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          start_portion: form.start_portion,
          end_portion: form.end_portion
        };
        const res = await api.post('/kepegawaian/leave-requests/preview', payload);
        if (res.data?.success) {
          setPreview(res.data.data);
        }
      } catch (err) {
        setPreview(null);
        setPreviewError(err.response?.data?.message || 'Gagal menghitung durasi cuti');
      } finally {
        setLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => clearTimeout(timer);
  }, [form.start_date, form.end_date, form.start_portion, form.end_portion, form.leave_type, form.employee_id]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await api.post('/kepegawaian/leave-requests', form);
      if (res.data?.success) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Gagal mengajukan permohonan cuti');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Form Permohonan Cuti / Izin</h3>
            <p className="text-xs text-slate-500">Perhitungan otomatis hari kerja efektif dan saldo jatah</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection for HR */}
          {isHr && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Pegawai (Atas Nama) *
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

          {/* Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jenis Cuti / Izin *
            </label>
            <select
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {leaveTypes.map(t => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.count_mode === 'calendar_days' ? 'Hari Kalender' : 'Hari Kerja'}) {t.deducts_balance ? '• Potong Saldo' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    start_date: val,
                    end_date: prev.end_date && prev.end_date < val ? val : (prev.end_date || val)
                  }));
                }}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai *
              </label>
              <input
                type="date"
                required
                min={form.start_date}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Half Day Portions */}
          {currentType?.half_day_allowed && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Porsi Hari Mulai</label>
                <select
                  value={form.start_portion}
                  onChange={(e) => setForm({ ...form, start_portion: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="full">Seharian Penuh (1.0 HK)</option>
                  <option value="pm">Setengah Hari Siang (0.5 HK)</option>
                  {form.start_date === form.end_date && (
                    <option value="am">Setengah Hari Pagi (0.5 HK)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Porsi Hari Selesai</label>
                <select
                  value={form.end_portion}
                  onChange={(e) => setForm({ ...form, end_portion: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  <option value="full">Seharian Penuh (1.0 HK)</option>
                  <option value="am">Setengah Hari Pagi (0.5 HK)</option>
                  {form.start_date === form.end_date && (
                    <option value="pm">Setengah Hari Siang (0.5 HK)</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Live Preview Card */}
          {loadingPreview ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Menghitung hari kerja dan memeriksa kalender libur...
            </div>
          ) : previewError ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{previewError}</span>
            </div>
          ) : preview ? (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Durasi Terhitung</span>
                <span className="text-base font-bold text-indigo-700">
                  {preview.duration_days} {preview.count_mode === 'calendar_days' ? 'Hari Kalender' : 'Hari Kerja (HK)'}
                </span>
              </div>

              {preview.balance_impact && (
                <div className="text-xs text-indigo-800 pt-1 border-t border-indigo-100 flex items-center justify-between">
                  <span>Saldo Saat Ini: {preview.balance_impact.availableBefore} Hari</span>
                  <span className={`font-semibold ${preview.balance_impact.isSufficient ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Sisa Setelah Cuti: {preview.balance_impact.availableAfter} Hari
                  </span>
                </div>
              )}

              {preview.warnings && preview.warnings.length > 0 && (
                <div className="text-[11px] text-amber-700 pt-1">
                  Catatan: {preview.warnings.join(', ')}
                </div>
              )}
            </div>
          ) : null}

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan Permohonan {currentType?.reason_required ? '*' : '(Opsional)'}
            </label>
            <textarea
              rows={3}
              required={currentType?.reason_required}
              placeholder="Jelaskan keperluan cuti atau izin..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || !preview || (preview.balance_impact && !preview.balance_impact.isSufficient)}
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
                  Kirim Pengajuan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
