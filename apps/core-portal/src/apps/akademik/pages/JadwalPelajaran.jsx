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
  User,
  UserX,
  CheckCheck,
  AlertTriangle,
  ArrowLeftRight,
  Settings,
  Columns3,
  LayoutGrid,
  Grid,
  Maximize2,
  Minimize2,
  Building2
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

// Komponen Input Jam Khusus 24 Jam (00:00 s.d 23:59) Murni
function TimeInput24({ value = '07:00', onChange, disabled = false }) {
  const parts = String(value || '07:00').split(':');
  const rawH = parseInt(parts[0], 10) || 0;
  const rawM = parseInt(parts[1], 10) || 0;
  const hour = String(Math.min(23, Math.max(0, rawH))).padStart(2, '0');
  const minute = String(Math.min(59, Math.max(0, rawM))).padStart(2, '0');

  const handleHourChange = (e) => {
    const newH = e.target.value;
    const newTime = `${newH}:${minute}`;
    if (onChange) onChange(newTime);
  };

  const handleMinuteChange = (e) => {
    const newM = e.target.value;
    const newTime = `${hour}:${newM}`;
    if (onChange) onChange(newTime);
  };

  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 font-mono shadow-2xs">
      <select
        disabled={disabled}
        value={hour}
        onChange={handleHourChange}
        className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 px-2 py-1 cursor-pointer"
      >
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="font-extrabold text-slate-400 text-xs">:</span>
      <select
        disabled={disabled}
        value={minute}
        onChange={handleMinuteChange}
        className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 px-2 py-1 cursor-pointer"
      >
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <span className="text-[10px] font-black text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200 ml-auto select-none">
        24 Jam
      </span>
    </div>
  );
}

