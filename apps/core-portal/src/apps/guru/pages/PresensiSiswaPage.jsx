import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Search,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  FileText,
  FileCheck2,
  Check,
  ChevronDown
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { journalService } from '../services/journalService';
import { scoreService } from '../services/scoreService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField, { Input, Select, Textarea } from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';

export default function PresensiSiswaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { activeContext } = useTeacherContext();

  // Konfigurasi Tanggal & Sesi
  const initialScheduleId = searchParams.get('schedule_id') || searchParams.get('id') || '';
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(initialScheduleId);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState('');

  // Data Siswa & Presensi
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: { status: 'present'|'permitted'|'sick'|'absent'|'late', notes: '' } }
  const [isExistingAttendance, setIsExistingAttendance] = useState(false);

  // Data Jurnal Mengajar
  const [existingJournalId, setExistingJournalId] = useState(null);
  const [journalData, setJournalData] = useState({
    meeting_number: 1,
    learning_objective_id: '',
    topic_material: '',
    general_notes: ''
  });
  const [availableTPs, setAvailableTPs] = useState([]);
  const [isLoadingTPs, setIsLoadingTPs] = useState(false);

  // UI State
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingJournal, setIsLoadingJournal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [activeNotesStudentId, setActiveNotesStudentId] = useState(null);

  // 1. Ambil daftar jadwal guru
  const loadSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    try {
      const res = await scheduleService.getMySchedules({
        satuan_pendidikan_id: activeContext?.satuanPendidikanId,
        academic_year_id: activeContext?.academicYearId
      });
      const data = res?.data || res || {};
      const scheduleList = data.schedules || (Array.isArray(data) ? data : []);
      setSchedules(scheduleList);

      // Auto-select schedule jika belum terpilih
      if (!selectedScheduleId && scheduleList.length > 0) {
        setSelectedScheduleId(String(scheduleList[0].id));
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [activeContext?.satuanPendidikanId, activeContext?.academicYearId, selectedScheduleId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Cari objek jadwal yang sedang dipilih
  const currentSchedule = useMemo(() => {
    return schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [schedules, selectedScheduleId]);

  // Tentukan class_group_id aktif
  useEffect(() => {
    if (currentSchedule) {
      let cgId = '';
      if (currentSchedule.class_groups && currentSchedule.class_groups.length > 0) {
        cgId = String(currentSchedule.class_groups[0].id);
      } else if (currentSchedule.class_group_id) {
        cgId = String(currentSchedule.class_group_id);
      }
      setSelectedClassGroupId(cgId);
    }
  }, [currentSchedule]);

  // Draft Cache Key
  const draftKey = `aldepos_draft_att_${selectedScheduleId}_${selectedClassGroupId}_${selectedDate}`;

  // 2. Ambil data santri di rombel & presensi eksis pada tanggal tersebut
  const loadClassMembersAndAttendance = useCallback(async () => {
    if (!selectedClassGroupId || !selectedScheduleId || !selectedDate) {
      setStudents([]);
      return;
    }

    setIsLoadingStudents(true);
    setFetchError(null);

    try {
      // 1. Ambil anggota rombel
      const membersRes = await attendanceService.getClassGroupMembers(selectedClassGroupId);
      const membersData = membersRes?.data || membersRes || [];
      const memberList = Array.isArray(membersData) ? membersData : (membersData.members || []);

      // 2. Ambil data presensi yang sudah tersimpan untuk sesi & tanggal ini
      const attRes = await attendanceService.getLessonAttendances({
        subject_schedule_id: selectedScheduleId,
        class_group_id: selectedClassGroupId,
        date: selectedDate
      }).catch(() => null);

      const existingAtt = attRes?.data || attRes || [];
      const existingList = Array.isArray(existingAtt) ? existingAtt : (existingAtt.items || []);

      const newAttMap = {};
      let hasSaved = false;

      if (existingList.length > 0) {
        hasSaved = true;
        existingList.forEach((a) => {
          newAttMap[a.student_id] = {
            status: a.status || 'present',
            notes: a.notes || ''
          };
        });
      }

      // Cek apakah ada draft yang belum tersimpan di sessionStorage (jika belum tersimpan di DB)
      let savedDraft = null;
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (raw) savedDraft = JSON.parse(raw);
      } catch {}

      // Inisialisasi setiap siswa
      memberList.forEach((m) => {
        const sId = m.student_id || m.id;
        if (!newAttMap[sId]) {
          if (savedDraft && savedDraft[sId]) {
            newAttMap[sId] = savedDraft[sId];
          } else {
            newAttMap[sId] = {
              status: 'present', // Default semua hadir
              notes: ''
            };
          }
        }
      });

      setStudents(memberList);
      setAttendanceMap(newAttMap);
      setIsExistingAttendance(hasSaved);
    } catch (err) {
      console.error('Error loading class attendance data:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat daftar siswa rombel.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassGroupId, selectedScheduleId, selectedDate, draftKey]);

  useEffect(() => {
    loadClassMembersAndAttendance();
  }, [loadClassMembersAndAttendance]);

  // 3. Ambil Tujuan Pembelajaran (TP) untuk mapel jadwal aktif
  useEffect(() => {
    const fetchTPs = async () => {
      if (!currentSchedule?.subject_id) {
        setAvailableTPs([]);
        return;
      }
      setIsLoadingTPs(true);
      try {
        const params = {
          satuan_pendidikan_id: currentSchedule.satuan_pendidikan_id || activeContext?.satuanPendidikanId,
          academic_year_id: currentSchedule.academic_year_id || activeContext?.academicYearId,
          subject_id: currentSchedule.subject_id
        };
        const res = await scoreService.getLearningObjectives(params);
        const data = res?.data || res || [];
        const list = Array.isArray(data) ? data : (data.items || []);
        setAvailableTPs(list.filter(t => t.is_active));
      } catch (e) {
        console.error('Error fetching TPs for subject:', e);
      } finally {
        setIsLoadingTPs(false);
      }
    };
    fetchTPs();
  }, [currentSchedule, activeContext]);

  // 4. Ambil Jurnal Mengajar yang sudah tersimpan untuk jadwal & tanggal ini
  const loadExistingJournal = useCallback(async () => {
    if (!selectedScheduleId || !selectedDate) {
      setExistingJournalId(null);
      return;
    }
    setIsLoadingJournal(true);
    try {
      const res = await journalService.getMyJournals({
        schedule_id: selectedScheduleId,
        date: selectedDate
      }).catch(() => null);

      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      const matchJournal = list.find(j => String(j.schedule_id) === String(selectedScheduleId) && (j.teaching_date === selectedDate || j.date === selectedDate)) || (list.length > 0 ? list[0] : null);

      if (matchJournal) {
        setExistingJournalId(matchJournal.id);
        setJournalData({
          meeting_number: matchJournal.meeting_number || 1,
          learning_objective_id: matchJournal.learning_objective_id ? String(matchJournal.learning_objective_id) : '',
          topic_material: matchJournal.topic_material || '',
          general_notes: matchJournal.general_notes || ''
        });
      } else {
        setExistingJournalId(null);
        setJournalData((prev) => ({
          ...prev,
          meeting_number: prev.meeting_number || 1,
          topic_material: prev.topic_material || '',
          learning_objective_id: '',
          general_notes: ''
        }));
      }
    } catch (err) {
      console.error('Error loading existing journal:', err);
    } finally {
      setIsLoadingJournal(false);
    }
  }, [selectedScheduleId, selectedDate]);

  useEffect(() => {
    loadExistingJournal();
  }, [loadExistingJournal]);

  // Handle pilih TP untuk auto-fill topik materi
  const handleSelectTP = (tpId) => {
    if (!tpId) {
      setJournalData((prev) => ({
        ...prev,
        learning_objective_id: ''
      }));
      return;
    }
    const selectedTp = availableTPs.find(t => String(t.id) === String(tpId));
    if (selectedTp) {
      setJournalData((prev) => ({
        ...prev,
        learning_objective_id: String(selectedTp.id),
        topic_material: selectedTp.scope_material
          ? `${selectedTp.code} - ${selectedTp.scope_material}`
          : `${selectedTp.code} - ${selectedTp.description.slice(0, 100)}`
      }));
    }
  };

  // Ubah status presensi per siswa
  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => {
      const updated = {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          status
        }
      };
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Ubah catatan per siswa
  const handleNotesChange = (studentId, notes) => {
    setAttendanceMap((prev) => {
      const updated = {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          notes
        }
      };
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Aksi Cepat: Tandai Semua Hadir
  const handleMarkAllPresent = () => {
    setAttendanceMap((prev) => {
      const updated = {};
      students.forEach((s) => {
        const sId = s.student_id || s.id;
        updated[sId] = {
          ...(prev[sId] || {}),
          status: 'present'
        };
      });
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Simpan Terpadu: Presensi Siswa & Jurnal Mengajar
  const handleSaveAll = async () => {
    if (!selectedScheduleId || !selectedClassGroupId || !selectedDate) {
      setToast({
        type: 'error',
        title: 'Data Tidak Lengkap',
        message: 'Pastikan jadwal, rombel, dan tanggal telah dipilih.'
      });
      return;
    }

    if (students.length === 0) {
      setToast({
        type: 'error',
        title: 'Tidak Ada Siswa',
        message: 'Rombel ini belum memiliki santri terdaftar.'
      });
      return;
    }

    if (!journalData.topic_material.trim()) {
      setToast({
        type: 'error',
        title: 'Materi Jurnal Wajib Diisi',
        message: 'Silakan pilih Tujuan Pembelajaran (TP) atau tuliskan topik materi yang diajarkan pada sesi ini.'
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Simpan Presensi Siswa
      const attendances = students.map((s) => {
        const sId = s.student_id || s.id;
        const record = attendanceMap[sId] || { status: 'present', notes: '' };
        return {
          student_id: sId,
          status: record.status || 'present',
          notes: record.notes ? record.notes.trim() : null
        };
      });

      const attendancePayload = {
        subject_schedule_id: Number(selectedScheduleId),
        class_group_id: Number(selectedClassGroupId),
        date: selectedDate,
        attendances
      };

      await attendanceService.saveLessonAttendanceBulk(attendancePayload);

      // 2. Simpan Jurnal Mengajar
      const journalPayload = {
        schedule_id: Number(selectedScheduleId),
        teaching_date: selectedDate,
        meeting_number: parseInt(journalData.meeting_number, 10) || 1,
        topic_material: journalData.topic_material.trim(),
        learning_objective_id: journalData.learning_objective_id ? Number(journalData.learning_objective_id) : null,
        general_notes: journalData.general_notes ? journalData.general_notes.trim() : null
      };

      if (existingJournalId) {
        await journalService.updateJournal(existingJournalId, journalPayload);
      } else {
        const createdJ = await journalService.createJournal(journalPayload);
        if (createdJ?.data?.id || createdJ?.id) {
          setExistingJournalId(createdJ?.data?.id || createdJ?.id);
        }
      }

      // Hapus draft sessionStorage setelah sukses
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}

      setIsExistingAttendance(true);
      setToast({
        type: 'success',
        title: 'Presensi & Jurnal Berhasil Disimpan',
        message: `Presensi ${attendances.length} siswa dan Jurnal KBM Pertemuan ke-${journalData.meeting_number} berhasil disimpan.`
      });
    } catch (err) {
      console.error('Error saving attendance and journal:', err);
      setToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.response?.data?.message || err.message || 'Koneksi gagal. Isian Anda tersimpan sementara di perangkat.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Hitung Ringkasan Presensi (Real-Time)
  const counts = useMemo(() => {
    let present = 0;
    let permitted = 0;
    let sick = 0;
    let absent = 0;

    students.forEach((s) => {
      const sId = s.student_id || s.id;
      const st = attendanceMap[sId]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'permitted') permitted++;
      else if (st === 'sick') sick++;
      else if (st === 'absent') absent++;
    });

    return { present, permitted, sick, absent, total: students.length };
  }, [students, attendanceMap]);

  // Filter Siswa Berdasarkan Pencarian
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const name = (s.student_name || s.full_name || s.name || '').toLowerCase();
      const nis = (s.nis || s.nisn || '').toLowerCase();
      return name.includes(q) || nis.includes(q);
    });
  }, [students, searchQuery]);

  // Rombel Display Name
  const classGroupName = currentSchedule?.class_group_name ||
    (currentSchedule?.class_groups && currentSchedule.class_groups.map(c => c.name).join(', ')) ||
    'Rombel Belajar';

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Presensi & Jurnal KBM"
        subtitle="Pencatatan kehadiran santri dan jurnal materi pengajaran per sesi KBM."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={FileText}
              onClick={() => navigate('/guru/jurnal')}
              className="hidden sm:inline-flex text-xs"
            >
              Riwayat Jurnal
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={isSaving}
              disabled={students.length === 0}
              onClick={handleSaveAll}
              className="shrink-0"
            >
              Simpan Presensi & Jurnal
            </Button>
          </div>
        }
      />

      {/* Bar Pemilih Jadwal & Tanggal */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SelectorKonteks />

          {/* Pemilih Tanggal */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-slate-800 border border-slate-700 rounded-lg text-slate-200">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Pilih Tanggal Presensi KBM"
                className="bg-transparent text-xs font-semibold focus:outline-none text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Dropdown Pilihan Sesi Jadwal Mengajar */}
        <div className="pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 mb-1 block">
            Pilih Sesi Jadwal Mengajar Guru:
          </label>
          <select
            value={selectedScheduleId}
            onChange={(e) => {
              setSelectedScheduleId(e.target.value);
              setSearchParams({ schedule_id: e.target.value, date: selectedDate });
            }}
            aria-label="Pilih Sesi Jadwal Mengajar"
            className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {schedules.length > 0 ? (
              schedules.map((sch) => {
                const cg = sch.class_group_name || (sch.class_groups && sch.class_groups.map(c => c.name).join(', ')) || 'Rombel';
                const dayNames = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu' };
                const day = dayNames[sch.day_of_week] || `Hari ${sch.day_of_week}`;
                return (
                  <option key={sch.id} value={String(sch.id)}>
                    {day} • {sch.start_time?.slice(0, 5)} - {sch.end_time?.slice(0, 5)} | {sch.subject_name || 'Mapel'} ({cg})
                  </option>
                );
              })
            ) : (
              <option value="">Belum ada jadwal mengajar pada tahun ajaran aktif</option>
            )}
          </select>
        </div>
      </div>

      {/* Info Sesi Aktif Card */}
      {currentSchedule && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">
                  {currentSchedule.subject_name || 'Mata Pelajaran'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {classGroupName}
                </span>
                {isExistingAttendance && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    ✓ Presensi Terisi
                  </span>
                )}
                {existingJournalId && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    ✓ Jurnal Terisi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {currentSchedule.start_time?.slice(0, 5)} - {currentSchedule.end_time?.slice(0, 5)} WIB
                </span>
                {currentSchedule.room_name && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {currentSchedule.room_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {students.length} Santri
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleMarkAllPresent}
              className="text-xs"
            >
              Semua Hadir
            </Button>
          </div>
        </div>
      )}

      {/* SECTION 1: JURNAL MATERI KBM */}
      <Card className="p-4 sm:p-5 bg-slate-900/80 border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Jurnal Materi KBM</h3>
              <p className="text-[11px] text-slate-400">Pertemuan, materi/TP, dan catatan pelaksanaan pembelajaran.</p>
            </div>
          </div>
          {existingJournalId && (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Mode Ubah Jurnal
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pertemuan Ke-N */}
          <div className="sm:col-span-1">
            <FormField
              label="Pertemuan Ke"
              required
              help="Contoh: 1, 2, 3..."
            >
              <Input
                type="number"
                min="1"
                value={journalData.meeting_number}
                onChange={(e) => setJournalData({ ...journalData, meeting_number: e.target.value })}
                placeholder="1"
                className="font-bold text-center"
              />
            </FormField>
          </div>

          {/* Pilih Tujuan Pembelajaran (TP) */}
          <div className="sm:col-span-2">
            <FormField
              label="Pilih Tujuan Pembelajaran (TP)"
              help={availableTPs.length > 0 ? 'Pilih TP yang dirumuskan pada Tahap 21' : 'Belum ada master TP untuk mapel ini'}
            >
              <select
                value={journalData.learning_objective_id}
                onChange={(e) => handleSelectTP(e.target.value)}
                aria-label="Pilih Tujuan Pembelajaran"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 truncate min-h-[44px]"
              >
                <option value="">-- Pilih dari Master TP (Atau Tulis Manual di bawah) --</option>
                {availableTPs.map((tp) => (
                  <option key={tp.id} value={String(tp.id)}>
                    {tp.code} - {tp.scope_material ? `(${tp.scope_material}) ` : ''}{tp.description.slice(0, 75)}...
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Topik / Materi Pembelajaran (Text Input) */}
        <FormField
          label="Topik / Materi yang Diajarkan"
          required
          help="Uraian ringkas materi yang diajarkan pada pertemuan ini."
        >
          <Input
            type="text"
            value={journalData.topic_material}
            onChange={(e) => setJournalData({ ...journalData, topic_material: e.target.value })}
            placeholder="Contoh: Menghitung volume dan luas permukaan tabung serta prisma segitiga"
          />
        </FormField>

        {/* Catatan Umum KBM */}
        <FormField
          label="Catatan Umum / Hambatan Pelaksanaan KBM (Opsional)"
          help="Catatan dinamika kelas, kendala santri, atau tindak lanjut pertemuan berikutnya."
        >
          <Textarea
            rows={2}
            value={journalData.general_notes}
            onChange={(e) => setJournalData({ ...journalData, general_notes: e.target.value })}
            placeholder="Tuliskan catatan pelaksanaan KBM, misalnya: Sebagian besar siswa tuntas, perlu latihan tambahan untuk soal cerita..."
          />
        </FormField>
      </Card>

      {/* SECTION 2: PRESENSI KEHADIRAN SANTRI */}
      <div className="flex flex-col gap-3">
        {/* Quick Summary Chips */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Hadir</p>
            <p className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">{counts.present}</p>
          </div>
          <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Izin</p>
            <p className="text-lg sm:text-xl font-black text-sky-300 mt-0.5">{counts.permitted}</p>
          </div>
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Sakit</p>
            <p className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">{counts.sick}</p>
          </div>
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Alpa</p>
            <p className="text-lg sm:text-xl font-black text-rose-300 mt-0.5">{counts.absent}</p>
          </div>
        </div>

        {/* Search Bar Siswa */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NIS santri..."
            className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Daftar Siswa Card / List */}
        {isLoadingStudents ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : fetchError ? (
          <ErrorState
            title="Gagal Memuat Anggota Kelas"
            message={fetchError}
            onRetry={loadClassMembersAndAttendance}
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="Tidak Ada Siswa di Rombel Ini"
            description="Rombel yang dipilih belum memiliki santri aktif terdaftar. Hubungi Bagian Kurikulum/TU."
            icon={Users}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredStudents.map((student, idx) => {
              const studentId = student.student_id || student.id;
              const record = attendanceMap[studentId] || { status: 'present', notes: '' };
              const studentName = student.student_name || student.full_name || student.name || `Siswa #${studentId}`;
              const nis = student.nis || student.nisn || '-';
              const gender = student.gender || student.jenis_kelamin || '';
              const isNotesOpen = activeNotesStudentId === studentId || Boolean(record.notes);

              return (
                <Card
                  key={studentId}
                  className="p-3.5 sm:p-4 bg-slate-900/70 border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Info Siswa */}
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-100 leading-tight">
                          {studentName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          NIS: {nis} {gender ? `• ${gender === 'L' || gender === 'laki-laki' ? 'L' : 'P'}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* 4 Status Chips H / I / S / A (Touch Target 44px) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {/* Hadir */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(studentId, 'present')}
                        aria-label={`Tandai ${studentName} Hadir`}
                        className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          record.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-2 ring-emerald-400/50'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                        }`}
                      >
                        H
                      </button>

                      {/* Izin */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(studentId, 'permitted')}
                        aria-label={`Tandai ${studentName} Izin`}
                        className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                          record.status === 'permitted'
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40 ring-2 ring-sky-400/50'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                        }`}
                      >
                        I
                      </button>

                      {/* Sakit */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(studentId, 'sick')}
                        aria-label={`Tandai ${studentName} Sakit`}
                        className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          record.status === 'sick'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 ring-2 ring-amber-400/50'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                        }`}
                      >
                        S
                      </button>

                      {/* Alpa */}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(studentId, 'absent')}
                        aria-label={`Tandai ${studentName} Alpa`}
                        className={`min-w-[44px] min-h-[44px] px-3 rounded-lg text-xs font-bold transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                          record.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-2 ring-rose-400/50'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                        }`}
                      >
                        A
                      </button>

                      {/* Toggle Catatan */}
                      <button
                        type="button"
                        onClick={() => setActiveNotesStudentId(activeNotesStudentId === studentId ? null : studentId)}
                        aria-label={`Catatan untuk ${studentName}`}
                        className={`min-w-[44px] min-h-[44px] p-2 rounded-lg text-xs transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                          record.notes
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                        }`}
                        title={record.notes || 'Tambah catatan siswa'}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Kolom Catatan Per Siswa */}
                  {isNotesOpen && (
                    <div className="pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={record.notes || ''}
                        onChange={(e) => handleNotesChange(studentId, e.target.value)}
                        placeholder={`Catatan untuk ${studentName} (misal: izin ke UKS, datang telat 15 menit)...`}
                        className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Save Bar (Mobile Convenience) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 sm:hidden">
        <Button
          variant="primary"
          size="lg"
          icon={Save}
          loading={isSaving}
          disabled={students.length === 0}
          onClick={handleSaveAll}
          className="w-full shadow-lg"
        >
          Simpan Presensi & Jurnal KBM
        </Button>
      </div>
    </div>
  );
}
