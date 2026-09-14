import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit2,
  LogIn,
  LogOut,
  X,
  User
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function Presensi() {
  const { user, activeSchoolUnit } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Modal Correction
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [selectedAtt, setSelectedAtt] = useState(null);
  const [correctForm, setCorrectForm] = useState({
    status: 'present',
    check_in_time: '',
    check_out_time: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Employees master untuk manual check-in
  const [employees, setEmployees] = useState([]);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInForm, setCheckInForm] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    check_in_time: '07:30:00'
  });

  const fetchAttendances = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let q = `?date_from=${dateFrom}&date_to=${dateTo}`;
      if (activeSchoolUnit?.id) q += `&school_unit_id=${activeSchoolUnit.id}`;

      const res = await api.get(`/kepegawaian/attendances${q}`);
      if (res.data?.success) {
        setAttendances(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/kepegawaian/employees?per_page=100');
      if (res.data?.success) {
        setEmployees(res.data.data.items || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAttendances();
    fetchEmployees();
  }, [activeSchoolUnit, dateFrom, dateTo]);

  const handleSelfCheckIn = async () => {
    try {
      const res = await api.post('/kepegawaian/attendances/check-in', {});
      if (res.data?.success) {
        setSuccessMsg('Check-In berhasil dicatat!');
        fetchAttendances();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal melakukan check-in');
    }
  };

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/attendances/check-in', {
        ...checkInForm,
        school_unit_id: activeSchoolUnit?.id || 1
      });
      if (res.data?.success) {
        setSuccessMsg('Presensi berhasil dicatat');
        setIsCheckInModalOpen(false);
        fetchAttendances();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mencatat presensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      const res = await api.patch(`/kepegawaian/attendances/${id}/check-out`, {});
      if (res.data?.success) {
        setSuccessMsg('Check-Out berhasil dicatat');
        fetchAttendances();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal check-out');
    }
  };

  const openCorrectModal = (att) => {
    setSelectedAtt(att);
    setCorrectForm({
      status: att.status,
      check_in_time: att.check_in_time || '',
      check_out_time: att.check_out_time || ''
    });
    setIsCorrectModalOpen(true);
  };

  const handleCorrectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.patch(`/kepegawaian/attendances/${selectedAtt.id}`, correctForm);
      if (res.data?.success) {
        setSuccessMsg('Koreksi presensi berhasil disimpan');
        setIsCorrectModalOpen(false);
        fetchAttendances();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan koreksi');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadges = {
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sick: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    permitted: 'bg-amber-50 text-amber-700 border-amber-200',
    absent: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Presensi & Absensi Pegawai</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan jam masuk, pulang, dan status kehadiran harian
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAttendances}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSelfCheckIn}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Check-In Mandiri</span>
          </button>
          <button
            onClick={() => setIsCheckInModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4" />
            <span>Input Presensi Manual</span>
          </button>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="font-semibold text-slate-600">Rentang Tanggal:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          />
        </div>
      </div>

      {/* Table Presensi */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Tanggal</th>
              <th className="p-3.5">Pegawai</th>
              <th className="p-3.5">Jam Masuk</th>
              <th className="p-3.5">Jam Pulang</th>
              <th className="p-3.5">Status Kehadiran</th>
              <th className="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <span>Memuat presensi...</span>
                </td>
              </tr>
            ) : attendances.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  Tidak ada catatan presensi pada rentang tanggal ini
                </td>
              </tr>
            ) : (
              attendances.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-medium text-slate-700">
                    {att.attendance_date.split('T')[0]}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-800">{att.employee_name || `Pegawai #${att.employee_id}`}</div>
                    <div className="text-[10px] text-slate-400">{att.employee_number || ''}</div>
                  </td>
                  <td className="p-3.5 font-mono text-emerald-700 font-semibold">{att.check_in_time || '-'}</td>
                  <td className="p-3.5 font-mono text-rose-700 font-semibold">{att.check_out_time || '-'}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadges[att.status] || 'bg-slate-100'}`}>
                      {att.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!att.check_out_time && att.status === 'present' && (
                        <button
                          onClick={() => handleCheckOut(att.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Check-Out</span>
                        </button>
                      )}
                      <button
                        onClick={() => openCorrectModal(att)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        title="Koreksi Manual"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Koreksi Presensi */}
      {isCorrectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Koreksi Presensi HRD</h3>
              <button onClick={() => setIsCorrectModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCorrectSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Kehadiran</label>
                <select
                  value={correctForm.status}
                  onChange={(e) => setCorrectForm({ ...correctForm, status: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="present">Present (Hadir)</option>
                  <option value="sick">Sick (Sakit)</option>
                  <option value="permitted">Permitted (Izin)</option>
                  <option value="absent">Absent (Alpa / Tanpa Keterangan)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Waktu Masuk (Check-In)</label>
                <input
                  type="text"
                  placeholder="HH:MM:SS"
                  value={correctForm.check_in_time}
                  onChange={(e) => setCorrectForm({ ...correctForm, check_in_time: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Waktu Pulang (Check-Out)</label>
                <input
                  type="text"
                  placeholder="HH:MM:SS"
                  value={correctForm.check_out_time}
                  onChange={(e) => setCorrectForm({ ...correctForm, check_out_time: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCorrectModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan Koreksi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Presensi Manual */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Input Presensi Pegawai</h3>
              <button onClick={() => setIsCheckInModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleManualCheckIn} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Pegawai *</label>
                <select
                  required
                  value={checkInForm.employee_id}
                  onChange={(e) => setCheckInForm({ ...checkInForm, employee_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Pilih Pegawai</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={checkInForm.attendance_date}
                  onChange={(e) => setCheckInForm({ ...checkInForm, attendance_date: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jam Masuk</label>
                <input
                  type="text"
                  value={checkInForm.check_in_time}
                  onChange={(e) => setCheckInForm({ ...checkInForm, check_in_time: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCheckInModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan Presensi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
