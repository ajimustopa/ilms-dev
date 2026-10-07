import React, { useState } from 'react';
import {
  CalendarRange,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  FileText,
  AlertTriangle,
  User,
  Building,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  Download
} from 'lucide-react';
import StatusBadge from '../../../../shared/components/StatusBadge';
import api from '../../../../shared/services/api';

export default function LeaveRequestsTab({
  leaves = [],
  loading = false,
  leaveTypes = [],
  employees = [],
  onRefresh,
  onOpenCreateModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Action Modals
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('approve'); // 'approve', 'reject', 'request_revision', 'cancel'
  const [actionComment, setActionComment] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  const filteredLeaves = leaves.filter(item => {
    const matchSearch =
      (item.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    const matchType = selectedType === 'ALL' || item.leave_type === selectedType;

    return matchSearch && matchStatus && matchType;
  });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const totalDays = leaves.filter(l => l.status === 'approved').reduce((acc, curr) => acc + (parseFloat(curr.duration_days) || 0), 0);

  const handleOpenDetail = async (leaveItem) => {
    try {
      const res = await api.get(`/kepegawaian/leave-requests/${leaveItem.id}`);
      if (res.data?.success) {
        setSelectedLeave(res.data.data);
      } else {
        setSelectedLeave(leaveItem);
      }
    } catch (e) {
      setSelectedLeave(leaveItem);
    }
    setIsDetailDrawerOpen(true);
  };

  const handleOpenActionModal = (type, leaveItem) => {
    setSelectedLeave(leaveItem);
    setActionType(type);
    setActionComment('');
    setActionError('');
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedLeave) return;
    setIsSubmittingAction(true);
    setActionError('');

    try {
      let endpoint = '';
      let payload = {};

      if (actionType === 'approve') {
        endpoint = `/kepegawaian/leave-requests/${selectedLeave.id}/approve`;
        payload = { comment: actionComment };
      } else if (actionType === 'reject') {
        endpoint = `/kepegawaian/leave-requests/${selectedLeave.id}/reject`;
        payload = { rejection_reason: actionComment };
      } else if (actionType === 'request_revision') {
        endpoint = `/kepegawaian/leave-requests/${selectedLeave.id}/request-revision`;
        payload = { comment: actionComment };
      } else if (actionType === 'cancel') {
        endpoint = `/kepegawaian/leave-requests/${selectedLeave.id}/cancel`;
        payload = { cancel_reason: actionComment };
      }

      const res = await api.patch(endpoint, payload);
      if (res.data?.success) {
        setIsActionModalOpen(false);
        setIsDetailDrawerOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Gagal memproses aksi');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Menunggu Persetujuan</p>
            <h3 className="text-2xl font-bold text-amber-600">{pendingCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Perlu ditindaklanjuti segera</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Cuti Disetujui</p>
            <h3 className="text-2xl font-bold text-emerald-600">{approvedCount}</h3>
            <p className="text-xs text-slate-400 mt-1">Total pengajuan sah</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Hari Diambil</p>
            <h3 className="text-2xl font-bold text-indigo-600">{totalDays} <span className="text-sm font-medium text-slate-500">Hari</span></h3>
            <p className="text-xs text-slate-400 mt-1">Akumulasi durasi cuti</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <CalendarRange className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Jenis Cuti Terdaftar</p>
            <h3 className="text-2xl font-bold text-blue-600">{leaveTypes.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Master kebijakan aktif</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="rejected">Ditolak (Rejected)</option>
              <option value="revision_requested">Minta Revisi</option>
              <option value="cancelled">Dibatalkan</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Jenis Cuti</option>
              {leaveTypes.map(t => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajukan Cuti / Izin
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
                <th className="py-3.5 px-4">Jenis Cuti</th>
                <th className="py-3.5 px-4">Rentang Tanggal</th>
                <th className="py-3.5 px-4 text-center">Durasi</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Alasan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Memuat permohonan cuti...
                    </div>
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada data permohonan cuti yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.employee_name || 'Pegawai'}</div>
                      <div className="text-xs text-slate-400">{item.nip || `ID: ${item.employee_id}`}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {item.leave_type_name || item.leave_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{item.start_date}</div>
                      <div className="text-xs text-slate-400">s/d {item.end_date}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.duration_days} {item.count_mode === 'calendar_days' ? 'Hari' : 'HK'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500" title={item.reason}>
                      {item.reason || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Lihat Detail & Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOpenActionModal('approve', item)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Setujui"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenActionModal('reject', item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Tolak"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Drawer Detail & Multi-Step Approval Timeline */}
      {isDetailDrawerOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Detail Permohonan Cuti</h3>
                <p className="text-xs text-slate-500">ID #{selectedLeave.id} • Dibuat {selectedLeave.created_at?.slice(0, 10)}</p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Employee Info Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {selectedLeave.employee_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{selectedLeave.employee_name}</h4>
                  <p className="text-xs text-slate-500">{selectedLeave.nip || 'NIP Pegawai'} • {selectedLeave.position_name || 'Staff'}</p>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400 block mb-1">Jenis Cuti</span>
                  <span className="font-semibold text-sm text-slate-800">{selectedLeave.leave_type_name || selectedLeave.leave_type}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400 block mb-1">Durasi Total</span>
                  <span className="font-semibold text-sm text-indigo-600">{selectedLeave.duration_days} Hari ({selectedLeave.count_mode === 'calendar_days' ? 'Kalender' : 'HK'})</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400 block mb-1">Tanggal Mulai</span>
                  <span className="font-semibold text-sm text-slate-800">{selectedLeave.start_date} ({selectedLeave.start_portion || 'full'})</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-400 block mb-1">Tanggal Selesai</span>
                  <span className="font-semibold text-sm text-slate-800">{selectedLeave.end_date} ({selectedLeave.end_portion || 'full'})</span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Alasan Permohonan</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                  {selectedLeave.reason || 'Tidak ada alasan khusus dicantumkan.'}
                </div>
              </div>

              {/* Multi-Step Approval Timeline */}
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Jalur Persetujuan (Workflow)</span>
                <div className="space-y-3">
                  {selectedLeave.approval_steps && selectedLeave.approval_steps.length > 0 ? (
                    selectedLeave.approval_steps.map((step, idx) => (
                      <div key={step.id || idx} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          step.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          step.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                          step.status === 'bypassed' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {step.step_no}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-slate-800">
                              {step.approver_source === 'direct_supervisor' ? 'Atasan Langsung' :
                               step.approver_source === 'unit_head' ? 'Kepala Sekolah' : 'HRD Yayasan'}
                            </h5>
                            <span className="text-xs font-medium capitalize">
                              <StatusBadge status={step.status} />
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {step.assigned_employee_name ? `Penugasan: ${step.assigned_employee_name}` : 'Penugasan: Pool HRD'}
                          </p>
                          {step.comment && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-2 border border-slate-100">
                              Catatan: "{step.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                      Persetujuan langsung 1 tingkat (HRD)
                    </div>
                  )}
                </div>
              </div>

              {/* Colleague Overlaps */}
              {selectedLeave.overlapping_colleagues && selectedLeave.overlapping_colleagues.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Rekan Cuti Bersamaan ({selectedLeave.overlapping_colleagues.length} Orang)
                  </div>
                  <ul className="text-xs text-amber-900 space-y-1">
                    {selectedLeave.overlapping_colleagues.map((col, cIdx) => (
                      <li key={cIdx} className="flex justify-between">
                        <span>• {col.colleague_name}</span>
                        <span className="text-amber-700">{col.start_date} s/d {col.end_date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            {selectedLeave.status === 'pending' && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenActionModal('request_revision', selectedLeave)}
                  className="px-3.5 py-2 text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                >
                  Minta Revisi
                </button>
                <button
                  onClick={() => handleOpenActionModal('reject', selectedLeave)}
                  className="px-3.5 py-2 text-sm font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors"
                >
                  Tolak
                </button>
                <button
                  onClick={() => handleOpenActionModal('approve', selectedLeave)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  Setujui Cuti
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Dialog (Approve, Reject, Revision, Cancel) */}
      {isActionModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">
                {actionType === 'approve' && 'Konfirmasi Persetujuan Cuti'}
                {actionType === 'reject' && 'Konfirmasi Penolakan Cuti'}
                {actionType === 'request_revision' && 'Permintaan Revisi Pengajuan'}
                {actionType === 'cancel' && 'Batalkan Pengajuan Cuti'}
              </h3>
              <button onClick={() => setIsActionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Pegawai: <strong>{selectedLeave.employee_name}</strong> ({selectedLeave.duration_days} hari {selectedLeave.leave_type_name})
            </p>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {actionType === 'approve' ? 'Catatan Tambahan (Opsional)' : 'Alasan / Catatan (Wajib)'}
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Tuliskan catatan persetujuan atau alasan..."
                className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isSubmittingAction || (actionType !== 'approve' && !actionComment.trim())}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
              >
                {isSubmittingAction ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
