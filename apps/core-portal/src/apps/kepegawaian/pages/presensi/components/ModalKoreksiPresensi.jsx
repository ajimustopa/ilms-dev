import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  LogIn,
  LogOut,
  User,
  History
} from 'lucide-react';

export default function ModalKoreksiPresensi({
  isOpen,
  onClose,
  attendance,
  onSave
}) {
  const [formData, setFormData] = useState({
    status: 'present',
    sub_status: 'Hadir Tepat Waktu',
    check_in_time: '',
    check_out_time: '',
    notes: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (attendance) {
      setFormData({
        status: attendance.status || 'present',
        sub_status: attendance.sub_status || (attendance.status === 'present' ? (attendance.is_late ? 'Terlambat' : 'Hadir Tepat Waktu') : 'Izin'),
        check_in_time: attendance.check_in_time ? attendance.check_in_time.slice(0, 5) : '',
        check_out_time: attendance.check_out_time ? attendance.check_out_time.slice(0, 5) : '',
        notes: attendance.check_in_notes || attendance.notes || '',
        reason: ''
      });
      setErrorMsg('');
    }
  }, [attendance]);

  if (!isOpen || !attendance) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      setErrorMsg('Alasan/justifikasi koreksi presensi wajib diisi untuk pencatatan audit trail.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSave(attendance.id, {
        ...formData,
        check_in_time: formData.check_in_time ? `${formData.check_in_time}:00` : null,
        check_out_time: formData.check_out_time ? `${formData.check_out_time}:00` : null
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan koreksi presensi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs border border-purple-200 shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Koreksi Presensi HRD</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                  ID #{attendance.id}
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5 font-medium">
                {attendance.employee_name} &bull; {attendance.attendance_date?.split('T')[0]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ringkasan Data Sebelum Koreksi */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
              Data Sebelum Koreksi:
            </span>
            <div className="flex items-center justify-between text-xs">
              <span>Status: <strong className="text-slate-800 capitalize">{attendance.sub_status || attendance.status}</strong></span>
              <span>Masuk: <strong className="font-mono text-emerald-800">{attendance.check_in_time ? attendance.check_in_time.slice(0, 5) : '-'} WIB</strong></span>
              <span>Pulang: <strong className="font-mono text-slate-800">{attendance.check_out_time ? attendance.check_out_time.slice(0, 5) : '-'} WIB</strong></span>
            </div>
          </div>

          {/* Status Kehadiran Baru */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status Kehadiran Baru</label>
              <select
                value={formData.status}
                onChange={(e) => {
                  const st = e.target.value;
                  let sub = 'Hadir Tepat Waktu';
                  if (st === 'sick') sub = 'Sakit (Surat Dokter)';
                  else if (st === 'permitted') sub = 'Izin Resmi';
                  else if (st === 'absent') sub = 'Alpa';
                  setFormData({ ...formData, status: st, sub_status: sub });
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="present">Present (Hadir)</option>
                <option value="permitted">Permitted (Izin / Cuti / DL)</option>
                <option value="sick">Sick (Sakit)</option>
                <option value="absent">Absent (Alpa / Tanpa Keterangan)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rincian / Label Khusus</label>
              <select
                value={formData.sub_status}
                onChange={(e) => setFormData({ ...formData, sub_status: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="Hadir Tepat Waktu">Hadir Tepat Waktu</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin Resmi">Izin Resmi</option>
                <option value="Sakit">Sakit</option>
                <option value="Cuti">Cuti</option>
                <option value="Dinas Luar">Dinas Luar</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>
          </div>

          {/* Jam Masuk & Pulang */}
          {formData.status === 'present' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jam Masuk (HH:MM)</label>
                <input
                  type="text"
                  placeholder="07:00"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jam Pulang (HH:MM)</label>
                <input
                  type="text"
                  placeholder="16:00"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Alasan Koreksi (WAJIB untuk Audit Log) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Alasan / Justifikasi Koreksi HRD <span className="text-rose-600">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="Contoh: Koreksi mesin fingerprint mati listrik, pegawai terkonfirmasi hadir piket..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Audit Note */}
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Setiap perubahan nilai akan disimpan ke dalam <strong>Audit Trail Log</strong> secara permanen bersama identitas akun Anda.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.reason.trim()}
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Koreksi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
