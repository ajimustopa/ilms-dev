import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  CalendarRange,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  User
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function CutiLembur() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('leaves');

  // Leaves state
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  // Overtimes state
  const [overtimes, setOvertimes] = useState([]);
  const [loadingOvertimes, setLoadingOvertimes] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & Forms
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type: 'Cuti Tahunan',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState({
    employee_id: '',
    overtime_date: '',
    hours: '2',
    notes: ''
  });

  // Reject Modal
  const [rejectType, setRejectType] = useState(null); // 'leave' or 'overtime'
  const [selectedRejectId, setSelectedRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Employee list for dropdown
  const [employees, setEmployees] = useState([]);

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/leave-requests${q}`);
      if (res.data?.success) setLeaves(res.data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat pengajuan cuti');
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchOvertimes = async () => {
    setLoadingOvertimes(true);
    try {
      let q = '';
      if (activeSchoolUnit?.id) q = `?school_unit_id=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/overtimes${q}`);
      if (res.data?.success) setOvertimes(res.data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat pengajuan lembur');
    } finally {
      setLoadingOvertimes(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/kepegawaian/employees?per_page=100');
      if (res.data?.success) setEmployees(res.data.data.items || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchLeaves();
    fetchOvertimes();
    fetchEmployees();
  }, [activeSchoolUnit]);

  // Leave Handlers
  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/leave-requests', {
        ...leaveForm,
        school_unit_id: activeSchoolUnit?.id || 1
      });
      if (res.data?.success) {
        setSuccessMsg('Pengajuan cuti berhasil dikirim');
        setIsLeaveModalOpen(false);
        fetchLeaves();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengajukan cuti');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      const res = await api.patch(`/kepegawaian/leave-requests/${id}/approve`, {});
      if (res.data?.success) {
        setSuccessMsg('Pengajuan cuti berhasil disetujui');
        fetchLeaves();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyetujui cuti');
    }
  };

  // Overtime Handlers
  const handleCreateOvertime = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/overtimes', {
        ...overtimeForm,
        school_unit_id: activeSchoolUnit?.id || 1
      });
      if (res.data?.success) {
        setSuccessMsg('Pengajuan lembur berhasil dicatat');
        setIsOvertimeModalOpen(false);
        fetchOvertimes();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mencatat lembur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOvertime = async (id) => {
    try {
      const res = await api.patch(`/kepegawaian/overtimes/${id}/approve`, {});
      if (res.data?.success) {
        setSuccessMsg('Pengajuan lembur berhasil disetujui');
        fetchOvertimes();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyetujui lembur');
    }
  };

  // Reject Modal Open & Submit
  const openRejectModal = (type, id) => {
    setRejectType(type);
    setSelectedRejectId(id);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (rejectType === 'leave') {
        await api.patch(`/kepegawaian/leave-requests/${selectedRejectId}/reject`, { reason: rejectReason });
        setSuccessMsg('Pengajuan cuti ditolak');
        fetchLeaves();
      } else {
        await api.patch(`/kepegawaian/overtimes/${selectedRejectId}/reject`, { notes: rejectReason });
        setSuccessMsg('Pengajuan lembur ditolak');
        fetchOvertimes();
      }
      setIsRejectModalOpen(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menolak pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadges = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Manajemen Cuti, Izin & Lembur</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola permohonan ketidakhadiran kerja dan penugasan lembur pegawai
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { fetchLeaves(); fetchOvertimes(); }}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'leaves' ? (
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Cuti / Izin</span>
            </button>
          ) : (
            <button
              onClick={() => setIsOvertimeModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Lembur</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-3 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'leaves' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Pengajuan Cuti & Izin ({leaves.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('overtimes')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'overtimes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Penugasan Lembur ({overtimes.length})</span>
        </button>
      </div>

      {/* Tab 1: Cuti & Izin */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Pegawai</th>
                <th className="p-3.5">Jenis Cuti</th>
                <th className="p-3.5">Periode Tanggal</th>
                <th className="p-3.5">Alasan</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLeaves ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat berkas cuti...</span>
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    Tidak ada pengajuan cuti tercatat
                  </td>
                </tr>
              ) : (
                leaves.map((lv) => (
                  <tr key={lv.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-semibold text-slate-800">{lv.employee_name || `Pegawai #${lv.employee_id}`}</td>
                    <td className="p-3.5 font-bold text-indigo-700">{lv.leave_type}</td>
                    <td className="p-3.5 font-mono text-slate-700">
                      {lv.start_date.split('T')[0]} s/d {lv.end_date.split('T')[0]}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{lv.reason || '-'}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadges[lv.status]}`}>
                        {lv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {lv.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveLeave(lv.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => openRejectModal('leave', lv.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{lv.approver_name ? `Diproses: ${lv.approver_name}` : 'Selesai'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Lembur */}
      {activeTab === 'overtimes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Pegawai</th>
                <th className="p-3.5">Tanggal Lembur</th>
                <th className="p-3.5">Durasi (Jam)</th>
                <th className="p-3.5">Keterangan / Tugas</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingOvertimes ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat berkas lembur...</span>
                  </td>
                </tr>
              ) : overtimes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    Tidak ada pengajuan lembur tercatat
                  </td>
                </tr>
              ) : (
                overtimes.map((ov) => (
                  <tr key={ov.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-semibold text-slate-800">{ov.employee_name || `Pegawai #${ov.employee_id}`}</td>
                    <td className="p-3.5 font-mono text-slate-700">{ov.overtime_date.split('T')[0]}</td>
                    <td className="p-3.5 font-bold text-indigo-700">{ov.hours} Jam</td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{ov.notes || '-'}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadges[ov.status]}`}>
                        {ov.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {ov.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveOvertime(ov.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => openRejectModal('overtime', ov.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">{ov.approver_name ? `Diproses: ${ov.approver_name}` : 'Selesai'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajukan Cuti */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Formulir Pengajuan Cuti / Izin</h3>
              <button onClick={() => setIsLeaveModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateLeave} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pegawai *</label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Pilih Pegawai</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenis Cuti / Izin</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Cuti Tahunan, Cuti Sakit, Izin Khusus"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mulai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alasan / Keperluan</label>
                <textarea
                  rows="2"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Keterangan pengajuan..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Kirim Permohonan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Lembur */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Catat Pengajuan Lembur</h3>
              <button onClick={() => setIsOvertimeModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateOvertime} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pegawai *</label>
                <select
                  required
                  value={overtimeForm.employee_id}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, employee_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Pilih Pegawai</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_number})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Lembur</label>
                  <input
                    type="date"
                    required
                    value={overtimeForm.overtime_date}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, overtime_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durasi (Jam)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    required
                    value={overtimeForm.hours}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Uraian Tugas Lembur</label>
                <textarea
                  rows="2"
                  value={overtimeForm.notes}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, notes: e.target.value })}
                  placeholder="Kegiatan yang dikerjakan..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsOvertimeModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan Lembur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Penolakan (Reject) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Alasan Penolakan Permohonan</h3>
              <button onClick={() => setIsRejectModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alasan Penolakan *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Tuliskan alasan penolakan..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsRejectModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-semibold">Konfirmasi Tolak</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
