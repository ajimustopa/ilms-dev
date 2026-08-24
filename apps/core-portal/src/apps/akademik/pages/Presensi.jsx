import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Clock,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Check,
  X,
  RotateCw
} from 'lucide-react';

export default function Presensi() {
  const [activeSubTab, setActiveSubTab] = useState('daily');
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Daily attendance state
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId && activeSubTab === 'daily') {
      fetchClassStudentsAndAttendance();
    } else if (activeSubTab === 'leaves') {
      fetchLeaveRequests();
    }
  }, [selectedClassId, attendanceDate, activeSubTab]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/akademik/class-groups');
      const cls = res.data?.data || [];
      setClasses(cls);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchClassStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      const [stuRes, attRes] = await Promise.all([
        api.get(`/akademik/enrollments?class_group_id=${selectedClassId}`),
        api.get(`/akademik/attendances`, {
          params: { class_group_id: selectedClassId, attendance_date: attendanceDate }
        })
      ]);

      const stuList = stuRes.data?.data || [];
      const attList = attRes.data?.data || [];

      setStudents(stuList);

      const sMap = {};
      const nMap = {};
      for (const s of stuList) {
        sMap[s.student_id] = 'hadir'; // default
      }
      for (const a of attList) {
        sMap[a.student_id] = a.status;
        if (a.notes) nMap[a.student_id] = a.notes;
      }
      setStatusMap(sMap);
      setNotesMap(nMap);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLeaveLoading(true);
      const res = await api.get('/akademik/leave-requests');
      setLeaveRequests(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleNoteChange = (studentId, note) => {
    setNotesMap(prev => ({ ...prev, [studentId]: note }));
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const items = Object.keys(statusMap).map(sid => ({
        student_id: Number(sid),
        status: statusMap[sid],
        notes: notesMap[sid] || null
      }));

      await api.post('/akademik/attendances/bulk', {
        class_group_id: Number(selectedClassId),
        attendance_date: attendanceDate,
        items
      });

      setSuccessMsg('Presensi rombel berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveLeave = async (id, status) => {
    try {
      await api.put(`/akademik/leave-requests/${id}/approve`, { approval_status: status });
      setSuccessMsg(`Pengajuan izin berhasil ${status}!`);
      fetchLeaveRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses izin');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Presensi & Perizinan Siswa</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan kehadiran harian siswa per rombel dan persetujuan pengajuan izin / sakit.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (activeSubTab === 'daily') fetchClassStudentsAndAttendance();
              else fetchLeaveRequests();
            }}
            disabled={loading || leaveLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data Presensi dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading || leaveLoading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeSubTab === 'daily' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presensi Harian Rombel
            </button>
            <button
              onClick={() => setActiveSubTab('leaves')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeSubTab === 'leaves' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengajuan Izin ({leaveRequests.filter(l => l.approval_status === 'menunggu').length})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sub-Tab 1: Presensi Harian */}
      {activeSubTab === 'daily' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rombel:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tanggal Presensi:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Tabel Presensi */}
          <form onSubmit={handleSaveAttendance}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <h2 className="text-xs font-bold text-slate-800">
                    Form Absensi ({students.length} Siswa)
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Presensi</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Status Kehadiran</th>
                      <th className="py-3 px-4">Keterangan / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Memuat presensi siswa...</td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Belum ada siswa di rombel ini.</td></tr>
                    ) : (
                      students.map(s => (
                        <tr key={s.student_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">{s.nis}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{s.student_name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {['hadir', 'izin', 'sakit', 'alpa'].map(st => (
                                <label key={st} className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`status_${s.student_id}`}
                                    value={st}
                                    checked={statusMap[s.student_id] === st}
                                    onChange={() => handleStatusChange(s.student_id, st)}
                                    className="text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className={`text-[11px] font-semibold uppercase ${
                                    st === 'hadir' ? 'text-emerald-700' :
                                    st === 'izin' ? 'text-blue-700' :
                                    st === 'sakit' ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                    {st}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={notesMap[s.student_id] || ''}
                              onChange={(e) => handleNoteChange(s.student_id, e.target.value)}
                              placeholder="Catatan tambahan..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Tab 2: Pengajuan Izin */}
      {activeSubTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Diajukan Oleh</th>
                  <th className="py-3 px-4">Tanggal Izin</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Alasan</th>
                  <th className="py-3 px-4">Status Approval</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveLoading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">Memuat pengajuan izin...</td></tr>
                ) : leaveRequests.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada pengajuan izin siswa.</td></tr>
                ) : (
                  leaveRequests.map(l => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 font-bold text-slate-800">{l.student_name}</td>
                      <td className="py-3 px-4 text-slate-600">{l.guardian_name || 'Orang Tua / Wali'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{l.leave_date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          l.leave_type === 'sakit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{l.reason || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          l.approval_status === 'disetujui' ? 'bg-emerald-100 text-emerald-700' :
                          l.approval_status === 'ditolak' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {l.approval_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {l.approval_status === 'menunggu' && (
                          <>
                            <button
                              onClick={() => handleApproveLeave(l.id, 'disetujui')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleApproveLeave(l.id, 'ditolak')}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-xs"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
