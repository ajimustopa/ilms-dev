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
  RotateCw,
  BookOpen,
  Sparkles,
  Award,
  Activity,
  Layers
} from 'lucide-react';

export default function Presensi() {
  const [activeSubTab, setActiveSubTab] = useState('daily'); // 'daily' | 'lesson' | 'activity' | 'leaves'
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Daily attendance state
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 2. Lesson attendance state
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [lessonStatusMap, setLessonStatusMap] = useState({});
  const [lessonNotesMap, setLessonNotesMap] = useState({});
  const [lessonSummary, setLessonSummary] = useState(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  // 3. Activity attendance state
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [activityType, setActivityType] = useState('ekskul'); // 'ekskul' | 'acara_sekolah' | 'lainnya'
  const [activityRefId, setActivityRefId] = useState('');
  const [activityName, setActivityName] = useState('Pramuka Penggalang');
  const [activityStatusMap, setActivityStatusMap] = useState({});
  const [activityNotesMap, setActivityNotesMap] = useState({});
  const [activitySummary, setActivitySummary] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // 4. Leave requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchExtracurriculars();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSchedules(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (activeSubTab === 'daily' && selectedClassId) {
      fetchClassStudentsAndAttendance();
    } else if (activeSubTab === 'lesson' && selectedClassId) {
      fetchLessonAttendance();
    } else if (activeSubTab === 'activity') {
      fetchActivityAttendance();
    } else if (activeSubTab === 'leaves') {
      fetchLeaveRequests();
    }
  }, [selectedClassId, selectedScheduleId, attendanceDate, activeSubTab, activityType, activityRefId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/akademik/class-groups');
      const cls = res.data?.data || [];
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) setSelectedClassId(String(cls[0].id));
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchExtracurriculars = async () => {
    try {
      const res = await api.get('/akademik/extracurriculars').catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setExtracurriculars(list);
      if (list.length > 0) {
        setActivityRefId(String(list[0].id));
        setActivityName(list[0].name);
      }
    } catch (err) {
      console.warn('Error fetching extracurriculars:', err);
    }
  };

  const fetchSchedules = async (classId) => {
    try {
      const res = await api.get('/akademik/schedules', { params: { class_group_id: classId } }).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setSchedules(list);
      if (list.length > 0) {
        setSelectedScheduleId(String(list[0].id));
      } else {
        setSelectedScheduleId('');
      }
    } catch (err) {
      console.warn('Error fetching schedules:', err);
    }
  };

  // 1. Daily
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
        sMap[s.student_id] = 'hadir';
      }
      for (const a of attList) {
        sMap[a.student_id] = a.status;
        if (a.notes) nMap[a.student_id] = a.notes;
      }
      setStatusMap(sMap);
      setNotesMap(nMap);
    } catch (err) {
      console.error('Error fetching daily attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lesson
  const fetchLessonAttendance = async () => {
    try {
      setLessonLoading(true);
      const [stuRes, lessonRes, sumRes] = await Promise.all([
        api.get(`/akademik/enrollments?class_group_id=${selectedClassId}`),
        api.get(`/akademik/lesson-attendances`, {
          params: {
            class_group_id: selectedClassId,
            subject_schedule_id: selectedScheduleId || undefined,
            date: attendanceDate
          }
        }),
        api.get(`/akademik/lesson-attendances/summary`, {
          params: {
            class_group_id: selectedClassId,
            subject_schedule_id: selectedScheduleId || undefined,
            date: attendanceDate
          }
        })
      ]);

      const stuList = stuRes.data?.data || [];
      const attList = lessonRes.data?.data || [];
      setStudents(stuList);
      setLessonSummary(sumRes.data?.data || null);

      const sMap = {};
      const nMap = {};
      for (const s of stuList) {
        sMap[s.student_id] = 'present';
      }
      for (const a of attList) {
        sMap[a.student_id] = a.status;
        if (a.notes) nMap[a.student_id] = a.notes;
      }
      setLessonStatusMap(sMap);
      setLessonNotesMap(nMap);
    } catch (err) {
      console.error('Error fetching lesson attendances:', err);
    } finally {
      setLessonLoading(false);
    }
  };

  // 3. Activity
  const fetchActivityAttendance = async () => {
    try {
      setActivityLoading(true);
      const [stuRes, actRes, sumRes] = await Promise.all([
        api.get(`/akademik/enrollments?class_group_id=${selectedClassId}`),
        api.get(`/akademik/activity-attendances`, {
          params: {
            activity_type: activityType,
            activity_ref_id: activityType === 'ekskul' ? activityRefId : undefined,
            date: attendanceDate
          }
        }),
        api.get(`/akademik/activity-attendances/summary`, {
          params: {
            activity_type: activityType,
            activity_ref_id: activityType === 'ekskul' ? activityRefId : undefined,
            date: attendanceDate
          }
        })
      ]);

      const stuList = stuRes.data?.data || [];
      const attList = actRes.data?.data || [];
      setStudents(stuList);
      setActivitySummary(sumRes.data?.data || null);

      const sMap = {};
      const nMap = {};
      for (const s of stuList) {
        sMap[s.student_id] = 'present';
      }
      for (const a of attList) {
        sMap[a.student_id] = a.status;
        if (a.notes) nMap[a.student_id] = a.notes;
      }
      setActivityStatusMap(sMap);
      setActivityNotesMap(nMap);
    } catch (err) {
      console.error('Error fetching activity attendances:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // 4. Leaves
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

      setSuccessMsg('Presensi harian siswa berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi harian.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLessonAttendance = async (e) => {
    e.preventDefault();
    if (!selectedScheduleId) {
      setErrorMsg('Pilih jam pelajaran / jadwal mengajar terlebih dahulu.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const attendances = Object.keys(lessonStatusMap).map(sid => ({
        student_id: Number(sid),
        status: lessonStatusMap[sid],
        notes: lessonNotesMap[sid] || null,
        input_method: 'manual'
      }));

      const res = await api.post('/akademik/lesson-attendances/bulk', {
        subject_schedule_id: Number(selectedScheduleId),
        class_group_id: Number(selectedClassId),
        date: attendanceDate,
        attendances
      });

      setSuccessMsg(res.data?.message || 'Presensi per jam pelajaran berhasil disimpan!');
      fetchLessonAttendance();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi pelajaran.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivityAttendance = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const attendances = Object.keys(activityStatusMap).map(sid => ({
        student_id: Number(sid),
        status: activityStatusMap[sid],
        notes: activityNotesMap[sid] || null,
        input_method: 'manual'
      }));

      const res = await api.post('/akademik/activity-attendances/bulk', {
        activity_type: activityType,
        activity_ref_id: activityType === 'ekskul' && activityRefId ? Number(activityRefId) : null,
        activity_name: activityName,
        date: attendanceDate,
        attendances
      });

      setSuccessMsg(res.data?.message || 'Presensi kegiatan berhasil disimpan!');
      fetchActivityAttendance();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan presensi kegiatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveLeave = async (id, status) => {
    try {
      await api.put(`/akademik/leave-requests/${id}/approve`, { approval_status: status });
      setSuccessMsg(`Status pengajuan izin berhasil diubah menjadi ${status}`);
      fetchLeaveRequests();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Gagal memproses izin: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>Presensi & Absensi Siswa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola presensi harian, presensi per jam pelajaran, presensi kegiatan ekskul/acara, dan permohonan izin santri.
          </p>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('daily')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeSubTab === 'daily' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presensi Harian
          </button>
          <button
            onClick={() => setActiveSubTab('lesson')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeSubTab === 'lesson' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presensi Pelajaran
          </button>
          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeSubTab === 'activity' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Presensi Kegiatan
          </button>
          <button
            onClick={() => setActiveSubTab('leaves')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeSubTab === 'leaves' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengajuan Izin
          </button>
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
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. PRESENSI HARIAN */}
      {/* ======================================================== */}
      {activeSubTab === 'daily' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rombel:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <form onSubmit={handleSaveAttendance}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-bold text-slate-800">
                    Form Absensi Harian ({students.length} Siswa)
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Presensi Harian</span>
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
                            <div className="flex items-center gap-3">
                              {['hadir', 'izin', 'sakit', 'alpa'].map(st => (
                                <label key={st} className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`status_${s.student_id}`}
                                    value={st}
                                    checked={statusMap[s.student_id] === st}
                                    onChange={() => setStatusMap({ ...statusMap, [s.student_id]: st })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className={`text-[11px] font-semibold uppercase ${
                                    st === 'hadir' ? 'text-emerald-700' :
                                    st === 'izin' ? 'text-indigo-700' :
                                    st === 'sakit' ? 'text-amber-700' : 'text-rose-700'
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
                              onChange={(e) => setNotesMap({ ...notesMap, [s.student_id]: e.target.value })}
                              placeholder="Catatan tambahan..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

      {/* ======================================================== */}
      {/* 2. PRESENSI PER JAM PELAJARAN (LESSON ATTENDANCE) */}
      {/* ======================================================== */}
      {activeSubTab === 'lesson' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rombel:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Jadwal Pelajaran (Jam KBM) *</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {schedules.length === 0 ? (
                  <option value="">(Tidak ada jadwal terdaftar pada rombel ini)</option>
                ) : (
                  schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.day_of_week || 'Hari'} {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}] {s.subject_name || 'Mapel'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tanggal KBM:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Metric Summary */}
          {lessonSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 block">Total Santri</span>
                <span className="text-lg font-bold text-slate-800">{lessonSummary.total}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 block">Hadir (Present)</span>
                <span className="text-lg font-bold text-emerald-800">{lessonSummary.present}</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <span className="text-[10px] font-bold text-indigo-600 block">Izin (Permitted)</span>
                <span className="text-lg font-bold text-indigo-800">{lessonSummary.permitted}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-600 block">Sakit (Sick)</span>
                <span className="text-lg font-bold text-amber-800">{lessonSummary.sick}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] font-bold text-rose-600 block">Alpa (Absent)</span>
                <span className="text-lg font-bold text-rose-800">{lessonSummary.absent}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 block">Persentase</span>
                <span className="text-lg font-bold text-emerald-800">{lessonSummary.attendance_rate}%</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveLessonAttendance}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-bold text-slate-800">
                    Presensi Jam Pelajaran ({students.length} Santri)
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Presensi Jam Pelajaran</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Status KBM</th>
                      <th className="py-3 px-4">Catatan / Jurnal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lessonLoading ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Memuat presensi jam pelajaran...</td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Belum ada siswa di rombel ini.</td></tr>
                    ) : (
                      students.map(s => (
                        <tr key={s.student_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">{s.nis}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{s.student_name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {[
                                { key: 'present', label: 'Hadir', col: 'text-emerald-700' },
                                { key: 'sick', label: 'Sakit', col: 'text-amber-700' },
                                { key: 'permitted', label: 'Izin', col: 'text-indigo-700' },
                                { key: 'absent', label: 'Alpa', col: 'text-rose-700' },
                                { key: 'late', label: 'Terlambat', col: 'text-indigo-700' }
                              ].map(st => (
                                <label key={st.key} className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`lesson_status_${s.student_id}`}
                                    value={st.key}
                                    checked={lessonStatusMap[s.student_id] === st.key}
                                    onChange={() => setLessonStatusMap({ ...lessonStatusMap, [s.student_id]: st.key })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className={`text-[11px] font-semibold ${st.col}`}>
                                    {st.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={lessonNotesMap[s.student_id] || ''}
                              onChange={(e) => setLessonNotesMap({ ...lessonNotesMap, [s.student_id]: e.target.value })}
                              placeholder="Catatan keaktifan / KBM..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

      {/* ======================================================== */}
      {/* 3. PRESENSI KEGIATAN (EKSKUL / ACARA SEKOLAH) */}
      {/* ======================================================== */}
      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rombel Santri:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tipe Kegiatan:</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ekskul">Ekstrakurikuler</option>
                <option value="acara_sekolah">Acara / Tabligh / PHBI</option>
                <option value="lainnya">Kegiatan Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Kegiatan *</label>
              {activityType === 'ekskul' ? (
                <select
                  value={activityRefId}
                  onChange={(e) => {
                    setActivityRefId(e.target.value);
                    const found = extracurriculars.find(x => String(x.id) === String(e.target.value));
                    if (found) setActivityName(found.name);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {extracurriculars.map(x => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Nama acara sekolah..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tanggal Kegiatan:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Activity Metric Summary */}
          {activitySummary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 block">Total Santri</span>
                <span className="text-lg font-bold text-slate-800">{activitySummary.total}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 block">Hadir (Present)</span>
                <span className="text-lg font-bold text-emerald-800">{activitySummary.present}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] font-bold text-rose-600 block">Tidak Hadir (Absent)</span>
                <span className="text-lg font-bold text-rose-800">{activitySummary.absent}</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <span className="text-[10px] font-bold text-indigo-600 block">Dispensasi (Excused)</span>
                <span className="text-lg font-bold text-indigo-800">{activitySummary.excused}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-600 block">Tingkat Kehadiran</span>
                <span className="text-lg font-bold text-emerald-800">{activitySummary.attendance_rate}%</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveActivityAttendance}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-bold text-slate-800">
                    Presensi Kegiatan: {activityName} ({students.length} Santri)
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Presensi Kegiatan</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="py-3 px-4">NIS</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Status Kegiatan</th>
                      <th className="py-3 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLoading ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Memuat presensi kegiatan...</td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-400">Belum ada siswa di rombel ini.</td></tr>
                    ) : (
                      students.map(s => (
                        <tr key={s.student_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">{s.nis}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{s.student_name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {[
                                { key: 'present', label: 'Hadir', col: 'text-emerald-700' },
                                { key: 'absent', label: 'Tidak Hadir', col: 'text-rose-700' },
                                { key: 'excused', label: 'Dispensasi', col: 'text-indigo-700' }
                              ].map(st => (
                                <label key={st.key} className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`act_status_${s.student_id}`}
                                    value={st.key}
                                    checked={activityStatusMap[s.student_id] === st.key}
                                    onChange={() => setActivityStatusMap({ ...activityStatusMap, [s.student_id]: st.key })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className={`text-[11px] font-semibold ${st.col}`}>
                                    {st.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={activityNotesMap[s.student_id] || ''}
                              onChange={(e) => setActivityNotesMap({ ...activityNotesMap, [s.student_id]: e.target.value })}
                              placeholder="Catatan keikutsertaan..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

      {/* ======================================================== */}
      {/* 4. PENGAJUAN IZIN */}
      {/* ======================================================== */}
      {activeSubTab === 'leaves' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                          l.leave_type === 'sakit' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{l.reason || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          l.approval_status === 'disetujui' ? 'bg-emerald-100 text-emerald-700' :
                          l.approval_status === 'ditolak' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
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
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs"
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
