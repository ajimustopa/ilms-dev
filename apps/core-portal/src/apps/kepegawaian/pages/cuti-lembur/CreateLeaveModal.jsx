import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  Clock,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Send,
  Loader2,
  Info,
  Sparkles
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { getLeaveErrorMessage, LEAVE_WARNING_MESSAGES } from './leaveErrorHelper';

export default function CreateLeaveModal({
  isOpen,
  onClose,
  currentUser,
  employees = [],
  leaveTypes = [],
  onSuccess
}) {
  if (!isOpen) return null;

  const permissions = currentUser?.permissions || [];
  const isHr = permissions.includes('kepegawaian.leave_requests.manage') ||
               permissions.includes('kepegawaian.leave_requests.override') ||
               currentUser?.role === 'super_admin';
  const canOverride = permissions.includes('kepegawaian.leave_requests.override') ||
                      currentUser?.role === 'super_admin';

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    isHr ? (employees[0]?.id || '') : (currentUser?.employeeId || '')
  );
  const [selectedTypeCode, setSelectedTypeCode] = useState(leaveTypes[0]?.code || 'cuti_tahunan');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startPortion, setStartPortion] = useState('full');
  const [endPortion, setEndPortion] = useState('full');
  const [reason, setReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Bypass Options
  const [bypassApproval, setBypassApproval] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  // Live Preview State
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected Type Metadata
  const currentType = leaveTypes.find(t => t.code === selectedTypeCode) || leaveTypes[0];

  // Fetch Live Preview with Debounce
  const fetchLivePreview = useCallback(async () => {
    if (!startDate || !endDate || !selectedEmployeeId) {
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await api.post('/kepegawaian/leave-requests/preview', {
        employee_id: Number(selectedEmployeeId),
        leave_type: selectedTypeCode,
        start_date: startDate,
        end_date: endDate,
        start_portion: startPortion,
        end_portion: endPortion,
        reason: reason.trim(),
        attachment_name: attachmentFile ? attachmentFile.name : undefined,
        bypass_approval: bypassApproval,
        bypass_reason: bypassReason.trim()
      });

      if (res.data?.success) {
        setPreviewData(res.data.data);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedEmployeeId, selectedTypeCode, startDate, endDate, startPortion, endPortion, reason, attachmentFile, bypassApproval, bypassReason]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLivePreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLivePreview]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !endDate) {
      setFormError('Tanggal mulai dan berakhir wajib diisi');
      return;
    }

    if (!reason.trim() && currentType?.reason_required) {
      setFormError('Alasan permohonan wajib diisi');
      return;
    }

    if (bypassApproval && !bypassReason.trim()) {
      setFormError('Alasan persetujuan langsung (bypass HRD) wajib diisi');
      return;
    }

    setSubmitLoading(true);
    try {
      const formData = new FormData();
      if (isHr && selectedEmployeeId) {
        formData.append('employee_id', selectedEmployeeId);
      }
      formData.append('leave_type', selectedTypeCode);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('start_portion', startPortion);
      formData.append('end_portion', endPortion);
      formData.append('reason', reason.trim());

      if (bypassApproval) {
        formData.append('bypass_approval', '1');
        formData.append('bypass_reason', bypassReason.trim());
      }

      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const res = await api.post('/kepegawaian/leave-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        if (onSuccess) onSuccess('Permohonan cuti/izin berhasil diajukan');
        onClose();
      } else {
        setFormError(res.data?.message || 'Gagal mengajukan permohonan');
      }
    } catch (err) {
      setFormError(getLeaveErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ajukan Cuti & Izin Pegawai</h3>
              <span className="text-[11px] text-slate-500">Formulir permohonan administrasi ketidakhadiran</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Mengajukan</p>
                <p className="mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Pegawai Pemohon <span className="text-rose-500">*</span>
            </label>
            {isHr ? (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                required
              >
                <option value="" disabled>Pilih Pegawai...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_number || emp.nip || `ID:${emp.id}`}) • {emp.position_name || 'Staf'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-9 px-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center text-slate-700 font-medium text-xs">
                {currentUser?.name || currentUser?.username} (Saya Sendiri)
              </div>
            )}
          </div>

          {/* Leave Type & Balance Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Kategori / Jenis Cuti <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTypeCode}
                onChange={(e) => setSelectedTypeCode(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
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
              <label className="block font-bold text-slate-800 mb-1.5">Karakteristik & Kebijakan</label>
              <div className="h-9 px-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-medium">
                <span>{currentType?.count_mode === 'calendar_days' ? 'Hari Kalender' : 'Hari Kerja Efektif'}</span>
                <span className="font-bold text-[11px] text-emerald-700">
                  {currentType?.max_days_per_request ? `Maks ${currentType.max_days_per_request} hr/pengajuan` : 'Fleksibel'}
                </span>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                Tanggal Berakhir <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                required
              />
            </div>
          </div>

          {/* Half-day Portions (Optional) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Porsi Waktu (Setengah Hari)
              </span>
              <span className="text-[10px] text-slate-400">Default: Penuh (1 Hari Penuh)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Hari Pertama:</span>
                <select
                  value={startPortion}
                  onChange={(e) => setStartPortion(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                >
                  <option value="full">1 Hari Penuh (Full Day)</option>
                  <option value="pm">Setengah Hari Siang (PM)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Hari Terakhir:</span>
                <select
                  value={endPortion}
                  onChange={(e) => setEndPortion(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                >
                  <option value="full">1 Hari Penuh (Full Day)</option>
                  <option value="am">Setengah Hari Pagi (AM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Alasan / Keterangan Keperluan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors resize-none placeholder-slate-400"
              placeholder="Tuliskan keterangan keperluan cuti secara detail dan jelas..."
              rows={3}
              required
            />
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Unggah Dokumen Pendukung
              {currentType?.attachment_rule === 'required' ? (
                <span className="text-rose-500 ml-1">* (Wajib)</span>
              ) : (
                <span className="text-slate-400 font-normal ml-1">(Opsional / Jika Diperlukan)</span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              {attachmentFile && (
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  className="text-xs text-rose-600 hover:underline shrink-0"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Live Preview & Impact Card */}
          {previewLoading ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Menghitung durasi hari kerja dan memeriksa validasi sistem...</span>
            </div>
          ) : previewData ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Pratinjau Durasi & Validasi Otomatis
                </span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${previewData.can_submit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {previewData.can_submit ? 'VALID / MEMENUHI SYARAT' : 'DIBLOKIR SISTEM'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block">Durasi Terhitung</span>
                  <span className="text-sm font-bold text-slate-900">{previewData.duration_days} Hari</span>
                </div>
                {previewData.balance_impact && (
                  <>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Saldo Saat Ini</span>
                      <span className="text-sm font-bold text-slate-800">{previewData.balance_impact.availableBefore} Hari</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-emerald-900">
                      <span className="text-[10px] text-emerald-700 block font-semibold">Sisa Setelahnya</span>
                      <span className="text-sm font-bold">{previewData.balance_impact.availableAfter} Hari</span>
                    </div>
                  </>
                )}
              </div>

              {/* Day Breakdown Chips */}
              {previewData.breakdown && previewData.breakdown.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold block">Rincian Hari:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.breakdown.map((b, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          b.is_working_day
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {b.date?.slice(5)}: {b.is_working_day ? `${b.portion_count} HK` : (b.is_holiday ? 'Libur' : 'Non-Kerja')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors list */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1">
                  {previewData.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings list */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  {previewData.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{warn.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* HR Override Bypass Checkbox */}
          {canOverride && (
            <div className="p-3.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bypassApproval}
                  onChange={(e) => setBypassApproval(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                  Persetujuan Langsung (Bypass Approval oleh HRD)
                </span>
              </label>

              {bypassApproval && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                    Alasan Bypass / Override <span className="text-rose-500">* (Wajib)</span>
                  </label>
                  <input
                    type="text"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    placeholder="Contoh: Disetujui langsung atas arahan Yayasan / Keadaan Darurat"
                    className="w-full h-8 px-3 rounded-lg border border-indigo-200 bg-white text-xs text-indigo-950 outline-none focus:border-indigo-500"
                    required={bypassApproval}
                  />
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              onClick={onClose}
              disabled={submitLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
              type="button"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={submitLoading || (previewData && !previewData.can_submit && !bypassApproval)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirimkan...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{bypassApproval ? 'Simpan & Setujui Langsung' : 'Kirim Permohonan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
