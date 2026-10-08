import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { scheduleService } from '../services/scheduleService';
import { journalService } from '../services/journalService';
import { attendanceService } from '../services/attendanceService';
import { formatIndonesianDate, formatShortTime } from '../utils/dateHelper';
import { getScheduleClassGroupDisplay, getScheduleRoomDisplay } from '../utils/scheduleHelper';
import {
  Button,
  Card,
  StatusBadge,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  PageHeader,
  SegmentedTabs,
  BottomSheet,
  SelectorKonteks,
  StatRibbonCard
} from '../components';
import {
  CalendarDays,
  Clock,
  BookOpen,
  UserCheck,
  ChevronRight,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  Layers,
  ArrowRight,
  FileEdit,
  RotateCw,
  Printer,
  Search,
  Users,
  Sparkles,
  Coffee,
  Sun,
  LayoutGrid,
  ListFilter
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Senin', short: 'SEN' },
  { id: 2, name: 'Selasa', short: 'SEL' },
  { id: 3, name: 'Rabu', short: 'RAB' },
  { id: 4, name: 'Kamis', short: 'KAM' },
  { id: 5, name: 'Jumat', short: 'JUM' },
  { id: 6, name: 'Sabtu', short: 'SAB' }
];

// Baris Istirahat Terjadwal
const BREAK_SLOTS = [
  {
    id: 'break_dhuha',
    title: 'ISTIRAHAT & SHALAT DHUHA',
    time: '09.45 - 10.15 WIB',
    startMinutes: 9 * 60 + 45,
    endMinutes: 10 * 60 + 15,
    desc: "Santri & Asatidz Menuju Masjid Jami' Aldepos • Durasi 30 Menit",
    icon: Sun
  },
  {
    id: 'break_dzuhur',
    title: 'ISTIRAHAT DZUHUR, MAKAN SIANG & SHALAT',
    time: '11.45 - 13.00 WIB',
    startMinutes: 11 * 60 + 45,
    endMinutes: 13 * 60 + 0,
    desc: "Masjid Jami' & Ruang Makan Santri • Durasi 75 Menit",
    icon: Coffee
  }
];

