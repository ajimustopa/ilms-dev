import React, { useState } from 'react';
import {
  Clock,
  Search,
  Plus,
  Check,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Briefcase
} from 'lucide-react';
import StatusBadge from '../../../../shared/components/StatusBadge';
import api from '../../../../shared/services/api';

export default function OvertimeTab({
  overtimes = [],
  loading = false,
  employees = [],
  onRefresh,
  onOpenCreateModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDayType, setSelectedDayType] = useState('ALL');

  // Reconciliation Modal
  const [selectedOt, setSelectedOt] = useState(null);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [payableHours, setPayableHours] = useState('');
  const [realizationStatus, setRealizationStatus] = useState('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredOvertimes = overtimes.filter(item => {
    const matchSearch =
      (item.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.task_description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    const matchDay = selectedDayType === 'ALL' || item.day_type === selectedDayType;

    return matchSearch && matchStatus && matchDay;
  });

  const pendingCount = overtimes.filter(o => o.status === 'pending').length;
  const approvedCount = overtimes.filter(o => o.status === 'approved').length;
  const totalHours = overtimes.filter(o => o.status === 'approved').reduce((acc, curr) => acc + (parseFloat(curr.payable_hours || curr.hours) || 0), 0);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/kepegawaian/overtimes/${id}/approve`);
      if (onRefresh) onRefresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyetujui lembur');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Masukkan alasan penolakan lembur:');
    if (!reason) return;
    try {
      await api.patch(`/kepegawaian/overtimes/${id}/reject`, { rejection_reason: reason });
      if (onRefresh) onRefresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menolak lembur');
    }
  };

  const handleOpenReconcile = (item) => {
    setSelectedOt(item);
    setPayableHours(item.payable_hours || item.hours || '2');
    setRealizationStatus(item.realization_status || 'manual');
    setErrorMsg('');
    setIsReconcileModalOpen(true);
  };

  const handleExecuteReconcile = async () => {
    if (!selectedOt) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.patch(`/kepegawaian/overtimes/${selectedOt.id}/reconcile`, {
        payable_hours: parseFloat(payableHours),
        realization_status: realizationStatus
      });
      if (res.data?.success) {
        setIsReconcileModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal merekonsiliasi lembur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pengajuan Lembur Menunggu</p>
            <h3 className="text-2xl font-bold text-amber-600">{pendingCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Perlu persetujuan HRD</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Lembur Disetujui</p>
            <h3 className="text-2xl font-bold text-emerald-600">{approvedCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Surat Perintah / Penugasan Sah</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Jam Lembur Disetujui</p>
            <h3 className="text-2xl font-bold text-indigo-600">{totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-500">Jam</span></h3>
            <p className="text-xs text-slate-400 mt-1">Siap diproses ke payroll</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pegawai, SPK, atau deskripsi lembur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          <select
            value={selectedDayType}
            onChange={(e) => setSelectedDayType(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Jenis Hari</option>
            <option value="workday">Hari Kerja</option>
            <option value="weekend">Akhir Pekan</option>
            <option value="holiday">Hari Libur</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Input / Tugaskan Lembur
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pegawai</th>
                <th className="py-3.5 px-4">Tanggal & Jenis Hari</th>
                <th className="py-3.5 px-4">Waktu / Rencana</th>
                <th className="py-3.5 px-4 text-center">Durasi Rencana</th>
                <th className="py-3.5 px-4 text-center">Realisasi Jam</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Deskripsi Tugas</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Memuat data lembur...
                    </div>
                  </td>
                </tr>
              ) : filteredOvertimes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data lembur yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredOvertimes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.employee_name || 'Pegawai'}</div>
                      <div className="text-xs text-slate-400">{item.nip || `ID: ${item.employee_id}`}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{item.overtime_date}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                        item.day_type === 'holiday' ? 'bg-rose-100 text-rose-700' :
                        item.day_type === 'weekend' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.day_type || 'workday'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {item.start_time && item.end_time ? `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}` : 'Sesuai Tugas'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                      {item.hours} Jam
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.payable_hours ? `${item.payable_hours} Jam` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500" title={item.task_description}>
                      {item.task_description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Setujui"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Tolak"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {item.status === 'approved' && (
                          <button
                            onClick={() => handleOpenReconcile(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors"
                            title="Rekonsiliasi Absensi"
                          >
                            Rekonsiliasi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation Modal */}
      {isReconcileModalOpen && selectedOt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Rekonsiliasi Realisasi Lembur</h3>
              <button onClick={() => setIsReconcileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Pegawai: <strong>{selectedOt.employee_name}</strong> • Tanggal: <strong>{selectedOt.overtime_date}</strong> (Rencana: {selectedOt.hours} Jam)
            </p>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Terbayar Disahkan (Payable Hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={payableHours}
                onChange={(e) => setPayableHours(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Realisasi
              </label>
              <select
                value={realizationStatus}
                onChange={(e) => setRealizationStatus(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="matched">Sesuai Presensi (Matched)</option>
                <option value="partial">Sebagian (Partial)</option>
                <option value="manual">Konfirmasi Manual HRD</option>
                <option value="no_attendance">Tanpa Presensi</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReconcile}
                disabled={isSubmitting || !payableHours}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Sahkan Jam Lembur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
