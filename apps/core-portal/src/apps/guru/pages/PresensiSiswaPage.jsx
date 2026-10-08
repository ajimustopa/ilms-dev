import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Info,
  FileText,
  FileCheck2,
  Check,
  Zap,
  Tag,
  WifiOff,
  CloudOff,
  CheckCheck,
  GraduationCap,
  History,
  MoreVertical,
  Activity,
  Plus
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { journalService } from '../services/journalService';
import { scoreService } from '../services/scoreService';
import { formatIndonesianDate, formatShortTime } from '../utils/dateHelper';
import { getScheduleClassGroupDisplay, getScheduleRoomDisplay } from '../utils/scheduleHelper';
import {
  PageHeader,
  SelectorKonteks,
  Card,
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  useToast
} from '../components';

// Status Attendance Configuration
const STATUS_CONFIG = {
  present: {
    code: 'H',
    label: 'Hadir',
    activeBg: 'bg-emerald-600 text-white',
    activeBorder: 'border-emerald-600',
    inactiveBg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    barColor: 'bg-emerald-600'
  },
  sick: {
    code: 'S',
    label: 'Sakit',
    activeBg: 'bg-indigo-600 text-white',
    activeBorder: 'border-indigo-600',
    inactiveBg: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
    barColor: 'bg-indigo-600'
  },
  permitted: {
    code: 'I',
    label: 'Izin',
    activeBg: 'bg-amber-500 text-white',
    activeBorder: 'border-amber-500',
    inactiveBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    barColor: 'bg-amber-500'
  },
  absent: {
    code: 'A',
    label: 'Alpa',
    activeBg: 'bg-rose-600 text-white',
    activeBorder: 'border-rose-600',
    inactiveBg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    barColor: 'bg-rose-600'
  }
};