export default function JadwalPage() {
  const navigate = useNavigate();
  const { user } = useTeacherAuth();
  const { activeContext } = useTeacherContext();

  // Current real date & day
  const todayDayIndex = new Date().getDay(); // 0=Ahad, 1=Senin..6=Sabtu
  const todayDayNumber = todayDayIndex === 0 ? 7 : todayDayIndex; // 1=Senin..7=Ahad
  const todayDateStr = useMemo(() => formatIndonesianDate(new Date(), true), []);

  // View Mode: 'grid' (Desktop) | 'agenda' (Mobile / Card-Stack)
  const [viewMode, setViewMode] = useState('grid');
  // Selected day for mobile agenda (1..6, default to today or Monday if Sunday)
  const [selectedDay, setSelectedDay] = useState(todayDayNumber > 6 ? 1 : todayDayNumber);

  // Filters & Search
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Schedules & Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todayJournalStatus, setTodayJournalStatus] = useState(null);
  const [todayAttendanceList, setTodayAttendanceList] = useState([]);

  // Modal Detail Schedule
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Realtime clock for live calculations
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // 10s tick
    return () => clearInterval(timer);
  }, []);

  // Fetch Schedules & Teaching Data for Teacher
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedUnitIds = activeContext?.satuanPendidikanIds || (activeContext?.satuanPendidikanId ? [activeContext.satuanPendidikanId] : []);
      const isMultiOrAll = activeContext?.isAllUnits || selectedUnitIds.length !== 1;
      const unitParam = isMultiOrAll ? undefined : activeContext?.satuanPendidikanId;
      const todayIso = new Date().toLocaleDateString('en-CA');

      const [schedRes, assignRes, journalRes, attendanceRes] = await Promise.all([
        scheduleService.getMySchedules({
          satuan_pendidikan_id: unitParam,
          academic_year_id: activeContext?.academicYearId || undefined
        }).catch(() => ({ schedules: [] })),
        scheduleService.getMyTeachingAssignments({
          satuan_pendidikan_id: unitParam,
          academic_year_id: activeContext?.academicYearId || undefined
        }).catch(() => []),
        journalService.getTodayJournalStatus().catch(() => null),
        attendanceService.getLessonAttendances({ date: todayIso }).catch(() => [])
      ]);

      let schedList = schedRes?.schedules || (Array.isArray(schedRes) ? schedRes : schedRes?.data || []);
      if (!activeContext?.isAllUnits && selectedUnitIds.length > 0) {
        schedList = schedList.filter((s) => !s.satuan_pendidikan_id || selectedUnitIds.some((uid) => String(uid) === String(s.satuan_pendidikan_id)));
      }
      setAllSchedules(schedList);

      let assignList = assignRes?.assignments || (Array.isArray(assignRes) ? assignRes : assignRes?.data?.assignments || []);
      if (!activeContext?.isAllUnits && selectedUnitIds.length > 0) {
        assignList = assignList.filter((a) => !a.satuan_pendidikan_id || selectedUnitIds.some((uid) => String(uid) === String(a.satuan_pendidikan_id)));
      }
      setAssignments(assignList);

      setTodayJournalStatus(journalRes?.data || journalRes || null);
      setTodayAttendanceList(attendanceRes?.data || (Array.isArray(attendanceRes) ? attendanceRes : []));
    } catch (err) {
      setError(err?.message || 'Gagal memuat jadwal mengajar.');
      setAllSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [activeContext?.satuanPendidikanId, activeContext?.satuanPendidikanIds, activeContext?.academicYearId, activeContext?.isAllUnits]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper normalisasi nomor hari (string / number -> 1..7)
  const normalizeDayNumber = (val) => {
    if (val === undefined || val === null) return 1;
    if (typeof val === 'number') return val;
    const str = String(val).toLowerCase().trim();
    if (str === 'senin' || str === 'monday') return 1;
    if (str === 'selasa' || str === 'tuesday') return 2;
    if (str === 'rabu' || str === 'wednesday') return 3;
    if (str === 'kamis' || str === 'thursday') return 4;
    if (str === 'jumat' || str === 'friday') return 5;
    if (str === 'sabtu' || str === 'saturday') return 6;
    if (str === 'ahad' || str === 'minggu' || str === 'sunday') return 7;
    const num = parseInt(str, 10);
    return !isNaN(num) ? num : 1;
  };

  // Helper hitung menit dari waktu HH:mm
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = String(timeStr).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper evaluasi status sesi & sisa waktu (countdown & progress)
  const evaluateScheduleTime = (startTime, endTime) => {
    if (!startTime || !endTime) return { status: 'neutral', label: 'Terjadwal', countdownText: null };
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const totalDuration = Math.max(1, endMinutes - startMinutes);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const remainingMinutes = endMinutes - currentMinutes;
      const elapsedMinutes = currentMinutes - startMinutes;
      const progressPercent = Math.min(100, Math.round((elapsedMinutes / totalDuration) * 100));
      return {
        status: 'info',
        label: 'Sedang Berlangsung',
        code: 'LIVE',
        isOngoing: true,
        remainingMinutes,
        elapsedMinutes,
        totalDuration,
        progressPercent,
        countdownText: `Sisa waktu: ${remainingMinutes} menit`
      };
    }

    if (currentMinutes < startMinutes) {
      const diffMinutes = startMinutes - currentMinutes;
      const diffH = Math.floor(diffMinutes / 60);
      const diffM = diffMinutes % 60;
      let diffStr = '';
      if (diffH > 0) diffStr += `${diffH} jam `;
      diffStr += `${diffM} menit`;

      return {
        status: 'warning',
        label: 'Akan Datang',
        code: 'SOON',
        isUpcoming: true,
        diffMinutes,
        countdownText: `Dimulai dalam ${diffStr}`
      };
    }

    return {
      status: 'neutral',
      label: 'Selesai',
      code: 'DONE',
      isPassed: true,
      countdownText: 'Sesi tatap muka selesai'
    };
  };

  // Journal filled mapping
  const journalFilledMap = useMemo(() => {
    const map = new Map();
    if (todayJournalStatus?.schedules) {
      todayJournalStatus.schedules.forEach((item) => {
        map.set(Number(item.id), Boolean(item.has_journal_filled));
      });
    }
    return map;
  }, [todayJournalStatus]);

  // Attendance filled mapping (Presensi Siswa)
  const attendanceFilledMap = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(todayAttendanceList)
      ? todayAttendanceList
      : todayAttendanceList?.data || [];
    list.forEach((item) => {
      const sId = item.subject_schedule_id || item.schedule_id;
      if (sId) {
        map.set(Number(sId), true);
      }
    });
    return map;
  }, [todayAttendanceList]);

  // Statistik Beban Mengajar (Dihitung dari API Riil)
  const stats = useMemo(() => {
    let totalJp = 0;
    const rombelSet = new Set();
    const rombelNames = [];

    allSchedules.forEach((s) => {
      // Hitung durasi jam / JP (rata-rata 1 JP = 40-45 mnt, atau dari selisih waktu)
      const start = timeToMinutes(s.start_time);
      const end = timeToMinutes(s.end_time);
      const dur = Math.max(0, end - start);
      const jp = dur >= 80 ? 2 : dur >= 35 ? 1 : (s.jp_count || 2);
      totalJp += jp;

      const rName = getScheduleClassGroupDisplay(s);
      const rId = s.class_group_id || rName;
      if (rId && !rombelSet.has(rId)) {
        rombelSet.add(rId);
        rombelNames.push(rName);
      }
    });

    // Total Santri dari assignments atau estimasi rata-rata 30-32 per rombel
    let totalSantri = 0;
    if (assignments.length > 0) {
      assignments.forEach((a) => {
        totalSantri += Number(a.students_count || a.total_students || 0);
      });
    }
    if (totalSantri === 0) {
      totalSantri = rombelSet.size * 32; // fallback estimasi standar 32 santri/rombel
    }

    const targetJp = 24;
    const workPercent = Math.min(100, Math.round((totalJp / targetJp) * 100));

    return {
      totalJp: totalJp || allSchedules.length * 2,
      totalRombel: rombelSet.size,
      rombelNames: rombelNames.slice(0, 5),
      totalSantri: totalSantri || rombelSet.size * 32,
      workPercent
    };
  }, [allSchedules, assignments]);

  // Evaluasi Sesi Sedang Berlangsung atau Terdekat Hari Ini (Hero Live Banner)
  const todaySchedules = useMemo(() => {
    return allSchedules
      .filter((s) => normalizeDayNumber(s.day_of_week) === todayDayNumber)
      .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
  }, [allSchedules, todayDayNumber]);

  const activeOrNextSession = useMemo(() => {
    if (todaySchedules.length === 0) return null;

    // 1. Cek sesi yang sedang LIVE berlangsung
    const ongoing = todaySchedules.find((s) => {
      const evalRes = evaluateScheduleTime(s.start_time, s.end_time);
      return evalRes.isOngoing;
    });
    if (ongoing) {
      return {
        schedule: ongoing,
        evalInfo: evaluateScheduleTime(ongoing.start_time, ongoing.end_time)
      };
    }

    // 2. Cek sesi terdekat berikutnya
    const upcomings = todaySchedules
      .map((s) => ({ schedule: s, evalInfo: evaluateScheduleTime(s.start_time, s.end_time) }))
      .filter((item) => item.evalInfo.isUpcoming)
      .sort((a, b) => (a.evalInfo.diffMinutes || 0) - (b.evalInfo.diffMinutes || 0));

    if (upcomings.length > 0) {
      return upcomings[0];
    }

    return null;
  }, [todaySchedules, currentTime]);

  // List Mapel & Ruang Unik untuk Filter
  const uniqueSubjects = useMemo(() => {
    const map = new Map();
    allSchedules.forEach((s) => {
      const name = s.subject_name || s.subject_code;
      if (name) map.set(name, name);
    });
    return Array.from(map.values());
  }, [allSchedules]);

  const uniqueRooms = useMemo(() => {
    const map = new Map();
    allSchedules.forEach((s) => {
      const room = getScheduleRoomDisplay(s);
      if (room) map.set(room, room);
    });
    return Array.from(map.values());
  }, [allSchedules]);

  // Filtered schedules berdasarkan subject, room, dan query pencarian
  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((s) => {
      const sName = (s.subject_name || s.subject_code || '').toLowerCase();
      const rName = getScheduleRoomDisplay(s).toLowerCase();
      const cName = getScheduleClassGroupDisplay(s).toLowerCase();

      if (filterSubject !== 'ALL' && (s.subject_name || s.subject_code) !== filterSubject) {
        return false;
      }
      if (filterRoom !== 'ALL' && getScheduleRoomDisplay(s) !== filterRoom) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = sName.includes(q) || rName.includes(q) || cName.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allSchedules, filterSubject, filterRoom, searchQuery]);

  // Jadwal Terkelompok per Hari (1..6)
  const schedulesByDay = useMemo(() => {
    const grouped = {};
    DAYS_OF_WEEK.forEach((d) => {
      grouped[d.id] = filteredSchedules
        .filter((s) => normalizeDayNumber(s.day_of_week) === d.id)
        .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    });
    return grouped;
  }, [filteredSchedules]);

  // Time slots unik untuk baris Grid Desktop
  const distinctTimeSlots = useMemo(() => {
    const slotMap = new Map();
    filteredSchedules.forEach((s) => {
      const key = `${formatShortTime(s.start_time)} - ${formatShortTime(s.end_time)}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          key,
          startTime: s.start_time,
          endTime: s.end_time,
          startMinutes: timeToMinutes(s.start_time),
          endMinutes: timeToMinutes(s.end_time),
          label: key
        });
      }
    });

    const slots = Array.from(slotMap.values()).sort((a, b) => a.startMinutes - b.startMinutes);

    // Sisipkan Break Slots di urutan yang tepat
    const combined = [];
    const addedBreaks = new Set();

    slots.forEach((slot) => {
      BREAK_SLOTS.forEach((brk) => {
        if (!addedBreaks.has(brk.id) && slot.startMinutes >= brk.startMinutes) {
          combined.push({ ...brk, isBreak: true });
          addedBreaks.add(brk.id);
        }
      });
      combined.push(slot);
    });

    // Sisipkan sisa break yang belum masuk
    BREAK_SLOTS.forEach((brk) => {
      if (!addedBreaks.has(brk.id)) {
        combined.push({ ...brk, isBreak: true });
        addedBreaks.add(brk.id);
      }
    });

    return combined.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [filteredSchedules]);

  // Jadwal Hari Terpilih untuk Mobile Agenda
  const selectedDayItems = useMemo(() => {
    return schedulesByDay[selectedDay] || [];
  }, [schedulesByDay, selectedDay]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Jadwal Mengajar Guru"
        subtitle={`${activeContext?.academicYearName || 'Semester Ganjil'} • ${todayDateStr}`}
        badge={
          <StatusBadge status="info" size="sm">
            {allSchedules.length} Sesi Terjadwal
          </StatusBadge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4 text-slate-500" />}
              className="hidden sm:inline-flex min-h-[38px]"
            >
              Cetak Roster
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 2. STAT CARDS: MOBILE 1-ROW COMPACT & DESKTOP 3-GRID RIBBON               */}
      {/* ========================================================================= */}

      {/* Tampilan Mobile: 1 Baris Ramping (Ultra-Compact, Colorful & Informative) */}
      <div className="sm:hidden grid grid-cols-3 gap-1.5 p-1.5 bg-slate-900/5 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {/* Cardlet 1: Beban KBM (Emerald) */}
        <div className="flex flex-col justify-between p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/20 shadow-2xs min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight truncate">
              Beban KBM
            </span>
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono font-extrabold text-xs text-emerald-950 dark:text-emerald-100">
              {stats.totalJp} <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">JP</span>
            </span>
            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-1 py-0.2 rounded">
              {stats.workPercent}%
            </span>
          </div>
        </div>

        {/* Cardlet 2: Rombel (Indigo) */}
        <div className="flex flex-col justify-between p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-blue-500/10 border border-indigo-500/20 shadow-2xs min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-tight truncate">
              Rombel
            </span>
            <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono font-extrabold text-xs text-indigo-950 dark:text-indigo-100">
              {stats.totalRombel} <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">Kelas</span>
            </span>
            <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-300 truncate max-w-[45px]">
              {stats.rombelNames[0] || 'Aktif'}
            </span>
          </div>
        </div>

        {/* Cardlet 3: Santri (Amber) */}
        <div className="flex flex-col justify-between p-2 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/20 shadow-2xs min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight truncate">
              Santri
            </span>
            <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono font-extrabold text-xs text-amber-950 dark:text-amber-100">
              {stats.totalSantri}
            </span>
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-1 py-0.2 rounded">
              Santri
            </span>
          </div>
        </div>
      </div>

      {/* Tampilan Desktop / Tablet: 3 Kartu StatRibbonCard Penuh */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3.5">
        <StatRibbonCard
          label="Total Beban Mengajar"
          value={`${stats.totalJp} JP`}
          status="success"
          icon={Clock}
          context="/ Pekan"
          badge={`${stats.workPercent}% Beban Kerja`}
        >
          <div className="mt-2.5 space-y-1">
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.workPercent)}%` }}
              />
            </div>
          </div>
        </StatRibbonCard>

        <StatRibbonCard
          label="Rombongan Belajar"
          value={`${stats.totalRombel} Rombel`}
          status="info"
          icon={Layers}
          context="Kelas Terjadwal"
        >
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {stats.rombelNames.map((r, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
              >
                {r}
              </span>
            ))}
          </div>
        </StatRibbonCard>

        <StatRibbonCard
          label="Santri Diampu"
          value={`${stats.totalSantri} Santri`}
          status="success"
          icon={GraduationCap}
          context="Santri Binaan KBM"
          badge="Aktif"
        />
      </div>



      {/* ========================================================================= */}
      {/* 4. FILTER BAR & VIEW TOGGLE                                               */}
      {/* ========================================================================= */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Filter Mapel */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-9 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Semua Mapel</option>
            {uniqueSubjects.map((sub, i) => (
              <option key={i} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          {/* Filter Ruang */}
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="h-9 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Semua Ruang</option>
            {uniqueRooms.map((rm, i) => (
              <option key={i} value={rm}>
                Ruang {rm}
              </option>
            ))}
          </select>

          {/* Mini Search Input */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari mapel / rombel / ruang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Right: Switcher View Mode (Desktop/Tablet) */}
        <div className="flex items-center gap-2 shrink-0">
          <SegmentedTabs
            tabs={[
              { id: 'grid', label: 'Kisi Mingguan', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              { id: 'agenda', label: 'Agenda Harian', icon: <ListFilter className="w-3.5 h-3.5" /> }
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTENT BODY (LOADING / ERROR / GRID / AGENDA)                         */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard count={3} />
        </div>
      ) : error ? (
        <ErrorState title="Gagal Memuat Jadwal Mengajar" message={error} onRetry={loadData} />
      ) : filteredSchedules.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-8 h-8 text-slate-400" />}
          title="Tidak Ada Jadwal Mengajar Ditemukan"
          description={
            filterSubject !== 'ALL' || filterRoom !== 'ALL' || searchQuery
              ? 'Tidak ditemukan jadwal yang cocok dengan filter aktif Anda.'
              : 'Anda belum memiliki jadwal mengajar aktif pada semester ini.'
          }
          actionLabel={
            filterSubject !== 'ALL' || filterRoom !== 'ALL' || searchQuery
              ? 'Reset Filter'
              : undefined
          }
          onAction={() => {
            setFilterSubject('ALL');
            setFilterRoom('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <>
          {/* ===================================================================== */}
          {/* MODE A: DESKTOP GRID MINGGUAN (Tampil di Desktop saat mode 'grid')   */}
          {/* ===================================================================== */}
          <div className={viewMode === 'grid' ? 'hidden md:block' : 'hidden'}>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
              {/* Header Timetable Title */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    Matriks Jadwal Mingguan
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Zona Waktu: WIB • {filteredSchedules.length} Sesi Terplot
                </span>
              </div>

              {/* Scrollable Grid Canvas */}
              <div className="overflow-x-auto">
                <div className="min-w-[980px] divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Grid Column Headers: Jam/JP + 6 Hari */}
                  <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider select-none divide-x divide-slate-200 dark:divide-slate-800">
                    <div className="p-3 text-center bg-slate-200/50 dark:bg-slate-900/50 font-mono text-[11px]">
                      JAM / JP
                    </div>
                    {DAYS_OF_WEEK.map((d) => {
                      const isToday = d.id === todayDayNumber;
                      const dayCount = (schedulesByDay[d.id] || []).length;
                      return (
                        <div
                          key={d.id}
                          className={`p-2.5 text-center transition-colors ${
                            isToday
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{d.name}</span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            )}
                          </div>
                          <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                            {dayCount > 0 ? `${dayCount} Sesi KBM` : 'Libur / Kosong'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Time Rows */}
                  {distinctTimeSlots.map((slot, sIdx) => {
                    // Jika ini adalah baris Istirahat (Horizontal Break Stripe)
                    if (slot.isBreak) {
                      const BreakIcon = slot.icon || Coffee;
                      return (
                        <div
                          key={slot.id || `break_${sIdx}`}
                          className="bg-slate-100/90 dark:bg-slate-800/70 px-4 py-2 flex items-center justify-between border-y border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                            <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                              <BreakIcon className="w-3 h-3" />
                            </div>
                            <span>
                              {slot.title} ({slot.time})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                            {slot.desc}
                          </span>
                        </div>
                      );
                    }

                    // Baris Jam KBM Normal
                    return (
                      <div
                        key={slot.key || sIdx}
                        className="grid grid-cols-7 min-h-[96px] divide-x divide-slate-200 dark:divide-slate-800"
                      >
                        {/* Time Column */}
                        <div className="p-2.5 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-center items-center text-center">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {slot.label}
                          </span>
                          <span className="mt-1 px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            2 JP
                          </span>
                        </div>

                        {/* 6 Day Columns */}
                        {DAYS_OF_WEEK.map((d) => {
                          const isToday = d.id === todayDayNumber;
                          // Cari apakah ada jadwal guru di slot ini pada hari d
                          const dayItems = schedulesByDay[d.id] || [];
                          const item = dayItems.find((s) => {
                            const itemKey = `${formatShortTime(s.start_time)} - ${formatShortTime(
                              s.end_time
                            )}`;
                            return itemKey === slot.key;
                          });

                          if (!item) {
                            return (
                              <div
                                key={d.id}
                                className={`p-2 transition-colors ${
                                  isToday
                                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                                    : 'bg-white dark:bg-slate-900'
                                } flex items-center justify-center`}
                              >
                                <span className="text-[10px] text-slate-300 dark:text-slate-700 select-none">
                                  -
                                </span>
                              </div>
                            );
                          }

                          const timeEval = isToday
                            ? evaluateScheduleTime(item.start_time, item.end_time)
                            : { status: 'neutral', label: 'Terjadwal' };

                          const isJournalFilled = journalFilledMap.get(Number(item.id));
                          const isAttendanceFilled = attendanceFilledMap.get(Number(item.id));

                          return (
                            <div
                              key={d.id}
                              onClick={() => {
                                const cgId = item.class_group_id || (item.class_groups && item.class_groups[0]?.id) || '';
                                navigate(`/guru/absensi-kelas?schedule_id=${item.id}&class_group_id=${cgId}`);
                              }}
                              className={`p-2.5 transition-all flex flex-col justify-between group cursor-pointer ${
                                timeEval.isOngoing
                                  ? 'bg-emerald-100/60 dark:bg-emerald-950/50 ring-1 ring-emerald-500'
                                  : isToday
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50'
                                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  {/* Nama Rombel Reguler */}
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {getScheduleClassGroupDisplay(item)}
                                  </span>
                                  {timeEval.isOngoing ? (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase animate-pulse">
                                      LIVE
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[60px]">
                                      {getScheduleRoomDisplay(item)}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                                  {item.subject_name || item.subject_code}
                                </p>

                                {/* Mini Status Badges: Absensi & Jurnal */}
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  {/* Status Absensi */}
                                  {isAttendanceFilled ? (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 text-[9px] font-bold">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      Absen
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded border text-[9px] ${
                                        isToday && (timeEval.isPassed || timeEval.isOngoing)
                                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 font-bold'
                                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium'
                                      }`}
                                    >
                                      {isToday && (timeEval.isPassed || timeEval.isOngoing) ? (
                                        <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                                      ) : (
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      )}
                                      Absen
                                    </span>
                                  )}

                                  {/* Status Jurnal */}
                                  {isJournalFilled ? (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/50 text-[9px] font-bold">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                                      Jurnal
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded border text-[9px] ${
                                        isToday && (timeEval.isPassed || timeEval.isOngoing)
                                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 font-bold'
                                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium'
                                      }`}
                                    >
                                      {isToday && (timeEval.isPassed || timeEval.isOngoing) ? (
                                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                                      ) : (
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      )}
                                      Jurnal
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-emerald-600 transition-colors">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[80px]">
                                    {getScheduleRoomDisplay(item)}
                                  </span>
                                </span>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* MODE B: MOBILE AGENDA CARD-STACK (Default di Mobile atau View Mode)  */}
          {/* ===================================================================== */}
          {/* ===================================================================== */}
          {/* MODE B: MOBILE AGENDA CARD-STACK (Default di Mobile atau View Mode)  */}
          {/* ===================================================================== */}
          <div className={viewMode === 'grid' ? 'md:hidden space-y-3' : 'space-y-3'}>
            {/* Horizontal Day Picker (Senin s/d Sabtu) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = d.id === selectedDay;
                const isToday = d.id === todayDayNumber;
                const dayCount = (schedulesByDay[d.id] || []).length;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDay(d.id)}
                    className={`flex flex-col items-center justify-center min-w-[54px] min-h-[58px] rounded-xl p-1.5 transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-tight uppercase ${
                        isSelected ? 'text-emerald-300' : isToday ? 'text-emerald-600 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {d.short}
                    </span>
                    <span className="text-xs font-extrabold mt-0.5">{d.name.slice(0, 3)}</span>
                    <span
                      className={`text-[9px] font-mono font-bold mt-1 px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isToday
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold'
                          : dayCount > 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold'
                          : 'bg-transparent text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      {dayCount} Sesi
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List Timeline KBM Hari Terpilih */}
            {selectedDayItems.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="w-8 h-8 text-slate-400" />}
                title={`Tidak Ada Jadwal Mengajar Hari ${
                  DAYS_OF_WEEK.find((d) => d.id === selectedDay)?.name
                }`}
                description="Tidak ditemukan sesi KBM terjadwal untuk hari ini. Selamat beristirahat!"
              />
            ) : (
              <div className="relative pl-3 space-y-2.5 border-l-2 border-emerald-500/20 ml-1.5 sm:ml-2 sm:pl-4 sm:space-y-3">
                {selectedDayItems.map((item, idx) => {
                  const isSelectedDayToday = selectedDay === todayDayNumber;
                  const timeEval = isSelectedDayToday
                    ? evaluateScheduleTime(item.start_time, item.end_time)
                    : { status: 'neutral', label: 'Terjadwal' };

                  const isJournalFilled = journalFilledMap.get(Number(item.id));
                  const isAttendanceFilled = attendanceFilledMap.get(Number(item.id));
                  const isJournalUnfilledForPassedSchedule =
                    isSelectedDayToday && timeEval.isPassed && !isJournalFilled;

                  return (
                    <div key={item.id || idx} className="relative">
                      {/* Timeline Node Indicator */}
                      <div
                        className={`absolute -left-[19px] sm:-left-[23px] top-3.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center ring-2 sm:ring-4 ${
                          timeEval.isOngoing
                            ? 'bg-rose-500 ring-rose-200 dark:ring-rose-900 animate-ping'
                            : isSelectedDayToday
                            ? 'bg-emerald-600 ring-emerald-100 dark:ring-emerald-950'
                            : 'bg-slate-400 ring-slate-100 dark:ring-slate-800'
                        }`}
                      >
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Card Content - Compact & Modern */}
                      <div
                        onClick={() => {
                          const cgId = item.class_group_id || (item.class_groups && item.class_groups[0]?.id) || '';
                          navigate(`/guru/absensi-kelas?schedule_id=${item.id}&class_group_id=${cgId}`);
                        }}
                        className={`p-3 sm:p-3.5 rounded-xl transition-all cursor-pointer border ${
                          timeEval.isOngoing
                            ? 'bg-gradient-to-r from-emerald-500/5 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30'
                            : isJournalUnfilledForPassedSchedule
                            ? 'bg-gradient-to-r from-amber-500/5 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-amber-300 dark:border-amber-800/60 hover:shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                        }`}
                      >
                        {/* Header: Mapel & Jam */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.subject_name || item.subject_code}
                              </h3>
                              {isSelectedDayToday && timeEval.isOngoing && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                  LIVE
                                </span>
                              )}
                            </div>

                            {/* Meta Info: Rombel Reguler & Ruang */}
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                                {getScheduleClassGroupDisplay(item)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[11px]">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {getScheduleRoomDisplay(item)}
                              </span>
                            </div>

                            {/* Status Absensi & Jurnal Mengajar dengan Kode Warna & Teks Kecil */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {/* Status Absensi Siswa */}
                              {isAttendanceFilled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-bold shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Absensi: Sudah
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] ${
                                    isSelectedDayToday && (timeEval.isPassed || timeEval.isOngoing)
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/70 font-bold'
                                      : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium'
                                  }`}
                                >
                                  {isSelectedDayToday && (timeEval.isPassed || timeEval.isOngoing) ? (
                                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                  )}
                                  Absensi: Belum
                                </span>
                              )}

                              {/* Status Jurnal Mengajar */}
                              {isJournalFilled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 text-[10px] font-bold shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                  Jurnal: Sudah
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] ${
                                    isSelectedDayToday && (timeEval.isPassed || timeEval.isOngoing)
                                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/70 font-bold'
                                      : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium'
                                  }`}
                                >
                                  {isSelectedDayToday && (timeEval.isPassed || timeEval.isOngoing) ? (
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                  )}
                                  Jurnal: Belum
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time Slot Pill */}
                          <div className="shrink-0 text-right">
                            <span className="inline-block text-[11px] sm:text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.5 rounded-lg shadow-2xs">
                              {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Ultra-Compact & Responsive */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cgId = item.class_group_id || (item.class_groups && item.class_groups[0]?.id) || '';
                                navigate(
                                  `/guru/absensi-kelas?class_group_id=${cgId}&schedule_id=${item.id || ''}`
                                );
                              }}
                              className="h-7 sm:h-8 px-2.5 text-[11px] sm:text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Presensi & Jurnal</span>
                            </button>
                          </div>

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSchedule(item);
                            }}
                            className="text-[11px] text-slate-400 hover:text-emerald-600 font-medium flex items-center gap-0.5 cursor-pointer p-1"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 6. BOTTOM SHEET DETAIL JADWAL & SHORTCUTS                                 */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={Boolean(selectedSchedule)}
        onClose={() => setSelectedSchedule(null)}
        title="Detail Sesi Jadwal Mengajar"
        description={
          selectedSchedule?.academic_year_name
            ? `Tahun Ajaran: ${selectedSchedule.academic_year_name}`
            : undefined
        }
        footer={
          <div className="flex items-center gap-2">
            <Button variant="outline" fullWidth onClick={() => setSelectedSchedule(null)}>
              Tutup
            </Button>
          </div>
        }
      >
        {selectedSchedule && (
          <div className="space-y-4 py-1 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                Mata Pelajaran:
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedSchedule.subject_name || selectedSchedule.subject_code}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Kode Mapel:{' '}
                <span className="font-mono font-bold">
                  {selectedSchedule.subject_code || '-'}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Rombel Reguler:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {getScheduleClassGroupDisplay(selectedSchedule)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Lokasi Ruangan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {getScheduleRoomDisplay(selectedSchedule)}
                </span>
              </div>
            </div>

            {/* Status Administrasi KBM (Presensi & Jurnal) */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-slate-500 block text-[11px] font-semibold">
                Status Administrasi KBM:
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Presensi Siswa:</span>
                {attendanceFilledMap.get(Number(selectedSchedule.id)) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Diisi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold border border-rose-200/60">
                    <AlertTriangle className="w-3.5 h-3.5" /> Belum Diisi
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Jurnal Mengajar:</span>
                {journalFilledMap.get(Number(selectedSchedule.id)) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-xs font-bold border border-teal-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Diisi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold border border-amber-200/60">
                    <AlertTriangle className="w-3.5 h-3.5" /> Belum Diisi
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Waktu Pelaksanaan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {DAYS_OF_WEEK.find((d) => d.id === normalizeDayNumber(selectedSchedule.day_of_week))
                    ?.name || 'Hari Terjadwal'}
                </span>
              </div>
              <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                {formatShortTime(selectedSchedule.start_time)} -{' '}
                {formatShortTime(selectedSchedule.end_time)} WIB
              </span>
            </div>

            {/* Tombol Pintasan Aksi KBM */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pintasan Aksi KBM:
              </p>

              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(
                    `/guru/absensi-kelas?class_group_id=${s.class_group_id || ''}&schedule_id=${
                      s.id || ''
                    }`
                  );
                }}
                leftIcon={<UserCheck className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                Mulai Presensi Siswa Rombel Ini
              </Button>

              <Button
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(`/guru/jurnal-mengajar?schedule_id=${s.id || ''}`);
                }}
                leftIcon={<BookOpen className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                Tulis / Rekap Jurnal Mengajar
              </Button>

              <Button
                variant="outline"
                fullWidth
                size="md"
                onClick={() => {
                  const s = selectedSchedule;
                  setSelectedSchedule(null);
                  navigate(
                    `/guru/nilai?class_group_id=${s.class_group_id || ''}&subject_id=${
                      s.subject_id || ''
                    }`
                  );
                }}
                leftIcon={<GraduationCap className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                Input Nilai Asesmen Mapel Ini
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
