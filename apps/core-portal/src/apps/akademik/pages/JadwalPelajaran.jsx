import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Users,
  BookOpen,
  Activity,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCw,
  X,
  Layers,
  MapPin,
  CheckSquare,
  Square,
  Power,
  Search,
  Filter,
  ChevronDown,
  Check,
  History,
  Sparkles,
  Copy,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  ShieldAlert,
  Info,
  CalendarDays,
  Tag,
  ArrowRight,
  Zap,
  HelpCircle,
  UserX,
  CheckCheck,
  AlertTriangle,
  ArrowLeftRight,
  Settings
} from 'lucide-react';

const DAYS = [
  { id: 1, name: 'Senin' },
  { id: 2, name: 'Selasa' },
  { id: 3, name: 'Rabu' },
  { id: 4, name: 'Kamis' },
  { id: 5, name: 'Jumat' },
  { id: 6, name: 'Sabtu' },
  { id: 7, name: 'Minggu' }
];

export default function JadwalPelajaran() {
  const { activeSchoolUnit } = useAuth();

  // Navigation main stages:
  // 'stage1_time' | 'stage2_lessons' | 'stage3_constraints' | 'stage4_generator' | 'stage5_editor'
  const [mainTab, setMainTab] = useState('stage1_time');

  // Sub-tab for Stage 3 Constraints: 'teacher' | 'class' | 'subject'
  const [constraintTab, setConstraintTab] = useState('teacher');

  // State Utama
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown Master
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [extrasList, setExtrasList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolUnitsList, setSchoolUnitsList] = useState([]);

  // Searchable select state for Jadwal
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [crossUnitTeacher, setCrossUnitTeacher] = useState(true);

  // View mode in Stage 5: 'calendar' | 'table' | 'teacher_matrix' | 'master_grid'
  const [viewMode, setViewMode] = useState('calendar');

  // Durasi standar menit per JP dari Struktur Kurikulum / Tahun Ajaran
  const activeYearObj = academicYears.find(y => String(y.id) === String(selectedYearId)) || academicYears[0];
  const minutesPerJp = activeYearObj?.minutes_per_jp || 40;

  // ==========================================
  // TAHAP 1: STRUKTUR WAKTU (TIME SLOTS)
  // ==========================================
  const [timeSlots, setTimeSlots] = useState([]);
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [timeSlotModalOpen, setTimeSlotModalOpen] = useState(false);
  const [slotDayFilter, setSlotDayFilter] = useState('');
  const [timeSlotForm, setTimeSlotForm] = useState({
    day_of_week: 1,
    period_index: 1,
    start_time: '07:00',
    end_time: '07:40',
    type: 'lesson', // 'lesson' (JP) | 'break' (Non-JP Istirahat) | 'activity' (Non-JP Kegiatan)
    label: 'Jam Ke-1',
    is_generator_usable: true
  });

  // Modal Wizard Generator Pola Waktu Otomatis
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    startTime: '07:00',
    minutesPerJp: 40,
    periodsSeninKamis: 8,
    periodsJumat: 5,
    periodsSabtu: 7,
    breakAfterPeriod1: 3,
    breakDuration1: 20, // Menit
    breakLabel1: 'Istirahat Pagi',
    breakAfterPeriod2: 5,
    breakDuration2: 60, // Menit
    breakLabel2: 'Sholat Dzuhur & Makan'
  });

  // ==========================================
  // TAHAP 2: BEBAN PELAJARAN (LESSONS & KUOTA JP)
  // ==========================================
  const [lessonsList, setLessonsList] = useState([]);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonFilterClass, setLessonFilterClass] = useState('');
  const [lessonFilterStatus, setLessonFilterStatus] = useState('all'); // 'all' | 'ready' | 'unassigned'
  const [lessonForm, setLessonForm] = useState({
    type: 'mapel',
    subject_id: '',
    extracurricular_id: '',
    name: '',
    total_hours_per_week: 2,
    duration_per_session: 2,
    room_name: '',
    is_joined_class: false,
    target_class_ids: [],
    teacher_ids: []
  });

  // ==========================================
  // TAHAP 3: ATURAN WAKTU KHUSUS (CONSTRAINTS)
  // ==========================================
  // A. Ketersediaan Guru
  const [selectedTeacherForAvail, setSelectedTeacherForAvail] = useState('');
  const [teacherAvailabilities, setTeacherAvailabilities] = useState([]);
  const [savingAvail, setSavingAvail] = useState(false);

  // B. Ketersediaan Rombel
  const [selectedClassForAvail, setSelectedClassForAvail] = useState('');
  const [classAvailabilities, setClassAvailabilities] = useState([]);

  // C. Batasan Mata Pelajaran
  const [selectedSubjectForConstraint, setSelectedSubjectForConstraint] = useState('');
  const [subjectConstraintForm, setSubjectConstraintForm] = useState({
    preferred_time: 'any', // 'morning_only' (Jam Pagi) | 'early_periods' (Jam 1-2) | 'any' (Bebas)
    max_per_day: 2,
    forbidden_days: []
  });

  // ==========================================
  // TAHAP 4: TIMETABLE AUTO-GENERATOR
  // ==========================================
  const [generatorRuns, setGeneratorRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorReport, setGeneratorReport] = useState(null);

  // ==========================================
  // TAHAP 5: VISUAL JADWAL (EDITOR & MONITORING)
  // ==========================================
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [createPresetModalOpen, setCreatePresetModalOpen] = useState(false);
  const [presetForm, setPresetForm] = useState({
    name: '',
    code: '',
    description: '',
    copy_from_preset_id: '',
    is_active: false,
    reason: 'Penambahan opsi jadwal baru'
  });

  // Modal Konfirmasi Pengaktifan Preset
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [presetToActivate, setPresetToActivate] = useState(null);
  const [activationReason, setActivationReason] = useState('');

  // Modal Riwayat Perubahan Jadwal (Audit Logs)
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [scheduleLogs, setScheduleLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal Tambah / Edit Jadwal Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [form, setForm] = useState({
    schedule_type: 'mapel',
    subject_id: '',
    extracurricular_id: '',
    teacher_employee_id: '',
    day_of_week: 1,
    start_time: '07:00',
    end_time: '07:40',
    period_label: 'Jam Ke-1',
    room_name: 'Ruang Kelas',
    class_group_ids: [],
    is_combined_class: false,
    notes: '',
    reason: ''
  });

  // Modal Hapus Jadwal (Wajib Alasan)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('Penghapusan jadwal pelajaran');

  // Load Initial Master
  useEffect(() => {
    fetchInitialMaster();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedYearId) {
      fetchSchedules();
      fetchTimeSlots();
      fetchLessons();
      fetchGeneratorRuns();
    }
  }, [selectedYearId, selectedPresetId, selectedClassId, selectedDay, activeSchoolUnit]);

  const fetchInitialMaster = async () => {
    try {
      const params = activeSchoolUnit?.id ? { satuan_pendidikan_id: activeSchoolUnit.id } : {};
      const [ayRes, cgRes, subRes, exRes, empRes, suRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }),
        api.get('/akademik/class-groups', { params }),
        api.get('/akademik/subjects', { params }),
        api.get('/akademik/extracurriculars', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/kepegawaian/employees', { params: { per_page: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get('/core/school-units').catch(() => ({ data: { data: [] } }))
      ]);

      const ays = ayRes.data?.data || [];
      setAcademicYears(ays);
      const activeAy = ays.find(y => y.is_active) || ays[0];
      if (activeAy) {
        setSelectedYearId(activeAy.id);
        setWizardForm(prev => ({ ...prev, minutesPerJp: activeAy.minutes_per_jp || 40 }));
      }

      setClassGroups(cgRes.data?.data || []);
      setSubjectsList(subRes.data?.data || []);
      setExtrasList(exRes.data?.data || []);
      const teachersList = empRes.data?.data?.items || (Array.isArray(empRes.data?.data) ? empRes.data.data : []);
      setTeachers(teachersList);
      const unitsList = suRes.data?.data?.items || (Array.isArray(suRes.data?.data) ? suRes.data.data : []);
      setSchoolUnitsList(Array.isArray(unitsList) ? unitsList : []);
    } catch (err) {
      console.error('Error fetching master for schedules:', err);
    }
  };

  // ==========================================
  // FETCHERS
  // ==========================================
  const fetchTimeSlots = async () => {
    try {
      const res = await api.get('/akademik/timetable/time-slots', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId }
      });
      setTimeSlots(res.data?.data || []);
    } catch (e) {}
  };

  const fetchLessons = async () => {
    try {
      const res = await api.get('/akademik/timetable/lessons', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId }
      });
      setLessonsList(res.data?.data || []);
    } catch (e) {}
  };

  const fetchTeacherAvailabilities = async (teacherId) => {
    if (!teacherId || !selectedYearId) return;
    try {
      const res = await api.get('/akademik/timetable/availabilities/teachers', {
        params: { academic_year_id: selectedYearId, teacher_employee_id: teacherId }
      });
      setTeacherAvailabilities(res.data?.data || []);
    } catch (e) {}
  };

  const fetchClassAvailabilities = async (classId) => {
    if (!classId || !selectedYearId) return;
    try {
      const res = await api.get('/akademik/timetable/availabilities/classes', {
        params: { academic_year_id: selectedYearId, class_group_id: classId }
      });
      setClassAvailabilities(res.data?.data || []);
    } catch (e) {}
  };

  const fetchGeneratorRuns = async () => {
    try {
      const res = await api.get('/akademik/timetable/runs', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId }
      });
      const runs = res.data?.data || [];
      setGeneratorRuns(runs);
      if (runs.length > 0 && !activeRun) {
        handleSelectRun(runs[0].id);
      }
    } catch (e) {}
  };

  const handleSelectRun = async (runId) => {
    try {
      const res = await api.get(`/akademik/timetable/runs/${runId}`);
      setActiveRun(res.data?.data || null);
    } catch (e) {}
  };

  const fetchSchedules = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        satuan_pendidikan_id: activeSchoolUnit?.id,
        academic_year_id: selectedYearId || undefined,
        preset_id: selectedPresetId || undefined,
        class_group_id: selectedClassId || undefined,
        day_of_week: selectedDay || undefined
      };

      const [schRes, preRes] = await Promise.all([
        api.get('/akademik/schedules', { params }),
        api.get('/akademik/schedule-presets', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId || undefined }
        })
      ]);

      const schList = schRes.data?.data || [];
      const preList = preRes.data?.data || [];

      setSchedules(schList);
      setPresets(preList);

      const activeP = preList.find(p => p.is_active);
      setActivePreset(activeP || null);
      if (!selectedPresetId && activeP) {
        setSelectedPresetId(activeP.id);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setErrorMsg('Gagal memuat data jadwal pelajaran');
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = {
        satuan_pendidikan_id: activeSchoolUnit?.id,
        academic_year_id: selectedYearId || undefined
      };
      const res = await api.get('/akademik/schedules/logs', { params });
      setScheduleLogs(res.data?.data || []);
    } catch (err) {
      console.error('Gagal memuat riwayat log jadwal:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Helper Auto-calculate End Time based on Start Time and Duration
  const addMinutesToTime = (timeStr, minutesToAdd) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + parseInt(minutesToAdd, 10);
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // ==========================================
  // ACTIONS TAHAP 1: STRUKTUR WAKTU
  // ==========================================
  const handleOpenAddTimeSlot = (dayId = 1) => {
    setEditingTimeSlot(null);
    const existingForDay = timeSlots.filter(s => s.day_of_week === dayId);
    const nextIndex = existingForDay.length + 1;
    const lastSlot = existingForDay[existingForDay.length - 1];
    const nextStart = lastSlot ? lastSlot.end_time : '07:00';
    const nextEnd = addMinutesToTime(nextStart, minutesPerJp);

    setTimeSlotForm({
      day_of_week: dayId,
      period_index: nextIndex,
      start_time: nextStart,
      end_time: nextEnd,
      type: 'lesson',
      label: `Jam Ke-${nextIndex}`,
      is_generator_usable: true
    });
    setTimeSlotModalOpen(true);
  };

  const handleOpenEditTimeSlot = (slot) => {
    setEditingTimeSlot(slot);
    setTimeSlotForm({
      id: slot.id,
      day_of_week: slot.day_of_week,
      period_index: slot.period_index,
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: slot.type || 'lesson',
      label: slot.label || '',
      is_generator_usable: slot.is_generator_usable !== false
    });
    setTimeSlotModalOpen(true);
  };

  const handleSaveTimeSlot = async (e) => {
    e.preventDefault();
    if (!timeSlotForm.start_time || !timeSlotForm.end_time) {
      alert('Jam mulai dan jam selesai wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...timeSlotForm,
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: parseInt(selectedYearId, 10),
        is_generator_usable: timeSlotForm.type === 'lesson' ? timeSlotForm.is_generator_usable : false
      };
      await api.post('/akademik/timetable/time-slots', payload);
      setSuccessMsg('Rentang waktu berhasil disimpan!');
      setTimeSlotModalOpen(false);
      fetchTimeSlots();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan rentang waktu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimeSlot = async (slotId) => {
    if (!window.confirm('Hapus rentang waktu ini?')) return;
    try {
      await api.delete(`/akademik/timetable/time-slots/${slotId}`);
      setSuccessMsg('Rentang waktu berhasil dihapus');
      fetchTimeSlots();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus rentang waktu');
    }
  };

  // Generate Pola Waktu Otomatis (Wizard)
  const handleExecutePatternWizard = async (e) => {
    e.preventDefault();
    if (!window.confirm('Pola rentang waktu baru akan dibuat untuk hari Senin s.d. Sabtu sesuai durasi JP struktur kurikulum. Lanjutkan?')) return;
    setSaving(true);
    try {
      const duration = parseInt(wizardForm.minutesPerJp, 10) || 40;
      const daysToGenerate = [
        { id: 1, count: wizardForm.periodsSeninKamis },
        { id: 2, count: wizardForm.periodsSeninKamis },
        { id: 3, count: wizardForm.periodsSeninKamis },
        { id: 4, count: wizardForm.periodsSeninKamis },
        { id: 5, count: wizardForm.periodsJumat },
        { id: 6, count: wizardForm.periodsSabtu }
      ];

      for (const d of daysToGenerate) {
        let currentTime = wizardForm.startTime;
        let pIndex = 1;

        for (let i = 1; i <= d.count; i++) {
          // Cek apakah ada istirahat 1
          if (wizardForm.breakAfterPeriod1 && (i - 1) === parseInt(wizardForm.breakAfterPeriod1, 10)) {
            const breakEnd = addMinutesToTime(currentTime, wizardForm.breakDuration1);
            await api.post('/akademik/timetable/time-slots', {
              satuan_pendidikan_id: activeSchoolUnit?.id || 1,
              academic_year_id: parseInt(selectedYearId, 10),
              day_of_week: d.id,
              period_index: pIndex++,
              start_time: currentTime,
              end_time: breakEnd,
              type: 'break',
              label: wizardForm.breakLabel1 || 'Istirahat',
              is_generator_usable: false
            });
            currentTime = breakEnd;
          }

          // Cek apakah ada istirahat 2 / Sholat
          if (wizardForm.breakAfterPeriod2 && (i - 1) === parseInt(wizardForm.breakAfterPeriod2, 10) && d.id !== 5) {
            const breakEnd2 = addMinutesToTime(currentTime, wizardForm.breakDuration2);
            await api.post('/akademik/timetable/time-slots', {
              satuan_pendidikan_id: activeSchoolUnit?.id || 1,
              academic_year_id: parseInt(selectedYearId, 10),
              day_of_week: d.id,
              period_index: pIndex++,
              start_time: currentTime,
              end_time: breakEnd2,
              type: 'activity',
              label: wizardForm.breakLabel2 || 'Sholat Dzuhur & Makan',
              is_generator_usable: false
            });
            currentTime = breakEnd2;
          }

          // Slot Jam Pelajaran (JP)
          const jpEnd = addMinutesToTime(currentTime, duration);
          await api.post('/akademik/timetable/time-slots', {
            satuan_pendidikan_id: activeSchoolUnit?.id || 1,
            academic_year_id: parseInt(selectedYearId, 10),
            day_of_week: d.id,
            period_index: pIndex++,
            start_time: currentTime,
            end_time: jpEnd,
            type: 'lesson',
            label: `Jam Ke-${i}`,
            is_generator_usable: true
          });
          currentTime = jpEnd;
        }
      }

      setSuccessMsg('Pola rentang waktu JP & Non-JP berhasil digenerate otomatis!');
      setWizardModalOpen(false);
      fetchTimeSlots();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengeksekusi generator pola waktu');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIONS TAHAP 2: BEBAN PELAJARAN (LESSONS)
  // ==========================================
  const handleSyncLessonsFromDuties = async () => {
    try {
      setSaving(true);
      const res = await api.post('/akademik/timetable/lessons/sync', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedYearId
      });
      setSuccessMsg(res.data?.message || 'Beban pelajaran berhasil disinkronkan dari Struktur Kurikulum & Tugas Mengajar!');
      fetchLessons();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyinkronkan beban pelajaran');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.name.trim()) {
      alert('Nama pembelajaran wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...lessonForm,
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: parseInt(selectedYearId, 10),
        is_active: lessonForm.teacher_ids && lessonForm.teacher_ids.length > 0
      };
      await api.post('/akademik/timetable/lessons', payload);
      setSuccessMsg('Beban pelajaran berhasil disimpan!');
      setLessonModalOpen(false);
      fetchLessons();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan beban pelajaran');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Hapus beban pelajaran ini?')) return;
    try {
      await api.delete(`/akademik/timetable/lessons/${lessonId}`);
      setSuccessMsg('Beban pelajaran berhasil dihapus');
      fetchLessons();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus beban pelajaran');
    }
  };

  // ==========================================
  // ACTIONS TAHAP 3: ATURAN WAKTU KHUSUS (CONSTRAINTS)
  // ==========================================
  const handleToggleTeacherSlotAvail = async (dayId, periodIndex, currentStatus) => {
    if (!selectedTeacherForAvail || !selectedYearId) return;
    let nextStatus = 'available';
    if (currentStatus === 'available' || !currentStatus) nextStatus = 'unavailable';
    else if (currentStatus === 'unavailable') nextStatus = 'avoid';
    else nextStatus = 'available';

    try {
      await api.post('/akademik/timetable/availabilities/teachers/bulk', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedYearId,
        teacher_employee_id: selectedTeacherForAvail,
        items: [{ day_of_week: dayId, period_index: periodIndex, status: nextStatus }]
      });
      fetchTeacherAvailabilities(selectedTeacherForAvail);
    } catch (e) {}
  };

  const handleToggleClassSlotAvail = async (dayId, periodIndex, currentStatus) => {
    if (!selectedClassForAvail || !selectedYearId) return;
    const nextStatus = (currentStatus === 'unavailable' || currentStatus === 'blocked') ? 'available' : 'unavailable';
    try {
      await api.post('/akademik/timetable/availabilities/classes/bulk', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedYearId,
        class_group_id: selectedClassForAvail,
        items: [{ day_of_week: dayId, period_index: periodIndex, status: nextStatus }]
      });
      fetchClassAvailabilities(selectedClassForAvail);
    } catch (e) {}
  };

  // ==========================================
  // ACTIONS TAHAP 4: TIMETABLE AUTO-GENERATOR
  // ==========================================
  const handleRunGenerator = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await api.post('/akademik/timetable/generate', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedYearId,
        name: `Generate Otomatis #${new Date().toLocaleTimeString('id-ID')}`
      });
      setGeneratorReport(res.data?.data || null);
      setSuccessMsg(res.data?.message || 'Penjadwalan otomatis selesai!');
      fetchGeneratorRuns();
      if (res.data?.data?.run_id) {
        handleSelectRun(res.data.data.run_id);
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menjalankan generator jadwal');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishRun = async (runId) => {
    if (!window.confirm('Yakin ingin mempublikasikan jadwal ini sebagai Jadwal Resmi Aktif sekolah? Jadwal lama akan digantikan.')) return;
    try {
      setSaving(true);
      await api.post(`/akademik/timetable/runs/${runId}/publish`);
      setSuccessMsg('Jadwal resmi berhasil dipublikasikan!');
      fetchSchedules();
      fetchGeneratorRuns();
      setMainTab('stage5_editor');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mempublikasikan jadwal');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIONS TAHAP 5: VISUAL JADWAL (EDITOR & MONITORING)
  // ==========================================
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setForm({
      schedule_type: 'mapel',
      subject_id: subjectsList.length > 0 ? subjectsList[0].id : '',
      extracurricular_id: extrasList.length > 0 ? extrasList[0].id : '',
      teacher_employee_id: teachers.length > 0 ? teachers[0].id : '',
      day_of_week: selectedDay ? parseInt(selectedDay, 10) : 1,
      start_time: '07:00',
      end_time: addMinutesToTime('07:00', minutesPerJp),
      period_label: 'Jam Ke-1',
      room_name: 'Ruang Kelas',
      class_group_ids: selectedClassId ? [parseInt(selectedClassId, 10)] : (classGroups.length > 0 ? [classGroups[0].id] : []),
      is_combined_class: false,
      notes: '',
      reason: 'Penambahan alokasi jadwal pelajaran'
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (sch) => {
    setEditingSchedule(sch);
    setForm({
      schedule_type: sch.schedule_type || 'mapel',
      subject_id: sch.subject_id || '',
      extracurricular_id: sch.extracurricular_id || '',
      teacher_employee_id: sch.teacher_employee_id || '',
      day_of_week: sch.day_of_week || 1,
      start_time: sch.start_time || '07:00',
      end_time: sch.end_time || addMinutesToTime(sch.start_time || '07:00', minutesPerJp),
      period_label: sch.period_label || '',
      room_name: sch.room_name || '',
      class_group_ids: sch.class_groups ? sch.class_groups.map(c => c.id) : [],
      is_combined_class: !!sch.is_combined_class,
      notes: sch.notes || '',
      reason: 'Penyesuaian jam tatap muka / ruangan / pengampu'
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (form.class_group_ids.length === 0) {
      setErrorMsg('Pilih minimal 1 rombongan belajar untuk jadwal ini');
      return;
    }
    if (form.schedule_type === 'mapel' && !form.subject_id) {
      setErrorMsg('Pilih mata pelajaran');
      return;
    }
    if (form.schedule_type === 'ekskul' && !form.extracurricular_id) {
      setErrorMsg('Pilih ekstrakurikuler');
      return;
    }
    if (editingSchedule && (!form.reason || !form.reason.trim())) {
      setErrorMsg('Alasan perubahan wajib diisi untuk pencatatan riwayat perubahan');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: parseInt(selectedYearId, 10),
        preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
        schedule_type: form.schedule_type,
        subject_id: form.schedule_type === 'mapel' ? form.subject_id : null,
        extracurricular_id: form.schedule_type === 'ekskul' ? form.extracurricular_id : null,
        teacher_employee_id: form.teacher_employee_id || null,
        day_of_week: parseInt(form.day_of_week, 10),
        start_time: form.start_time,
        end_time: form.end_time,
        period_label: form.period_label || null,
        room_name: form.room_name || null,
        class_group_ids: form.class_group_ids,
        is_combined_class: form.class_group_ids.length > 1 || form.is_combined_class,
        notes: form.notes || null,
        reason: form.reason || (editingSchedule ? 'Perubahan jadwal pelajaran' : 'Penambahan jadwal pelajaran')
      };

      if (editingSchedule) {
        await api.put(`/akademik/schedules/${editingSchedule.id}`, payload);
        setSuccessMsg('Jadwal pelajaran berhasil diperbarui!');
      } else {
        await api.post('/akademik/schedules', payload);
        setSuccessMsg('Jadwal pelajaran baru berhasil ditambahkan!');
      }

      setModalOpen(false);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan jadwal pelajaran');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    if (!deleteReason.trim()) {
      alert('Alasan penghapusan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/akademik/schedules/${scheduleToDelete.id}`, {
        data: { reason: deleteReason.trim() }
      });
      setSuccessMsg('Jadwal pelajaran berhasil dihapus!');
      setDeleteModalOpen(false);
      setScheduleToDelete(null);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus jadwal');
    } finally {
      setSaving(false);
    }
  };

  // Group schedules by Day for Calendar View
  const schedulesByDay = DAYS.map(day => ({
    ...day,
    items: schedules.filter(s => s.day_of_week === day.id)
  }));

  // KPI Calculations
  const totalLessonHours = lessonsList.reduce((acc, l) => acc + (parseInt(l.total_hours_per_week, 10) || 0), 0);
  const readyLessons = lessonsList.filter(l => l.teacher_ids && l.teacher_ids.length > 0 && l.is_active !== false);
  const unassignedLessons = lessonsList.filter(l => !l.teacher_ids || l.teacher_ids.length === 0 || l.is_active === false);
  const currentSelectedPreset = presets.find(p => p.id == selectedPresetId) || activePreset;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER UTAMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              Sistem Penjadwalan Pembelajaran (Timetable)
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Unit: {activeSchoolUnit?.name || 'Semua Unit'}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Standar Durasi: <b>{minutesPerJp} Menit / JP</b></span>
            </span>
            {activePreset && (
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Jadwal Aktif: {activePreset.name}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Alur penyusunan jadwal terstruktur: Rentang Waktu (JP & Non-JP) ➔ Beban Pelajaran ➔ Aturan Ketersediaan ➔ Auto-Generator Anti-Bentrok ➔ Visual Editor.
          </p>
        </div>

        {/* Global Toolbar Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tahun Ajaran Selector */}
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-950 text-xs focus:ring-2 focus:ring-teal-500 shadow-2xs"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                TA {y.name} {y.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => { fetchTimeSlots(); fetchLessons(); fetchSchedules(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan data dari database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 5-STAGE NAVIGATION STEPPER HEADER          */}
      {/* ========================================== */}
      <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs font-bold">
          {/* 1. TAHAP 1: STRUKTUR WAKTU */}
          <button
            type="button"
            onClick={() => setMainTab('stage1_time')}
            className={`flex items-center gap-2.5 p-3 rounded-xl transition text-left cursor-pointer ${
              mainTab === 'stage1_time'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md ring-2 ring-teal-400'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
              mainTab === 'stage1_time' ? 'bg-slate-950 text-teal-400' : 'bg-slate-800 text-slate-300'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <div className="truncate">1. Struktur Waktu</div>
              <div className={`text-[10px] font-normal truncate ${mainTab === 'stage1_time' ? 'text-teal-950 font-semibold' : 'text-slate-400'}`}>
                {timeSlots.length} Rentang JP & Non-JP
              </div>
            </div>
          </button>

          {/* 2. TAHAP 2: BEBAN PELAJARAN */}
          <button
            type="button"
            onClick={() => setMainTab('stage2_lessons')}
            className={`flex items-center gap-2.5 p-3 rounded-xl transition text-left cursor-pointer ${
              mainTab === 'stage2_lessons'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md ring-2 ring-teal-400'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
              mainTab === 'stage2_lessons' ? 'bg-slate-950 text-teal-400' : 'bg-slate-800 text-slate-300'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <div className="truncate">2. Beban Pelajaran</div>
              <div className={`text-[10px] font-normal truncate ${mainTab === 'stage2_lessons' ? 'text-teal-950 font-semibold' : 'text-slate-400'}`}>
                {lessonsList.length} Sesi ({readyLessons.length} Siap Guru)
              </div>
            </div>
          </button>

          {/* 3. TAHAP 3: ATURAN KHUSUS */}
          <button
            type="button"
            onClick={() => setMainTab('stage3_constraints')}
            className={`flex items-center gap-2.5 p-3 rounded-xl transition text-left cursor-pointer ${
              mainTab === 'stage3_constraints'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md ring-2 ring-teal-400'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
              mainTab === 'stage3_constraints' ? 'bg-slate-950 text-teal-400' : 'bg-slate-800 text-slate-300'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <div className="truncate">3. Aturan Khusus</div>
              <div className={`text-[10px] font-normal truncate ${mainTab === 'stage3_constraints' ? 'text-teal-950 font-semibold' : 'text-slate-400'}`}>
                Ketersediaan Guru/Rombel
              </div>
            </div>
          </button>

          {/* 4. TAHAP 4: AUTO-GENERATOR */}
          <button
            type="button"
            onClick={() => setMainTab('stage4_generator')}
            className={`flex items-center gap-2.5 p-3 rounded-xl transition text-left cursor-pointer ${
              mainTab === 'stage4_generator'
                ? 'bg-indigo-500 text-white font-black shadow-md ring-2 ring-indigo-400'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
              mainTab === 'stage4_generator' ? 'bg-indigo-950 text-amber-300' : 'bg-slate-800 text-amber-300'
            }`}>
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="truncate flex items-center gap-1">
                <span>4. Auto-Generator</span>
              </div>
              <div className={`text-[10px] font-normal truncate ${mainTab === 'stage4_generator' ? 'text-indigo-100 font-semibold' : 'text-slate-400'}`}>
                {generatorRuns.length} Riwayat Generate
              </div>
            </div>
          </button>

          {/* 5. TAHAP 5: VISUAL JADWAL (EDITOR) */}
          <button
            type="button"
            onClick={() => setMainTab('stage5_editor')}
            className={`flex items-center gap-2.5 p-3 rounded-xl transition text-left cursor-pointer ${
              mainTab === 'stage5_editor'
                ? 'bg-teal-500 text-slate-950 font-black shadow-md ring-2 ring-teal-400'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
              mainTab === 'stage5_editor' ? 'bg-slate-950 text-teal-400' : 'bg-slate-800 text-slate-300'
            }`}>
              5
            </div>
            <div className="min-w-0">
              <div className="truncate">5. Visual Jadwal</div>
              <div className={`text-[10px] font-normal truncate ${mainTab === 'stage5_editor' ? 'text-teal-950 font-semibold' : 'text-slate-400'}`}>
                {schedules.length} Sesi Terjadwal
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. TAHAP 1: STRUKTUR WAKTU & RENTANG JAM   */}
      {/* ========================================== */}
      {mainTab === 'stage1_time' && (
        <div className="space-y-6">
          {/* Info Stage Card */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-teal-400 text-teal-950 font-black text-xs rounded-full uppercase tracking-wider">
                  Tahap 1
                </span>
                <span className="text-xs text-teal-200">Penetapan Rentang Waktu (JP & Non-JP)</span>
              </div>
              <h3 className="text-xl font-black">Struktur Waktu Harian Sekolah</h3>
              <p className="text-xs text-teal-100 leading-relaxed">
                Tentukan rentang jam harian untuk Senin s.d. Sabtu. Rentang waktu terdiri dari 2 jenis: <b>JP (Jam Pelajaran)</b> dengan durasi baku <b>{minutesPerJp} Menit / JP</b> sesuai Struktur Kurikulum, serta <b>Non-JP (Kegiatan / Istirahat / Sholat)</b>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setWizardModalOpen(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current text-slate-950" />
                <span>⚡ Wizard Pola Waktu Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddTimeSlot(1)}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Rentang Manual</span>
              </button>
            </div>
          </div>

          {/* Filter Hari & Daftar Slot */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter Hari:</span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSlotDayFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      slotDayFilter === '' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua Hari
                  </button>
                  {DAYS.slice(0, 6).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSlotDayFilter(String(d.id))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        slotDayFilter === String(d.id) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-slate-500">
                Total <b>{timeSlots.length}</b> slot waktu terdaftar
              </span>
            </div>

            {/* Grid Kartu Per Hari */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS.slice(0, 6)
                .filter(d => !slotDayFilter || slotDayFilter === String(d.id))
                .map(day => {
                  const daySlots = timeSlots
                    .filter(s => s.day_of_week === day.id)
                    .sort((a, b) => a.period_index - b.period_index);
                  const jpSlots = daySlots.filter(s => s.type === 'lesson');
                  const nonJpSlots = daySlots.filter(s => s.type !== 'lesson');

                  return (
                    <div key={day.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-2xs">
                      <div className="bg-slate-200/80 px-4 py-3 font-black text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-teal-700" />
                          <span>{day.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                            {jpSlots.length} JP
                          </span>
                          {nonJpSlots.length > 0 && (
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                              {nonJpSlots.length} Non-JP
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 space-y-2 flex-1">
                        {daySlots.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs">
                            <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            <p>Belum ada rentang waktu untuk hari {day.name}.</p>
                            <button
                              type="button"
                              onClick={() => handleOpenAddTimeSlot(day.id)}
                              className="mt-2 text-[11px] font-bold text-teal-600 hover:text-teal-800"
                            >
                              + Tambah Slot Jam
                            </button>
                          </div>
                        ) : (
                          daySlots.map(s => {
                            const isJp = s.type === 'lesson';
                            return (
                              <div
                                key={s.id}
                                className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 shadow-2xs ${
                                  isJp
                                    ? 'bg-white border-teal-200 hover:border-teal-300'
                                    : s.type === 'break'
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-purple-50/70 border-purple-200'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                      isJp
                                        ? 'bg-teal-600 text-white'
                                        : s.type === 'break'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-purple-600 text-white'
                                    }`}>
                                      {isJp ? 'JP' : 'NON-JP'}
                                    </span>
                                    <span className="font-extrabold text-xs text-slate-800">{s.label || `Jam Ke-${s.period_index}`}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                                    <span>{s.start_time} - {s.end_time}</span>
                                    {isJp && <span className="text-[10px] text-teal-700 font-bold">({minutesPerJp}m)</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTimeSlot(s)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100"
                                    title="Edit rentang waktu"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTimeSlot(s.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Hapus rentang waktu"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="p-2 bg-slate-100 border-t border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAddTimeSlot(day.id)}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center justify-center gap-1 w-full py-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Slot {day.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. TAHAP 2: BEBAN PELAJARAN (LESSONS)      */}
      {/* ========================================== */}
      {mainTab === 'stage2_lessons' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-teal-400 text-teal-950 font-black text-xs rounded-full uppercase tracking-wider">
                  Tahap 2
                </span>
                <span className="text-xs text-teal-200">Kebutuhan Beban Belajar & Validasi Guru</span>
              </div>
              <h3 className="text-xl font-black">Beban Pelajaran Per Rombel & Kuota JP</h3>
              <p className="text-xs text-teal-100 leading-relaxed">
                Menghitung alokasi kuota JP mata pelajaran per rombel dari <b>Struktur Kurikulum</b> dan mencocokkannya dengan <b>Pembagian Tugas Mengajar</b>. Pembelajaran yang <b>belum ada guru yang ditugaskan TIDAK BISA dialokasikan jadwalnya</b>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleSyncLessonsFromDuties}
                disabled={saving}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-current text-slate-950" />
                <span>🔄 Sinkronkan dari Kurikulum & Tugas Mengajar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingLesson(null);
                  setLessonForm({
                    type: 'mapel',
                    subject_id: subjectsList[0]?.id || '',
                    extracurricular_id: '',
                    name: '',
                    total_hours_per_week: 2,
                    duration_per_session: 2,
                    room_name: '',
                    is_joined_class: false,
                    target_class_ids: classGroups[0] ? [classGroups[0].id] : [],
                    teacher_ids: teachers[0] ? [teachers[0].id] : []
                  });
                  setLessonModalOpen(true);
                }}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Manual</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Kebutuhan JP</span>
              <h4 className="text-xl font-black text-slate-800 mt-1">{totalLessonHours} JP / Pekan</h4>
              <span className="text-[10px] text-slate-400">Target Kurikulum Sekolah</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Unit Pembelajaran</span>
              <h4 className="text-xl font-black text-indigo-700 mt-1">{lessonsList.length} Sesi Kelas</h4>
              <span className="text-[10px] text-slate-400">Mapel & Ekstrakurikuler</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Siap Dijadwalkan</span>
              <h4 className="text-xl font-black text-emerald-700 mt-1">{readyLessons.length} Unit (Ada Guru)</h4>
              <span className="text-[10px] text-emerald-600 font-bold">100% Siap dialokasikan</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Belum Ada Guru</span>
              <h4 className={`text-xl font-black mt-1 ${unassignedLessons.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {unassignedLessons.length} Unit
              </h4>
              <span className="text-[10px] text-rose-500 font-bold">
                {unassignedLessons.length > 0 ? 'Wajib ditugaskan guru' : 'Semua sudah beres'}
              </span>
            </div>
          </div>

          {/* Alert Warning if unassigned lessons exist */}
          {unassignedLessons.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-extrabold text-sm">Peringatan: Terdapat {unassignedLessons.length} Pembelajaran Tanpa Guru Pengampu</h5>
                <p className="mt-0.5 leading-relaxed">
                  Sesuai aturan sistem, pembelajaran yang belum memiliki guru pengampu <b>tidak akan dialokasikan pada jadwal pelajaran</b>. Silakan tetapkan guru di menu <b>Pembagian Tugas Mengajar (Modul Kurikulum)</b> lalu klik tombol <b>"Sinkronkan dari Kurikulum"</b>.
                </p>
              </div>
            </div>
          )}

          {/* Table Beban Pelajaran */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter Rombel:</span>
                <select
                  value={lessonFilterClass}
                  onChange={(e) => setLessonFilterClass(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">Semua Rombel</option>
                  {classGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>{cg.name}</option>
                  ))}
                </select>

                <span className="text-xs font-bold text-slate-700 ml-2">Status:</span>
                <select
                  value={lessonFilterStatus}
                  onChange={(e) => setLessonFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="all">Semua Status</option>
                  <option value="ready">Siap (Sudah Ada Guru)</option>
                  <option value="unassigned">Belum Ada Guru (Perlu Guru)</option>
                </select>
              </div>

              <span className="text-xs text-slate-500">
                Menampilkan {lessonsList.length} pembelajaran
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Mata Pelajaran / Unit</th>
                    <th className="p-3">Rombel Sasaran</th>
                    <th className="p-3">Guru Pengampu</th>
                    <th className="p-3 text-center">Beban JP/Pekan</th>
                    <th className="p-3 text-center">Durasi / Sesi</th>
                    <th className="p-3 text-center">Status Jadwal</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lessonsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Belum ada beban pelajaran. Klik tombol <b>"🔄 Sinkronkan dari Kurikulum & Tugas Mengajar"</b> di atas.
                      </td>
                    </tr>
                  ) : (
                    lessonsList
                      .filter(l => {
                        if (lessonFilterClass && !(l.target_class_ids || []).includes(parseInt(lessonFilterClass, 10))) return false;
                        const hasTeacher = l.teacher_ids && l.teacher_ids.length > 0;
                        if (lessonFilterStatus === 'ready' && !hasTeacher) return false;
                        if (lessonFilterStatus === 'unassigned' && hasTeacher) return false;
                        return true;
                      })
                      .map((les, idx) => {
                        const classNames = (les.target_class_ids || []).map(cid => classGroups.find(c => c.id === cid)?.name).filter(Boolean);
                        const teacherObjs = (les.teacher_ids || []).map(tid => teachers.find(t => t.id === tid)).filter(Boolean);
                        const hasTeacher = teacherObjs.length > 0;

                        return (
                          <tr key={les.id} className={`hover:bg-slate-50 transition ${!hasTeacher ? 'bg-rose-50/30' : ''}`}>
                            <td className="p-3 font-semibold text-center text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">
                              <div>
                                <span>{les.name}</span>
                                {les.is_joined_class && (
                                  <span className="ml-1.5 px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-md font-bold text-[9px]">
                                    Rombel Gabungan
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {classNames.map((cn, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 rounded font-semibold text-[10px]">
                                    {cn}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              {hasTeacher ? (
                                <div className="flex flex-wrap gap-1">
                                  {teacherObjs.map((t, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded font-semibold text-[10px]">
                                      {t.full_name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded font-black text-[10px] flex items-center gap-1 w-fit">
                                  <UserX className="w-3 h-3" />
                                  <span>Belum Ada Guru</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-black text-indigo-700 text-xs">
                              {les.total_hours_per_week} JP
                            </td>
                            <td className="p-3 text-center font-semibold text-slate-700">
                              {les.duration_per_session} JP / Sesi
                            </td>
                            <td className="p-3 text-center">
                              {hasTeacher ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                  ✓ Siap Dialokasikan
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold text-[10px]">
                                  ✕ Ditangguhkan
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(les.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Hapus beban pelajaran"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. TAHAP 3: ATURAN WAKTU KHUSUS            */}
      {/* ========================================== */}
      {mainTab === 'stage3_constraints' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 bg-teal-400 text-teal-950 font-black text-xs rounded-full uppercase tracking-wider">
                  Tahap 3
                </span>
                <span className="text-xs text-teal-200">Ketersediaan Waktu & Batasan Khusus</span>
              </div>
              <h3 className="text-xl font-black">Aturan Waktu Khusus (Guru, Rombel & Mapel)</h3>
              <p className="text-xs text-teal-100 leading-relaxed">
                Tandai rentang waktu tertentu dari Tahap 1 yang <b>TIDAK BISA dialokasikan</b> untuk guru tertentu (hari libur/kegiatan lain), rombel tertentu (praktikum/kegiatan pesantren), atau mapel tertentu (misal PJOK hanya di jam pagi).
              </p>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setConstraintTab('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  constraintTab === 'teacher' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ketersediaan Guru
              </button>
              <button
                type="button"
                onClick={() => setConstraintTab('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  constraintTab === 'class' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Ketersediaan Rombel
              </button>
              <button
                type="button"
                onClick={() => setConstraintTab('subject')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  constraintTab === 'subject' ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Batasan Mata Pelajaran
              </button>
            </div>
          </div>

          {/* SUB-TAB A: KETERSEDIAAN GURU */}
          {constraintTab === 'teacher' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">Matriks Ketersediaan Guru Mengajar</h4>
                  <p className="text-xs text-slate-500">Klik pada kotak jam pelajaran untuk mengubah status: Tersedia (Hijau), Libur / Tidak Tersedia (Merah), atau Hindari (Kuning).</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTeacherForAvail}
                    onChange={(e) => {
                      setSelectedTeacherForAvail(e.target.value);
                      fetchTeacherAvailabilities(e.target.value);
                    }}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Pilih Guru Pengampu --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.nip || 'Guru'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedTeacherForAvail ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Silakan pilih guru pada dropdown di atas untuk melihat dan mengatur jadwal ketersediaan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3 text-left border">Hari</th>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                            <th key={p} className="p-2 border">JP {p}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.slice(0, 6).map(day => (
                          <tr key={day.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-left text-slate-800 border bg-slate-50/50">{day.name}</td>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(period => {
                              const avail = teacherAvailabilities.find(a => a.day_of_week === day.id && a.period_index === period);
                              const isUnavailable = avail?.status === 'unavailable';
                              const isAvoid = avail?.status === 'avoid';

                              return (
                                <td
                                  key={period}
                                  onClick={() => handleToggleTeacherSlotAvail(day.id, period, avail?.status)}
                                  className={`p-2.5 border cursor-pointer transition font-black select-none ${
                                    isUnavailable
                                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                      : isAvoid
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                  title="Klik untuk ubah: Tersedia ➔ Libur ➔ Hindari"
                                >
                                  {isUnavailable ? '✕ LIBUR' : isAvoid ? '⚠ HINDARI' : '✓ BISA'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-500 rounded"></span> Tersedia (Bisa Mengajar)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-rose-500 rounded"></span> Tidak Tersedia (Libur / Diblokir)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-amber-400 rounded"></span> Hindari (Preferensi Jam Kosong)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB B: KETERSEDIAAN ROMBEL */}
          {constraintTab === 'class' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">Matriks Waktu KBM Rombongan Belajar</h4>
                  <p className="text-xs text-slate-500">Tandai jam-jam di mana kelas tertentu tidak memiliki KBM (misal waktu kegiatan santri khusus, praktikum, dll.).</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedClassForAvail}
                    onChange={(e) => {
                      setSelectedClassForAvail(e.target.value);
                      fetchClassAvailabilities(e.target.value);
                    }}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {classGroups.map(cg => (
                      <option key={cg.id} value={cg.id}>{cg.name} ({cg.grade_level_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedClassForAvail ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Silakan pilih rombel pada dropdown di atas untuk mengatur jam belajar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 text-left border">Hari</th>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                          <th key={p} className="p-2 border">JP {p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.slice(0, 6).map(day => (
                        <tr key={day.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-left text-slate-800 border bg-slate-50/50">{day.name}</td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(period => {
                            const avail = classAvailabilities.find(a => a.day_of_week === day.id && a.period_index === period);
                            const isUnavailable = avail?.status === 'unavailable';

                            return (
                              <td
                                key={period}
                                onClick={() => handleToggleClassSlotAvail(day.id, period, avail?.status)}
                                className={`p-2.5 border cursor-pointer transition font-black select-none ${
                                  isUnavailable
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                                title="Klik untuk ubah: Tersedia KBM ➔ Waktu Terblokir"
                              >
                                {isUnavailable ? '✕ BLOKIR' : '✓ KBM'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB C: BATASAN MATA PELAJARAN */}
          {constraintTab === 'subject' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-800">Batasan Waktu Khusus Mata Pelajaran</h4>
                <p className="text-xs text-slate-500">Contoh: PJOK / Olahraga diatur hanya boleh di pagi hari (sebelum jam 10:00), atau Tahfidz di jam ke-1 s.d ke-2.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectsList.slice(0, 8).map(sub => (
                  <div key={sub.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-extrabold text-xs text-slate-800">{sub.name}</span>
                      <p className="text-[10px] text-slate-500 font-mono">{sub.code || 'MAPEL'}</p>
                    </div>
                    <select
                      defaultValue="any"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                    >
                      <option value="any">Bebas Sepanjang Hari</option>
                      <option value="morning_only">Hanya Jam Pagi (JP 1-3)</option>
                      <option value="first_periods">Hanya Jam Ke-1 & 2</option>
                      <option value="no_friday">Tidak Boleh Hari Jumat</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 4. TAHAP 4: TIMETABLE AUTO-GENERATOR       */}
      {/* ========================================== */}
      {mainTab === 'stage4_generator' && (
        <div className="space-y-6">
          {/* Generator Hero Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Tahap 4 • AI Timetable Solver</span>
                </span>
                <span className="text-xs text-indigo-200">CSP + Backtracking Heuristic Engine</span>
              </div>
              <h3 className="text-2xl font-black">Generate Jadwal Pelajaran Otomatis (Anti-Bentrok)</h3>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Algoritma solver secara otomatis menempatkan seluruh beban pelajaran ke dalam slot waktu (Tahap 1), mematuhi kuota JP (Tahap 2), penugasan guru, serta ketersediaan guru & rombel (Tahap 3) dengan jaminan <b>0% bentrok guru, rombel, maupun ruangan</b>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleRunGenerator}
                disabled={isGenerating || readyLessons.length === 0}
                className="w-full sm:w-auto px-6 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Menghitung & Menempatkan Sesi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 fill-current text-slate-950" />
                    <span>⚡ JALANKAN AUTO-GENERATOR</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-flight Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tahap 1: Waktu</span>
                <p className="text-sm font-black text-slate-800">{timeSlots.filter(s => s.type === 'lesson').length} JP Tersedia</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tahap 2: Beban JP</span>
                <p className="text-sm font-black text-slate-800">{totalLessonHours} JP Target</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Siap Guru</span>
                <p className="text-sm font-black text-emerald-700">{readyLessons.length} Pelajaran</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Belum Ada Guru</span>
                <p className={`text-sm font-black ${unassignedLessons.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {unassignedLessons.length} (Dilewati)
                </p>
              </div>
            </div>
          </div>

          {/* Generator Result Report */}
          {generatorReport && (
            <div className={`p-6 rounded-2xl border ${
              generatorReport.success ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' : 'bg-amber-50/90 border-amber-300 text-amber-950'
            } shadow-sm space-y-4`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {generatorReport.success ? (
                    <CheckCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-base">
                      {generatorReport.success ? 'Jadwal Berhasil Dihasilkan 100% Bebas Bentrok!' : 'Generate Jadwal Selesai dengan Catatan'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ditempatkan: <b className="text-emerald-700">{generatorReport.placed_lessons} Sesi</b> | Konflik: <b className="text-emerald-700">0 Bentrok</b> | Skor Kualitas: <b className="text-indigo-700">{generatorReport.score}/100</b>
                    </p>
                  </div>
                </div>

                {activeRun && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePublishRun(activeRun.id)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>PUBLIKASIKAN KE JADWAL RESMI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab('stage5_editor')}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Buka di Visual Jadwal (Tahap 5)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {generatorReport.diagnostics && (
                <div className="p-4 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                  <span className="font-bold text-amber-900">Diagnosis & Laporan Solver:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {generatorReport.diagnostics.reasons?.map((r, i) => (
                      <li key={i} className="text-rose-700">{r}</li>
                    ))}
                    {generatorReport.diagnostics.recommendations?.map((rec, i) => (
                      <li key={i} className="text-teal-700 font-semibold">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Generator Runs History & Matrix Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center justify-between">
              <span>Riwayat Hasil Generate ({generatorRuns.length})</span>
            </h4>

            {generatorRuns.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada riwayat generate jadwal. Klik tombol "JALANKAN AUTO-GENERATOR" di atas.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {generatorRuns.map(r => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRun(r.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      activeRun?.id === r.id ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-800">{r.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>Skor: <b className="text-indigo-600">{r.score}/100</b> | Ditempatkan: <b>{r.placed_lessons_count}/{r.total_lessons_count}</b></p>
                      <p>Dibuat: {new Date(r.created_at).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. TAHAP 5: VISUAL JADWAL (EDITOR & HASIL) */}
      {/* ========================================== */}
      {mainTab === 'stage5_editor' && (
        <div className="space-y-6">
          {/* FILTER & PRESET SELECTOR BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filter:
              </span>

              {/* Selector Opsi / Preset Jadwal */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-slate-500">Opsi Jadwal:</span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_active ? '★ (Diberlakukan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rombel */}
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Semua Rombel</option>
                {classGroups.map((cg) => (
                  <option key={cg.id} value={cg.id}>
                    {cg.name} ({cg.type === 'ekstrakurikuler' ? 'Ekskul' : cg.grade_level_name})
                  </option>
                ))}
              </select>

              {/* Hari */}
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Semua Hari</option>
                {DAYS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPresetModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold border border-indigo-200 shadow-2xs"
              >
                Kelola Opsi ({presets.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Sesi Manual</span>
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'calendar' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                1. Kalender Mingguan
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                2. Daftar Tabel Sesi
              </button>
            </div>

            <span className="text-xs text-slate-500">
              Menampilkan <b>{schedules.length} Sesi</b> pada opsi <b>{currentSelectedPreset?.name || 'Reguler'}</b>
            </span>
          </div>

          {/* CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {schedulesByDay.slice(0, 6).map(day => (
                <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                  <div className="bg-teal-50/80 px-4 py-3 font-black text-xs text-teal-950 border-b border-teal-100 flex items-center justify-between">
                    <span>{day.name}</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                      {day.items.length} Sesi
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2 flex-1">
                    {day.items.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-8 italic">Tidak ada jadwal</p>
                    ) : (
                      day.items.map(sch => {
                        const isMapel = sch.schedule_type === 'mapel';
                        return (
                          <div
                            key={sch.id}
                            className={`p-3 rounded-xl border transition shadow-2xs space-y-1.5 ${
                              isMapel ? 'bg-white border-slate-200 hover:border-teal-300' : 'bg-purple-50/50 border-purple-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                {sch.period_label || `${sch.start_time} - ${sch.end_time}`}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(sch)}
                                  className="p-1 text-slate-400 hover:text-teal-700"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScheduleToDelete(sch);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-extrabold text-xs text-slate-900 leading-snug">
                              {sch.subject_name || sch.extra_name || 'Pelajaran'}
                            </h5>

                            <div className="space-y-0.5 text-[10px] text-slate-500">
                              <p className="font-medium text-slate-700 truncate">
                                👨‍🏫 {sch.teacher_name || 'Belum Ada Guru'}
                              </p>
                              <p className="truncate">
                                🏫 {sch.class_groups ? sch.class_groups.map(c => c.name).join(', ') : 'Rombel'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Hari</th>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3">Rombel</th>
                      <th className="p-3">Guru Pengampu</th>
                      <th className="p-3">Ruangan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">Belum ada jadwal pada opsi ini.</td>
                      </tr>
                    ) : (
                      schedules.map(sch => (
                        <tr key={sch.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold">{DAYS.find(d => d.id === sch.day_of_week)?.name || '-'}</td>
                          <td className="p-3 font-mono">{sch.start_time} - {sch.end_time}</td>
                          <td className="p-3 font-bold text-slate-900">{sch.subject_name || sch.extra_name}</td>
                          <td className="p-3">{sch.class_groups?.map(c => c.name).join(', ') || '-'}</td>
                          <td className="p-3">{sch.teacher_name || '-'}</td>
                          <td className="p-3">{sch.room_name || '-'}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(sch)}
                              className="p-1 text-slate-400 hover:text-teal-700 mr-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setScheduleToDelete(sch);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ========================================== */}
      {/* MODAL 1: TAMBAH / EDIT RENTANG WAKTU (SLOT)*/}
      {/* ========================================== */}
      {timeSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-800">
                {editingTimeSlot ? 'Edit Rentang Waktu' : 'Tambah Rentang Waktu (Tahap 1)'}
              </h3>
              <button onClick={() => setTimeSlotModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTimeSlot} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hari</label>
                <select
                  value={timeSlotForm.day_of_week}
                  onChange={(e) => setTimeSlotForm({ ...timeSlotForm, day_of_week: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {DAYS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Rentang Waktu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newEnd = addMinutesToTime(timeSlotForm.start_time, minutesPerJp);
                      setTimeSlotForm({ ...timeSlotForm, type: 'lesson', end_time: newEnd, is_generator_usable: true });
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                      timeSlotForm.type === 'lesson'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    JP (Jam Pelajaran)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlotForm({ ...timeSlotForm, type: 'break', is_generator_usable: false })}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                      timeSlotForm.type !== 'lesson'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Non-JP (Istirahat/Kegiatan)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={timeSlotForm.start_time}
                    onChange={(e) => {
                      const st = e.target.value;
                      const newEnd = timeSlotForm.type === 'lesson' ? addMinutesToTime(st, minutesPerJp) : timeSlotForm.end_time;
                      setTimeSlotForm({ ...timeSlotForm, start_time: st, end_time: newEnd });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={timeSlotForm.end_time}
                    onChange={(e) => setTimeSlotForm({ ...timeSlotForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
              </div>

              {timeSlotForm.type === 'lesson' && (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-900 font-medium">
                  💡 Durasi otomatis dihitung <b>{minutesPerJp} Menit</b> sesuai standar Struktur Kurikulum.
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Label / Nama Periode</label>
                <input
                  type="text"
                  value={timeSlotForm.label}
                  onChange={(e) => setTimeSlotForm({ ...timeSlotForm, label: e.target.value })}
                  placeholder="misal: Jam Ke-1 / Sholat Dhuha"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTimeSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Rentang Waktu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: WIZARD GENERATOR POLA WAKTU       */}
      {/* ========================================== */}
      {wizardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Wizard Generator Pola Waktu Otomatis</h3>
                  <p className="text-[11px] text-slate-500">Membantu membuat pola rentang waktu Senin s.d. Sabtu dalam 1 klik.</p>
                </div>
              </div>
              <button onClick={() => setWizardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePatternWizard} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai Masuk KBM</label>
                  <input
                    type="time"
                    value={wizardForm.startTime}
                    onChange={(e) => setWizardForm({ ...wizardForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi per JP (Menit)</label>
                  <input
                    type="number"
                    value={wizardForm.minutesPerJp}
                    onChange={(e) => setWizardForm({ ...wizardForm, minutesPerJp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Senin-Kamis</label>
                  <input
                    type="number"
                    value={wizardForm.periodsSeninKamis}
                    onChange={(e) => setWizardForm({ ...wizardForm, periodsSeninKamis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumat</label>
                  <input
                    type="number"
                    value={wizardForm.periodsJumat}
                    onChange={(e) => setWizardForm({ ...wizardForm, periodsJumat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sabtu</label>
                  <input
                    type="number"
                    value={wizardForm.periodsSabtu}
                    onChange={(e) => setWizardForm({ ...wizardForm, periodsSabtu: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <span className="font-extrabold text-amber-900">Jeda Istirahat & Kegiatan Non-JP:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Istirahat Pagi (Setelah JP ke-X)</label>
                    <input
                      type="number"
                      value={wizardForm.breakAfterPeriod1}
                      onChange={(e) => setWizardForm({ ...wizardForm, breakAfterPeriod1: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Durasi Istirahat (Menit)</label>
                    <input
                      type="number"
                      value={wizardForm.breakDuration1}
                      onChange={(e) => setWizardForm({ ...wizardForm, breakDuration1: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setWizardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black shadow-md"
                >
                  {saving ? 'Mengenerate...' : 'Generate Pola Waktu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: TAMBAH / EDIT BEBAN PELAJARAN     */}
      {/* ========================================== */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-800">
                {editingLesson ? 'Edit Beban Pelajaran' : 'Tambah Beban Pelajaran Manual'}
              </h3>
              <button onClick={() => setLessonModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  value={lessonForm.subject_id}
                  onChange={(e) => {
                    const sub = subjectsList.find(s => String(s.id) === e.target.value);
                    setLessonForm({
                      ...lessonForm,
                      subject_id: e.target.value,
                      name: sub ? `${sub.name}` : lessonForm.name
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Mapel --</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || '-'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Unit Pembelajaran</label>
                <input
                  type="text"
                  value={lessonForm.name}
                  onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
                  placeholder="misal: Matematika (Kelas 7A)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel Sasaran</label>
                <select
                  value={lessonForm.target_class_ids[0] || ''}
                  onChange={(e) => setLessonForm({ ...lessonForm, target_class_ids: [parseInt(e.target.value, 10)] })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Rombel --</option>
                  {classGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>{cg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Guru Pengampu</label>
                <select
                  value={lessonForm.teacher_ids[0] || ''}
                  onChange={(e) => setLessonForm({ ...lessonForm, teacher_ids: e.target.value ? [parseInt(e.target.value, 10)] : [] })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="">-- Belum Ada Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kuota JP/Pekan</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={lessonForm.total_hours_per_week}
                    onChange={(e) => setLessonForm({ ...lessonForm, total_hours_per_week: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi per Sesi</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={lessonForm.duration_per_session}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration_per_session: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Beban Pelajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: TAMBAH / EDIT SESI JADWAL MANUAL  */}
      {/* ========================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-800">
                {editingSchedule ? 'Edit Sesi Jadwal Pelajaran' : 'Tambah Sesi Jadwal Manual'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hari</label>
                <select
                  value={form.day_of_week}
                  onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {DAYS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || '-'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rombel</label>
                <select
                  value={form.class_group_ids[0] || ''}
                  onChange={(e) => setForm({ ...form, class_group_ids: [parseInt(e.target.value, 10)] })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Rombel --</option>
                  {classGroups.map(cg => (
                    <option key={cg.id} value={cg.id}>{cg.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Guru Pengampu</label>
                <select
                  value={form.teacher_employee_id || ''}
                  onChange={(e) => setForm({ ...form, teacher_employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => {
                      const st = e.target.value;
                      setForm({ ...form, start_time: st, end_time: addMinutesToTime(st, minutesPerJp) });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Perubahan / Catatan</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Catatan untuk audit log riwayat perubahan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 5: KELOLA OPSI JADWAL (PRESETS)      */}
      {/* ========================================== */}
      {presetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Kelola Opsi / Preset Jadwal Pelajaran</span>
              </h3>
              <button onClick={() => setPresetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {presets.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">{p.name}</span>
                      {p.is_active && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full">
                          DIBERLAKUKAN
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.schedules_count || 0} Sesi Jadwal</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!p.is_active && (
                      <button
                        type="button"
                        onClick={async () => {
                          await api.put(`/akademik/schedule-presets/${p.id}/activate`, { reason: 'Pemberlakuan opsi jadwal' });
                          fetchSchedules();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                      >
                        Berlakukan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPresetModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