export default function PresensiSiswaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { activeContext } = useTeacherContext();

  // Params dari URL
  const paramScheduleId = searchParams.get('schedule_id') || searchParams.get('id') || '';
  const paramClassGroupId = searchParams.get('class_group_id') || '';
  const paramDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(paramDate);
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(paramScheduleId);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState(paramClassGroupId);

  // Data Siswa & Presensi Map
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { [studentId]: { status: 'present'|'sick'|'permitted'|'absent', notes: '' } }
  const [isExistingAttendance, setIsExistingAttendance] = useState(false);

  // Keyboard navigation active student index
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);

  // Filter Tab di Roster: 'ALL' | 'present' | 'sick' | 'permitted' | 'absent'
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Jurnal Mengajar Data
  const [isJournalOpen, setIsJournalOpen] = useState(true);
  const [existingJournalId, setExistingJournalId] = useState(null);
  const [journalData, setJournalData] = useState({
    meeting_number: 1,
    learning_objective_id: '',
    topic_material: '',
    general_notes: '',
    has_homework: false,
    homework_title: '',
    homework_deadline: ''
  });
  const [availableTPs, setAvailableTPs] = useState([]);
  const [isLoadingTPs, setIsLoadingTPs] = useState(false);

  // Media & Metoda Tags
  const [teachingMethods, setTeachingMethods] = useState(['Praktikum Konseptual', 'LKPD Berkelompok']);
  const [newMethodInput, setNewMethodInput] = useState('');
  const [isAddingMethod, setIsAddingMethod] = useState(false);

  // UI & Network States
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingJournal, setIsLoadingJournal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Network Online Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Draft Cache Key
  const draftKey = `aldepos_draft_att_${selectedScheduleId}_${selectedClassGroupId}_${selectedDate}`;

  // 1. Ambil Daftar Jadwal Guru
  const loadSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    try {
      const selectedUnitIds = activeContext?.satuanPendidikanIds || (activeContext?.satuanPendidikanId ? [activeContext.satuanPendidikanId] : []);
      const isMultiOrAll = activeContext?.isAllUnits || selectedUnitIds.length !== 1;
      const unitParam = isMultiOrAll ? undefined : activeContext?.satuanPendidikanId;

      const res = await scheduleService.getMySchedules({
        satuan_pendidikan_id: unitParam,
        academic_year_id: activeContext?.academicYearId
      });
      const schedList = res?.schedules || (Array.isArray(res) ? res : []);
      setSchedules(schedList);

      // Auto-select jadwal jika belum ada di query param
      if (!selectedScheduleId && schedList.length > 0) {
        // Cek apakah ada jadwal yang sedang berlangsung hari ini
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const todayDayNum = now.getDay() === 0 ? 7 : now.getDay();

        const currentActive = schedList.find((s) => {
          const sDay = Number(s.day_of_week) || (s.day_of_week === 'senin' ? 1 : 1);
          if (sDay !== todayDayNum) return false;
          const [sH, sM] = String(s.start_time || '').split(':').map(Number);
          const [eH, eM] = String(s.end_time || '').split(':').map(Number);
          const startM = (sH || 0) * 60 + (sM || 0);
          const endM = (eH || 0) * 60 + (eM || 0);
          return currentMins >= startM && currentMins <= endM;
        });

        const target = currentActive || schedList[0];
        setSelectedScheduleId(String(target.id));
        if (target.class_group_id) {
          setSelectedClassGroupId(String(target.class_group_id));
        }
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [activeContext, selectedScheduleId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Cari objek jadwal yang sedang dipilih
  const currentSchedule = useMemo(() => {
    return schedules.find((s) => String(s.id) === String(selectedScheduleId)) || null;
  }, [schedules, selectedScheduleId]);

  // Sinkronkan class_group_id aktif saat currentSchedule berubah
  useEffect(() => {
    if (currentSchedule) {
      const cgId =
        currentSchedule.class_group_id ||
        (currentSchedule.class_groups && currentSchedule.class_groups[0]?.id) ||
        '';
      if (cgId && (!selectedClassGroupId || selectedClassGroupId !== String(cgId))) {
        setSelectedClassGroupId(String(cgId));
      }
    }
  }, [currentSchedule, selectedClassGroupId]);

  // 2. Ambil Anggota Rombel & Presensi Tersimpan
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

      // 2. Ambil data presensi yang sudah tersimpan
      const attRes = await attendanceService
        .getLessonAttendances({
          subject_schedule_id: selectedScheduleId,
          class_group_id: selectedClassGroupId,
          date: selectedDate
        })
        .catch(() => null);

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

      // Cek apakah ada draft yang belum tersimpan di sessionStorage
      let savedDraft = null;
      try {
        const raw = sessionStorage.getItem(draftKey);
        if (raw) savedDraft = JSON.parse(raw);
      } catch {}

      // Inisialisasi setiap siswa (default: present)
      memberList.forEach((m) => {
        const sId = m.student_id || m.id;
        if (!newAttMap[sId]) {
          if (savedDraft && savedDraft[sId]) {
            newAttMap[sId] = savedDraft[sId];
          } else {
            newAttMap[sId] = {
              status: 'present',
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
        setAvailableTPs(list.filter((t) => t.is_active));
      } catch (e) {
        console.error('Error fetching TPs for subject:', e);
      } finally {
        setIsLoadingTPs(false);
      }
    };
    fetchTPs();
  }, [currentSchedule, activeContext]);

  // 4. Ambil Jurnal Mengajar yang Sudah Tersimpan
  const loadExistingJournal = useCallback(async () => {
    if (!selectedScheduleId || !selectedDate) {
      setExistingJournalId(null);
      return;
    }
    setIsLoadingJournal(true);
    try {
      const res = await journalService
        .getMyJournals({
          schedule_id: selectedScheduleId,
          date: selectedDate
        })
        .catch(() => null);

      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : (data.items || []);
      const matchJournal =
        list.find(
          (j) =>
            String(j.schedule_id) === String(selectedScheduleId) &&
            (j.teaching_date === selectedDate || j.date === selectedDate)
        ) || (list.length > 0 ? list[0] : null);

      if (matchJournal) {
        setExistingJournalId(matchJournal.id);
        setJournalData({
          meeting_number: matchJournal.meeting_number || 1,
          learning_objective_id: matchJournal.learning_objective_id
            ? String(matchJournal.learning_objective_id)
            : '',
          topic_material: matchJournal.topic_material || '',
          general_notes: matchJournal.general_notes || '',
          has_homework: Boolean(matchJournal.has_homework),
          homework_title: matchJournal.homework_title || '',
          homework_deadline: matchJournal.homework_deadline || ''
        });
      } else {
        setExistingJournalId(null);
        setJournalData((prev) => ({
          ...prev,
          meeting_number: prev.meeting_number || 1,
          topic_material: prev.topic_material || '',
          learning_objective_id: '',
          general_notes: '',
          has_homework: false,
          homework_title: '',
          homework_deadline: ''
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

  // Handle Pilih TP untuk auto-fill topik materi
  const handleSelectTP = (tpId) => {
    if (!tpId) {
      setJournalData((prev) => ({
        ...prev,
        learning_objective_id: ''
      }));
      return;
    }
    const selectedTp = availableTPs.find((t) => String(t.id) === String(tpId));
    if (selectedTp) {
      setJournalData((prev) => ({
        ...prev,
        learning_objective_id: String(selectedTp.id),
        topic_material: selectedTp.scope_material
          ? `${selectedTp.code} • ${selectedTp.scope_material}`
          : `${selectedTp.code} • ${selectedTp.description.slice(0, 100)}`
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

  // Aksi Cepat: Setel Semua Hadir
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
    toast.info(`${students.length} santri ditandai hadir.`, 'Semua Siswa Disetel Hadir');
  };

  // Tambah Metoda Ajar Baru
  const handleAddMethod = () => {
    if (newMethodInput.trim()) {
      setTeachingMethods((prev) => [...prev, newMethodInput.trim()]);
      setNewMethodInput('');
      setIsAddingMethod(false);
    }
  };

  // Hitung Ringkasan Presensi (Real-Time Counter)
  const counts = useMemo(() => {
    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;

    students.forEach((s) => {
      const sId = s.student_id || s.id;
      const st = attendanceMap[sId]?.status || 'present';
      if (st === 'present') present += 1;
      else if (st === 'sick') sick += 1;
      else if (st === 'permitted') permitted += 1;
      else if (st === 'absent') absent += 1;
    });

    const total = students.length || 1;
    const presentRate = Math.round((present / total) * 100);

    return {
      total: students.length,
      present,
      sick,
      permitted,
      absent,
      presentRate,
      presentPct: (present / total) * 100,
      sickPct: (sick / total) * 100,
      permittedPct: (permitted / total) * 100,
      absentPct: (absent / total) * 100
    };
  }, [students, attendanceMap]);

  // Filtered Students untuk Roster Table & Card Stack
  const filteredStudents = useMemo(() => {
    return students.filter((s, idx) => {
      const sId = s.student_id || s.id;
      const st = attendanceMap[sId]?.status || 'present';
      const sName = (s.student_name || s.name || s.full_name || '').toLowerCase();
      const sNisn = (s.nisn || s.nis || '').toLowerCase();
      const sNo = String(s.attendance_number || idx + 1);

      if (filterStatus !== 'ALL' && st !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = sName.includes(q) || sNisn.includes(q) || sNo.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [students, attendanceMap, filterStatus, searchQuery]);

  // Keyboard Shortcuts Listener (Desktop)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Abaikan jika user sedang mengetik di input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const currentStudent = filteredStudents[activeStudentIndex];
      if (!currentStudent) return;
      const sId = currentStudent.student_id || currentStudent.id;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleStatusChange(sId, 'present');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleStatusChange(sId, 'sick');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleStatusChange(sId, 'permitted');
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleStatusChange(sId, 'absent');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveStudentIndex((prev) => Math.min(filteredStudents.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveStudentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredStudents, activeStudentIndex]);

  // Simpan Terpadu: Presensi Siswa & Jurnal Mengajar
  const handleSaveAll = async () => {
    if (!selectedScheduleId || !selectedClassGroupId || !selectedDate) {
      toast.error('Pastikan jadwal, rombel, dan tanggal telah dipilih.', 'Data Tidak Lengkap');
      return;
    }

    if (students.length === 0) {
      toast.warning('Rombel ini belum memiliki santri terdaftar.', 'Tidak Ada Siswa');
      return;
    }

    if (!journalData.topic_material.trim()) {
      toast.warning('Silakan pilih Tujuan Pembelajaran (TP) atau tuliskan topik materi yang diajarkan.', 'Materi Jurnal Wajib Diisi');
      setIsJournalOpen(true);
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
        learning_objective_id: journalData.learning_objective_id
          ? Number(journalData.learning_objective_id)
          : null,
        general_notes: journalData.general_notes ? journalData.general_notes.trim() : null,
        has_homework: journalData.has_homework ? 1 : 0,
        homework_title: journalData.homework_title ? journalData.homework_title.trim() : null,
        homework_deadline: journalData.homework_deadline || null
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
      setLastSavedTime(new Date());

      toast.success(
        `Presensi ${attendances.length} siswa dan Jurnal KBM Pertemuan ke-${journalData.meeting_number} berhasil disimpan.`,
        'Presensi & Jurnal Tersimpan'
      );
    } catch (err) {
      console.error('Error saving attendance and journal:', err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Koneksi gagal. Isian Anda tersimpan sementara di penyimpanan lokal.',
        'Gagal Menyimpan'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200">
      {/* 1. Offline Indicator Banner jika Koneksi Terputus */}
      {!isOnline && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>Koneksi internet terputus. Isian presensi tetap tersimpan otomatis di perangkat Anda.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 font-bold">
            Offline Mode
          </span>
        </div>
      )}

      {/* 2. Page Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/guru/jadwal')}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Jadwal</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              KBM Aktif
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Presensi Siswa & Jurnal KBM
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tersimpan {formatShortTime(lastSavedTime)}</span>
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HERO ACTIVE SESSION DETAIL CARD                                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                Sesi KBM Terpilih
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {formatIndonesianDate(selectedDate, true)}
              </span>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {currentSchedule?.subject_name || currentSchedule?.subject_code || 'Mata Pelajaran'}
              </h2>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
                {getScheduleClassGroupDisplay(currentSchedule)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Pertemuan Ke-{journalData.meeting_number}
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatShortTime(currentSchedule?.start_time)} -{' '}
                {formatShortTime(currentSchedule?.end_time)} WIB
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {getScheduleRoomDisplay(currentSchedule)}
              </span>
            </div>
          </div>

          {/* Sesi Switcher Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={selectedScheduleId}
                onChange={(e) => {
                  setSelectedScheduleId(e.target.value);
                  const s = schedules.find((item) => String(item.id) === e.target.value);
                  if (s && s.class_group_id) {
                    setSelectedClassGroupId(String(s.class_group_id));
                  }
                }}
                className="h-10 pl-3 pr-8 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name || s.subject_code} ({getScheduleClassGroupDisplay(s)}) •{' '}
                    {formatShortTime(s.start_time)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. COLLAPSIBLE KARTU JURNAL & MATERI KBM                                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all duration-200">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsJournalOpen(!isJournalOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Jurnal & Materi Pembelajaran KBM
                </h3>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    journalData.topic_material
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {journalData.topic_material ? 'Terisi' : 'Perlu Diisi'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {journalData.topic_material || 'Pilih TP dan topik bahasan hari ini...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            {isJournalOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Accordion Body */}
        {isJournalOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-4">
              {/* Pertemuan Ke- & TP Selection (Col 6) */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pertemuan Ke-
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={journalData.meeting_number}
                  onChange={(e) =>
                    setJournalData((prev) => ({ ...prev, meeting_number: e.target.value }))
                  }
                  className="w-full h-10 px-3 text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-8 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Rujukan Tujuan Pembelajaran (TP)
                </label>
                <div className="relative">
                  <select
                    value={journalData.learning_objective_id}
                    onChange={(e) => handleSelectTP(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Pilih TP (Opsional / Manual) --</option>
                    {availableTPs.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.code} • {tp.scope_material || tp.description.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Materi Pokok / Topik Bahasan (Col 12) */}
              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Materi Pokok / Bahasan Hari Ini <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Teorema Pythagoras dan Pembuktian Segitiga Siku-Siku"
                  value={journalData.topic_material}
                  onChange={(e) =>
                    setJournalData((prev) => ({ ...prev, topic_material: e.target.value }))
                  }
                  className="w-full h-10 px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Metoda & Media Pembelajaran (Tags) */}
              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Metoda & Media Ajar
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {teachingMethods.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      {m}
                    </span>
                  ))}
                  {isAddingMethod ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newMethodInput}
                        onChange={(e) => setNewMethodInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                        placeholder="Ketik lalu Enter..."
                        className="h-8 px-2 text-xs rounded border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddMethod}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingMethod(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-emerald-700 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Catatan / Refleksi KBM */}
              <div className="md:col-span-12 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Refleksi Guru & Catatan Kelas
                </label>
                <textarea
                  rows="2"
                  placeholder="Contoh: KBM kondusif, 3 siswa butuh remedial soal nomor 4..."
                  value={journalData.general_notes}
                  onChange={(e) =>
                    setJournalData((prev) => ({ ...prev, general_notes: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Asesmen Formatif / PR Toggle */}
              <div className="md:col-span-12 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ada Tugas / Asesmen Formatif?
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={journalData.has_homework}
                    onChange={(e) =>
                      setJournalData((prev) => ({ ...prev, has_homework: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {journalData.has_homework && (
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Judul Penugasan</label>
                    <input
                      type="text"
                      placeholder="Latihan Buku Paket Hal 45-48"
                      value={journalData.homework_title}
                      onChange={(e) =>
                        setJournalData((prev) => ({ ...prev, homework_title: e.target.value }))
                      }
                      className="w-full h-8 px-2.5 text-xs rounded border border-emerald-300 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Tenggat Waktu</label>
                    <input
                      type="date"
                      value={journalData.homework_deadline}
                      onChange={(e) =>
                        setJournalData((prev) => ({ ...prev, homework_deadline: e.target.value }))
                      }
                      className="w-full h-8 px-2.5 text-xs rounded border border-emerald-300 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE ATTENDANCE COUNTERS & SEGMENTED PROGRESS BAR                      */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              Rekapitulasi Kehadiran Sesi Ini
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">Tingkat Hadir:</span>
            <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
              {counts.presentRate}%
            </span>
          </div>
        </div>

        {/* Multi-segmented Attendance Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-0.5">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${counts.presentPct}%` }}
            title={`Hadir: ${counts.present}`}
          />
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${counts.sickPct}%` }}
            title={`Sakit: ${counts.sick}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${counts.permittedPct}%` }}
            title={`Izin: ${counts.permitted}`}
          />
          <div
            className="h-full bg-rose-600 transition-all duration-300"
            style={{ width: `${counts.absentPct}%` }}
            title={`Alpa: ${counts.absent}`}
          />
        </div>

        {/* 5 Compact Pill Counters in 1 Row on Mobile and Desktop */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center pt-0.5">
          <div className="py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
              Hadir
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-800 dark:text-emerald-300">
              {counts.present}
            </span>
          </div>

          <div className="py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-400 truncate">
              Sakit
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-indigo-800 dark:text-indigo-300">
              {counts.sick}
            </span>
          </div>

          <div className="py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
              Izin
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-amber-800 dark:text-amber-300">
              {counts.permitted}
            </span>
          </div>

          <div className="py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-rose-700 dark:text-rose-400 truncate">
              Alpa
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-rose-800 dark:text-rose-300">
              {counts.absent}
            </span>
          </div>

          <div className="py-1 px-1 sm:py-1.5 sm:px-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-0.5">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
              Total
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {counts.total}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. TOOLBAR & FILTER ROSTER SANTRI                                         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Semua ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('present')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'present'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
            }`}
          >
            Hadir ({counts.present})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('sick')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'sick'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700'
            }`}
          >
            Sakit ({counts.sick})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('permitted')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'permitted'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-700'
            }`}
          >
            Izin ({counts.permitted})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('absent')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'absent'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-700'
            }`}
          >
            Alpa ({counts.absent})
          </button>
        </div>

        {/* Quick Bulk Action & Search */}
        <div className="flex items-center gap-2">
          <Button
            variant="brand-subtle"
            size="sm"
            onClick={handleMarkAllPresent}
            leftIcon={<Zap className="w-3.5 h-3.5" />}
            className="text-xs min-h-[36px]"
          >
            Setel Semua Hadir
          </Button>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari santri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. ROSTER CONTENT (LOADING / ERROR / TABLE DESKTOP / CARD MOBILE)         */}
      {/* ========================================================================= */}
      {isLoadingStudents ? (
        <div className="space-y-3">
          <SkeletonCard count={3} />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Data Santri"
          message={fetchError}
          onRetry={loadClassMembersAndAttendance}
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-slate-400" />}
          title="Rombel Belum Memiliki Santri"
          description="Tidak ditemukan santri yang terdaftar aktif dalam rombongan belajar ini."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-slate-400" />}
          title="Tidak Ada Santri yang Cocok"
          description="Tidak ditemukan santri dengan kriteria filter atau pencarian saat ini."
          actionLabel="Reset Filter"
          onAction={() => {
            setFilterStatus('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <>
          {/* ===================================================================== */}
          {/* DESKTOP VIEW: TABEL 40px DENGAN KEYBOARD SHORTCUTS                    */}
          {/* ===================================================================== */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Keyboard Guide Legend Header */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Pintasan Keyboard:
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-[10px]">
                  H
                </span>{' '}
                Hadir
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-[10px]">
                  S
                </span>{' '}
                Sakit
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-[10px]">
                  I
                </span>{' '}
                Izin
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-[10px]">
                  A
                </span>{' '}
                Alpa
                <span className="text-slate-300">|</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-[10px]">
                  ↑ / ↓
                </span>{' '}
                Navigasi Santri
              </div>
              <span className="font-mono text-[11px]">
                Santri Terpilih: #{activeStudentIndex + 1}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-16 text-center">No & NISN</th>
                    <th className="py-2.5 px-4 min-w-[220px]">Nama Santri</th>
                    <th className="py-2.5 px-4 min-w-[260px] text-center">Status Kehadiran</th>
                    <th className="py-2.5 px-4 min-w-[220px]">Catatan KBM / Kedisiplinan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  {filteredStudents.map((student, idx) => {
                    const sId = student.student_id || student.id;
                    const record = attendanceMap[sId] || { status: 'present', notes: '' };
                    const isActiveRow = idx === activeStudentIndex;
                    const initial = (student.student_name || student.name || 'S')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={sId || idx}
                        onClick={() => setActiveStudentIndex(idx)}
                        className={`transition-colors cursor-pointer ${
                          isActiveRow
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* No & NISN */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            #{String(student.attendance_number || idx + 1).padStart(2, '0')}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {student.nisn || student.nis || '-'}
                          </div>
                        </td>

                        {/* Nama Santri & Kamar */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {student.student_name || student.name || student.full_name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {student.dormitory_name
                                  ? `Asrama ${student.dormitory_name}`
                                  : student.is_boarder === false
                                  ? 'Non-Mukim'
                                  : 'Mukim'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Radio Buttons (H, S, I, A) */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg max-w-fit mx-auto">
                            {['present', 'sick', 'permitted', 'absent'].map((stKey) => {
                              const cfg = STATUS_CONFIG[stKey];
                              const isSelected = record.status === stKey;
                              return (
                                <button
                                  key={stKey}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(sId, stKey);
                                    setActiveStudentIndex(idx);
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                                    isSelected
                                      ? cfg.activeBg + ' shadow-2xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  <span>{cfg.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* Catatan KBM Input */}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            placeholder="+ Tambah catatan..."
                            value={record.notes || ''}
                            onChange={(e) => handleNotesChange(sId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 px-2.5 text-xs rounded border border-transparent hover:border-slate-200 focus:border-emerald-500 bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* MOBILE VIEW: CARD-STACK VERTIKAL (Touch Targets ≥ 44px)              */}
          {/* ===================================================================== */}
          <div className="md:hidden space-y-3">
            {filteredStudents.map((student, idx) => {
              const sId = student.student_id || student.id;
              const record = attendanceMap[sId] || { status: 'present', notes: '' };
              const initial = (student.student_name || student.name || 'S')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={sId || idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 font-bold text-sm flex items-center justify-center">
                          {initial}
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-mono text-[9px] font-bold">
                          #{String(student.attendance_number || idx + 1).padStart(2, '0')}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {student.student_name || student.name || student.full_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          NISN: {student.nisn || student.nis || '-'}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        record.status === 'present'
                          ? 'success'
                          : record.status === 'sick'
                          ? 'info'
                          : record.status === 'permitted'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {STATUS_CONFIG[record.status]?.label}
                    </StatusBadge>
                  </div>

                  {/* 4 Touch Target Chips (44px Tinggi) */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {['present', 'sick', 'permitted', 'absent'].map((stKey) => {
                      const cfg = STATUS_CONFIG[stKey];
                      const isSelected = record.status === stKey;
                      return (
                        <button
                          key={stKey}
                          type="button"
                          onClick={() => handleStatusChange(sId, stKey)}
                          className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all active:scale-95 ${
                            isSelected
                              ? cfg.activeBg + ' shadow-xs ring-2 ring-offset-1 ring-emerald-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="text-[11px]">{cfg.code}</span>
                          <span className="text-[10px] font-medium">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Catatan Individual */}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="+ Catatan santri (misal: di UKS, izin lomba)..."
                      value={record.notes || ''}
                      onChange={(e) => handleNotesChange(sId, e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 8. FOOTER SAVE ACTION (SATU TOMBOL DI PALING BAWAH)                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {counts.present} dari {counts.total} Santri Hadir ({counts.presentRate}%)
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline text-slate-500">
            {counts.sick} Sakit, {counts.permitted} Izin, {counts.absent} Alpa
          </span>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSaveAll}
          disabled={isSaving}
          leftIcon={
            isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )
          }
          className="w-full sm:w-auto font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white min-h-[46px] px-8 text-sm active:scale-[0.99]"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Presensi & Jurnal'}
        </Button>
      </div>
    </div>
  );
}
