import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatDate } from '../../../shared/utils/formatters';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  BookOpen,
  Check,
  Save,
  Clock,
  Sparkles,
  Loader2,
  ChevronRight,
  Filter,
  FileCheck
} from 'lucide-react';

export default function AbsensiKelas() {
  const { activeSchoolUnit, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialScheduleId = searchParams.get('schedule_id');

  const [attendanceMode, setAttendanceMode] = useState('lesson'); // 'lesson' | 'daily'
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(initialScheduleId || '');

  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingNumber, setMeetingNumber] = useState(1);
  const [topicNotes, setTopicNotes] = useState('');

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { student_id: { status: 'present'|'hadir'|..., notes: '' } }
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load Teacher Schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await api.get('/akademik/schedules', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);
        const list = res?.data?.data || [];
        setSchedules(list);
        if (list.length > 0 && !selectedScheduleId) {
          setSelectedScheduleId(String(list[0].id));
          if (list[0].class_group_id) {
            setSelectedClassId(String(list[0].class_group_id));
          }
          if (list[0].subject_name) {
            setSelectedSubject(list[0].subject_name);
          }
        }
      } catch (err) {
        console.warn('Failed to load schedules:', err);
      }
    };
    fetchSchedules();
  }, [activeSchoolUnit]);

  // Handle schedule change
  const handleScheduleChange = (schedId) => {
    setSelectedScheduleId(schedId);
    const found = schedules.find((s) => String(s.id) === String(schedId));
    if (found) {
      if (found.class_group_id) setSelectedClassId(String(found.class_group_id));
      if (found.subject_name) setSelectedSubject(found.subject_name);
    }
  };

  // Load Class Groups (Rombel)
  useEffect(() => {
    const fetchClassGroups = async () => {
      try {
        const res = await api.get('/akademik/curriculum/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);

        const items = res?.data?.data?.items || res?.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setClassGroups(items);
          if (!selectedClassId) setSelectedClassId(String(items[0].id));
        } else {
          // Fallback dummy rombel
          const mockClasses = [
            { id: 1, name: 'Kelas 8A - Ikhwan' },
            { id: 2, name: 'Kelas 8B - Akhwat' },
            { id: 3, name: 'Kelas 7A - Ikhwan' },
            { id: 4, name: 'Kelas 9A - Ikhwan' }
          ];
          setClassGroups(mockClasses);
          if (!selectedClassId) setSelectedClassId('1');
        }
      } catch (err) {
        console.error('Error fetching class groups:', err);
      }
    };
    fetchClassGroups();
  }, [activeSchoolUnit]);

  // Load Students in Selected Class
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/akademik/curriculum/class-groups/${selectedClassId}/members`).catch(() => null);
        const list = res?.data?.data?.members || res?.data?.data || [];
        
        let loadedStudents = [];
        if (Array.isArray(list) && list.length > 0) {
          loadedStudents = list.map((m) => ({
            id: m.student_id || m.id,
            nis: m.nis || '202600' + m.id,
            full_name: m.student_name || m.full_name || 'Santri Aldepos',
            gender: m.gender || 'L'
          }));
        } else {
          // Fallback dummy roster
          loadedStudents = [
            { id: 101, nis: '260801', full_name: 'Abdullah Azzam Pratama', gender: 'L' },
            { id: 102, nis: '260802', full_name: 'Muhammad Farhan Al-Fatih', gender: 'L' },
            { id: 103, nis: '260803', full_name: 'Zaidan Zulfiqar Rahman', gender: 'L' },
            { id: 104, nis: '260804', full_name: 'Hamzah Ibnu Abdul Aziz', gender: 'L' },
            { id: 105, nis: '260805', full_name: 'Fatih Al-Ayyubi', gender: 'L' },
            { id: 106, nis: '260806', full_name: 'Bilal Ahmad Ramadhan', gender: 'L' },
            { id: 107, nis: '260807', full_name: 'Thariq Bin Ziyad', gender: 'L' },
            { id: 108, nis: '260808', full_name: 'Umar Khalid Al-Baqir', gender: 'L' }
          ];
        }

        setStudents(loadedStudents);

        // Inisialisasi default semua Hadir
        const initialMap = {};
        loadedStudents.forEach((s) => {
          initialMap[s.id] = { status: attendanceMode === 'lesson' ? 'present' : 'hadir', notes: '' };
        });
        setAttendanceMap(initialMap);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClassId, attendanceMode]);

  // Set Status Satuan Siswa
  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  // Set Catatan Siswa
  const handleNoteChange = (studentId, notes) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  // Batch: Tandai Semua Hadir
  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => {
      const nextMap = { ...prev };
      const presentKey = attendanceMode === 'lesson' ? 'present' : 'hadir';
      students.forEach((s) => {
        nextMap[s.id] = { ...nextMap[s.id], status: presentKey };
      });
      return nextMap;
    });
  };

  // Simpan Presensi ke Backend
  const handleSaveAttendance = async () => {
    if (!selectedClassId || students.length === 0) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      if (attendanceMode === 'lesson') {
        const payload = {
          subject_schedule_id: Number(selectedScheduleId) || 1,
          class_group_id: Number(selectedClassId),
          date: meetingDate,
          attendances: students.map((s) => {
            let st = attendanceMap[s.id]?.status || 'present';
            if (st === 'hadir') st = 'present';
            if (st === 'izin') st = 'permitted';
            if (st === 'sakit') st = 'sick';
            if (st === 'alpa') st = 'absent';
            return {
              student_id: s.id,
              status: st,
              notes: attendanceMap[s.id]?.notes || null,
              input_method: 'manual'
            };
          })
        };

        const res = await api.post('/akademik/lesson-attendances/bulk', payload);
        setFeedback({
          type: 'success',
          message: res.data?.message || `Presensi jam pelajaran ${selectedSubject || ''} berhasil disimpan (${students.length} santri tercatat).`
        });
      } else {
        const items = students.map((s) => {
          let st = attendanceMap[s.id]?.status || 'hadir';
          if (st === 'present') st = 'hadir';
          if (st === 'permitted') st = 'izin';
          if (st === 'sick') st = 'sakit';
          if (st === 'absent') st = 'alpa';
          return {
            student_id: s.id,
            status: st,
            notes: attendanceMap[s.id]?.notes || null
          };
        });

        const payload = {
          class_group_id: selectedClassId,
          attendance_date: meetingDate,
          satuan_pendidikan_id: activeSchoolUnit?.id,
          items
        };

        const res = await api.post('/akademik/attendances/bulk', payload);
        if (res.data?.success || res.status === 200 || res.status === 201) {
          setFeedback({
            type: 'success',
            message: `Presensi Harian berhasil disimpan (${students.length} santri tercatat).`
          });
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal menyimpan presensi. Silakan periksa kembali.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Perhitungan Rekap Status
  const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  Object.values(attendanceMap).forEach((val) => {
    if (counts[val.status] !== undefined) counts[val.status]++;
  });
  const attendanceRate = students.length > 0 ? Math.round((counts.hadir / students.length) * 100) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Form Presensi */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Absensi Pertemuan Belajar (Kelas)</h1>
            <p className="text-xs text-slate-400">
              Pencatatan presensi siswa dan jurnal materi sesi tatap muka KBM
            </p>
          </div>
        </div>

        {/* Counter Ringkasan Cepat */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-[10px] text-emerald-400 font-bold block">Hadir</span>
            <span className="text-sm font-extrabold text-emerald-300">{counts.hadir}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
            <span className="text-[10px] text-blue-400 font-bold block">Izin</span>
            <span className="text-sm font-extrabold text-blue-300">{counts.izin}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="text-[10px] text-amber-400 font-bold block">Sakit</span>
            <span className="text-sm font-extrabold text-amber-300">{counts.sakit}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <span className="text-[10px] text-rose-400 font-bold block">Alpa</span>
            <span className="text-sm font-extrabold text-rose-300">{counts.alpa}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Form Konfigurasi Sesi Pertemuan */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
        
        {/* Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Tipe Pencatatan:</span>
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setAttendanceMode('lesson')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  attendanceMode === 'lesson'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Per Jam Pelajaran
              </button>
              <button
                type="button"
                onClick={() => setAttendanceMode('daily')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  attendanceMode === 'daily'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Presensi Harian Rombel
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            {attendanceMode === 'lesson'
              ? 'Tersimpan ke lesson_attendances (rekap mata pelajaran & rapor)'
              : 'Tersimpan ke student_attendances (presensi harian sekolah)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {attendanceMode === 'lesson' && schedules.length > 0 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jadwal Mengajar (Jam Pelajaran) *</label>
              <select
                value={selectedScheduleId}
                onChange={(e) => handleScheduleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-amber-300 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.day_of_week || 'Hari ini'} {s.start_time?.slice(0, 5) || '07:30'} - {s.end_time?.slice(0, 5) || '09:00'}] {s.subject_name || 'Mapel'} - {s.class_group_name || 'Rombel'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Rombongan Belajar (Kelas)</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
            <input
              type="text"
              value={selectedSubject || 'Matematika Terapan'}
              onChange={(e) => setSelectedSubject(e.target.value)}
              placeholder="Mata Pelajaran..."
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Pertemuan</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pertemuan Ke-</label>
            <input
              type="number"
              min="1"
              max="50"
              value={meetingNumber}
              onChange={(e) => setMeetingNumber(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

        </div>

        {/* Input Materi Pembahasan */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Topik / Materi Pembahasan Hari Ini
          </label>
          <input
            type="text"
            value={topicNotes}
            onChange={(e) => setTopicNotes(e.target.value)}
            placeholder="Contoh: Bab 3 - Persamaan Linear Dua Variabel & Latihan Soal Mandiri"
            className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Tabel Roster Siswa & Toggle Presensi */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Daftar Presensi Santri</span>
              <span className="text-xs font-normal text-slate-400">({students.length} Siswa Terdaftar)</span>
            </h2>
            <p className="text-xs text-slate-400">Tingkat Kehadiran: <strong className="text-emerald-400">{attendanceRate}%</strong></p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tandai Semua Hadir</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Presensi</span>
            </button>
          </div>
        </div>

        {/* Roster Santri: Dual Layout */}
        {/* Mobile Card Stack (md:hidden) */}
        <div className="block md:hidden space-y-3">
          {students.map((st, idx) => {
            const currentStatus = attendanceMap[st.id]?.status || 'hadir';
            return (
              <div
                key={st.id}
                className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{st.full_name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        NIS: {st.nis} • {st.gender === 'L' ? 'Ikhwan' : 'Akhwat'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Touch Target Status Chips: Min 44px height */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'hadir')}
                    className={`min-h-[44px] rounded-xl font-extrabold text-xs flex flex-col items-center justify-center transition active:scale-95 ${
                      currentStatus === 'hadir'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 border border-emerald-500 ring-2 ring-emerald-400/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="text-xs">Hadir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'izin')}
                    className={`min-h-[44px] rounded-xl font-extrabold text-xs flex flex-col items-center justify-center transition active:scale-95 ${
                      currentStatus === 'izin'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 border border-blue-500 ring-2 ring-blue-400/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="text-xs">Izin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'sakit')}
                    className={`min-h-[44px] rounded-xl font-extrabold text-xs flex flex-col items-center justify-center transition active:scale-95 ${
                      currentStatus === 'sakit'
                        ? 'bg-amber-600 text-slate-950 shadow-md shadow-amber-900/30 border border-amber-500 ring-2 ring-amber-400/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="text-xs">Sakit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(st.id, 'alpa')}
                    className={`min-h-[44px] rounded-xl font-extrabold text-xs flex flex-col items-center justify-center transition active:scale-95 ${
                      currentStatus === 'alpa'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30 border border-rose-500 ring-2 ring-rose-400/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="text-xs">Alpa</span>
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    value={attendanceMap[st.id]?.notes || ''}
                    onChange={(e) => handleNoteChange(st.id, e.target.value)}
                    placeholder="Catatan presensi (opsional)..."
                    className="w-full px-3 py-2.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block table-container">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 w-12 text-center rounded-l-xl">No</th>
                <th className="py-3 px-3">NIS</th>
                <th className="py-3 px-3">Nama Santri</th>
                <th className="py-3 px-3 text-center w-60">Status Kehadiran</th>
                <th className="py-3 px-3 rounded-r-xl">Keterangan Khusus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {students.map((st, idx) => {
                const currentStatus = attendanceMap[st.id]?.status || 'hadir';
                return (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{st.nis}</td>
                    <td className="py-3 px-3 font-bold text-white">
                      {st.full_name}
                      <span className="text-[10px] text-slate-500 ml-1.5">({st.gender === 'L' ? 'Ikhwan' : 'Akhwat'})</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'hadir')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            currentStatus === 'hadir'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'izin')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            currentStatus === 'izin'
                              ? 'bg-blue-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'sakit')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            currentStatus === 'sakit'
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'alpa')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            currentStatus === 'alpa'
                              ? 'bg-rose-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          A
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={attendanceMap[st.id]?.notes || ''}
                        onChange={(e) => handleNoteChange(st.id, e.target.value)}
                        placeholder="Catatan..."
                        className="w-full px-2.5 py-1 text-xs bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Tombol Simpan */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Pastikan data presensi santri sudah akurat sebelum disimpan ke database akademik.
          </p>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Presensi Pertemuan</span>
          </button>
        </div>

      </div>

    </div>
  );
}