// Helper pemformatan jam 24 jam (HH:mm)
function formatTime24(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

// Helper penghitung tinggi konsisten kartu jadwal berdasarkan durasi waktu
function getConsistentCardHeight(startTime, endTime, isRowLayout = false, baseHeight = 68) {
  if (!startTime || !endTime) return baseHeight;
  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (durationMinutes <= 0) return baseHeight;
    // Standar 40 menit per JP = baseHeight (~68px), 80 menit = ~140px
    const scale = Math.max(1, durationMinutes / 40);
    return Math.round(baseHeight * scale);
  } catch (e) {
    return baseHeight;
  }
}

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
  const [allSchoolClassGroups, setAllSchoolClassGroups] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [extrasList, setExtrasList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolUnitsList, setSchoolUnitsList] = useState([]);
  const [teachingDutiesList, setTeachingDutiesList] = useState([]);

  // Searchable select state for Jadwal
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [crossUnitTeacher, setCrossUnitTeacher] = useState(true);

  // View mode in Stage 5: 'matrix' (aSc TimeTables Grid) | 'calendar' (Mingguan) | 'table' (Daftar)
  const [viewMode, setViewMode] = useState('matrix');
  // Matrix Perspective: 'class' (Rombel) | 'teacher' (Guru)
  const [matrixPerspective, setMatrixPerspective] = useState('class');
  // Fullscreen Focus Mode untuk Matriks
  const [isMatrixFullscreen, setIsMatrixFullscreen] = useState(false);
  // Calendar Layout: 'wrap' (responsive grid/wrap) | 'row' (sejajar horizontal 1 baris)
  const [calendarLayout, setCalendarLayout] = useState('wrap');

  // Durasi standar menit per JP dari Struktur Kurikulum / Tahun Ajaran
  const activeYearObj = academicYears.find(y => String(y.id) === String(selectedYearId)) || academicYears[0];
  const minutesPerJp = activeYearObj?.minutes_per_jp || 40;

  // Pilihan Preset Warna untuk Rentang Waktu (JP & Non-JP) dengan Visibilitas dan Kontras Tinggi
  const TIME_SLOT_COLOR_PRESETS = [
    // Nuansa Hijau & Teal
    { label: 'Teal Klasik', value: '#0d9488' },
    { label: 'Emerald Mint', value: '#059669' },
    { label: 'Forest Green', value: '#15803d' },
    { label: 'Lime Segar', value: '#65a30d' },
    // Nuansa Biru & Cyan
    { label: 'Ocean Blue', value: '#0284c7' },
    { label: 'Royal Blue', value: '#2563eb' },
    { label: 'Deep Indigo', value: '#4f46e5' },
    { label: 'Cyan Aqua', value: '#0891b2' },
    // Nuansa Ungu & Pink
    { label: 'Purple Violet', value: '#9333ea' },
    { label: 'Fuchsia Pink', value: '#c026d3' },
    { label: 'Rose Berry', value: '#e11d48' },
    { label: 'Coral Crimson', value: '#dc2626' },
    // Nuansa Hangat & Netral
    { label: 'Amber Gold', value: '#d97706' },
    { label: 'Tangerine Orange', value: '#ea580c' },
    { label: 'Bronze Warm', value: '#b45309' },
    { label: 'Slate Charcoal', value: '#475569' }
  ];

  // ==========================================
  // TAHAP 1: STRUKTUR WAKTU (TIME SLOTS)
  // ==========================================
  const [timeSlots, setTimeSlots] = useState([]);
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [timeSlotModalOpen, setTimeSlotModalOpen] = useState(false);
  const [slotDayFilter, setSlotDayFilter] = useState('');
  // Time Slot Layout: 'wrap' (responsive grid) | 'row' (sejajar horizontal 1 baris)
  const [timeSlotLayout, setTimeSlotLayout] = useState('wrap');
  const [timeSlotForm, setTimeSlotForm] = useState({
    day_of_week: 1,
    selected_days: [1, 2, 3, 4, 5, 6], // Multi-day support
    period_index: 1,
    start_time: '07:00',
    end_time: '07:40',
    type: 'lesson', // 'lesson' (JP) | 'break' (Non-JP Istirahat) | 'activity' (Non-JP Kegiatan)
    label: 'Jam Ke-1',
    color: '#0d9488',
    is_generator_usable: true
  });

  // State Ghost Preview Slot saat Hover Area Kosong Kalender
  const [hoverGridSlot, setHoverGridSlot] = useState(null); // { dayId, topPx, heightPx, startTime, endTime }

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

  // Modal Salin Struktur Waktu (Lintas Tahun Ajaran / Lintas Satuan Pendidikan / Opsi Jadwal)
  const [copyTimeSlotModalOpen, setCopyTimeSlotModalOpen] = useState(false);
  const [sourceYearsList, setSourceYearsList] = useState([]);
  const [loadingSourceYears, setLoadingSourceYears] = useState(false);
  const [sourcePresetsList, setSourcePresetsList] = useState([]);
  const [loadingSourcePresets, setLoadingSourcePresets] = useState(false);
  const [copyTimeSlotForm, setCopyTimeSlotForm] = useState({
    source_satuan_pendidikan_id: '',
    source_academic_year_id: '',
    source_preset_id: '',
    replace_existing: true
  });

  // 1. Fetch Tahun Ajaran Sumber secara dinamis saat Satuan Pendidikan Sumber dipilih
  useEffect(() => {
    if (!copyTimeSlotModalOpen) return;
    const fetchSourceYears = async () => {
      setLoadingSourceYears(true);
      try {
        const unitId = copyTimeSlotForm.source_satuan_pendidikan_id || activeSchoolUnit?.id;
        const params = unitId ? { satuan_pendidikan_id: unitId } : {};
        const res = await api.get('/akademik/academic-years', { params });
        const list = res.data?.data || [];
        setSourceYearsList(list);

        // Jika source_academic_year_id saat ini tidak ada di list unit tersebut, pilihkan tahun ajaran aktif atau yang pertama
        if (!list.some(y => String(y.id) === String(copyTimeSlotForm.source_academic_year_id))) {
          const currentYearObj = academicYears.find(y => String(y.id) === String(selectedYearId));
          const sameNameYear = currentYearObj ? list.find(y => y.name === currentYearObj.name) : null;
          const actY = sameNameYear || list.find(y => y.is_active) || list[0];
          setCopyTimeSlotForm(prev => ({
            ...prev,
            source_academic_year_id: actY ? String(actY.id) : ''
          }));
        }
      } catch (err) {
        console.warn('Gagal memuat tahun ajaran sumber:', err);
        setSourceYearsList([]);
      } finally {
        setLoadingSourceYears(false);
      }
    };

    fetchSourceYears();
  }, [copyTimeSlotModalOpen, copyTimeSlotForm.source_satuan_pendidikan_id]);

  // 2. Fetch Preset / Opsi Jadwal Sumber secara dinamis saat Satuan Pendidikan & Tahun Ajaran Sumber berubah
  useEffect(() => {
    if (!copyTimeSlotModalOpen) return;
    if (!copyTimeSlotForm.source_academic_year_id) {
      setSourcePresetsList([]);
      setCopyTimeSlotForm(prev => ({ ...prev, source_preset_id: '' }));
      return;
    }

    const fetchSourcePresets = async () => {
      setLoadingSourcePresets(true);
      try {
        const unitId = copyTimeSlotForm.source_satuan_pendidikan_id || activeSchoolUnit?.id;
        const params = {
          academic_year_id: copyTimeSlotForm.source_academic_year_id
        };
        if (unitId) params.satuan_pendidikan_id = unitId;

        const res = await api.get('/akademik/schedule-presets', { params });
        const list = res.data?.data || [];
        setSourcePresetsList(list);

        // Jika list kosong, reset preset_id
        if (list.length === 0) {
          setCopyTimeSlotForm(prev => ({ ...prev, source_preset_id: '' }));
        } else {
          // Pilih preset yang aktif atau pertahankan jika valid
          const isValid = list.some(p => String(p.id) === String(copyTimeSlotForm.source_preset_id));
          if (!isValid) {
            const actP = list.find(p => p.is_active) || list[0];
            setCopyTimeSlotForm(prev => ({
              ...prev,
              source_preset_id: actP ? String(actP.id) : ''
            }));
          }
        }
      } catch (err) {
        console.warn('Gagal memuat preset sumber:', err);
        setSourcePresetsList([]);
        setCopyTimeSlotForm(prev => ({ ...prev, source_preset_id: '' }));
      } finally {
        setLoadingSourcePresets(false);
      }
    };

    fetchSourcePresets();
  }, [copyTimeSlotModalOpen, copyTimeSlotForm.source_satuan_pendidikan_id, copyTimeSlotForm.source_academic_year_id]);

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
  const [teacherAvailSearchQuery, setTeacherAvailSearchQuery] = useState('');
  const [teacherAvailDropdownOpen, setTeacherAvailDropdownOpen] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);

  // B. Ketersediaan Rombel
  const [selectedClassForAvail, setSelectedClassForAvail] = useState('');
  const [classAvailabilities, setClassAvailabilities] = useState([]);
  const [classAvailSearchQuery, setClassAvailSearchQuery] = useState('');
  const [classAvailDropdownOpen, setClassAvailDropdownOpen] = useState(false);

  // C. Batasan Mata Pelajaran
  const [subjectConstraintSearchQuery, setSubjectConstraintSearchQuery] = useState('');
  const [subjectConstraintsMap, setSubjectConstraintsMap] = useState({}); // { [subjectId]: preferred_time }
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
  const [generatorStep, setGeneratorStep] = useState(0); // 0-5 step progress
  const [generatorLogs, setGeneratorLogs] = useState([]);
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

  // Seleksi Massal Sesi (Batch Selection & Bulk Actions)
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('Penghapusan massal jadwal pelajaran');

  // Drag and Drop Sesi Jadwal pada Matriks KBM
  const [draggedSchedule, setDraggedSchedule] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { dayId, slotId, rowId }
  const [isMovingSchedule, setIsMovingSchedule] = useState(false);

  // Modal Dialog Penanganan Bentrok Drag & Drop (Opsi Gabung Rombel)
  const [dragConflictModal, setDragConflictModal] = useState(null); // { schedule, targetDayId, targetSlot, targetRowId, errorDetail, joinableClassGroupIds, targetRowName, conflictingSchedule }

  // Handler Pindah Sesi Jadwal via Drag & Drop
  const handleMoveSchedule = async (targetDayId, targetSlot, targetRowId) => {
    if (!draggedSchedule) return;

    // Hitung durasi sesi asal (menit)
    const [sh, sm] = draggedSchedule.start_time.split(':').map(Number);
    const [eh, em] = draggedSchedule.end_time.split(':').map(Number);
    const originalDuration = (eh * 60 + em) - (sh * 60 + sm);

    // Waktu mulai baru dari slot target
    const newStartTime = targetSlot.start_time;
    const newEndTime = addMinutesToTime(newStartTime, originalDuration > 0 ? originalDuration : minutesPerJp);
    const newPeriodLabel = targetSlot.label || `Jam Ke-${targetSlot.period_index || 1}`;

    // Rombel atau Guru yang disesuaikan jika perspective berubah
    let newClassGroupIds = draggedSchedule.class_groups ? draggedSchedule.class_groups.map(c => c.id) : [];
    let newTeacherEmployeeId = draggedSchedule.teacher_employee_id || '';

    if (matrixPerspective === 'class' && targetRowId) {
      // Jika rombel tunggal, pindahkan rombel ke targetRowId
      if (newClassGroupIds.length <= 1) {
        newClassGroupIds = [Number(targetRowId)];
      } else if (!newClassGroupIds.includes(Number(targetRowId))) {
        newClassGroupIds = [Number(targetRowId), ...newClassGroupIds.filter(id => id !== Number(targetRowId))];
      }
    } else if (matrixPerspective === 'teacher' && targetRowId) {
      newTeacherEmployeeId = String(targetRowId);
    }

    // Jika posisi sama persis, abaikan
    if (
      draggedSchedule.day_of_week === targetDayId &&
      draggedSchedule.start_time === newStartTime &&
      (matrixPerspective !== 'class' || (newClassGroupIds.length === 1 && newClassGroupIds[0] === Number(targetRowId)))
    ) {
      setDraggedSchedule(null);
      setDragOverTarget(null);
      return;
    }

    const targetCg = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups).find(c => c.id === Number(targetRowId));
    const effectiveUnitId = draggedSchedule.satuan_pendidikan_id || targetCg?.satuan_pendidikan_id || activeSchoolUnit?.id || 1;
    const matchingAy = academicYears.find(y => y.satuan_pendidikan_id === effectiveUnitId && y.is_active) ||
                       academicYears.find(y => y.satuan_pendidikan_id === effectiveUnitId) ||
                       academicYears.find(y => String(y.id) === String(selectedYearId));
    const effectiveYearId = draggedSchedule.academic_year_id || matchingAy?.id || parseInt(selectedYearId, 10);

    const payload = {
      satuan_pendidikan_id: effectiveUnitId,
      academic_year_id: effectiveYearId,
      preset_id: draggedSchedule.preset_id || (selectedPresetId ? parseInt(selectedPresetId, 10) : null),
      day_of_week: targetDayId,
      start_time: newStartTime,
      end_time: newEndTime,
      period_label: newPeriodLabel,
      room_name: draggedSchedule.room_name || 'Ruang Kelas',
      class_group_ids: newClassGroupIds,
      is_combined_class: newClassGroupIds.length > 1,
      teacher_employee_id: newTeacherEmployeeId ? parseInt(newTeacherEmployeeId, 10) : null,
      subject_id: draggedSchedule.subject_id ? parseInt(draggedSchedule.subject_id, 10) : null,
      extracurricular_id: draggedSchedule.extracurricular_id ? parseInt(draggedSchedule.extracurricular_id, 10) : null,
      schedule_type: draggedSchedule.schedule_type || 'mapel',
      is_active: draggedSchedule.is_active !== false,
      notes: draggedSchedule.notes || '',
      reason: `Pemindahan jadwal sesi via Drag & Drop ke Hari ${DAYS.find(d => d.id === targetDayId)?.name || targetDayId} jam ${newStartTime}-${newEndTime}`
    };

    setIsMovingSchedule(true);
    try {
      await api.put(`/akademik/schedules/${draggedSchedule.id}`, payload);
      setSuccessMsg(`Sesi "${draggedSchedule.subject_name || draggedSchedule.extra_name || 'Mapel'}" berhasil dipindahkan ke ${DAYS.find(d => d.id === targetDayId)?.name || targetDayId} (${newStartTime} - ${newEndTime})!`);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
      setDraggedSchedule(null);
      setDragOverTarget(null);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Terjadi bentrok jadwal saat pemindahan sesi.';
      
      // Temukan rombel target & jadwal bentrok untuk menyiapkan kandidat mode gabung
      const targetCg = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups).find(c => c.id === Number(targetRowId));
      const originCgIds = draggedSchedule.class_groups ? draggedSchedule.class_groups.map(c => c.id) : [];
      const combinedCgIds = Array.from(new Set([...originCgIds, Number(targetRowId)].filter(Boolean)));

      // Cari sesi lain yang sedang bentrok di jam & hari yang sama
      const conflictingSch = schedules.find(s =>
        s.id !== draggedSchedule.id &&
        s.day_of_week === targetDayId &&
        s.start_time === newStartTime &&
        (
          (draggedSchedule.teacher_employee_id && s.teacher_employee_id === draggedSchedule.teacher_employee_id) ||
          (targetRowId && s.class_groups && s.class_groups.some(cg => cg.id === Number(targetRowId)))
        )
      );

      // Buka Modal Dialog Pilihan Solusi Bentrok (Tawarkan Mode Gabung Rombel)
      setDragConflictModal({
        draggedSchedule,
        targetDayId,
        targetSlot,
        targetRowId,
        targetRowName: targetCg?.name || `Rombel #${targetRowId}`,
        conflictingSchedule: conflictingSch,
        joinableClassGroupIds: combinedCgIds,
        newStartTime,
        newEndTime,
        newPeriodLabel,
        errorDetail: errMsg
      });
    } finally {
      setIsMovingSchedule(false);
    }
  };

  // Eksekutor Mode Rombel Gabungan Dari Hasil Bentrok Drag & Drop
  const handleConfirmJoinClassFromDrag = async () => {
    if (!dragConflictModal) return;
    const { draggedSchedule, targetDayId, targetRowId, newStartTime, newEndTime, newPeriodLabel, joinableClassGroupIds, conflictingSchedule } = dragConflictModal;

    setIsMovingSchedule(true);
    try {
      // 1. Kumpulkan seluruh rombel yang terlibat (sesi asal + baris target + sesi bentrok eksis jika ada)
      const originCgIds = draggedSchedule.class_groups ? draggedSchedule.class_groups.map(c => c.id) : [];
      const conflictCgIds = (conflictingSchedule && conflictingSchedule.class_groups) ? conflictingSchedule.class_groups.map(c => c.id) : [];
      const allTargetCgIds = Array.from(new Set([
        ...originCgIds,
        Number(targetRowId),
        ...conflictCgIds,
        ...(joinableClassGroupIds || [])
      ].filter(Boolean)));

      // 2. Tentukan skenario penggabungan rombel:
      if (conflictingSchedule && conflictingSchedule.id !== draggedSchedule.id) {
        // HAPUS SESI ASAL TERLEBIH DAHULU AGAR TIDAK BENTROK DI SERVER SAAT UPDATE SESI TUJUAN
        await api.delete(`/akademik/schedules/${draggedSchedule.id}`, {
          data: { reason: 'Peleburan rombel ke sesi gabungan via Drag & Drop' }
        });

        const confUnitId = conflictingSchedule.satuan_pendidikan_id || draggedSchedule.satuan_pendidikan_id || activeSchoolUnit?.id || 1;
        const matchingAy = academicYears.find(y => y.satuan_pendidikan_id === confUnitId && y.is_active) ||
                           academicYears.find(y => y.satuan_pendidikan_id === confUnitId);

        const payloadMerge = {
          satuan_pendidikan_id: confUnitId,
          academic_year_id: conflictingSchedule.academic_year_id || matchingAy?.id || parseInt(selectedYearId, 10),
          preset_id: conflictingSchedule.preset_id || draggedSchedule.preset_id || (selectedPresetId ? parseInt(selectedPresetId, 10) : null),
          day_of_week: targetDayId,
          start_time: newStartTime,
          end_time: newEndTime,
          period_label: newPeriodLabel,
          room_name: conflictingSchedule.room_name || draggedSchedule.room_name || 'Ruang Gabungan',
          class_group_ids: allTargetCgIds,
          is_combined_class: true,
          teacher_employee_id: conflictingSchedule.teacher_employee_id || draggedSchedule.teacher_employee_id || null,
          subject_id: conflictingSchedule.subject_id || draggedSchedule.subject_id || null,
          extracurricular_id: conflictingSchedule.extracurricular_id || draggedSchedule.extracurricular_id || null,
          schedule_type: conflictingSchedule.schedule_type || draggedSchedule.schedule_type || 'mapel',
          is_active: true,
          notes: conflictingSchedule.notes || draggedSchedule.notes || '',
          reason: `Penggabungan Rombel (Gabung Kelas) via Drag & Drop pada ${DAYS.find(d => d.id === targetDayId)?.name || targetDayId} jam ${newStartTime}-${newEndTime}`
        };

        // Update sesi di slot tujuan dengan seluruh rombel gabungan
        await api.put(`/akademik/schedules/${conflictingSchedule.id}`, payloadMerge);
      } else {
        // Jika hanya 1 sesi yang dimodifikasi rombelnya di slot tujuan
        const targetUnitId = draggedSchedule.satuan_pendidikan_id || activeSchoolUnit?.id || 1;
        const matchingAy = academicYears.find(y => y.satuan_pendidikan_id === targetUnitId && y.is_active) ||
                           academicYears.find(y => y.satuan_pendidikan_id === targetUnitId);

        const payload = {
          satuan_pendidikan_id: targetUnitId,
          academic_year_id: draggedSchedule.academic_year_id || matchingAy?.id || parseInt(selectedYearId, 10),
          preset_id: draggedSchedule.preset_id || (selectedPresetId ? parseInt(selectedPresetId, 10) : null),
          day_of_week: targetDayId,
          start_time: newStartTime,
          end_time: newEndTime,
          period_label: newPeriodLabel,
          room_name: draggedSchedule.room_name || 'Ruang Gabungan',
          class_group_ids: allTargetCgIds,
          is_combined_class: true,
          teacher_employee_id: draggedSchedule.teacher_employee_id ? parseInt(draggedSchedule.teacher_employee_id, 10) : null,
          subject_id: draggedSchedule.subject_id ? parseInt(draggedSchedule.subject_id, 10) : null,
          extracurricular_id: draggedSchedule.extracurricular_id ? parseInt(draggedSchedule.extracurricular_id, 10) : null,
          schedule_type: draggedSchedule.schedule_type || 'mapel',
          is_active: draggedSchedule.is_active !== false,
          notes: draggedSchedule.notes || '',
          reason: `Penggabungan Rombel (Gabung Kelas) via Drag & Drop pada ${DAYS.find(d => d.id === targetDayId)?.name || targetDayId} jam ${newStartTime}-${newEndTime}`
        };

        await api.put(`/akademik/schedules/${draggedSchedule.id}`, payload);
      }

      setSuccessMsg(`Berhasil! Sesi "${draggedSchedule.subject_name || draggedSchedule.extra_name || 'Mapel'}" kini resmi menjadi MODE ROMBEL GABUNGAN (${allTargetCgIds.length} Kelas).`);
      setDragConflictModal(null);
      setDraggedSchedule(null);
      setDragOverTarget(null);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(`Gagal menerapkan mode gabung rombel:\n${err.response?.data?.message || err.message}`);
    } finally {
      setIsMovingSchedule(false);
    }
  };

  // Load Initial Master saat Satuan Pendidikan berubah
  useEffect(() => {
    setSelectedPresetId('');
    setSelectedClassId('');
    setSelectedDay('');
    setActivePreset(null);
    fetchInitialMaster();
  }, [activeSchoolUnit]);

  // Refetch schedules, timeSlots, lessons, dan classGroups saat selectedYearId / activeSchoolUnit berubah
  useEffect(() => {
    if (selectedYearId) {
      fetchSchedules();
      fetchTimeSlots();
      fetchLessons();
      fetchGeneratorRuns();
      fetchClassGroupsForCurrentYear(selectedYearId);
    }
  }, [selectedYearId, selectedPresetId, selectedClassId, selectedDay, activeSchoolUnit]);

  const fetchClassGroupsForCurrentYear = async (yearId) => {
    if (!yearId) return;
    try {
      const unitId = activeSchoolUnit?.id || undefined;
      console.log('[DEBUG CLASS FETCH START]', {
        unit: unitId || 'SEMUA_UNIT',
        yearId,
        timestamp: new Date().toLocaleTimeString()
      });

      const [cgRes, allCgRes] = await Promise.all([
        api.get('/akademik/class-groups', {
          params: {
            academic_year_id: yearId,
            ...(unitId ? { satuan_pendidikan_id: unitId } : {})
          }
        }),
        api.get('/akademik/class-groups', {
          params: { academic_year_id: yearId }
        })
      ]);

      const currentUnitClasses = cgRes.data?.data || [];
      const allUnitsClasses = allCgRes.data?.data || [];

      console.log('[DEBUG CLASS FETCH SUCCESS]', {
        unit: unitId || 'SEMUA_UNIT',
        yearId,
        classesLoaded: currentUnitClasses.length,
        allClassesLoaded: allUnitsClasses.length,
        classNames: currentUnitClasses.map(c => c.name)
      });

      setClassGroups(currentUnitClasses);
      setAllSchoolClassGroups(allUnitsClasses);
    } catch (err) {
      console.error('Error fetching class groups for year:', err);
    }
  };

  const fetchInitialMaster = async () => {
    try {
      const params = activeSchoolUnit?.id ? { satuan_pendidikan_id: activeSchoolUnit.id } : {};
      // Fetch Academic Years dan Master Umum (tanpa class-groups untuk mencegah race condition)
      const [ayRes, subRes, exRes, empRes, suRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }),
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
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id,
          academic_year_id: selectedYearId,
          preset_id: activeSchoolUnit?.id ? (selectedPresetId || undefined) : undefined
        }
      });
      const rawSlots = res.data?.data || [];
      const sortedSlots = [...rawSlots].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return (a.day_of_week || 0) - (b.day_of_week || 0);
        const timeCompare = String(a.start_time || '').localeCompare(String(b.start_time || ''));
        if (timeCompare !== 0) return timeCompare;
        return (a.period_index || 0) - (b.period_index || 0);
      });
      setTimeSlots(sortedSlots);
    } catch (e) {}
  };

  const fetchLessons = async () => {
    try {
      const [lessRes, dutyRes] = await Promise.all([
        api.get('/akademik/timetable/lessons', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId }
        }),
        api.get('/akademik/teaching-duties', {
          params: { academic_year_id: selectedYearId }
        }).catch(() => ({ data: { data: [] } }))
      ]);
      setLessonsList(lessRes.data?.data || []);
      setTeachingDutiesList(dutyRes.data?.data || []);
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
      const preRes = await api.get('/akademik/schedule-presets', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: selectedYearId || undefined }
      });

      const preList = preRes.data?.data || [];
      setPresets(preList);

      const activeP = preList.find(p => p.is_active) || preList[0];
      setActivePreset(activeP || null);

      // Pastikan preset_id HANYA dikirim jika satuan pendidikan spesifik dipilih
      let effectivePresetId = undefined;
      if (activeSchoolUnit?.id) {
        if (selectedPresetId && preList.some(p => String(p.id) === String(selectedPresetId))) {
          effectivePresetId = selectedPresetId;
        } else if (activeP) {
          effectivePresetId = activeP.id;
          setSelectedPresetId(activeP.id);
        }
      }

      const schDataRes = await api.get('/akademik/schedules', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
          academic_year_id: selectedYearId || undefined,
          preset_id: effectivePresetId, // Mutlak undefined saat mode Semua Unit
          class_group_id: selectedClassId || undefined,
          day_of_week: selectedDay || undefined
        }
      });

      setSchedules(schDataRes.data?.data || []);
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

  // Helper Format Jam 24 Jam Murni (HH:mm)
  const formatTime24 = (timeStr) => {
    if (!timeStr) return '';
    const cleaned = String(timeStr).replace('.', ':').trim();
    const match = cleaned.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      let hh = parseInt(match[1], 10);
      const mm = match[2];
      const isPm = /pm/i.test(cleaned);
      const isAm = /am/i.test(cleaned);
      if (isPm && hh < 12) hh += 12;
      if (isAm && hh === 12) hh = 0;
      return `${String(hh % 24).padStart(2, '0')}:${mm}`;
    }
    return timeStr;
  };

  // Helper Format Durasi Waktu Jam & Menit (misal: 1j 30m, 45m, 1j)
  const calculateDurationText = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const cleanStart = formatTime24(startTime);
    const cleanEnd = formatTime24(endTime);
    const [sh, sm] = cleanStart.split(':').map(Number);
    const [eh, em] = cleanEnd.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
    let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    if (h > 0 && m > 0) return `${h}j ${m}m`;
    if (h > 0 && m === 0) return `${h}j`;
    return `${m}m`;
  };

  // Helper Hitung Total Menit dari 00:00 (misal "07:30" => 450)
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const clean = formatTime24(timeStr);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  };

  // Algoritma Collision Grouping (Side-by-Side Overlap Handler ala Google Calendar)
  const clusterDayEvents = (events) => {
    if (!events || events.length === 0) return [];
    
    // 1. Urutkan berdasarkan start_time, lalu durasi terpanjang
    const sorted = [...events].sort((a, b) => {
      const startDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      if (startDiff !== 0) return startDiff;
      return timeToMinutes(b.end_time) - timeToMinutes(a.end_time);
    });

    const clusters = [];
    let currentCluster = [];
    let clusterEnd = -1;

    // 2. Kelompokkan ke dalam cluster waktu yang saling tumpang tindih
    sorted.forEach(ev => {
      const evStart = timeToMinutes(ev.start_time);
      const evEnd = Math.max(evStart + 15, timeToMinutes(ev.end_time));

      if (currentCluster.length === 0 || evStart < clusterEnd) {
        currentCluster.push({ ...ev, _startMins: evStart, _endMins: evEnd });
        clusterEnd = Math.max(clusterEnd, evEnd);
      } else {
        clusters.push(currentCluster);
        currentCluster = [{ ...ev, _startMins: evStart, _endMins: evEnd }];
        clusterEnd = evEnd;
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 3. Alokasikan sub-kolom (left% & width%) dalam tiap cluster
    const positionedEvents = [];
    clusters.forEach(cluster => {
      const columns = []; // Track waktu selesai per sub-kolom
      
      cluster.forEach(ev => {
        let placed = false;
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          if (columns[colIdx] <= ev._startMins) {
            columns[colIdx] = ev._endMins;
            ev._colIdx = colIdx;
            placed = true;
            break;
          }
        }
        if (!placed) {
          ev._colIdx = columns.length;
          columns.push(ev._endMins);
        }
      });

      const totalCols = Math.max(1, columns.length);
      cluster.forEach(ev => {
        positionedEvents.push({
          ...ev,
          _colIdx: ev._colIdx || 0,
          _totalCols: totalCols,
          _leftPercent: ((ev._colIdx || 0) / totalCols) * 100,
          _widthPercent: (100 / totalCols)
        });
      });
    });

    return positionedEvents;
  };

  // Helper Konversi Menit Murni ke Format "HH:mm" (24 Jam)
  const minutesToTimeStr = (totalMinutes) => {
    const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Helper Snap Menit ke Kelipatan Interval Terdekat (misal interval 15m atau 30m)
  const snapMinutesToInterval = (rawMinutes, intervalMinutes = 30) => {
    return Math.round(rawMinutes / intervalMinutes) * intervalMinutes;
  };

  // Logika Murni: Konversi Posisi Klik Y ke Rentang Waktu (Snap awal jam tepat di akhir slot sebelumnya & clamp ke slot berikutnya)
  const computeEmptySlotTimeRange = ({
    clickY,
    operationalStartMinutes,
    operationalEndMinutes,
    pixelsPerMinute,
    snapIntervalMinutes = 30,
    defaultDurationMinutes = 60,
    existingDaySlots = []
  }) => {
    // 1. Hitung posisi menit mentah dari koordinat pixel Y
    const rawMinutes = operationalStartMinutes + (clickY / pixelsPerMinute);

    // 2. Cari blok-blok jadwal yang ada di hari ini
    const sortedSlots = [...existingDaySlots]
      .map(s => ({
        start: timeToMinutes(s.start_time),
        end: timeToMinutes(s.end_time)
      }))
      .filter(s => s.start > 0 && s.end > s.start)
      .sort((a, b) => a.start - b.start);

    // Cari slot yang mendahului titik klik (blok sebelumnya)
    const prevSlots = sortedSlots.filter(s => s.end <= rawMinutes);
    const lastPrevSlot = prevSlots.length > 0 ? prevSlots[prevSlots.length - 1] : null;

    // Cari slot yang berada setelah titik klik (blok berikutnya)
    const nextSlots = sortedSlots.filter(s => s.start >= rawMinutes);
    const firstNextSlot = nextSlots.length > 0 ? nextSlots[0] : null;

    // 3. Tentukan waktu mulai (startMins):
    // Jika ada blok sebelumnya dan jaraknya dekat/wajar dalam gap yang sama,
    // awal jam (bagian atas kotak) otomatis TEPAT MENEMPEL pada akhir dari kotak sebelumnya.
    let startMins;
    if (lastPrevSlot && rawMinutes >= lastPrevSlot.end && (!firstNextSlot || rawMinutes < firstNextSlot.start)) {
      startMins = lastPrevSlot.end;
    } else {
      // Jika di awal pagi atau tidak ada blok sebelumnya, snap ke interval grid terdekat
      startMins = snapMinutesToInterval(rawMinutes, snapIntervalMinutes);
      startMins = Math.max(operationalStartMinutes, startMins);
    }

    // 4. Tentukan waktu selesai (endMins) fleksibel:
    // Jika kursor berada lebih jauh dari startMins + durasi dasar, ikuti posisi kursor yang di-snap
    const hoverRawEndMins = snapMinutesToInterval(rawMinutes + snapIntervalMinutes, snapIntervalMinutes);
    const dynamicBaseDuration = defaultDurationMinutes || 40; // Default fleksibel sesuai JP/konfigurasi
    let endMins = Math.max(startMins + dynamicBaseDuration, hoverRawEndMins);

    // 5. Batasi (clamp) maksimal pada jam selesai operasional
    if (endMins > operationalEndMinutes) {
      endMins = operationalEndMinutes;
    }

    // 6. Pencegahan Tabrakan: Clamp terhadap waktu mulai blok berikutnya jika ada
    if (firstNextSlot && endMins > firstNextSlot.start) {
      endMins = firstNextSlot.start;
    }

    // Pastikan durasi valid minimal 15 menit jika ada ruang
    if (endMins <= startMins) {
      endMins = Math.min(startMins + 15, operationalEndMinutes);
    }

    return {
      startTime: minutesToTimeStr(startMins),
      endTime: minutesToTimeStr(endMins),
      startMinutes: startMins,
      endMinutes: endMins
    };
  };

  const addMinutesToTime = (timeStr, minutesToAdd) => {
    if (!timeStr) return '';
    const cleaned = formatTime24(timeStr);
    const [hStr, mStr] = cleaned.split(':');
    let totalMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + (parseInt(minutesToAdd, 10) || 0);
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // ==========================================
  // ACTIONS TAHAP 1: STRUKTUR WAKTU
  // ==========================================
  const handleOpenAddTimeSlot = (dayId = 1, customStart = null, customEnd = null) => {
    setEditingTimeSlot(null);
    const existingForDay = timeSlots.filter(s => s.day_of_week === dayId);
    const nextIndex = existingForDay.length + 1;
    const lastSlot = existingForDay[existingForDay.length - 1];
    const nextStart = customStart || (lastSlot ? lastSlot.end_time : '07:00');
    const nextEnd = customEnd || addMinutesToTime(nextStart, minutesPerJp);

    setTimeSlotForm({
      day_of_week: dayId,
      selected_days: [dayId], // Default to current day, user can select multiple / all days
      period_index: nextIndex,
      start_time: nextStart,
      end_time: nextEnd,
      type: 'lesson',
      label: `Jam Ke-${nextIndex}`,
      color: '#0d9488',
      is_generator_usable: true
    });
    setTimeSlotModalOpen(true);
  };

  const handleOpenEditTimeSlot = (slot) => {
    setEditingTimeSlot(slot);
    // Cari hari-hari lain yang memiliki slot serupa (period_index sama atau waktu/label sama)
    const matchingDays = timeSlots
      .filter(s => s.period_index === slot.period_index || s.label === slot.label || s.start_time === slot.start_time)
      .map(s => s.day_of_week);
    const initialDays = Array.from(new Set([slot.day_of_week, ...matchingDays])).sort((a, b) => a - b);

    setTimeSlotForm({
      id: slot.id,
      day_of_week: slot.day_of_week,
      edit_scope: 'single', // 'single' (hanya hari ini) | 'multiple' (terapkan massal)
      selected_days: initialDays.length > 1 ? initialDays : [1, 2, 3, 4, 5, 6],
      period_index: slot.period_index,
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: slot.type || 'lesson',
      label: slot.label || '',
      color: slot.color || (slot.type === 'break' ? '#f59e0b' : slot.type === 'activity' ? '#9333ea' : '#0d9488'),
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

    if (!editingTimeSlot && (!timeSlotForm.selected_days || timeSlotForm.selected_days.length === 0)) {
      alert('Pilih minimal satu hari untuk menerapkan rentang waktu');
      return;
    }

    setSaving(true);
    try {
      if (editingTimeSlot) {
        // Update current primary slot
        const currentPayload = {
          id: timeSlotForm.id,
          day_of_week: timeSlotForm.day_of_week,
          period_index: timeSlotForm.period_index,
          start_time: timeSlotForm.start_time,
          end_time: timeSlotForm.end_time,
          type: timeSlotForm.type,
          label: timeSlotForm.label,
          color: timeSlotForm.color || '#0d9488',
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: parseInt(selectedYearId, 10),
          preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
          is_generator_usable: timeSlotForm.type === 'lesson' ? timeSlotForm.is_generator_usable : false
        };
        await api.post('/akademik/timetable/time-slots', currentPayload);

        // Jika mode penerapan massal dipilih saat edit
        if (timeSlotForm.edit_scope === 'multiple' && timeSlotForm.selected_days && timeSlotForm.selected_days.length > 0) {
          const otherDays = timeSlotForm.selected_days.filter(d => d !== timeSlotForm.day_of_week);
          let syncedCount = 1;

          for (const otherDayId of otherDays) {
            // Cari slot yang cocok pada hari target
            const existingInOtherDay = timeSlots.filter(s => s.day_of_week === otherDayId);
            const matchedSlot = existingInOtherDay.find(s => 
              s.id !== editingTimeSlot.id && (
                s.period_index === editingTimeSlot.period_index || 
                s.label === editingTimeSlot.label || 
                s.start_time === editingTimeSlot.start_time
              )
            );

            const otherPayload = {
              ...(matchedSlot ? { id: matchedSlot.id } : {}),
              day_of_week: otherDayId,
              period_index: matchedSlot ? matchedSlot.period_index : (existingInOtherDay.length + 1),
              start_time: timeSlotForm.start_time,
              end_time: timeSlotForm.end_time,
              type: timeSlotForm.type,
              label: timeSlotForm.label,
              color: timeSlotForm.color || '#0d9488',
              satuan_pendidikan_id: activeSchoolUnit?.id || 1,
              academic_year_id: parseInt(selectedYearId, 10),
              preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
              is_generator_usable: timeSlotForm.type === 'lesson' ? timeSlotForm.is_generator_usable : false
            };
            await api.post('/akademik/timetable/time-slots', otherPayload);
            syncedCount++;
          }
          setSuccessMsg(`Perubahan rentang waktu berhasil disinkronkan ke ${syncedCount} hari!`);
        } else {
          setSuccessMsg('Rentang waktu berhasil diperbarui untuk hari ini!');
        }
      } else {
        // Create mode: multi-day support (save for all selected days)
        const targetDays = timeSlotForm.selected_days || [timeSlotForm.day_of_week || 1];
        let savedCount = 0;

        for (const dayId of targetDays) {
          const existingForDay = timeSlots.filter(s => s.day_of_week === dayId);
          const nextIdx = existingForDay.length + 1;
          const payload = {
            day_of_week: dayId,
            period_index: timeSlotForm.period_index || nextIdx,
            start_time: timeSlotForm.start_time,
            end_time: timeSlotForm.end_time,
            type: timeSlotForm.type,
            label: timeSlotForm.label,
            color: timeSlotForm.color || '#0d9488',
            satuan_pendidikan_id: activeSchoolUnit?.id || 1,
            academic_year_id: parseInt(selectedYearId, 10),
            preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
            is_generator_usable: timeSlotForm.type === 'lesson' ? timeSlotForm.is_generator_usable : false
          };
          await api.post('/akademik/timetable/time-slots', payload);
          savedCount++;
        }
        setSuccessMsg(`Rentang waktu berhasil disimpan untuk ${savedCount} hari!`);
      }

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
              preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
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
              preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
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
            preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
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

  const handleExecuteCopyTimeSlots = async (e) => {
    e.preventDefault();
    if (!copyTimeSlotForm.source_academic_year_id) {
      alert('Pilih tahun ajaran sumber struktur waktu');
      return;
    }

    if (copyTimeSlotForm.replace_existing) {
      const confirmReplace = window.confirm(
        '⚠️ PERINGATAN PENIMPAAN DATA:\n\n' +
        'Seluruh rentang waktu struktur harian yang ada pada jadwal saat ini akan DIHAPUS dan DITIMPA dengan data dari jadwal sumber.\n\n' +
        'Apakah Anda yakin ingin melanjutkan proses penyalinan ini?'
      );
      if (!confirmReplace) return;
    }

    try {
      setSaving(true);
      const payload = {
        source_satuan_pendidikan_id: copyTimeSlotForm.source_satuan_pendidikan_id ? parseInt(copyTimeSlotForm.source_satuan_pendidikan_id, 10) : undefined,
        source_academic_year_id: parseInt(copyTimeSlotForm.source_academic_year_id, 10),
        source_preset_id: copyTimeSlotForm.source_preset_id ? parseInt(copyTimeSlotForm.source_preset_id, 10) : null,
        target_satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        target_academic_year_id: parseInt(selectedYearId, 10),
        target_preset_id: selectedPresetId ? parseInt(selectedPresetId, 10) : null,
        replace_existing: copyTimeSlotForm.replace_existing
      };

      const res = await api.post('/akademik/timetable/time-slots/copy', payload);
      setSuccessMsg(res.data?.message || 'Struktur waktu harian berhasil disalin!');
      setCopyTimeSlotModalOpen(false);
      setTimeSlotModalOpen(false);
      fetchTimeSlots();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyalin struktur waktu');
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
    setGeneratorStep(1);
    setGeneratorLogs(['[1/5] Mengumpulkan struktur jam (Tahap 1), beban pelajaran (Tahap 2), dan ketersediaan guru/rombel (Tahap 3)...']);
    setErrorMsg('');
    
    // Simulasi step progress visual untuk memberikan kejelasan proses kepada user
    const stepTimer1 = setTimeout(() => {
      setGeneratorStep(2);
      setGeneratorLogs(prev => [
        ...prev,
        '[2/5] Memecah beban JP menjadi blok sesi pertemuan (misal 4 JP -> 2 JP + 2 JP terpisah) & memetakan mapel paralel...'
      ]);
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setGeneratorStep(3);
      setGeneratorLogs(prev => [
        ...prev,
        '[3/5] Menerapkan batas waktu ketersediaan guru & kegiatan sekolah (Sholat, Makan, Istirahat)...'
      ]);
    }, 800);

    const stepTimer3 = setTimeout(() => {
      setGeneratorStep(4);
      setGeneratorLogs(prev => [
        ...prev,
        '[4/5] Menjalankan Algoritma Solver CSP + Heuristik MRV (Most Constrained Variable) untuk mencegah bentrok guru & ruang...'
      ]);
    }, 1200);

    try {
      const res = await api.post('/akademik/timetable/generate', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedYearId,
        name: `Generate Otomatis #${new Date().toLocaleTimeString('id-ID')}`
      });
      
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setGeneratorStep(5);
      setGeneratorLogs(prev => [
        ...prev,
        `[5/5] Selesai! Berhasil menempatkan ${res.data?.data?.placed_lessons || 0} sesi pelajaran tanpa bentrok (Skor: ${res.data?.data?.score || 100}/100).`
      ]);

      setGeneratorReport(res.data?.data || null);
      setSuccessMsg(res.data?.message || 'Penjadwalan otomatis selesai!');
      fetchGeneratorRuns();
      if (res.data?.data?.run_id) {
        handleSelectRun(res.data.data.run_id);
      }
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setErrorMsg(err.response?.data?.message || 'Gagal menjalankan generator jadwal');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 600);
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
  // ACTIONS OPSI / PRESET JADWAL (ALTERNATIF JADWAL 1, 2, RAMADHAN, DLL)
  // ==========================================
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetModalTab, setPresetModalTab] = useState('list'); // 'list' | 'create' | 'edit'

  const handleOpenCreatePreset = (copyFromId = '') => {
    setEditingPreset(null);
    setPresetForm({
      name: copyFromId ? `Salinan Jadwal (${new Date().toLocaleDateString('id-ID')})` : '',
      code: '',
      description: '',
      copy_from_preset_id: copyFromId || '',
      is_active: false,
      reason: 'Penambahan opsi alternatif jadwal baru'
    });
    setPresetModalTab('create');
    setPresetModalOpen(true);
  };

  const handleOpenEditPreset = (p) => {
    setEditingPreset(p);
    setPresetForm({
      name: p.name || '',
      code: p.code || '',
      description: p.description || '',
      copy_from_preset_id: '',
      is_active: !!p.is_active,
      reason: 'Penyesuaian informasi opsi jadwal'
    });
    setPresetModalTab('edit');
    setPresetModalOpen(true);
  };

  const handleSavePresetForm = async (e) => {
    e.preventDefault();
    if (!presetForm.name.trim()) {
      alert('Nama opsi jadwal wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingPreset) {
        await api.put(`/akademik/schedule-presets/${editingPreset.id}`, {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: parseInt(selectedYearId, 10),
          name: presetForm.name.trim(),
          code: presetForm.code ? presetForm.code.trim() : null,
          description: presetForm.description || null,
          reason: presetForm.reason || 'Pembaruan data opsi jadwal'
        });
        setSuccessMsg(`Opsi jadwal "${presetForm.name}" berhasil diperbarui!`);
      } else {
        const res = await api.post('/akademik/schedule-presets', {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: parseInt(selectedYearId, 10),
          name: presetForm.name.trim(),
          code: presetForm.code ? presetForm.code.trim() : null,
          description: presetForm.description || null,
          is_active: presetForm.is_active,
          copy_from_preset_id: presetForm.copy_from_preset_id ? parseInt(presetForm.copy_from_preset_id, 10) : null,
          reason: presetForm.reason || 'Penambahan opsi alternatif jadwal baru'
        });
        setSuccessMsg(`Opsi jadwal baru "${presetForm.name}" berhasil dibuat!`);
        if (res.data?.data?.id) {
          setSelectedPresetId(res.data.data.id);
        }
      }
      setPresetModalTab('list');
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan opsi jadwal');
    } finally {
      setSaving(false);
    }
  };

  const handleActivatePreset = async (presetId, presetName) => {
    const reasonPrompt = window.prompt(`Konfirmasi pemberlakuan jadwal:\nMasukkan alasan mengaktifkan opsi "${presetName}" sebagai jadwal resmi KBM:`, 'Pemberlakuan jadwal resmi aktif sekolah');
    if (reasonPrompt === null) return;

    setSaving(true);
    try {
      await api.put(`/akademik/schedule-presets/${presetId}/activate`, {
        reason: reasonPrompt.trim() || 'Pemberlakuan opsi jadwal resmi'
      });
      setSuccessMsg(`Opsi jadwal "${presetName}" resmi DIBERLAKUKAN dan diaktifkan!`);
      setSelectedPresetId(presetId);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan opsi jadwal');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreset = async (presetId, presetName) => {
    if (!window.confirm(`Yakin ingin menghapus opsi jadwal "${presetName}" beserta seluruh alokasi sesinya? Tindakan ini tidak dapat dibatalkan.`)) return;
    setSaving(true);
    try {
      await api.delete(`/akademik/schedule-presets/${presetId}`);
      setSuccessMsg(`Opsi jadwal "${presetName}" berhasil dihapus!`);
      if (selectedPresetId === presetId) {
        setSelectedPresetId('');
      }
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus opsi jadwal');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIONS TAHAP 5: VISUAL JADWAL (EDITOR & MONITORING)
  // ==========================================
  const handleOpenAddModal = (initialData = {}) => {
    setEditingSchedule(null);
    const initialClassIds = initialData.class_group_ids || (selectedClassId ? [parseInt(selectedClassId, 10)] : (classGroups.length > 0 ? [classGroups[0].id] : []));
    const initialDay = initialData.day_of_week || (selectedDay ? parseInt(selectedDay, 10) : 1);
    const initialStartTime = initialData.start_time || '07:30';
    const initialEndTime = initialData.end_time || addMinutesToTime(initialStartTime, minutesPerJp);
    const initialPeriodLabel = initialData.period_label || 'Jam Ke-1';

    // Deteksi unit dari rombel yang diklik
    const clickedCg = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups).find(c => initialClassIds.includes(c.id));
    const detectedUnitId = clickedCg?.satuan_pendidikan_id || activeSchoolUnit?.id || 1;

    // Filter mapel untuk unit ini
    const availableSubjectsForUnit = subjectsList.filter(s => !s.satuan_pendidikan_id || s.satuan_pendidikan_id === detectedUnitId);

    // Cari guru default jika mapel dan rombel sudah ditentukan
    let detectedTeacherId = initialData.teacher_employee_id || '';
    let initialSubjectId = initialData.subject_id || (availableSubjectsForUnit.length > 0 ? availableSubjectsForUnit[0].id : (subjectsList.length > 0 ? subjectsList[0].id : ''));

    if (!detectedTeacherId && initialSubjectId && initialClassIds.length > 0) {
      const matchDuty = (teachingDutiesList || []).find(d =>
        d.type === 'mapel' &&
        Number(d.subject_id) === Number(initialSubjectId) &&
        initialClassIds.includes(Number(d.class_group_id))
      );
      if (matchDuty && matchDuty.teacher_employee_id) {
        detectedTeacherId = String(matchDuty.teacher_employee_id);
      } else {
        const matchLesson = lessonsList.find(l =>
          Number(l.subject_id) === Number(initialSubjectId) &&
          (l.target_class_ids || []).some(cid => initialClassIds.includes(Number(cid)))
        );
        if (matchLesson && matchLesson.teacher_ids && matchLesson.teacher_ids.length > 0) {
          detectedTeacherId = String(matchLesson.teacher_ids[0]);
        }
      }
    }

    setForm({
      schedule_type: initialData.schedule_type || 'mapel',
      subject_id: initialSubjectId,
      extracurricular_id: initialData.extracurricular_id || (extrasList.length > 0 ? extrasList[0].id : ''),
      teacher_employee_id: detectedTeacherId || (teachers.length > 0 ? String(teachers[0].id) : ''),
      day_of_week: initialDay,
      start_time: initialStartTime,
      end_time: initialEndTime,
      period_label: initialPeriodLabel,
      room_name: initialData.room_name || 'Ruang Kelas',
      class_group_ids: initialClassIds,
      is_combined_class: initialClassIds.length > 1,
      is_active: true,
      notes: '',
      reason: 'Penambahan alokasi jadwal pelajaran'
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setSubjectSearch('');
    setSubjectDropdownOpen(false);
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
      is_active: sch.is_active !== false,
      notes: sch.notes || '',
      reason: 'Penyesuaian jam tatap muka / ruangan / pengampu'
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setSubjectSearch('');
    setSubjectDropdownOpen(false);
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
      // Deteksi satuan_pendidikan_id dan academic_year_id yang tepat untuk sesi ini
      const selectedCg = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups).find(c =>
        form.class_group_ids.includes(c.id)
      );
      const effectiveUnitId = editingSchedule?.satuan_pendidikan_id || selectedCg?.satuan_pendidikan_id || activeSchoolUnit?.id || 1;
      const matchingAy = academicYears.find(y => y.satuan_pendidikan_id === effectiveUnitId && y.is_active) ||
                         academicYears.find(y => y.satuan_pendidikan_id === effectiveUnitId) ||
                         academicYears.find(y => String(y.id) === String(selectedYearId));
      const effectiveYearId = editingSchedule?.academic_year_id || matchingAy?.id || parseInt(selectedYearId, 10);

      const payload = {
        satuan_pendidikan_id: effectiveUnitId,
        academic_year_id: effectiveYearId,
        preset_id: editingSchedule?.preset_id || (selectedPresetId ? parseInt(selectedPresetId, 10) : null),
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
        is_active: form.is_active !== false,
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
      setSelectedScheduleIds(prev => prev.filter(id => id !== scheduleToDelete.id));
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus jadwal');
    } finally {
      setSaving(false);
    }
  };

  // Handler Seleksi Massal (Batch Selection)
  const handleToggleSelectSchedule = (id) => {
    setSelectedScheduleIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllSchedules = () => {
    if (selectedScheduleIds.length === schedules.length) {
      setSelectedScheduleIds([]);
    } else {
      setSelectedScheduleIds(schedules.map(s => s.id));
    }
  };

  const handleBulkDeleteSchedule = async () => {
    if (selectedScheduleIds.length === 0) return;
    if (!bulkDeleteReason.trim()) {
      alert('Alasan penghapusan massal wajib diisi');
      return;
    }
    setSaving(true);
    try {
      // Hapus berurutan via API
      for (const id of selectedScheduleIds) {
        await api.delete(`/akademik/schedules/${id}`, {
          data: { reason: bulkDeleteReason.trim() }
        });
      }
      setSuccessMsg(`Berhasil menghapus ${selectedScheduleIds.length} sesi jadwal secara massal!`);
      setBulkDeleteModalOpen(false);
      setSelectedScheduleIds([]);
      fetchSchedules();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus sebagian atau seluruh jadwal terpilih');
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

          {/* Pilihan Opsi Jadwal Aktif & Manajemen */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span className="text-xs font-bold text-indigo-900 shrink-0">Opsi Jadwal:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="bg-transparent font-black text-indigo-950 text-xs focus:outline-none cursor-pointer"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.is_active ? '★ (Diberlakukan)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPresetModalOpen(true)}
              className="ml-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition"
              title="Buka Manajemen Tambah, Edit, Duplikasi, dan Aktivasi Opsi Jadwal"
            >
              Kelola ({presets.length})
            </button>
          </div>

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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 bg-teal-400 text-teal-950 font-black text-xs rounded-full uppercase tracking-wider">
                  Tahap 1
                </span>
                <span className="text-xs text-teal-200">Penetapan Rentang Waktu (JP & Non-JP)</span>
                {currentSelectedPreset && (
                  <span className="px-2.5 py-0.5 bg-indigo-500/80 text-white font-bold text-xs rounded-full border border-indigo-300/40">
                    Opsi: {currentSelectedPreset.name} {currentSelectedPreset.is_active ? '★ (Aktif)' : ''}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black">Struktur Waktu Harian Sekolah</h3>
              <p className="text-xs text-teal-100 leading-relaxed">
                Tentukan rentang jam harian untuk opsi <b>{currentSelectedPreset?.name || 'Jadwal'}</b>. Rentang waktu terdiri dari 2 jenis: <b>JP (Jam Pelajaran)</b> dengan durasi baku <b>{minutesPerJp} Menit / JP</b> sesuai Struktur Kurikulum, serta <b>Non-JP (Kegiatan / Istirahat / Sholat)</b>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {timeSlots.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Yakin ingin mengosongkan seluruh (${timeSlots.length}) struktur rentang waktu untuk tahun ajaran ini? Kotak hari akan kembali menjadi kosong.`)) return;
                    setSaving(true);
                    try {
                      for (const s of timeSlots) {
                        await api.delete(`/akademik/timetable/time-slots/${s.id}`);
                      }
                      setSuccessMsg('Seluruh struktur rentang waktu berhasil dikosongkan!');
                      fetchTimeSlots();
                      setTimeout(() => setSuccessMsg(''), 4000);
                    } catch (e) {
                      alert('Gagal mengosongkan rentang waktu');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="px-3.5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-400/30 font-bold rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  title="Kosongkan seluruh rentang waktu"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Kosongkan Struktur Waktu</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCopyTimeSlotForm({
                    source_satuan_pendidikan_id: activeSchoolUnit?.id || '',
                    source_academic_year_id: academicYears.find(y => String(y.id) !== String(selectedYearId))?.id || academicYears[0]?.id || '',
                    source_preset_id: '',
                    replace_existing: true
                  });
                  setCopyTimeSlotModalOpen(true);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20 shadow-md transition active:scale-95 flex items-center gap-2"
                title="Salin pola struktur waktu dari tahun ajaran, preset, atau satuan pendidikan lain"
              >
                <Copy className="w-4 h-4 text-teal-300" />
                <span>📋 Salin dari Jadwal Lain</span>
              </button>
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
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
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
                    {DAYS.map(d => (
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

                {/* Toggle Tata Letak Tampilan Hari di Tahap 1 */}
                {!slotDayFilter && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTimeSlotLayout('wrap')}
                      title="Tampilan Responsif / Wrap Default"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                        timeSlotLayout === 'wrap'
                          ? 'bg-white text-teal-800 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Wrap (Default)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeSlotLayout('row')}
                      title="Mensejajarkan Semua Hari dalam 1 Baris Pekan Horizontal"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition ${
                        timeSlotLayout === 'row'
                          ? 'bg-white text-teal-800 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <Columns3 className="w-3.5 h-3.5" />
                      <span>Sejajarkan 1 Pekan</span>
                    </button>
                  </div>
                )}
              </div>

              <span className="text-xs text-slate-500">
                Total <b>{timeSlots.length}</b> slot waktu terdaftar
              </span>
            </div>

            {/* Grid Kartu Per Hari dengan Scroll Container Internal */}
            <div className="max-h-[72vh] overflow-y-auto overflow-x-auto pr-1 pb-2 rounded-xl">
              {!slotDayFilter && timeSlotLayout === 'row' ? (
                /* ============================================================ */
                /* GOOGLE CALENDAR WEEK VIEW ENGINE (PIXEL-PER-MINUTE ACCURACY) */
                /* ============================================================ */
                (() => {
                  if (timeSlots.length === 0) {
                    return (
                      <div className="py-16 px-4 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-400 min-w-[850px]">
                        <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-black text-sm text-slate-700">Belum ada struktur rentang waktu yang ditetapkan</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Gunakan tombol <b>Wizard Pola Waktu Otomatis</b> atau <b>+ Tambah Rentang Manual</b> di atas untuk membuat linimasa waktu sekolah.
                        </p>
                      </div>
                    );
                  }

                  // 1. Parameter Waktu & Konstanta Skala Piksel
                  const PIXELS_PER_MINUTE = 1.85; // 1 jam = 111px, 45m = 83px, 30m = 55px (sangat lega untuk seluruh teks)
                  const INTERVAL_MINUTES = 30; // Gridline per 30 menit

                  // 2. Hitung Rentang Jam Operasional Sekolah (Dinamis dari Data)
                  let minSlotMinutes = 7 * 60; // default 07:00
                  let maxSlotMinutes = 15 * 60; // default 15:00

                  timeSlots.forEach(s => {
                    const sMins = timeToMinutes(s.start_time);
                    const eMins = timeToMinutes(s.end_time);
                    if (sMins > 0) minSlotMinutes = Math.min(minSlotMinutes, sMins);
                    if (eMins > 0) maxSlotMinutes = Math.max(maxSlotMinutes, eMins);
                  });

                  // Bulatkan ke jam genap terdekat (misal 06:45 -> 06:00, 15:15 -> 16:00)
                  const startHour = Math.max(5, Math.floor(minSlotMinutes / 60));
                  const endHour = Math.min(23, Math.ceil(maxSlotMinutes / 60));
                  const operationalStartMinutes = startHour * 60;
                  const operationalEndMinutes = endHour * 60;
                  const totalGridMinutes = operationalEndMinutes - operationalStartMinutes;
                  const totalCanvasHeight = totalGridMinutes * PIXELS_PER_MINUTE;

                  // 3. Bangun Marka Garis Waktu (Time Markers per 30/60 menit)
                  const timeMarkers = [];
                  for (let m = operationalStartMinutes; m <= operationalEndMinutes; m += INTERVAL_MINUTES) {
                    const hour = Math.floor(m / 60);
                    const minute = m % 60;
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const topPos = (m - operationalStartMinutes) * PIXELS_PER_MINUTE;
                    timeMarkers.push({
                      minutes: m,
                      timeStr,
                      isHour: minute === 0,
                      top: topPos
                    });
                  }

                  // 4. Posisi Garis Waktu Sekarang (Current Time Indicator)
                  const now = new Date();
                  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Senin..7=Minggu
                  const currentNowMinutes = now.getHours() * 60 + now.getMinutes();
                  const isCurrentTimeInRange = currentNowMinutes >= operationalStartMinutes && currentNowMinutes <= operationalEndMinutes;
                  const currentNowTop = (currentNowMinutes - operationalStartMinutes) * PIXELS_PER_MINUTE;

                  return (
                    <div className="min-w-[1080px] xl:min-w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs select-none">
                      {/* 1. STICKY HEADER NAMA HARI */}
                      <div className="grid grid-cols-[68px_repeat(7,1fr)] sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
                        {/* Sudut Kiri Atas (Waktu UTC/Zona) */}
                        <div className="p-2.5 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50/70 text-slate-400 text-[10px] font-bold">
                          <Clock className="w-3.5 h-3.5 mb-0.5 text-slate-400" />
                          <span>WIB</span>
                        </div>

                        {/* 7 Kolom Header Hari */}
                        {DAYS.map(day => {
                          const jpCount = timeSlots.filter(s => s.day_of_week === day.id && s.type === 'lesson').length;
                          const isToday = day.id === currentDayOfWeek;

                          return (
                            <div
                              key={day.id}
                              className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 transition ${
                                isToday ? 'bg-teal-50/60' : 'bg-slate-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`font-black text-xs ${isToday ? 'text-teal-900' : 'text-slate-800'}`}>
                                  {day.name}
                                </span>
                                {isToday && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" title="Hari Ini" />
                                )}
                              </div>
                              <div className="mt-1 flex items-center justify-center">
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                  isToday ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-200/70 text-slate-600'
                                }`}>
                                  {jpCount} JP
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 2. TIMELINE CANVAS (Gutter Kiri + 7 Kolom Hari dengan Garis Waktu) */}
                      <div className="grid grid-cols-[68px_repeat(7,1fr)] relative" style={{ height: `${totalCanvasHeight}px` }}>
                        
                        {/* A. GUTTER WAKTU SISI KIRI */}
                        <div className="relative border-r border-slate-200 bg-slate-50/50">
                          {timeMarkers.map(tm => (
                            <div
                              key={tm.timeStr}
                              className="absolute right-2 -translate-y-1/2 flex items-center gap-1"
                              style={{ top: `${tm.top}px` }}
                            >
                              <span className={`font-mono text-[10px] ${
                                tm.isHour ? 'font-bold text-slate-700' : 'text-slate-400 text-[9px]'
                              }`}>
                                {tm.timeStr}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* B. 7 KOLOM HARI & KANVAS AGENDA BLOK */}
                        {DAYS.map(day => {
                          const rawDaySlots = timeSlots.filter(s => s.day_of_week === day.id);
                          const positionedSlots = clusterDayEvents(rawDaySlots);
                          const isToday = day.id === currentDayOfWeek;

                          // Handler Mouse Move di Area Kolom Hari untuk Ghost Preview
                          const handleColumnMouseMove = (e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const slotCalc = computeEmptySlotTimeRange({
                              clickY,
                              operationalStartMinutes,
                              operationalEndMinutes,
                              pixelsPerMinute: PIXELS_PER_MINUTE,
                              snapIntervalMinutes: 15, // Snapping halus per 15 menit
                              defaultDurationMinutes: minutesPerJp || 40, // Fleksibel sesuai durasi JP
                              existingDaySlots: rawDaySlots
                            });

                            const topPx = (slotCalc.startMinutes - operationalStartMinutes) * PIXELS_PER_MINUTE;
                            const heightPx = Math.max(34, (slotCalc.endMinutes - slotCalc.startMinutes) * PIXELS_PER_MINUTE - 2);

                            setHoverGridSlot({
                              dayId: day.id,
                              topPx,
                              heightPx,
                              startTime: slotCalc.startTime,
                              endTime: slotCalc.endTime
                            });
                          };

                          // Handler Klik Area Kosong untuk Buka Form Tambah
                          const handleColumnClick = (e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const slotCalc = computeEmptySlotTimeRange({
                              clickY,
                              operationalStartMinutes,
                              operationalEndMinutes,
                              pixelsPerMinute: PIXELS_PER_MINUTE,
                              snapIntervalMinutes: 15, // Snapping halus per 15 menit
                              defaultDurationMinutes: minutesPerJp || 40, // Fleksibel sesuai durasi JP
                              existingDaySlots: rawDaySlots
                            });

                            setHoverGridSlot(null);
                            handleOpenAddTimeSlot(day.id, slotCalc.startTime, slotCalc.endTime);
                          };

                          return (
                            <div
                              key={day.id}
                              onMouseMove={handleColumnMouseMove}
                              onMouseLeave={() => setHoverGridSlot(null)}
                              onClick={handleColumnClick}
                              className={`relative border-r border-slate-200 last:border-r-0 cursor-pointer ${
                                isToday ? 'bg-teal-50/15' : 'bg-slate-50/40'
                              }`}
                              title={`Klik di area kosong ${day.name} untuk tambah rentang waktu baru`}
                            >
                              {/* Garis Horizontal Background per 30 Menit & 1 Jam */}
                              {timeMarkers.map(tm => (
                                <div
                                  key={tm.timeStr}
                                  className={`absolute left-0 right-0 border-b pointer-events-none ${
                                    tm.isHour ? 'border-slate-200/90' : 'border-slate-200/40 border-dashed'
                                  }`}
                                  style={{ top: `${tm.top}px` }}
                                />
                              ))}

                              {/* Ghost Highlight Preview Slot Saat Hover Area Kosong (Ala Google Calendar) */}
                              {hoverGridSlot && hoverGridSlot.dayId === day.id && (
                                <div
                                  className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-teal-500 bg-teal-500/15 backdrop-blur-2xs z-15 pointer-events-none transition-all duration-75 flex flex-col justify-between p-1.5 shadow-sm animate-pulse"
                                  style={{
                                    top: `${hoverGridSlot.topPx}px`,
                                    height: `${hoverGridSlot.heightPx}px`
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="px-1 py-0.2 rounded font-black text-[8px] bg-teal-600 text-white shadow-2xs">
                                      + BARU
                                    </span>
                                    <span className="font-bold text-[10px] text-teal-900 truncate">
                                      Klik untuk menetapkan slot
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] font-mono font-bold text-teal-800">
                                    <span>{hoverGridSlot.startTime} - {hoverGridSlot.endTime}</span>
                                    <span className="bg-white/80 px-1 py-0.2 rounded border border-teal-300 text-[8px]">
                                      {calculateDurationText(hoverGridSlot.startTime, hoverGridSlot.endTime)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Indikator Garis Waktu Sekarang (Hanya di Kolom Hari Ini) */}
                              {isToday && isCurrentTimeInRange && (
                                <div
                                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                  style={{ top: `${currentNowTop}px` }}
                                >
                                  <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-rose-500 ring-2 ring-white shadow-xs" />
                                  <div className="flex-1 h-[2px] bg-rose-500 shadow-2xs" />
                                </div>
                              )}

                              {/* Slot Blok Agenda yang Ditempatkan Sesuai Koordinat Menit ke Pixel */}
                              {positionedSlots.map(s => {
                                const isJp = s.type === 'lesson';
                                const isElective = s.type === 'elective';
                                const isEkskul = s.type === 'extracurricular';
                                const slotColor = s.color || (isElective ? '#8b5cf6' : isJp ? '#0d9488' : isEkskul ? '#d97706' : s.type === 'break' ? '#f59e0b' : '#9333ea');
                                
                                const topPx = (s._startMins - operationalStartMinutes) * PIXELS_PER_MINUTE;
                                const heightPx = Math.max(38, (s._endMins - s._startMins) * PIXELS_PER_MINUTE - 2); // 2px gap antar blok

                                return (
                                  <div
                                    key={s.id}
                                    className="absolute rounded-xl border transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-md hover:z-10 group overflow-hidden cursor-pointer"
                                    style={{
                                      top: `${topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `calc(${s._leftPercent}% + 2px)`,
                                      width: `calc(${s._widthPercent}% - 4px)`,
                                      backgroundColor: `${slotColor}18`,
                                      borderColor: `${slotColor}50`,
                                      borderLeftWidth: '4px',
                                      borderLeftColor: slotColor
                                    }}
                                    onClick={() => handleOpenEditTimeSlot(s)}
                                    title={`Klik untuk edit: ${s.label || (isElective ? 'Mapel Pilihan' : isEkskul ? 'Ekskul' : `Jam Ke-${s.period_index}`)} (${formatTime24(s.start_time)} - ${formatTime24(s.end_time)})`}
                                  >
                                    {/* Header Blok: Nama Periode & Badge Mengisi Lebar Penuh */}
                                    <div className="p-1.5 flex items-start gap-1 w-full">
                                      <span
                                        className="px-1.5 py-0.5 rounded font-black text-[8.5px] text-white shrink-0 leading-none shadow-2xs mt-0.5"
                                        style={{ backgroundColor: slotColor }}
                                      >
                                        {isElective ? 'PILIHAN' : isJp ? 'JP' : isEkskul ? 'EKSKUL' : 'NON'}
                                      </span>
                                      <span className="font-bold text-[11px] text-slate-900 leading-snug break-words flex-1">
                                        {s.label || (isElective ? 'Mapel Pilihan (Paralel)' : isEkskul ? 'Ekskul' : `Jam Ke-${s.period_index}`)}
                                      </span>
                                    </div>

                                    {/* Tombol Aksi Floating Overlay (Layer Atas / Absolute Top-Right saat Hover) */}
                                    <div
                                      className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white/95 backdrop-blur-xs rounded-lg p-0.5 shadow-md border border-slate-200/80"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditTimeSlot(s)}
                                        className="p-1 rounded-md text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition"
                                        title="Edit rentang waktu"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTimeSlot(s.id)}
                                        className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                        title="Hapus rentang waktu"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Footer / Info Waktu & Durasi (Selalu Utuh & Rapi) */}
                                    <div className="px-1.5 pb-1 pt-0.5 flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5 text-[9px] font-mono text-slate-700 w-full mt-auto">
                                      <span className="font-bold text-slate-900 tracking-tight whitespace-nowrap">
                                        {formatTime24(s.start_time)} - {formatTime24(s.end_time)}
                                      </span>
                                      <span
                                        className="font-bold px-1.5 py-0.2 rounded border shrink-0 text-[8.5px]"
                                        style={{
                                          color: slotColor,
                                          backgroundColor: '#fffffffa',
                                          borderColor: `${slotColor}40`
                                        }}
                                      >
                                        {calculateDurationText(s.start_time, s.end_time)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* ============================================================ */
                /* MODE WRAP (RESPONSIF / PER HARI BIASA)                        */
                /* ============================================================ */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                  {DAYS
                    .filter(d => !slotDayFilter || slotDayFilter === String(d.id))
                    .map(day => {
                      const daySlots = timeSlots
                        .filter(s => s.day_of_week === day.id)
                        .sort((a, b) => {
                          const timeCompare = String(a.start_time || '').localeCompare(String(b.start_time || ''));
                          if (timeCompare !== 0) return timeCompare;
                          return (a.period_index || 0) - (b.period_index || 0);
                        });
                      const jpSlots = daySlots.filter(s => s.type === 'lesson');

                      return (
                        <div key={day.id} className="bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col shadow-2xs relative w-full h-full">
                          <div className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-md px-2.5 py-2 font-black text-[11px] text-slate-800 border-b border-slate-200 flex items-center justify-between rounded-t-xl shadow-xs">
                            <span>{day.name}</span>
                            <span className="text-[9px] font-bold text-teal-800 bg-teal-100/90 px-1.5 py-0.5 rounded shadow-2xs">
                              {jpSlots.length} JP
                            </span>
                          </div>

                          <div className="p-1.5 space-y-1.5 flex-1">
                            {daySlots.length === 0 ? (
                              <div className="py-7 px-2 text-center bg-slate-100/80 rounded-xl border border-dashed border-slate-300 text-slate-500 my-1">
                                <Clock className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                                <p className="text-[11px] font-bold text-slate-700">Belum Ditetapkan</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Rentang waktu belum ada</p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddTimeSlot(day.id)}
                                  className="mt-2.5 px-2.5 py-1 text-[10px] font-bold bg-white text-teal-700 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tetapkan Slot</span>
                                </button>
                              </div>
                            ) : (
                              daySlots.map(s => {
                                const isJp = s.type === 'lesson';
                                const isElective = s.type === 'elective';
                                const isEkskul = s.type === 'extracurricular';
                                const slotColor = s.color || (isElective ? '#8b5cf6' : isJp ? '#0d9488' : isEkskul ? '#d97706' : s.type === 'break' ? '#f59e0b' : '#9333ea');

                                return (
                                  <div
                                    key={s.id}
                                    className="px-2 py-1.5 rounded-lg border transition flex flex-col justify-between shadow-2xs hover:shadow-xs relative group"
                                    style={{
                                      backgroundColor: `${slotColor}12`,
                                      borderColor: `${slotColor}40`,
                                      borderLeftWidth: '3.5px',
                                      borderLeftColor: slotColor
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-1 w-full">
                                      <div className="flex items-start gap-1 min-w-0 flex-1">
                                        <span
                                          className="px-1.5 py-0.5 rounded font-black text-[9px] text-white shrink-0 leading-none shadow-2xs mt-0.5"
                                          style={{ backgroundColor: slotColor }}
                                        >
                                          {isElective ? 'PILIHAN' : isJp ? 'JP' : isEkskul ? 'EKSKUL' : 'NON'}
                                        </span>
                                        <span className="font-bold text-[11px] text-slate-900 leading-snug break-words">
                                          {s.label || (isElective ? 'Mapel Pilihan (Paralel)' : isEkskul ? 'Ekskul' : `Jam Ke-${s.period_index}`)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-0.5 shrink-0 -mr-0.5 -mt-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditTimeSlot(s)}
                                          className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-white/90 transition"
                                          title="Edit rentang waktu"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTimeSlot(s.id)}
                                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white/90 transition"
                                          title="Hapus rentang waktu"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-700 w-full mt-auto pt-1 whitespace-nowrap">
                                      <span className="font-bold text-slate-900 tracking-tight">{formatTime24(s.start_time)} - {formatTime24(s.end_time)}</span>
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0"
                                        style={{
                                          color: slotColor,
                                          backgroundColor: '#fffffffa',
                                          borderColor: `${slotColor}40`
                                        }}
                                      >
                                        {calculateDurationText(s.start_time, s.end_time)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="p-1.5 bg-slate-100/70 border-t border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenAddTimeSlot(day.id)}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center justify-center gap-1 w-full py-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Slot {day.name}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Button (FAB) Bulat Melayang di Kanan Bawah */}
          <div className="fixed bottom-6 right-6 z-40 group">
            <button
              type="button"
              onClick={() => handleOpenAddTimeSlot(1)}
              className="w-14 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 border-2 border-white ring-4 ring-teal-600/30"
              title="Tambah Rentang Waktu Baru"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
            {/* Tooltip Hover */}
            <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
              + Tambah Rentang Waktu
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
                <span className="text-xs text-teal-200">Kebutuhan Beban Belajar Mapel & Validasi Guru</span>
              </div>
              <h3 className="text-xl font-black">Beban Pelajaran Per Rombel & Kuota JP</h3>
              <p className="text-xs text-teal-100 leading-relaxed">
                Menghitung alokasi kuota JP <b>Mata Pelajaran</b> per rombel dari <b>Struktur Kurikulum</b> dan mencocokkannya dengan <b>Pembagian Tugas Mengajar Guru</b>. Pembelajaran mapel yang <b>belum ada guru yang ditugaskan TIDAK BISA dialokasikan jadwalnya</b>.
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
                <span>+ Tambah Beban Mapel</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards (Dinamis Berdasarkan Filter Rombel & Non-Akumulasi Mapel Pilihan Paralel) */}
          {(() => {
            const activeSubjectLessons = lessonsList.filter(l => !l.extracurricular_id);
            const filteredSubjectLessons = activeSubjectLessons.filter(l => {
              if (lessonFilterClass && !(l.target_class_ids || []).includes(parseInt(lessonFilterClass, 10))) return false;
              return true;
            });

            // Mapel Pilihan berjalan berbarengan secara paralel (shared slot), sehingga hanya dihitung 1x kuota JP dan 1 slot pembelajaran
            const electiveGroupJpMap = {};
            let regularJpHours = 0;
            const regularSubjectIds = new Set();
            let hasElective = false;

            filteredSubjectLessons.forEach(l => {
              const subObj = subjectsList.find(s => String(s.id) === String(l.subject_id));
              const isElective = Boolean(
                l.is_elective == 1 || l.is_elective === true || l.is_elective === '1' ||
                (subObj && (subObj.is_elective == 1 || subObj.is_elective === true || subObj.is_elective === '1'))
              );
              const hours = l.total_hours_per_week || 0;

              if (isElective) {
                hasElective = true;
                const groupKey = l.joint_group_id || 'elective_parallel_block';
                electiveGroupJpMap[groupKey] = Math.max(electiveGroupJpMap[groupKey] || 0, hours);
              } else {
                regularJpHours += hours;
                if (l.subject_id) {
                  regularSubjectIds.add(l.subject_id);
                }
              }
            });

            const electiveParallelJp = Object.values(electiveGroupJpMap).reduce((acc, h) => acc + h, 0);
            const currentFilteredJpHours = regularJpHours + electiveParallelJp;
            // Total unit mapel efektif: jumlah mapel unik reguler (distinct subject) + 1 slot mapel pilihan paralel
            const effectiveSubjectsCount = regularSubjectIds.size + (hasElective ? 1 : 0);

            const filteredReady = filteredSubjectLessons.filter(l => l.teacher_ids && l.teacher_ids.length > 0);
            const filteredUnassigned = filteredSubjectLessons.filter(l => !l.teacher_ids || l.teacher_ids.length === 0);
            const selectedClassName = classGroups.find(c => String(c.id) === String(lessonFilterClass))?.name;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {lessonFilterClass ? `Kebutuhan JP (${selectedClassName})` : 'Total Kebutuhan JP Mapel'}
                  </span>
                  <h4 className="text-xl font-black text-slate-800 mt-1">{currentFilteredJpHours} JP / Pekan</h4>
                  <span className="text-[10px] text-slate-400">
                    {lessonFilterClass ? `Beban Rombel ${selectedClassName} (Mapel Pilihan Paralel)` : 'Target Kurikulum Sekolah (Paralel Pilihan)'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {lessonFilterClass ? `Mata Pelajaran (${selectedClassName})` : 'Total Mata Pelajaran'}
                  </span>
                  <h4 className="text-xl font-black text-indigo-700 mt-1">{effectiveSubjectsCount} Mata Pelajaran</h4>
                  <span className="text-[10px] text-slate-400">
                    {hasElective ? 'Termasuk 1 Slot Mapel Pilihan Paralel' : 'Mata Pelajaran Reguler'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Siap Dijadwalkan</span>
                  <h4 className="text-xl font-black text-emerald-700 mt-1">{filteredReady.length} Unit (Ada Guru)</h4>
                  <span className="text-[10px] text-emerald-600 font-bold">100% Siap dialokasikan</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Belum Ada Guru</span>
                  <h4 className={`text-xl font-black mt-1 ${filteredUnassigned.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {filteredUnassigned.length} Unit
                  </h4>
                  <span className="text-[10px] text-rose-500 font-bold">
                    {filteredUnassigned.length > 0 ? 'Wajib ditugaskan guru' : 'Semua sudah beres'}
                  </span>
                </div>
              </div>
            );
          })()}

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
            {/* Banner Informasi Mapel Pilihan Non-Akumulatif */}
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 shadow-2xs">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-extrabold text-purple-950">Informasi Alokasi Waktu Mapel Pilihan:</span>
                <p className="mt-0.5 text-[11px] text-purple-800">
                  Mata pelajaran pilihan (berlatar ungu) berjalan serentak / paralel pada waktu yang sama di rombel gabungan. Kuota jam <b>tidak diakumulasi ganda</b> (misal: 2 JP + 2 JP = tetap dihitung <b>2 JP beban rombel</b>), dan penginputan mata pelajaran apa saja yang masuk di JP tersebut dapat diatur secara manual pada tahap penetapan jadwal.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter Rombel:</span>
                <select
                  value={lessonFilterClass}
                  onChange={(e) => setLessonFilterClass(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="">Semua Rombel Reguler</option>
                  {classGroups
                    .filter(cg => !cg.type || cg.type === 'reguler')
                    .map(cg => (
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
                Menampilkan {lessonsList.filter(l => !l.extracurricular_id).length} mata pelajaran
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Mata Pelajaran</th>
                    <th className="p-3">Rombel Sasaran</th>
                    <th className="p-3">Guru Pengampu</th>
                    <th className="p-3 text-center">Beban JP/Pekan</th>
                    <th className="p-3 text-center">Durasi / Sesi</th>
                    <th className="p-3 text-center">Status Guru</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lessonsList.filter(l => !l.extracurricular_id).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Belum ada beban mata pelajaran. Klik tombol <b>"🔄 Sinkronkan dari Kurikulum & Tugas Mengajar"</b> di atas.
                      </td>
                    </tr>
                  ) : (
                    lessonsList
                      .filter(l => !l.extracurricular_id)
                      .filter(l => {
                        if (lessonFilterClass && !(l.target_class_ids || []).includes(parseInt(lessonFilterClass, 10))) return false;
                        const hasTeacher = l.teacher_ids && l.teacher_ids.length > 0;
                        if (lessonFilterStatus === 'ready' && !hasTeacher) return false;
                        if (lessonFilterStatus === 'unassigned' && hasTeacher) return false;
                        return true;
                      })
                      .map((les, idx) => {
                        const subObj = subjectsList.find(s => String(s.id) === String(les.subject_id));
                        const isElective = Boolean(
                          les.is_elective == 1 || les.is_elective === true || les.is_elective === '1' ||
                          (subObj && (subObj.is_elective == 1 || subObj.is_elective === true || subObj.is_elective === '1'))
                        );
                        const isJoined = Boolean(les.is_joined_class == 1 || les.is_joined_class === true || les.is_joined_class === '1');
                        const classNames = (les.target_class_ids || []).map(cid => classGroups.find(c => c.id === cid)?.name).filter(Boolean);
                        const teacherObjs = (les.teacher_ids || []).map(tid => teachers.find(t => t.id === tid)).filter(Boolean);
                        const hasTeacher = teacherObjs.length > 0;
                        const cleanSubjectName = les.subject_name || subObj?.name || (les.name ? les.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'Mata Pelajaran');

                        return (
                          <tr key={les.id} className={`hover:bg-slate-50 transition ${isElective ? 'bg-purple-50/20' : !hasTeacher ? 'bg-rose-50/30' : ''}`}>
                            <td className="p-3 font-semibold text-center text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{cleanSubjectName}</span>
                                {isElective ? (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-md font-bold text-[9px]">
                                    Mapel Pilihan (Paralel)
                                  </span>
                                ) : null}
                                {isJoined ? (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-md font-bold text-[9px]">
                                    Rombel Gabungan
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {classNames.map((cn, i) => (
                                  <span key={i} className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${isElective ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-teal-50 text-teal-900 border-teal-200'}`}>
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
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-black text-indigo-700 text-xs">{les.total_hours_per_week} JP</span>
                                {isElective && (
                                  <span className="text-[8.5px] font-bold text-purple-700 bg-purple-100/70 px-1.5 py-0.2 rounded mt-0.5">
                                    Paralel (1x JP)
                                  </span>
                                )}
                              </div>
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
          {constraintTab === 'teacher' && (() => {
            // Ambil ID seluruh guru yang mengajar mata pelajaran reguler (dari lessonsList aktif)
            const activeTeacherIds = new Set();
            lessonsList
              .filter(l => !l.extracurricular_id)
              .forEach(l => {
                (l.teacher_ids || []).forEach(tid => activeTeacherIds.add(String(tid)));
              });

            // Filter daftar guru: hanya yang memiliki tugas mengajar mapel reguler & sesuai live search
            const regularTeachers = teachers.filter(t => activeTeacherIds.has(String(t.id)));
            const filteredTeachers = regularTeachers.filter(t => {
              if (!teacherAvailSearchQuery.trim()) return true;
              const q = teacherAvailSearchQuery.toLowerCase();
              return (
                (t.full_name && t.full_name.toLowerCase().includes(q)) ||
                (t.nip && t.nip.toLowerCase().includes(q))
              );
            });

            const selectedTeacherObj = teachers.find(t => String(t.id) === String(selectedTeacherForAvail));

            // Ambil seluruh rentang waktu jenis JP Reguler yang benar-benar ada (distinct berdasarkan period_index atau start_time)
            const regularJpSlots = timeSlots.filter(s => s.type === 'lesson');
            // Kelompokkan JP unik berdasarkan period_index yang ada pada JP Reguler
            const distinctPeriodsMap = new Map();
            regularJpSlots.forEach(s => {
              const p = s.period_index || 1;
              if (!distinctPeriodsMap.has(p)) {
                distinctPeriodsMap.set(p, {
                  period: p,
                  label: s.label || `Jam Ke-${p}`,
                  start_time: s.start_time,
                  end_time: s.end_time
                });
              }
            });

            // Urutkan kolom JP Reguler secara kronologis berdasarkan start_time lalu period
            const jpPeriods = Array.from(distinctPeriodsMap.values()).sort((a, b) => {
              const startDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
              if (startDiff !== 0) return startDiff;
              return a.period - b.period;
            });

            return (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">Matriks Ketersediaan Guru Mengajar</h4>
                    <p className="text-xs text-slate-500">Klik pada kotak jam pelajaran untuk mengubah status: Tersedia (Hijau), Libur / Tidak Tersedia (Merah), atau Hindari (Kuning).</p>
                  </div>

                  {/* Live Search Custom Select Guru */}
                  <div className="relative w-full sm:w-72">
                    <div
                      onClick={() => setTeacherAvailDropdownOpen(!teacherAvailDropdownOpen)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-300 hover:border-teal-500 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">
                          {selectedTeacherObj ? selectedTeacherObj.full_name : '-- Pilih Guru Pengampu --'}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {teacherAvailDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                        {/* Live Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            autoFocus
                            value={teacherAvailSearchQuery}
                            onChange={(e) => setTeacherAvailSearchQuery(e.target.value)}
                            placeholder="Cari nama guru / NIP..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* List Guru */}
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                          {filteredTeachers.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-xs">
                              Guru mapel tidak ditemukan
                            </div>
                          ) : (
                            filteredTeachers.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTeacherForAvail(String(t.id));
                                  setTeacherAvailDropdownOpen(false);
                                  setTeacherAvailSearchQuery('');
                                  fetchTeacherAvailabilities(String(t.id));
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                                  String(selectedTeacherForAvail) === String(t.id)
                                    ? 'bg-teal-50 text-teal-900 font-bold'
                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{t.full_name}</div>
                                  <div className="text-[10px] text-slate-400">{t.nip || 'Guru Reguler'}</div>
                                </div>
                                {String(selectedTeacherForAvail) === String(t.id) && (
                                  <span className="text-teal-600 font-bold text-xs">✓</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
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
                          {jpPeriods.map((colItem, idx) => (
                            <th key={colItem.period} className="p-2 border">
                              <div>{colItem.label || `JP ${idx + 1}`}</div>
                              {colItem.start_time && (
                                <div className="text-[9px] font-normal text-slate-500 font-mono">
                                  {formatTime24(colItem.start_time)}-{formatTime24(colItem.end_time)}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(day => (
                          <tr key={day.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-left text-slate-800 border bg-slate-50/50">{day.name}</td>
                            {jpPeriods.map(colItem => {
                              const period = colItem.period;
                              // Cek apakah pada hari ini ada rentang waktu jenis JP Reguler untuk period_index ini
                              const hasJpSlot = timeSlots.some(s => s.day_of_week === day.id && s.type === 'lesson' && s.period_index === period);
                              const avail = teacherAvailabilities.find(a => a.day_of_week === day.id && a.period_index === period);
                              const isUnavailable = avail?.status === 'unavailable';
                              const isAvoid = avail?.status === 'avoid';

                              if (!hasJpSlot) {
                                return (
                                  <td
                                    key={period}
                                    className="p-2.5 border bg-slate-100/80 text-slate-400 font-medium select-none cursor-not-allowed"
                                    title={`Tidak ada ${colItem.label} pada hari ${day.name} (Non-KBM / Di luar jam KBM)`}
                                  >
                                    <span className="text-[10px] text-slate-400 font-bold">-</span>
                                  </td>
                                );
                              }

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
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded"></span> Non-KBM / Tidak Ada JP</span>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* SUB-TAB B: KETERSEDIAAN ROMBEL */}
          {constraintTab === 'class' && (() => {
            // Filter rombel: hanya rombel reguler
            const regularClassGroups = classGroups.filter(cg => !cg.type || cg.type === 'reguler');
            const filteredClasses = regularClassGroups.filter(cg => {
              if (!classAvailSearchQuery.trim()) return true;
              const q = classAvailSearchQuery.toLowerCase();
              return (
                (cg.name && cg.name.toLowerCase().includes(q)) ||
                (cg.grade_level_name && cg.grade_level_name.toLowerCase().includes(q))
              );
            });

            const selectedClassObj = regularClassGroups.find(c => String(c.id) === String(selectedClassForAvail));

            // Ambil seluruh rentang waktu jenis JP Reguler yang benar-benar ada
            const regularJpSlots = timeSlots.filter(s => s.type === 'lesson');
            const distinctPeriodsMap = new Map();
            regularJpSlots.forEach(s => {
              const p = s.period_index || 1;
              if (!distinctPeriodsMap.has(p)) {
                distinctPeriodsMap.set(p, {
                  period: p,
                  label: s.label || `Jam Ke-${p}`,
                  start_time: s.start_time,
                  end_time: s.end_time
                });
              }
            });

            const jpPeriods = Array.from(distinctPeriodsMap.values()).sort((a, b) => {
              const startDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
              if (startDiff !== 0) return startDiff;
              return a.period - b.period;
            });

            return (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">Matriks Waktu KBM Rombongan Belajar</h4>
                    <p className="text-xs text-slate-500">Tandai jam-jam di mana kelas tertentu tidak memiliki KBM (misal waktu kegiatan santri khusus, praktikum, dll.).</p>
                  </div>

                  {/* Live Search Custom Select Rombel */}
                  <div className="relative w-full sm:w-72">
                    <div
                      onClick={() => setClassAvailDropdownOpen(!classAvailDropdownOpen)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-300 hover:border-teal-500 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">
                          {selectedClassObj ? `${selectedClassObj.name} (${selectedClassObj.grade_level_name || 'Reguler'})` : '-- Pilih Rombel --'}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {classAvailDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                        {/* Live Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            autoFocus
                            value={classAvailSearchQuery}
                            onChange={(e) => setClassAvailSearchQuery(e.target.value)}
                            placeholder="Cari nama rombel..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* List Rombel */}
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                          {filteredClasses.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-xs">
                              Rombel reguler tidak ditemukan
                            </div>
                          ) : (
                            filteredClasses.map(cg => (
                              <button
                                key={cg.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClassForAvail(String(cg.id));
                                  setClassAvailDropdownOpen(false);
                                  setClassAvailSearchQuery('');
                                  fetchClassAvailabilities(String(cg.id));
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                                  String(selectedClassForAvail) === String(cg.id)
                                    ? 'bg-teal-50 text-teal-900 font-bold'
                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{cg.name}</div>
                                  <div className="text-[10px] text-slate-400">{cg.grade_level_name || 'Rombel Reguler'}</div>
                                </div>
                                {String(selectedClassForAvail) === String(cg.id) && (
                                  <span className="text-teal-600 font-bold text-xs">✓</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!selectedClassForAvail ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>Silakan pilih rombel pada dropdown di atas untuk mengatur jam belajar.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3 text-left border">Hari</th>
                            {jpPeriods.map((colItem, idx) => (
                              <th key={colItem.period} className="p-2 border">
                                <div>{colItem.label || `JP ${idx + 1}`}</div>
                                {colItem.start_time && (
                                  <div className="text-[9px] font-normal text-slate-500 font-mono">
                                    {formatTime24(colItem.start_time)}-{formatTime24(colItem.end_time)}
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS.map(day => (
                            <tr key={day.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold text-left text-slate-800 border bg-slate-50/50">{day.name}</td>
                              {jpPeriods.map(colItem => {
                                const period = colItem.period;
                                const hasJpSlot = timeSlots.some(s => s.day_of_week === day.id && s.type === 'lesson' && s.period_index === period);
                                const avail = classAvailabilities.find(a => a.day_of_week === day.id && a.period_index === period);
                                const isUnavailable = avail?.status === 'unavailable';

                                if (!hasJpSlot) {
                                  return (
                                    <td
                                      key={period}
                                      className="p-2.5 border bg-slate-100/80 text-slate-400 font-medium select-none cursor-not-allowed"
                                      title={`Tidak ada ${colItem.label} pada hari ${day.name} (Non-KBM / Di luar jam KBM)`}
                                    >
                                      <span className="text-[10px] text-slate-400 font-bold">-</span>
                                    </td>
                                  );
                                }

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

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-500 rounded"></span> Tersedia KBM (Bisa Mengalokasikan Mapel)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-rose-500 rounded"></span> Waktu Terblokir (Santri Non-KBM / Praktikum)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded"></span> Non-KBM / Tidak Ada JP</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUB-TAB C: BATASAN MATA PELAJARAN */}
          {constraintTab === 'subject' && (() => {
            // Ambil seluruh mata pelajaran unik yang aktif di kurikulum / lessons
            const activeSubjectIds = new Set();
            lessonsList
              .filter(l => !l.extracurricular_id)
              .forEach(l => {
                if (l.subject_id) activeSubjectIds.add(String(l.subject_id));
              });

            const regularSubjects = subjectsList.filter(s => activeSubjectIds.has(String(s.id)) || (s.is_active && !s.parent_subject_id));
            const filteredSubjects = regularSubjects.filter(s => {
              if (!subjectConstraintSearchQuery.trim()) return true;
              const q = subjectConstraintSearchQuery.toLowerCase();
              return (
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.code && s.code.toLowerCase().includes(q))
              );
            });

            return (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">Batasan Waktu Khusus Mata Pelajaran</h4>
                    <p className="text-xs text-slate-500">Contoh: PJOK / Olahraga diatur hanya boleh di pagi hari (sebelum jam 10:00), atau Tahfidz di jam ke-1 s.d ke-2.</p>
                  </div>

                  {/* Live Search Input untuk Mata Pelajaran */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={subjectConstraintSearchQuery}
                      onChange={(e) => setSubjectConstraintSearchQuery(e.target.value)}
                      placeholder="Cari mata pelajaran..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredSubjects.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                      Mata pelajaran tidak ditemukan
                    </div>
                  ) : (
                    filteredSubjects.map(sub => {
                      const currentVal = subjectConstraintsMap[sub.id] || 'any';
                      return (
                        <div key={sub.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-3 shadow-2xs transition">
                          <div className="truncate">
                            <span className="font-extrabold text-xs text-slate-800 truncate block">{sub.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">{sub.code || 'MAPEL'}</span>
                              {sub.is_elective ? (
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                                  Pilihan
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded">
                                  Reguler
                                </span>
                              )}
                            </div>
                          </div>
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              setSubjectConstraintsMap({
                                ...subjectConstraintsMap,
                                [sub.id]: e.target.value
                              });
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 shrink-0"
                          >
                            <option value="any">Bebas Sepanjang Hari</option>
                            <option value="morning_only">Hanya Jam Pagi (JP 1-3)</option>
                            <option value="first_periods">Hanya Jam Ke-1 & 2</option>
                            <option value="no_friday">Tidak Boleh Hari Jumat</option>
                          </select>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
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
                    <span>Menghitung Solusi Jadwal... ({generatorStep}/5)</span>
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

          {/* Real-time Progress & Activity Log saat Generating */}
          {isGenerating && (
            <div className="bg-slate-900 border border-slate-700 text-white p-5 rounded-2xl shadow-xl space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                  <h4 className="font-black text-sm text-amber-300">Algoritma Solver Sedang Bekerja (Internal CSP Engine)</h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">Step {generatorStep} dari 5</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(generatorStep / 5) * 100}%` }}
                />
              </div>

              {/* Log List */}
              <div className="bg-slate-950/90 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1.5 border border-slate-800/80 max-h-40 overflow-y-auto">
                {generatorLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">✔</span>
                    <span className="text-slate-200">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    viewMode === 'matrix' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>1. Matriks aSc Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    viewMode === 'calendar' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  2. Kalender Mingguan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    viewMode === 'table' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  3. Daftar Tabel Sesi
                </button>
              </div>

              {/* Toggle Perspektif Matriks: Per Rombel vs Per Guru */}
              {viewMode === 'matrix' && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMatrixPerspective('class')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      matrixPerspective === 'class'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    🏫 Matriks Rombel
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixPerspective('teacher')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      matrixPerspective === 'teacher'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    👨‍🏫 Matriks Guru
                  </button>
                </div>
              )}

              {/* Tombol Pilih Semua Sesi */}
              {schedules.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllSchedules}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs ${
                    selectedScheduleIds.length === schedules.length
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={selectedScheduleIds.length === schedules.length ? 'Batalkan pilihan seluruh sesi' : 'Pilih seluruh sesi jadwal yang tampil'}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={selectedScheduleIds.length > 0 && selectedScheduleIds.length === schedules.length}
                    className="w-3.5 h-3.5 text-rose-600 rounded pointer-events-none cursor-pointer"
                  />
                  <span>
                    {selectedScheduleIds.length === schedules.length
                      ? 'Batal Pilih Semua'
                      : `Pilih Semua (${schedules.length})`}
                  </span>
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500">
              Menampilkan <b>{schedules.length} Sesi</b> pada opsi <b>{currentSelectedPreset?.name || 'Reguler'}</b>
            </span>
          </div>

          {/* ========================================================= */}
          {/* 1. TIMETABLE MATRIX GRID VIEW (STANDAR aSc TimeTables / EduPage) */}
          {/* ========================================================= */}
          {viewMode === 'matrix' && (() => {
            // Dapatkan seluruh Slot Waktu KBM (hanya lesson/JP KBM reguler & pilihan yang diinput di Tahap 1)
            const uniquePeriodsByDay = {};
            const availableDaysWithSlots = new Set();

            timeSlots.forEach(s => {
              if (s.type === 'lesson') {
                if (!uniquePeriodsByDay[s.day_of_week]) {
                  uniquePeriodsByDay[s.day_of_week] = [];
                }
                uniquePeriodsByDay[s.day_of_week].push(s);
                availableDaysWithSlots.add(s.day_of_week);
              }
            });

            // Urutkan slot per hari
            Object.keys(uniquePeriodsByDay).forEach(dayId => {
              uniquePeriodsByDay[dayId].sort((a, b) => a.period_index - b.period_index || a.start_time.localeCompare(b.start_time));
            });

            // Saring hari aktif: Hanya hari yang memiliki slot JP KBM terdaftar di Tahap 1
            // (atau hari yang memiliki sesi jadwal aktual)
            const daysWithSchedule = new Set(schedules.map(s => s.day_of_week));
            const activeDays = DAYS.filter(d => availableDaysWithSlots.has(d.id) || (uniquePeriodsByDay[d.id] && uniquePeriodsByDay[d.id].length > 0) || daysWithSchedule.has(d.id));

            // Sumbu Baris: Daftar Rombel atau Daftar Guru
            const targetClassList = (!activeSchoolUnit?.id && allSchoolClassGroups.length > 0) ? allSchoolClassGroups : classGroups;
            const rows = matrixPerspective === 'class'
              ? targetClassList.filter(c => !c.type || c.type === 'reguler')
              : teachers.filter(t => schedules.some(s => s.teacher_employee_id === t.id));

            // Helper Pembuat Warna Harmonis Berdasarkan String Nama Mapel / Guru
            const getSubjectColor = (subjectName, isEkskul) => {
              if (isEkskul) return { bg: '#fef3c7', border: '#f59e0b', text: '#78350f', badge: '#d97706' };
              const colors = [
                { bg: '#ecfdf5', border: '#10b981', text: '#064e3b', badge: '#059669' }, // Emerald (MTK)
                { bg: '#f0fdf4', border: '#22c55e', text: '#14532d', badge: '#16a34a' }, // Green (IPA)
                { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', badge: '#2563eb' }, // Blue (Bahasa Inggris)
                { bg: '#f5f3ff', border: '#8b5cf6', text: '#4c1d95', badge: '#7c3aed' }, // Purple (Bahasa Arab)
                { bg: '#faf5ff', border: '#a855f7', text: '#581c87', badge: '#9333ea' }, // Violet (PAI)
                { bg: '#fff7ed', border: '#f97316', text: '#7c2d12', badge: '#ea580c' }, // Orange (IPS)
                { bg: '#fdf2f8', border: '#ec4899', text: '#701a75', badge: '#db2777' }, // Pink (Bahasa Indonesia)
                { bg: '#f0fdfa', border: '#14b8a6', text: '#134e4a', badge: '#0d9488' }, // Teal (PJOK)
                { bg: '#fefce8', border: '#eab308', text: '#713f12', badge: '#ca8a04' }  // Yellow (PKN)
              ];
              let hash = 0;
              for (let i = 0; i < (subjectName || '').length; i++) {
                hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
              }
              const index = Math.abs(hash) % colors.length;
              return colors[index];
            };

            // Singkatan Mapel
            const getSubjectAbbr = (name) => {
              if (!name) return 'KBM';
              const clean = name.replace(/\(.*\)/g, '').trim().toUpperCase();
              if (clean.includes('MATEMATIKA')) return 'MTK';
              if (clean.includes('INGGRIS')) return 'ENG';
              if (clean.includes('ARAB')) return 'ARB';
              if (clean.includes('INDONESIA')) return 'IND';
              if (clean.includes('AGAMA') || clean.includes('PAI')) return 'PAI';
              if (clean.includes('IPA') || clean.includes('ALAM')) return 'IPA';
              if (clean.includes('IPS') || clean.includes('SOSIAL')) return 'IPS';
              if (clean.includes('PANCASILA') || clean.includes('PKN')) return 'PKN';
              if (clean.includes('JASMANI') || clean.includes('PJOK')) return 'PJK';
              return clean.substring(0, 3);
            };

            return (
              <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all ${
                isMatrixFullscreen ? 'fixed inset-0 w-screen h-screen z-[9999] rounded-none border-none p-3 bg-slate-900/80 backdrop-blur-md flex flex-col items-stretch overflow-hidden' : 'overflow-hidden'
              }`}>
                {/* TOOLBAR INFO MATRIKS + BATCH ACTIONS SEJAJAR */}
                <div className={`px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700 shrink-0 ${
                  isMatrixFullscreen ? 'bg-white rounded-xl shadow-md mb-2.5' : 'bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-900 rounded-lg font-extrabold text-[11px] shadow-2xs">
                      {matrixPerspective === 'class' ? 'Matriks KBM Seluruh Rombel' : 'Matriks KBM Seluruh Guru'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-bold">
                      {rows.length} {matrixPerspective === 'class' ? 'Rombel Kelas' : 'Guru'} (Mapel Reguler & Pilihan)
                    </span>

                    {/* SEJAJAR: INFO & AKSI SESI TERPILIH (JIKA ADA CHECKBOX YANG DICENTANG) */}
                    {selectedScheduleIds.length > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-xl shadow-md animate-in fade-in zoom-in-95">
                          <div className="w-5 h-5 rounded-md bg-teal-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                            {selectedScheduleIds.length}
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="font-extrabold text-[11px] text-white">
                              {selectedScheduleIds.length} Sesi Terpilih
                            </span>
                            <span className="text-[9px] text-slate-300 font-normal">
                              Pilih aksi massal untuk diterapkan pada seluruh sesi yang dicentang
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2">
                            <button
                              type="button"
                              onClick={() => setSelectedScheduleIds([])}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBulkDeleteReason(`Penghapusan massal ${selectedScheduleIds.length} sesi jadwal pelajaran`);
                                setBulkDeleteModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Massal</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span>
                      <span className="text-slate-600 font-medium">KBM Reguler (1 / 2 JP)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-purple-100 border border-purple-400"></span>
                      <span className="text-slate-600 font-medium">Mapel Pilihan / Paralel (Split)</span>
                    </div>

                    {/* Tombol Fullscreen / Fokus Mode */}
                    <button
                      type="button"
                      onClick={() => setIsMatrixFullscreen(!isMatrixFullscreen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs ${
                        isMatrixFullscreen
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-md'
                          : 'bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border-slate-300'
                      }`}
                      title={isMatrixFullscreen ? 'Keluar dari Mode Layar Penuh (Fokus)' : 'Buka Matriks Mode Layar Penuh (Fokus)'}
                    >
                      {isMatrixFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>Tutup Layar Penuh</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Layar Penuh (Fokus)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SCROLLABLE 2-WAY MATRIX GRID CONTAINER (CSS GRID MODERN 100% VERTICAL FILL) */}
                {(() => {
                  // 1. Hitung total kumulatif slot dari seluruh activeDays
                  const flatSlots = [];
                  activeDays.forEach(d => {
                    const daySlots = uniquePeriodsByDay[d.id] || [];
                    daySlots.forEach((slot, sIdx) => {
                      flatSlots.push({
                        ...slot,
                        dayId: d.id,
                        dayName: d.name,
                        sIdx
                      });
                    });
                  });

                  const totalSlotsCount = flatSlots.length;
                  const gridColsTemplate = `minmax(95px, 110px) repeat(${totalSlotsCount}, minmax(75px, 95px))`;

                  return (
                    <div className={`overflow-x-auto overflow-y-auto scrollbar-thin ${
                      isMatrixFullscreen
                        ? 'flex-1 w-full h-[calc(100vh-80px)] min-h-0 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col'
                        : 'max-h-[75vh]'
                    }`}>
                      <div
                        className={`w-max min-w-full text-center text-xs text-slate-800 ${
                          isMatrixFullscreen ? 'h-full flex-1 flex flex-col' : ''
                        }`}
                      >
                        {/* ========================================================= */}
                        {/* HEADER TINGKAT 1: NAMA HARI (STICKY TOP DENGAN TEMA TEGAS)*/}
                        {/* ========================================================= */}
                        <div
                          className="sticky top-0 z-30 shadow-2xs grid bg-slate-900 text-white font-extrabold text-xs shrink-0"
                          style={{ gridTemplateColumns: gridColsTemplate }}
                        >
                          <div className="p-2 sticky left-0 z-40 bg-slate-950 border-r-2 border-slate-700 min-w-[95px] max-w-[110px] shadow-md text-center flex items-center justify-center">
                            {matrixPerspective === 'class' ? '🏫 Rombel' : '👨‍🏫 Guru'}
                          </div>
                          {activeDays.map((d, dIdx) => {
                            const slotCount = uniquePeriodsByDay[d.id]?.length || 1;
                            const dayHeaders = [
                              { bg: 'bg-teal-900', border: 'border-teal-700', badge: 'bg-teal-800 text-teal-200' },
                              { bg: 'bg-indigo-900', border: 'border-indigo-700', badge: 'bg-indigo-800 text-indigo-200' },
                              { bg: 'bg-blue-900', border: 'border-blue-700', badge: 'bg-blue-800 text-blue-200' },
                              { bg: 'bg-purple-900', border: 'border-purple-700', badge: 'bg-purple-800 text-purple-200' },
                              { bg: 'bg-emerald-900', border: 'border-emerald-700', badge: 'bg-emerald-800 text-emerald-200' },
                              { bg: 'bg-amber-900', border: 'border-amber-700', badge: 'bg-amber-800 text-amber-200' },
                            ];
                            const theme = dayHeaders[dIdx % dayHeaders.length];

                            return (
                              <div
                                key={d.id}
                                className={`p-2.5 border-r-2 border-b border-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-2 ${theme.bg}`}
                                style={{ gridColumn: `span ${slotCount}` }}
                              >
                                <span className="font-black text-sm tracking-normal">{d.name}</span>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${theme.badge} border border-white/10`}>
                                  {slotCount} JP
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* ========================================================= */}
                        {/* HEADER TINGKAT 2: JAM PELAJARAN (STICKY TOP DI BAWAH HARI)*/}
                        {/* ========================================================= */}
                        <div
                          className="sticky top-[42px] z-30 shadow-2xs grid bg-slate-100 text-slate-700 font-bold text-[11px] border-b-2 border-slate-300 shrink-0"
                          style={{ gridTemplateColumns: gridColsTemplate }}
                        >
                          <div className="p-1.5 sticky left-0 z-40 bg-slate-300 border-r-2 border-slate-400 text-center text-[10px] text-slate-800 uppercase font-black flex items-center justify-center">
                            Jam
                          </div>
                          {activeDays.map((d, dIdx) => {
                            const daySlots = uniquePeriodsByDay[d.id] || [];
                            const isOddDay = dIdx % 2 === 1;

                            return daySlots.map((slot, sIdx) => {
                              const isLastSlotOfDay = sIdx === daySlots.length - 1;
                              return (
                                <div
                                  key={`${d.id}_${slot.id || sIdx}`}
                                  className={`p-1 border-b border-slate-300 min-w-[75px] max-w-[95px] whitespace-nowrap text-slate-800 flex flex-col justify-center items-center ${
                                    isLastSlotOfDay ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-200'
                                  } ${isOddDay ? 'bg-slate-100/90' : 'bg-white'}`}
                                >
                                  <div className="font-extrabold text-slate-900">{slot.label || `JP ${slot.period_index}`}</div>
                                  <div className="text-[9px] font-semibold text-slate-500 font-mono">
                                    {slot.start_time ? slot.start_time.substring(0, 5) : ''} - {slot.end_time ? slot.end_time.substring(0, 5) : ''}
                                  </div>
                                </div>
                              );
                            });
                          })}
                        </div>

                        {/* ========================================================= */}
                        {/* BODY ROWS: DAFTAR ROMBEL / GURU (GRID TERPADU SEMUA UNIT) */}
                        {/* ========================================================= */}
                        <div
                          className={`divide-y divide-slate-200 ${
                            isMatrixFullscreen ? 'flex-1 grid' : 'flex flex-col'
                          }`}
                          style={isMatrixFullscreen ? { gridTemplateRows: `repeat(${Math.max(1, rows.length)}, minmax(90px, 1fr))` } : undefined}
                        >
                          {rows.map((rowItem, rIdx) => {
                            const rowId = rowItem.id;
                            const rowName = rowItem.name || rowItem.full_name;

                            // Filter jadwal untuk baris ini
                            const rowSchedules = schedules.filter(sch => {
                              if (matrixPerspective === 'class') {
                                const cids = sch.class_groups ? sch.class_groups.map(c => c.id) : [];
                                return cids.includes(rowId);
                              } else {
                                return sch.teacher_employee_id === rowId;
                              }
                            });

                            const unitId = rowItem.satuan_pendidikan_id;
                            const unitCode = schoolUnitsList.find(u => u.id === unitId)?.code || (unitId === 2 ? 'SMA' : unitId === 1 ? 'SMP' : null);

                            return (
                              <div
                                key={rowId}
                                className="grid transition"
                                style={{ gridTemplateColumns: gridColsTemplate }}
                              >
                                {/* NAMA ROMBEL / GURU (STICKY COLUMN DENGAN BADGE UNIT) */}
                                <div className="p-2.5 sticky left-0 z-20 bg-slate-100 border-r-2 border-b border-slate-300 text-left font-black text-xs text-slate-900 shadow-md flex flex-col justify-center min-w-[95px] max-w-[110px]">
                                  <div className="truncate font-black text-sm text-slate-950">{rowName}</div>
                                  <div className="text-[9.5px] font-bold text-slate-600 truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    <span>{matrixPerspective === 'class' ? `${rowSchedules.length} Sesi` : (rowItem.nip || 'Guru')}</span>
                                    {!activeSchoolUnit?.id && matrixPerspective === 'class' && unitCode && (
                                      <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs ${
                                        unitId === 2 ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                                      }`}>
                                        {unitCode}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* CELL SETIAP HARI & JAM KBM */}
                                {activeDays.map((d, dIdx) => {
                                  const daySlots = uniquePeriodsByDay[d.id] || [];
                                  const renderedSlotIndices = new Set();
                                  const isOddDay = dIdx % 2 === 1;

                                  return daySlots.map((slot, sIdx) => {
                                    if (renderedSlotIndices.has(sIdx)) return null;
                                    const isLastSlotOfDay = sIdx === daySlots.length - 1;

                                    // Cari sesi yang cocok dengan slot jam ini
                                    const matchingSchedules = rowSchedules.filter(sch => {
                                      if (sch.day_of_week !== d.id) return false;
                                      const schStart = (sch.start_time || '').substring(0, 5);
                                      const slotStart = (slot.start_time || '').substring(0, 5);
                                      return schStart === slotStart ||
                                             sch.period_label === slot.label ||
                                             (slot.period_index && sch.period_index === slot.period_index);
                                    });

                                    if (matchingSchedules.length === 0) {
                                      // Slot Kosong -> Drag & Drop + Click
                                      const isOverThisCell = dragOverTarget &&
                                        dragOverTarget.dayId === d.id &&
                                        dragOverTarget.slotId === (slot.id || sIdx) &&
                                        dragOverTarget.rowId === rowId;

                                      return (
                                        <div
                                          key={`${d.id}_${sIdx}`}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            if (!isOverThisCell) {
                                              setDragOverTarget({ dayId: d.id, slotId: slot.id || sIdx, rowId });
                                            }
                                          }}
                                          onDragLeave={() => {
                                            if (isOverThisCell) setDragOverTarget(null);
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            handleMoveSchedule(d.id, slot, rowId);
                                          }}
                                          onClick={() => {
                                            handleOpenAddModal({
                                              day_of_week: d.id,
                                              start_time: slot.start_time,
                                              end_time: slot.end_time,
                                              period_label: slot.label || `Jam Ke-${slot.period_index}`,
                                              class_group_ids: matrixPerspective === 'class' ? [rowId] : [],
                                              teacher_employee_id: matrixPerspective === 'teacher' ? String(rowId) : ''
                                            });
                                          }}
                                          className={`p-1.5 border-b border-slate-200 transition text-[11px] group/cell flex items-center justify-center relative ${
                                            isLastSlotOfDay ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-100'
                                          } ${
                                            isOverThisCell
                                              ? 'bg-teal-100 border-2 border-dashed border-teal-600 ring-2 ring-teal-400 z-10'
                                              : isOddDay ? 'bg-slate-50/50 hover:bg-teal-50/60' : 'bg-white hover:bg-teal-50/60'
                                          } ${draggedSchedule ? 'cursor-copy' : 'cursor-pointer'}`}
                                          title={
                                            draggedSchedule
                                              ? `Lepaskan di sini untuk memindahkan sesi ke Hari ${d.name} (${slot.start_time}-${slot.end_time})`
                                              : `Klik untuk tambah sesi pada Hari ${d.name} (${slot.start_time}-${slot.end_time})`
                                          }
                                        >
                                          {isOverThisCell ? (
                                            <span className="font-extrabold text-teal-800 text-[10px] animate-pulse">
                                              ⬇ Lepas Di Sini
                                            </span>
                                          ) : (
                                            <span className="opacity-0 group-hover/cell:opacity-100 font-bold text-teal-600 text-xs">
                                              +
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }

                                    // Deteksi durasi JP (apakah membentang 2 slot?)
                                    const firstSch = matchingSchedules[0];
                                    const [sh, sm] = firstSch.start_time.split(':').map(Number);
                                    const [eh, em] = firstSch.end_time.split(':').map(Number);
                                    const durationMins = (eh * 60 + em) - (sh * 60 + sm);
                                    const is2JP = durationMins > 50;

                                    let colSpan = 1;
                                    if (is2JP && sIdx + 1 < daySlots.length && daySlots[sIdx + 1].type === 'lesson') {
                                      colSpan = 2;
                                      renderedSlotIndices.add(sIdx + 1);
                                    }
                                    const isSpannedLastSlot = sIdx + colSpan - 1 >= daySlots.length - 1;

                                    return (
                                      <div
                                        key={`${d.id}_${sIdx}`}
                                        style={{ gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined }}
                                        className={`p-1 border-b border-slate-200 flex flex-col justify-stretch h-full ${
                                          (isLastSlotOfDay || isSpannedLastSlot) ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-100'
                                        } ${isOddDay ? 'bg-slate-50/30' : 'bg-white'}`}
                                      >
                                        <div className={`w-full h-full flex flex-col gap-1 ${matchingSchedules.length > 1 ? 'divide-y divide-slate-200' : ''}`}>
                                          {matchingSchedules.map(sch => {
                                            const isSelected = selectedScheduleIds.includes(sch.id);
                                            const isBeingDragged = draggedSchedule && draggedSchedule.id === sch.id;
                                            const isEkskul = sch.schedule_type === 'ekskul';

                                            const matchedSub = subjectsList.find(s => String(s.id) === String(sch.subject_id));
                                            const isElective = matchedSub && (matchedSub.is_elective == 1 || matchedSub.is_elective === true || matchedSub.is_elective === '1');
                                            const groupName = matchedSub?.elective_group_name?.trim();

                                            const subName = isElective && groupName
                                              ? groupName
                                              : (sch.extra_name || sch.subject_name || 'Mapel');

                                            const colors = isElective && groupName
                                              ? { bg: '#faf5ff', border: '#a855f7', text: '#581c87', badge: '#9333ea' }
                                              : getSubjectColor(subName, isEkskul);

                                            const abbr = isElective && groupName ? 'BLK' : getSubjectAbbr(subName);

                                            return (
                                              <div
                                                key={sch.id}
                                                draggable={!isMovingSchedule}
                                                onDragStart={(e) => {
                                                  e.dataTransfer.setData('text/plain', String(sch.id));
                                                  e.dataTransfer.effectAllowed = 'move';
                                                  setDraggedSchedule(sch);
                                                }}
                                                onDragEnd={() => {
                                                  setDraggedSchedule(null);
                                                  setDragOverTarget(null);
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditModal(sch);
                                                }}
                                                className={`p-1.5 rounded-lg border text-left cursor-grab active:cursor-grabbing transition shadow-2xs relative group/card w-full h-full flex flex-col justify-between select-none ${
                                                  isSelected ? 'ring-2 ring-rose-500 bg-rose-50' : ''
                                                } ${isBeingDragged ? 'opacity-40 scale-95 border-dashed border-teal-500 ring-2 ring-teal-300' : 'hover:shadow-md'}`}
                                                style={{
                                                  backgroundColor: isSelected ? undefined : colors.bg,
                                                  borderColor: isSelected ? '#f43f5e' : colors.border
                                                }}
                                                title={`Tahan & Drag untuk memindahkan • ${subName} (${sch.subject_name || 'Pilihan'}) - ${sch.teacher_name || 'Tanpa Guru'} (${sch.start_time}-${sch.end_time})`}
                                              >
                                                {/* BAGIAN ATAS KARTU */}
                                                <div className="space-y-1">
                                                  <div className="flex items-center justify-between gap-1 leading-none">
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                          e.stopPropagation();
                                                          handleToggleSelectSchedule(sch.id);
                                                        }}
                                                        className="w-3 h-3 text-rose-600 rounded cursor-pointer border-slate-300 pointer-events-auto"
                                                      />
                                                      <span
                                                        className="font-black text-[11px] uppercase tracking-tight"
                                                        style={{ color: colors.text }}
                                                      >
                                                        {abbr}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                      {colSpan > 1 && (
                                                        <span className="text-[9px] font-black px-1 py-0.2 rounded bg-white/90 text-slate-700 border border-slate-200">
                                                          2 JP
                                                        </span>
                                                      )}
                                                      {isElective && groupName ? (
                                                        <span
                                                          className="text-[8px] font-black px-1 py-0.2 rounded bg-purple-600 text-white shadow-2xs"
                                                          title={`Blok Pilihan: ${groupName}`}
                                                        >
                                                          ✨ Blok
                                                        </span>
                                                      ) : ((sch.is_combined_class || (sch.class_groups && sch.class_groups.length > 1)) && (
                                                        <span
                                                          className="text-[8px] font-black px-1 py-0.2 rounded bg-purple-600 text-white shadow-2xs"
                                                          title={`Rombel Gabungan: ${sch.class_groups ? sch.class_groups.map(c => c.name).join(', ') : ''}`}
                                                        >
                                                          👥 Gabung
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>

                                                  <div className="mt-0.5 text-[9.5px] leading-tight font-bold text-slate-800 break-words">
                                                    {subName}
                                                  </div>
                                                </div>

                                                {/* BAGIAN BAWAH KARTU */}
                                                <div className="mt-1.5 pt-1 border-t border-black/5">
                                                  <div className="text-[8.5px] font-medium text-slate-600 break-words leading-tight">
                                                    {matrixPerspective === 'class'
                                                      ? (sch.teacher_name ? `👨‍🏫 ${sch.teacher_name}` : 'Belum Ditentukan')
                                                      : `🏫 ${sch.class_groups ? sch.class_groups.map(c => c.name).join(', ') : 'Rombel'}`}
                                                  </div>

                                                  {(sch.is_combined_class || (sch.class_groups && sch.class_groups.length > 1)) && matrixPerspective === 'class' && (
                                                    <div className="text-[7.5px] font-bold text-purple-700 bg-purple-50 px-1 py-0.5 rounded mt-0.5 break-words border border-purple-200 leading-tight">
                                                      Kelas: {sch.class_groups ? sch.class_groups.map(c => c.name).join(' & ') : ''}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  });
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })()}

          {/* CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <div
              className={
                calendarLayout === 'row'
                  ? 'grid grid-cols-7 gap-1.5 xl:gap-2 w-full'
                  : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
              }
            >
              {schedulesByDay.map(day => (
                <div key={day.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col relative">
                  <div className="sticky top-0 z-20 bg-teal-50/95 backdrop-blur-xs px-4 py-3 font-black text-xs text-teal-950 border-b border-teal-100 flex items-center justify-between shadow-2xs rounded-t-2xl">
                    <span>{day.name}</span>
                    <span className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200">
                      {day.items.length} Sesi
                    </span>
                  </div>

                  <div className="p-2 space-y-2 flex-1">
                    {day.items.length === 0 ? (
                      <div className="py-7 px-2 text-center bg-slate-100/70 rounded-xl border border-dashed border-slate-200/80 text-slate-400 my-1">
                        <Calendar className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                        <p className="text-[11px] font-bold text-slate-600">Belum Ada Sesi</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Jadwal belum ditetapkan</p>
                      </div>
                    ) : (
                      day.items.map(sch => {
                        const isMapel = sch.schedule_type === 'mapel';
                        // Cari slot waktu yang sesuai untuk mengambil warna kustom
                        const matchedSlot = timeSlots.find(
                          sl => sl.day_of_week === sch.day_of_week && (
                            sl.period_index === sch.period_index ||
                            sl.start_time === sch.start_time ||
                            sl.label === sch.period_label
                          )
                        );
                        const slotColor = matchedSlot?.color || (isMapel ? '#0d9488' : '#9333ea');

                        const cardMinHeight = getConsistentCardHeight(sch.start_time, sch.end_time, calendarLayout === 'row', 68);

                        const isSelected = selectedScheduleIds.includes(sch.id);

                        return (
                          <div
                            key={sch.id}
                            className={`p-2 rounded-xl border transition shadow-2xs space-y-1.5 hover:shadow-xs flex flex-col justify-between relative ${
                              isSelected ? 'ring-2 ring-rose-500 bg-rose-50/50' : ''
                            }`}
                            style={{
                              backgroundColor: isSelected ? undefined : `${slotColor}12`,
                              borderColor: isSelected ? '#f43f5e' : `${slotColor}35`,
                              borderLeftWidth: '3.5px',
                              borderLeftColor: isSelected ? '#f43f5e' : slotColor,
                              minHeight: cardMinHeight ? `${cardMinHeight}px` : undefined
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectSchedule(sch.id)}
                                    title="Pilih sesi untuk aksi massal"
                                    className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer border-slate-300 focus:ring-rose-500"
                                  />
                                  {sch.schedule_type === 'ekskul' ? (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white shadow-2xs">
                                      EKSKUL
                                    </span>
                                  ) : (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-white/90"
                                      style={{
                                        color: slotColor,
                                        borderColor: `${slotColor}40`
                                      }}
                                    >
                                      {sch.period_label || `${formatTime24(sch.start_time)} - ${formatTime24(sch.end_time)}`}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(sch)}
                                    className="p-0.5 text-slate-400 hover:text-teal-700 rounded hover:bg-white/80 transition"
                                    title="Edit Jadwal"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScheduleToDelete(sch);
                                      setDeleteModalOpen(true);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded hover:bg-white/80 transition"
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <h5 className="font-bold text-[11px] text-slate-900 leading-snug break-words">
                                {sch.extra_name ? `🏆 ${sch.extra_name}` : (sch.subject_name || 'Pelajaran')}
                              </h5>
                            </div>

                            <div className="space-y-0.5 text-[9px] text-slate-600 pt-0.5 border-t border-slate-200/50 mt-auto">
                              <p className="font-medium text-slate-800 break-words">
                                {sch.schedule_type === 'ekskul' ? '🏃 Pembina: ' : '👨‍🏫 Guru: '}
                                {sch.teacher_name || 'Belum Ditentukan'}
                              </p>
                              <p className="break-words text-slate-500">
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
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={schedules.length > 0 && selectedScheduleIds.length === schedules.length}
                          onChange={handleSelectAllSchedules}
                          title="Pilih Semua Sesi"
                          className="w-4 h-4 text-rose-600 rounded cursor-pointer border-slate-300 focus:ring-rose-500"
                        />
                      </th>
                      <th className="p-3">Hari</th>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Jenis & Aktivitas</th>
                      <th className="p-3">Rombel</th>
                      <th className="p-3">Guru / Pembina</th>
                      <th className="p-3">Ruangan</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">Belum ada jadwal pada opsi ini.</td>
                      </tr>
                    ) : (
                      schedules.map(sch => {
                        const isSelected = selectedScheduleIds.includes(sch.id);
                        return (
                          <tr key={sch.id} className={`transition ${isSelected ? 'bg-rose-50/60' : 'hover:bg-slate-50'}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectSchedule(sch.id)}
                                title="Pilih sesi ini"
                                className="w-4 h-4 text-rose-600 rounded cursor-pointer border-slate-300 focus:ring-rose-500"
                              />
                            </td>
                            <td className="p-3 font-bold">{DAYS.find(d => d.id === sch.day_of_week)?.name || '-'}</td>
                            <td className="p-3 font-mono whitespace-nowrap">{formatTime24(sch.start_time)} - {formatTime24(sch.end_time)} <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1 py-0.5 rounded border border-teal-100 ml-1">({calculateDurationText(sch.start_time, sch.end_time)})</span></td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {sch.schedule_type === 'ekskul' ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    EKSKUL
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 border border-teal-300">
                                    MAPEL
                                  </span>
                                )}
                                <span className="font-bold text-slate-900">{sch.extra_name || sch.subject_name}</span>
                              </div>
                            </td>
                            <td className="p-3">{sch.class_groups?.map(c => c.name).join(', ') || '-'}</td>
                            <td className="p-3">{sch.teacher_name || '-'}</td>
                            <td className="p-3">{sch.room_name || '-'}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(sch)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 mr-1 transition"
                                title="Edit Jadwal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleToDelete(sch);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          )}
        </div>
      )}

      {/* DRAG CONFLICT RESOLUTION MODAL (MUNCUL DI ATAS FULLSCREEN z-[10005]) */}
      {dragConflictModal && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Konflik Jadwal Ditemukan
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pemindahan jadwal bertabrakan dengan jadwal lain atau guru pengampu yang sama.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDragConflictModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DETAIL ERROR DARI SISTEM */}
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Penyebab Bentrok:</span>
              </div>
              <p className="text-amber-900 leading-relaxed font-medium pl-5">
                {dragConflictModal.errorDetail}
              </p>
            </div>

            {/* INFORMASI SESI YANG DIPINDAHKAN & TARGET */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Mata Pelajaran:</span>
                <span className="font-extrabold text-slate-800">
                  {dragConflictModal.draggedSchedule.subject_name || dragConflictModal.draggedSchedule.extra_name || 'Mapel'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Guru Pengampu:</span>
                <span className="font-bold text-teal-700">
                  {dragConflictModal.draggedSchedule.teacher_name || 'Belum Ditentukan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Slot Target:</span>
                <span className="font-bold text-slate-800">
                  {DAYS.find(d => d.id === dragConflictModal.targetDayId)?.name} ({dragConflictModal.newStartTime} - {dragConflictModal.newEndTime})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Kandidat Rombel Gabungan:</span>
                <span className="font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                  {(allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups)
                    .filter(c => dragConflictModal.joinableClassGroupIds.includes(c.id))
                    .map(c => c.name)
                    .join(' & ')}
                </span>
              </div>
            </div>

            {/* REKOMENDASI SOLUSI CERDAS */}
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Solusi Mode Rombel Gabungan (Kelas Gabung):</span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Jika Anda ingin 1 guru mengajar mata pelajaran ini kepada beberapa kelas sekaligus pada jam yang sama, aktifkan <b>Mode Rombel Gabungan</b>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDragConflictModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition order-3 sm:order-1"
              >
                Batal Pindahkan
              </button>

              <button
                type="button"
                onClick={() => {
                  const sch = dragConflictModal.draggedSchedule;
                  setDragConflictModal(null);
                  handleOpenEditModal(sch);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition flex items-center justify-center gap-1.5 order-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Jadwal Manual</span>
              </button>

              <button
                type="button"
                disabled={isMovingSchedule}
                onClick={handleConfirmJoinClassFromDrag}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition flex items-center justify-center gap-1.5 order-1 sm:order-3 animate-pulse hover:animate-none"
              >
                <Users className="w-4 h-4" />
                <span>{isMovingSchedule ? 'Memproses...' : '👥 Jadikan Rombel Gabungan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL LOG RIWAYAT PERUBAHAN JADWAL KBM    */}
      {/* ========================================== */}
      {/* ========================================== */}
      {/* MODAL 1: TAMBAH / EDIT RENTANG WAKTU (SLOT)*/}
      {/* ========================================== */}
      {timeSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-800">
                  {editingTimeSlot ? 'Edit Rentang Waktu' : 'Tambah Rentang Waktu (Tahap 1)'}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCopyTimeSlotForm({
                      source_satuan_pendidikan_id: activeSchoolUnit?.id || '',
                      source_academic_year_id: academicYears.find(y => String(y.id) !== String(selectedYearId))?.id || academicYears[0]?.id || '',
                      source_preset_id: '',
                      replace_existing: true
                    });
                    setCopyTimeSlotModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1 transition"
                  title="Salin pola struktur waktu dari jadwal / unit lain"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin dari Jadwal Lain</span>
                </button>
                <button onClick={() => setTimeSlotModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveTimeSlot} className="space-y-3.5 text-xs overflow-y-auto pr-1 pt-3 flex-1 scrollbar-thin">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingTimeSlot ? 'Cakupan Penerapan Edit' : 'Terapkan Pada Hari'}
                </label>

                {editingTimeSlot && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setTimeSlotForm({ ...timeSlotForm, edit_scope: 'single' })}
                      className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition text-center flex items-center justify-center gap-1.5 ${
                        timeSlotForm.edit_scope === 'single'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Hanya Hari {DAYS.find(d => d.id === timeSlotForm.day_of_week)?.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeSlotForm({ ...timeSlotForm, edit_scope: 'multiple' })}
                      className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition text-center flex items-center justify-center gap-1.5 ${
                        timeSlotForm.edit_scope === 'multiple'
                          ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Terapkan Massal</span>
                    </button>
                  </div>
                )}

                {(!editingTimeSlot || timeSlotForm.edit_scope === 'multiple') && (
                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">Pilih Hari Penerapan:</span>
                      {editingTimeSlot && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded">
                          Sinkronisasi Massal
                        </span>
                      )}
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTimeSlotForm({ ...timeSlotForm, selected_days: [1, 2, 3, 4, 5, 6] })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                          timeSlotForm.selected_days?.length === 6 && !timeSlotForm.selected_days?.includes(7)
                            ? 'bg-teal-600 text-white border-teal-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Senin - Sabtu (6 Hari)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeSlotForm({ ...timeSlotForm, selected_days: [1, 2, 3, 4, 5] })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                          timeSlotForm.selected_days?.length === 5 && !timeSlotForm.selected_days?.includes(6)
                            ? 'bg-teal-600 text-white border-teal-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Senin - Jumat (5 Hari)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeSlotForm({ ...timeSlotForm, selected_days: [1, 2, 3, 4, 5, 6, 7] })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                          timeSlotForm.selected_days?.length === 7
                            ? 'bg-teal-600 text-white border-teal-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Semua Hari (7 Hari)
                      </button>
                    </div>

                    {/* Checkbox Chips for Each Day */}
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                      {DAYS.map(d => {
                        const isSelected = timeSlotForm.selected_days?.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              const curr = timeSlotForm.selected_days || [];
                              const nextDays = isSelected
                                ? curr.filter(id => id !== d.id)
                                : [...curr, d.id].sort((a, b) => a - b);
                              setTimeSlotForm({ ...timeSlotForm, selected_days: nextDays });
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            <span>{d.name.slice(0, 3)}</span>
                            <span className={`text-[9px] font-black mt-0.5 ${isSelected ? 'text-teal-600' : 'text-slate-300'}`}>
                              {isSelected ? '✓' : '-'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[11px] text-teal-800 bg-teal-50/80 border border-teal-200/80 px-2.5 py-1.5 rounded-xl font-medium">
                      💡 {editingTimeSlot 
                        ? `Perubahan jam ${timeSlotForm.label || 'slot ini'} akan disinkronkan ke ${timeSlotForm.selected_days?.length || 0} hari terpilih.`
                        : `Rentang waktu ini akan diterapkan pada ${timeSlotForm.selected_days?.length || 0} hari terpilih.`
                      }
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Rentang Waktu</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newEnd = addMinutesToTime(timeSlotForm.start_time, minutesPerJp);
                      setTimeSlotForm({
                        ...timeSlotForm,
                        type: 'lesson',
                        end_time: newEnd,
                        color: timeSlotForm.color === '#f59e0b' || timeSlotForm.color === '#d97706' || timeSlotForm.color === '#6366f1' || timeSlotForm.color === '#8b5cf6' ? '#0d9488' : timeSlotForm.color,
                        is_generator_usable: true
                      });
                    }}
                    className={`py-2 px-2 rounded-xl font-bold border transition text-center text-xs flex flex-col items-center justify-center ${
                      timeSlotForm.type === 'lesson'
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>JP Reguler</span>
                    <span className="text-[9.5px] opacity-80 font-normal">Mapel Wajib</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newEnd = addMinutesToTime(timeSlotForm.start_time, (minutesPerJp || 40) * 2);
                      setTimeSlotForm({
                        ...timeSlotForm,
                        type: 'elective',
                        end_time: newEnd,
                        label: timeSlotForm.label && timeSlotForm.label.startsWith('Jam Ke-') ? 'Mapel Pilihan (Paralel)' : timeSlotForm.label,
                        color: '#8b5cf6',
                        is_generator_usable: true
                      });
                    }}
                    className={`py-2 px-2 rounded-xl font-bold border transition text-center text-xs flex flex-col items-center justify-center ${
                      timeSlotForm.type === 'elective'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Mapel Pilihan</span>
                    <span className="text-[9.5px] opacity-80 font-normal">Paralel / Rombel Gabungan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimeSlotForm({
                        ...timeSlotForm,
                        type: 'extracurricular',
                        color: '#d97706',
                        is_generator_usable: false
                      });
                    }}
                    className={`py-2 px-2 rounded-xl font-bold border transition text-center text-xs flex flex-col items-center justify-center ${
                      timeSlotForm.type === 'extracurricular'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Ekstrakurikuler</span>
                    <span className="text-[9.5px] opacity-80 font-normal">Rentang Khusus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimeSlotForm({
                        ...timeSlotForm,
                        type: 'break',
                        color: '#6366f1',
                        is_generator_usable: false
                      });
                    }}
                    className={`py-2 px-2 rounded-xl font-bold border transition text-center text-xs flex flex-col items-center justify-center ${
                      timeSlotForm.type === 'break' || timeSlotForm.type === 'activity'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Non-JP (Istirahat)</span>
                    <span className="text-[9.5px] opacity-80 font-normal">Sholat / Jeda</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai (24 Jam)</label>
                  <TimeInput24
                    value={timeSlotForm.start_time}
                    onChange={(st) => {
                      const newEnd = timeSlotForm.type === 'lesson' ? addMinutesToTime(st, minutesPerJp) : timeSlotForm.end_time;
                      setTimeSlotForm({ ...timeSlotForm, start_time: st, end_time: newEnd });
                    }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai (24 Jam)</label>
                  <TimeInput24
                    value={timeSlotForm.end_time}
                    onChange={(et) => setTimeSlotForm({ ...timeSlotForm, end_time: et })}
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

              {/* FITUR WARNA RENTANG WAKTU */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-700 text-xs">Warna Tampilan Rentang Waktu</label>
                    <span className="text-[10px] text-slate-500">Pilih palet warna untuk membedakan slot waktu</span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-xl border font-bold text-[10px]"
                    style={{
                      backgroundColor: `${timeSlotForm.color || '#0d9488'}15`,
                      borderColor: `${timeSlotForm.color || '#0d9488'}40`,
                      color: timeSlotForm.color || '#0d9488'
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white shadow-2xs"
                      style={{ backgroundColor: timeSlotForm.color || '#0d9488' }}
                    />
                    <span className="font-mono">{timeSlotForm.color || '#0d9488'}</span>
                  </div>
                </div>

                {/* 16 Preset Chips */}
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 pt-1">
                  {TIME_SLOT_COLOR_PRESETS.map((p) => {
                    const isSelected = (timeSlotForm.color || '#0d9488').toLowerCase() === p.value.toLowerCase();
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setTimeSlotForm({ ...timeSlotForm, color: p.value })}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] font-bold transition text-left ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={p.label}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/10 shadow-2xs"
                          style={{ backgroundColor: p.value }}
                        />
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500">Custom:</span>
                  <input
                    type="color"
                    value={timeSlotForm.color || '#0d9488'}
                    onChange={(e) => setTimeSlotForm({ ...timeSlotForm, color: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white shrink-0"
                    title="Buka pemilih warna bebas"
                  />
                  <input
                    type="text"
                    value={timeSlotForm.color || '#0d9488'}
                    onChange={(e) => setTimeSlotForm({ ...timeSlotForm, color: e.target.value })}
                    placeholder="#0d9488"
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold w-24 text-slate-700"
                  />
                  <span className="text-[10px] text-slate-400">Pilih HEX warna bebas</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0 sticky bottom-0 bg-white mt-2">
                <button
                  type="button"
                  onClick={() => setTimeSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition"
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
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai Masuk KBM (24 Jam)</label>
                  <TimeInput24
                    value={wizardForm.startTime}
                    onChange={(st) => setWizardForm({ ...wizardForm, startTime: st })}
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
      {/* MODAL 2B: SALIN STRUKTUR WAKTU DARI JADWAL LAIN */}
      {/* ========================================== */}
      {copyTimeSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Salin Struktur Waktu dari Jadwal Lain</h3>
                  <p className="text-[11px] text-slate-500">Menduplikasi pola rentang waktu dari tahun ajaran, opsi preset, atau satuan pendidikan lain.</p>
                </div>
              </div>
              <button onClick={() => setCopyTimeSlotModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCopyTimeSlots} className="space-y-3.5 text-xs">
              <div className="p-3 bg-teal-50/80 rounded-xl border border-teal-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-teal-950">
                  <span>Target Penempatan:</span>
                  <span className="bg-teal-600 text-white px-2 py-0.5 rounded text-[10px]">
                    {academicYears.find(y => String(y.id) === String(selectedYearId))?.name || 'Tahun Ajaran Aktif'}
                  </span>
                </div>
                <p className="text-[10px] text-teal-800">
                  Struktur waktu akan disalin ke Satuan Pendidikan: <b>{activeSchoolUnit?.name || 'Unit Aktif'}</b>.
                </p>
              </div>

              {/* Satuan Pendidikan Sumber (Dukungan Lintas Unit) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Satuan Pendidikan Sumber</label>
                <select
                  value={copyTimeSlotForm.source_satuan_pendidikan_id}
                  onChange={(e) => setCopyTimeSlotForm({ ...copyTimeSlotForm, source_satuan_pendidikan_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">Semua / Satuan Pendidikan Saat Ini ({activeSchoolUnit?.name || 'Unit Aktif'})</option>
                  {schoolUnitsList.map(u => (
                    <option key={u.id} value={u.id}>{u.name || `Unit #${u.id}`}</option>
                  ))}
                </select>
              </div>

              {/* Tahun Ajaran Sumber (Dinamis Sesuai Satuan Pendidikan Sumber) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Tahun Ajaran Sumber (Jadwal Acuan) *</label>
                  {loadingSourceYears && (
                    <span className="text-[10px] text-teal-600 font-bold animate-pulse">Memuat tahun ajaran...</span>
                  )}
                </div>
                <select
                  value={copyTimeSlotForm.source_academic_year_id}
                  onChange={(e) => setCopyTimeSlotForm({ ...copyTimeSlotForm, source_academic_year_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  required
                >
                  <option value="">-- Pilih Tahun Ajaran Sumber --</option>
                  {(sourceYearsList.length > 0 ? sourceYearsList : academicYears).map(y => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? '✨ [Aktif]' : ''} {String(y.id) === String(selectedYearId) ? '(Tahun Ajaran Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opsi Preset / Opsi Jadwal Sumber (Dinamis dari Manajemen Opsi Jadwal) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Opsi Jadwal / Preset Sumber</label>
                  {loadingSourcePresets ? (
                    <span className="text-[10px] text-teal-600 font-bold animate-pulse">Memuat opsi jadwal...</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {sourcePresetsList.length > 0 ? `${sourcePresetsList.length} opsi tersedia` : 'Belum ada opsi jadwal'}
                    </span>
                  )}
                </div>
                <select
                  value={copyTimeSlotForm.source_preset_id}
                  onChange={(e) => setCopyTimeSlotForm({ ...copyTimeSlotForm, source_preset_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  disabled={loadingSourcePresets || sourcePresetsList.length === 0}
                >
                  {sourcePresetsList.length === 0 ? (
                    <option value="">-- Belum Ada Opsi Jadwal / Preset Terdaftar di TA Sumber --</option>
                  ) : (
                    <>
                      <option value="">-- Struktur Waktu Standar Default --</option>
                      {sourcePresetsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''} {p.is_active ? '✨ [Resmi Aktif]' : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {sourcePresetsList.length > 0 ? (
                    <>Daftar di atas otomatis sinkron dengan preset yang ada pada menu <b>Manajemen Opsi Jadwal</b> unit & tahun ajaran sumber.</>
                  ) : (
                    <span className="text-amber-600 font-medium">⚠️ Tidak ditemukan opsi jadwal/preset pada tahun ajaran sumber yang dipilih.</span>
                  )}
                </p>
              </div>

              {/* Checkbox Bersihkan yang Lama */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="replace_existing_slots"
                  checked={copyTimeSlotForm.replace_existing}
                  onChange={(e) => setCopyTimeSlotForm({ ...copyTimeSlotForm, replace_existing: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="replace_existing_slots" className="font-bold text-slate-700 text-[11px] cursor-pointer">
                  Gantikan (timpa) seluruh struktur waktu yang sudah ada pada jadwal saat ini
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCopyTimeSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyalin...' : 'Salin Struktur Waktu Sekarang'}</span>
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
                  <option value="">-- Pilih Rombel Reguler --</option>
                  {classGroups
                    .filter(cg => !cg.type || cg.type === 'reguler')
                    .map(cg => (
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-800">
                {editingSchedule ? 'Edit Sesi Jadwal Pelajaran' : 'Tambah Sesi Jadwal Manual'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BANNER PERINGATAN ERROR DARI SERVER */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* DETEKSI REAL-TIME BENTROK JADWAL (GURU & ROMBEL) */}
            {(() => {
              if (!form.day_of_week || !form.start_time || !form.end_time) return null;
              const [formSh, formSm] = form.start_time.split(':').map(Number);
              const [formEh, formEm] = form.end_time.split(':').map(Number);
              const formStart = formSh * 60 + formSm;
              const formEnd = formEh * 60 + formEm;

              const conflicts = [];

              schedules.forEach(sch => {
                // Abaikan sesi yang sedang diedit
                if (editingSchedule && sch.id === editingSchedule.id) return;
                if (sch.day_of_week !== parseInt(form.day_of_week, 10)) return;
                if (sch.is_active === false) return;

                const [schSh, schSm] = sch.start_time.split(':').map(Number);
                const [schEh, schEm] = sch.end_time.split(':').map(Number);
                const schStart = schSh * 60 + schSm;
                const schEnd = schEh * 60 + schEm;

                // Cek apakah ada irisan waktu (overlap)
                const isOverlapping = (formStart < schEnd) && (formEnd > schStart);
                if (!isOverlapping) return;

                // 1. Cek Bentrok Guru
                if (form.teacher_employee_id && String(sch.teacher_employee_id) === String(form.teacher_employee_id)) {
                  const teacherObj = teachers.find(t => String(t.id) === String(form.teacher_employee_id));
                  conflicts.push({
                    type: 'teacher',
                    title: `Bentrok Guru: ${teacherObj?.full_name || sch.teacher_name || 'Guru'}`,
                    detail: `Sudah mengajar ${sch.subject_name || sch.extra_name || 'Mapel'} di rombel ${sch.class_groups ? sch.class_groups.map(c => c.name).join(', ') : 'Lain'} pada jam ${sch.start_time} - ${sch.end_time}`
                  });
                }

                // 2. Cek Bentrok Rombel Kelas (Kecuali jika rombel gabungan yang sama atau mapel pilihan paralel)
                if (form.class_group_ids && form.class_group_ids.length > 0) {
                  const schCids = sch.class_groups ? sch.class_groups.map(c => c.id) : [];
                  const intersectingCids = form.class_group_ids.filter(cid => schCids.includes(cid));

                  if (intersectingCids.length > 0) {
                    const intCgNames = classGroups.filter(cg => intersectingCids.includes(cg.id)).map(cg => cg.name).join(', ');
                    
                    // Cek apakah kedua mapel adalah pilihan paralel dalam blok yang sama
                    const curSub = subjectsList.find(s => String(s.id) === String(form.subject_id));
                    const schSub = subjectsList.find(s => String(s.id) === String(sch.subject_id));
                    const isBothElectiveBlock = curSub?.is_elective && schSub?.is_elective && curSub.elective_group_name === schSub.elective_group_name;

                    if (!isBothElectiveBlock) {
                      conflicts.push({
                        type: 'class',
                        title: `Bentrok Rombel: ${intCgNames}`,
                        detail: `Sudah ada jadwal ${sch.subject_name || sch.extra_name || 'Mapel'} bersama ${sch.teacher_name || 'Guru'} pada jam ${sch.start_time} - ${sch.end_time}`
                      });
                    }
                  }
                }
              });

              if (conflicts.length === 0) return null;

              return (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Perhatian: Terdeteksi {conflicts.length} Potensi Bentrok Jadwal!</span>
                  </div>
                  <div className="space-y-1 pl-5">
                    {conflicts.map((c, i) => (
                      <div key={i} className="text-[11px] text-amber-800 leading-tight">
                        <span className="font-bold text-amber-950">{c.title}</span>: {c.detail}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* PANEL INFORMASI SESI WAKTU & GURU (TEKS INFORMATIF ELEGAN) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span className="font-extrabold text-slate-800 text-xs">
                      {DAYS.find(d => d.id === form.day_of_week)?.name || 'Hari'}
                    </span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg text-[11px]">
                      {form.period_label || 'Slot Jam Pelajaran'}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-slate-700 text-xs bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {formatTime24(form.start_time)} - {formatTime24(form.end_time)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Guru Pengampu:</span>
                    <span className="font-bold text-slate-900">
                      {teachers.find(t => String(t.id) === String(form.teacher_employee_id))?.full_name || 'Mengikuti Pembagian Tugas Mengajar'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    *Otomatis dari SK Mengajar
                  </span>
                </div>
              </div>

              {/* 1. INPUT MATA PELAJARAN (INTERAKTIF DENGAN GRID & LIVE SEARCH) */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 text-xs">Mata Pelajaran *</label>
                  <span className="text-[10px] text-slate-400">
                    {(() => {
                      const curSub = subjectsList.find(s => String(s.id) === String(form.subject_id));
                      if (!curSub) return 'Wajib dipilih';
                      return (curSub.is_elective && curSub.elective_group_name) ? curSub.elective_group_name : curSub.name;
                    })()}
                  </span>
                </div>

                {/* INPUT TRIGGER YANG DAPAT DIKLIK UNTUK MEMBUKA GRID */}
                <div
                  onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                  className={`px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs transition ${
                    subjectDropdownOpen ? 'border-teal-500 ring-2 ring-teal-100 bg-white' : 'border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="truncate">
                      {(() => {
                        const curSub = subjectsList.find(s => String(s.id) === String(form.subject_id));
                        if (!curSub) return '-- Klik untuk Pilih Mata Pelajaran --';
                        const isElective = curSub.is_elective == 1 || curSub.is_elective === true || curSub.is_elective === '1';
                        const groupName = curSub.elective_group_name?.trim();
                        if (isElective && groupName) {
                          return `✨ ${groupName} (Blok Pilihan)`;
                        }
                        return `${curSub.name} (${curSub.code || '-'})`;
                      })()}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${subjectDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
                </div>

                {/* POPOVER CONTAINER GRID MAPEL (HANYA MUNCUL SAAT DIKLIK) */}
                {subjectDropdownOpen && (
                  <div className="mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-2 animate-in fade-in zoom-in-95 z-30">
                    {/* SEARCH LIVE FILTER UNTUK GRID MAPEL */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        placeholder="Ketik untuk cari mapel / blok (misal: Matematika, Arab)..."
                        className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {subjectSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubjectSearch('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* GRID KOTAK-KOTAK NAMA MATA PELAJARAN */}
                    <div className="max-h-52 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-200 scrollbar-thin">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(() => {
                          const currentCg = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups).find(c => form.class_group_ids.includes(c.id));
                          const currentUnitId = editingSchedule?.satuan_pendidikan_id || currentCg?.satuan_pendidikan_id || activeSchoolUnit?.id;
                          const scopedSubjects = currentUnitId
                            ? subjectsList.filter(s => !s.satuan_pendidikan_id || s.satuan_pendidikan_id === currentUnitId)
                            : subjectsList;

                          const processedGroupNames = new Set();
                          const gridItems = [];

                          scopedSubjects.forEach(s => {
                            const isElective = s.is_elective == 1 || s.is_elective === true || s.is_elective === '1';
                            const groupName = s.elective_group_name?.trim();

                            if (isElective && groupName) {
                              if (!processedGroupNames.has(groupName)) {
                                processedGroupNames.add(groupName);
                                const groupMembers = scopedSubjects.filter(m => m.elective_group_name?.trim() === groupName);
                                gridItems.push({
                                  id: s.id,
                                  isBlock: true,
                                  name: groupName,
                                  code: 'BLOK',
                                  groupName: groupName,
                                  memberIds: groupMembers.map(m => m.id),
                                  memberNames: groupMembers.map(m => m.name).join(', ')
                                });
                              }
                            } else {
                              gridItems.push({
                                id: s.id,
                                isBlock: false,
                                name: s.name,
                                code: s.code || '-',
                                groupName: null,
                                memberIds: [s.id],
                                memberNames: ''
                              });
                            }
                          });

                          const filtered = gridItems.filter(item => {
                            if (!subjectSearch.trim()) return true;
                            const query = subjectSearch.toLowerCase();
                            return (
                              item.name.toLowerCase().includes(query) ||
                              (item.code && item.code.toLowerCase().includes(query)) ||
                              (item.memberNames && item.memberNames.toLowerCase().includes(query))
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="col-span-full py-6 text-center text-slate-400 text-xs font-medium">
                                Tidak ada mata pelajaran yang cocok.
                              </div>
                            );
                          }

                          return filtered.map(item => {
                            const isSelected = item.isBlock
                              ? item.memberIds.some(mid => String(form.subject_id) === String(mid))
                              : String(form.subject_id) === String(item.id);

                            return (
                              <button
                                key={item.isBlock ? `block_${item.name}` : item.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newSubjectId = item.id;
                                  let autoTeacherId = form.teacher_employee_id;
                                  let autoClassGroupIds = [...form.class_group_ids];

                                  // 1. Cek dari teachingDutiesList (Tab 6 Kurikulum / Pembagian Tugas Mengajar)
                                  if (newSubjectId && form.class_group_ids && form.class_group_ids.length > 0) {
                                    const matchedDuties = (teachingDutiesList || []).filter(d =>
                                      d.type === 'mapel' &&
                                      item.memberIds.includes(Number(d.subject_id)) &&
                                      form.class_group_ids.includes(Number(d.class_group_id))
                                    );

                                    if (matchedDuties.length > 0) {
                                      const firstDuty = matchedDuties[0];
                                      if (firstDuty.teacher_employee_id) {
                                        autoTeacherId = String(firstDuty.teacher_employee_id);
                                      }

                                      if (firstDuty.joint_group_id) {
                                        const allJointDuties = (teachingDutiesList || []).filter(d => d.joint_group_id === firstDuty.joint_group_id);
                                        const jointCids = allJointDuties.map(d => Number(d.class_group_id)).filter(Boolean);
                                        if (jointCids.length > 1) {
                                          autoClassGroupIds = Array.from(new Set([...autoClassGroupIds, ...jointCids]));
                                        }
                                      }
                                    } else {
                                      // 2. Fallback ke lessonsList
                                      const matchLesson = lessonsList.find(l =>
                                        item.memberIds.includes(Number(l.subject_id)) &&
                                        (l.target_class_ids || []).some(cid => form.class_group_ids.includes(Number(cid)))
                                      );

                                      if (matchLesson) {
                                        if (matchLesson.teacher_ids && matchLesson.teacher_ids.length > 0) {
                                          autoTeacherId = String(matchLesson.teacher_ids[0]);
                                        }
                                        if (matchLesson.is_joined_class && matchLesson.target_class_ids && matchLesson.target_class_ids.length > 1) {
                                          autoClassGroupIds = matchLesson.target_class_ids.map(Number);
                                        }
                                      }
                                    }
                                  }

                                  setForm({
                                    ...form,
                                    subject_id: newSubjectId,
                                    teacher_employee_id: autoTeacherId,
                                    class_group_ids: autoClassGroupIds,
                                    is_combined_class: autoClassGroupIds.length > 1
                                  });
                                  setSubjectDropdownOpen(false);
                                  setSubjectSearch('');
                                }}
                                className={`p-2 rounded-xl border text-left transition flex flex-col justify-between relative group ${
                                  isSelected
                                    ? (item.isBlock
                                        ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                                        : 'bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-300')
                                    : (item.isBlock
                                        ? 'bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-950 shadow-2xs'
                                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs')
                                }`}
                              >
                                <div className="w-full">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : (item.isBlock ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 text-slate-600')
                                    }`}>
                                      {item.code}
                                    </span>
                                    {item.isBlock ? (
                                      <span className={`text-[7.5px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                        isSelected ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'
                                      }`}>
                                        ✨ Blok
                                      </span>
                                    ) : (
                                      isSelected && (
                                        <span className="text-white font-black text-xs">✓</span>
                                      )
                                    )}
                                  </div>
                                  <div className="font-extrabold text-xs leading-tight line-clamp-2">
                                    {item.name}
                                  </div>
                                </div>

                                {item.isBlock && (
                                  <div className={`text-[8px] mt-1 pt-1 border-t leading-tight truncate ${
                                    isSelected ? 'border-white/20 text-purple-100' : 'border-purple-200 text-purple-700 font-medium'
                                  }`} title={item.memberNames}>
                                    {item.memberNames}
                                  </div>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. INPUT ROMBONGAN BELAJAR (MENDUKUNG KELAS GABUNGAN LINTAS SATUAN PENDIDIKAN) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800 text-xs">
                    Rombongan Belajar (Pilih Satu atau Centang Banyak untuk Gabung Rombel) *
                  </label>
                  {form.class_group_ids.length > 1 && (
                    <span className="text-[10px] font-black text-purple-800 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <span>👥 Rombel Gabungan ({form.class_group_ids.length} Kelas)</span>
                    </span>
                  )}
                </div>

                {form.class_group_ids.length > 1 && (
                  <div className="mb-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-700 shrink-0" />
                    <div>
                      <span className="font-bold">Mode Gabung Rombel Aktif: </span>
                      <span className="font-bold text-purple-950">
                        {(allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups)
                          .filter(c => form.class_group_ids.includes(c.id))
                          .map(c => {
                            const unitName = schoolUnitsList.find(u => u.id === c.satuan_pendidikan_id)?.name;
                            return unitName && unitName !== activeSchoolUnit?.name ? `${c.name} (${unitName})` : c.name;
                          })
                          .join(' & ')}
                      </span>
                      <span className="text-[11px] text-purple-700 block mt-0.5">
                        Jadwal sesi ini akan sinkron dan muncul otomatis di seluruh rombel yang dicentang (termasuk jika lintas satuan pendidikan).
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-52 overflow-y-auto scrollbar-thin space-y-2.5">
                  {(() => {
                    const availableRombels = (allSchoolClassGroups.length > 0 ? allSchoolClassGroups : classGroups)
                      .filter(cg => !cg.type || cg.type === 'reguler');

                    // Kelompokkan rombel per satuan pendidikan
                    const unitGroups = {};
                    availableRombels.forEach(cg => {
                      const uid = cg.satuan_pendidikan_id || 1;
                      if (!unitGroups[uid]) {
                        const unitObj = schoolUnitsList.find(u => u.id === uid);
                        unitGroups[uid] = {
                          unitId: uid,
                          unitName: unitObj?.name || (uid === 2 ? 'SMA' : 'SMP'),
                          rombels: []
                        };
                      }
                      unitGroups[uid].rombels.push(cg);
                    });

                    return (
                      <>
                        {Object.values(unitGroups).map(group => (
                          <div key={group.unitId} className="space-y-1">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5 pt-1">
                              <span className={`w-2 h-2 rounded-full ${group.unitId === 2 ? 'bg-indigo-500' : 'bg-teal-500'}`}></span>
                              <span>{group.unitName} ({group.rombels.length} Rombel)</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {group.rombels.map(cg => {
                                const isChecked = form.class_group_ids.includes(cg.id);
                                return (
                                  <label
                                    key={cg.id}
                                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                                      isChecked
                                        ? (group.unitId === 2
                                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs'
                                            : 'bg-teal-50 border-teal-400 text-teal-950 shadow-2xs')
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setForm({ ...form, class_group_ids: [...form.class_group_ids, cg.id] });
                                        } else {
                                          setForm({ ...form, class_group_ids: form.class_group_ids.filter(id => id !== cg.id) });
                                        }
                                      }}
                                      className={`w-3.5 h-3.5 rounded cursor-pointer ${group.unitId === 2 ? 'text-indigo-600' : 'text-teal-600'}`}
                                    />
                                    <span className="truncate">{cg.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 3. ALASAN PERUBAHAN / CATATAN AUDIT */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Catatan / Alasan {editingSchedule ? 'Perubahan' : 'Penambahan'} (Audit Log)
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="misal: Penyesuaian jadwal KBM / penggabungan rombel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
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
      {/* MODAL KONFIRMASI HAPUS JADWAL             */}
      {/* ========================================== */}
      {deleteModalOpen && scheduleToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  Konfirmasi Hapus Sesi Jadwal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setScheduleToDelete(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
              <p className="font-bold text-rose-950">
                Apakah Anda yakin ingin menghapus sesi pelajaran berikut?
              </p>
              <div className="text-slate-700 font-medium space-y-0.5 pt-1">
                <p>📖 <b>{scheduleToDelete.extra_name || scheduleToDelete.subject_name || 'Mata Pelajaran'}</b></p>
                <p>📅 {DAYS.find(d => d.id === scheduleToDelete.day_of_week)?.name} ({formatTime24(scheduleToDelete.start_time)} - {formatTime24(scheduleToDelete.end_time)})</p>
                <p>🏫 Rombel: <b>{scheduleToDelete.class_groups?.map(c => c.name).join(', ') || '-'}</b></p>
                <p>👨‍🏫 Guru: <b>{scheduleToDelete.teacher_name || 'Belum Ditentukan'}</b></p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Alasan Penghapusan (Wajib untuk Catatan Audit Log) *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="misal: Perubahan kurikulum / pembatalan sesi / revisi jam"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setScheduleToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || !deleteReason.trim()}
                onClick={handleDeleteSchedule}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Menghapus...' : 'Hapus Sesi Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL KONFIRMASI HAPUS MASSAL (BULK DELETE)*/}
      {/* ========================================== */}
      {bulkDeleteModalOpen && selectedScheduleIds.length > 0 && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Konfirmasi Hapus Massal Sesi
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Tindakan ini akan menghapus {selectedScheduleIds.length} sesi terpilih secara permanen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-rose-950">
                <span>Total Sesi Dihapus:</span>
                <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-black">
                  {selectedScheduleIds.length} Sesi
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Seluruh alokasi waktu sesi KBM / Ekskul yang dicentang akan dibersihkan dari jadwal acuan aktif.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Alasan Penghapusan Massal (Wajib untuk Catatan Audit Log) *
              </label>
              <input
                type="text"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                placeholder="misal: Reset jadwal / penyesuaian rotasi semester / pengosongan sesi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || !bulkDeleteReason.trim()}
                onClick={handleBulkDeleteSchedule}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Menghapus Massal...' : `Hapus ${selectedScheduleIds.length} Sesi Sekarang`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 5: KELOLA OPSI JADWAL (PRESETS)      */}
      {/* ========================================== */}
      {presetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Manajemen Opsi Jadwal (Preset / Alternatif)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kelola beberapa alternatif jadwal (misal: Jadwal Reguler, Jadwal Ramadhan, Jadwal Ujian) & tentukan jadwal yang aktif diberlakukan.
                  </p>
                </div>
              </div>
              <button onClick={() => setPresetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB CONTROLLER */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPresetModalTab('list')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    presetModalTab === 'list' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Daftar Opsi ({presets.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreatePreset('')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    presetModalTab === 'create' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  + Buat Opsi Baru
                </button>
              </div>

              {presetModalTab === 'list' && (
                <button
                  type="button"
                  onClick={() => handleOpenCreatePreset('')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Alternatif Jadwal</span>
                </button>
              )}
            </div>

            {/* CONTENT: DAFTAR PRESET */}
            {presetModalTab === 'list' && (
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {presets.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                    <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Belum ada opsi jadwal tersimpan</p>
                    <p className="text-[11px] text-slate-400">Klik tombol di atas untuk membuat Jadwal 1 atau opsi pertama.</p>
                  </div>
                ) : (
                  presets.map((p) => {
                    const isCurrentActive = !!p.is_active;
                    const isViewing = String(p.id) === String(selectedPresetId);
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentActive
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs ring-1 ring-emerald-400'
                            : isViewing
                            ? 'bg-indigo-50/50 border-indigo-200'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{p.name}</span>
                            {p.code && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                                {p.code}
                              </span>
                            )}
                            {isCurrentActive ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>SEDANG DIBERLAKUKAN (AKTIF)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold rounded-full">
                                Draf / Alternatif
                              </span>
                            )}
                            {isViewing && !isCurrentActive && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded-full">
                                Sedang Dilihat
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-[11px] text-slate-600">{p.description}</p>
                          )}
                          <p className="text-[10px] text-slate-500 font-mono">
                            📊 Terisi: <b>{p.schedules_count || 0}</b> Sesi Jadwal
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          {/* Tombol Pilih untuk Dilihat & Diedit di Editor */}
                          {!isViewing && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPresetId(p.id);
                                setPresetModalOpen(false);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition"
                              title="Tampilkan jadwal ini di visual editor"
                            >
                              Buka Jadwal
                            </button>
                          )}

                          {/* Tombol Duplikasi / Salin */}
                          <button
                            type="button"
                            onClick={() => handleOpenCreatePreset(p.id)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition"
                            title="Salin/Duplikasi seluruh isi jadwal ini menjadi alternatif baru"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Edit Nama/Deskripsi */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditPreset(p)}
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-teal-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition"
                            title="Edit nama / info opsi jadwal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus (jika bukan satu-satunya dan bukan aktif) */}
                          {!isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(p.id, p.name)}
                              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold shadow-2xs transition"
                              title="Hapus opsi jadwal ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol Pemberlakuan Resmi (Aktifkan) */}
                          {!isCurrentActive ? (
                            <button
                              type="button"
                              onClick={() => handleActivatePreset(p.id, p.name)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center gap-1"
                              title="Berlakukan jadwal ini sebagai jadwal resmi KBM sekolah"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Berlakukan (Aktifkan)</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                              ✓ Jadwal Resmi Aktif
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CONTENT: FORM BUAT / EDIT PRESET */}
            {(presetModalTab === 'create' || presetModalTab === 'edit') && (
              <form onSubmit={handleSavePresetForm} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                  <p className="font-bold">
                    {presetModalTab === 'create' ? '✨ Buat Opsi Jadwal Baru' : '✏️ Edit Informasi Opsi Jadwal'}
                  </p>
                  <p className="text-slate-600">
                    {presetModalTab === 'create'
                      ? 'Anda dapat membuat jadwal kosong atau menyalin dari jadwal yang sudah ada (misal membuat Jadwal Khusus Ramadhan dari Jadwal Reguler).'
                      : 'Perbarui nama, kode, atau keterangan dari opsi jadwal ini.'}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Opsi Jadwal *</label>
                  <input
                    type="text"
                    value={presetForm.name}
                    onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                    placeholder="misal: Jadwal 1 (Reguler) / Jadwal 2 (Alternatif) / Jadwal Khusus Ramadhan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kode / Singkatan</label>
                    <input
                      type="text"
                      value={presetForm.code}
                      onChange={(e) => setPresetForm({ ...presetForm, code: e.target.value })}
                      placeholder="misal: REG-2026 / RAMADHAN-26"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase font-mono"
                    />
                  </div>

                  {presetModalTab === 'create' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Salin Isi Sesi Dari (Opsional)</label>
                      <select
                        value={presetForm.copy_from_preset_id}
                        onChange={(e) => setPresetForm({ ...presetForm, copy_from_preset_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                      >
                        <option value="">-- Mulai dari Kosong --</option>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            Salin dari: {p.name} ({p.schedules_count || 0} sesi)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deskripsi / Keterangan</label>
                  <textarea
                    rows={2}
                    value={presetForm.description}
                    onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                    placeholder="misal: Jadwal penyesuaian jam belajar selama bulan puasa atau rotasi semester genap"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alasan Pembuatan / Catatan Audit</label>
                  <input
                    type="text"
                    value={presetForm.reason}
                    onChange={(e) => setPresetForm({ ...presetForm, reason: e.target.value })}
                    placeholder="Catatan untuk riwayat audit log kurikulum"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPresetModalTab('list')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    Kembali ke Daftar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md"
                  >
                    {saving ? 'Menyimpan...' : (presetModalTab === 'create' ? 'Simpan & Buat Opsi Jadwal' : 'Perbarui Opsi Jadwal')}
                  </button>
                </div>
              </form>
            )}

            {/* FOOTER DIALOG */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 shrink-0">
              <span className="text-[11px] text-slate-500">
                Opsi jadwal yang <b>DIBERLAKUKAN</b> akan menjadi jadwal acuan aktif bagi guru & siswa di portal.
              </span>
              <button
                type="button"
                onClick={() => setPresetModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
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
