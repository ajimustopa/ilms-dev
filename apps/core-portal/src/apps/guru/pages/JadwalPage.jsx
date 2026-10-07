import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { scheduleService } from '../services/scheduleService';
import { journalService } from '../services/journalService';
import { formatIndonesianDate, formatShortTime } from '../utils/dateHelper';
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
      const [schedRes, assignRes, journalRes] = await Promise.all([
        scheduleService.getMySchedules().catch(() => ({ schedules: [] })),
        scheduleService.getMyTeachingAssignments().catch(() => []),
        journalService.getTodayJournalStatus().catch(() => null)
      ]);

      const schedList = schedRes?.schedules || (Array.isArray(schedRes) ? schedRes : []);
      setAllSchedules(schedList);

      const assignList = assignRes?.assignments || (Array.isArray(assignRes) ? assignRes : []);
      setAssignments(assignList);

      setTodayJournalStatus(journalRes?.data || journalRes || null);
    } catch (err) {
      setError(err?.message || 'Gagal memuat jadwal mengajar.');
      setAllSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

      const rId = s.class_group_id || s.class_group_name || s.class_name;
      if (rId && !rombelSet.has(rId)) {
        rombelSet.add(rId);
        rombelNames.push(s.class_group_name || s.class_name || `Rombel ${rId}`);
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
      if (s.room_name) map.set(s.room_name, s.room_name);
    });
    return Array.from(map.values());
  }, [allSchedules]);

  // Filtered schedules berdasarkan subject, room, dan query pencarian
  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((s) => {
      const sName = (s.subject_name || s.subject_code || '').toLowerCase();
      const rName = (s.room_name || '').toLowerCase();
      const cName = (s.class_group_name || s.class_name || '').toLowerCase();

      if (filterSubject !== 'ALL' && (s.subject_name || s.subject_code) !== filterSubject) {
        return false;
      }
      if (filterRoom !== 'ALL' && s.room_name !== filterRoom) {
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
        subtitle={`Semester Ganjil • ${todayDateStr}`}
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
            <SelectorKonteks />
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 2. STAT RIBBON CARDS (3 Metrik Beban Mengajar)                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
      {/* 3. HERO BANNER SESI AKTIF / SESI BERIKUTNYA                               */}
      {/* ========================================================================= */}
      {activeOrNextSession && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white p-4 sm:p-5 shadow-sm border border-emerald-600/50">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              {/* Badge Live / Soon Indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase text-emerald-100 border border-white/25">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeOrNextSession.evalInfo.isOngoing
                        ? 'bg-rose-400 animate-ping'
                        : 'bg-amber-300 animate-pulse'
                    }`}
                  />
                  <span>
                    {activeOrNextSession.evalInfo.isOngoing ? 'SEDANG BERLANGSUNG' : 'SESI BERIKUTNYA'}
                  </span>
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-200 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                  {formatShortTime(activeOrNextSession.schedule.start_time)} -{' '}
                  {formatShortTime(activeOrNextSession.schedule.end_time)} WIB
                </span>
              </div>

              {/* Subject & Class info */}
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {activeOrNextSession.schedule.subject_name ||
                    activeOrNextSession.schedule.subject_code ||
                    'Mata Pelajaran'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 text-xs font-semibold border border-emerald-500/40">
                  Kelas{' '}
                  {activeOrNextSession.schedule.class_group_name ||
                    activeOrNextSession.schedule.class_name ||
                    '-'}
                </span>
              </div>

              {/* Room & Countdown / Progress */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/90 pt-0.5">
                {activeOrNextSession.schedule.room_name && (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                    Ruang {activeOrNextSession.schedule.room_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-200">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  {activeOrNextSession.evalInfo.countdownText}
                </span>
              </div>

              {/* Progress bar jika sesi KBM sedang berlangsung */}
              {activeOrNextSession.evalInfo.isOngoing && (
                <div className="space-y-1 pt-1 max-w-md">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200 font-mono">
                    <span>Progres Sesi</span>
                    <span>
                      {activeOrNextSession.evalInfo.elapsedMinutes} /{' '}
                      {activeOrNextSession.evalInfo.totalDuration} Mnt (
                      {activeOrNextSession.evalInfo.progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/15">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-300 to-teal-200 rounded-full transition-all duration-300"
                      style={{ width: `${activeOrNextSession.evalInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions CTA */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0">
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  navigate(
                    `/guru/absensi-kelas?class_group_id=${
                      activeOrNextSession.schedule.class_group_id || ''
                    }&schedule_id=${activeOrNextSession.schedule.id || ''}`
                  )
                }
                leftIcon={<UserCheck className="w-4 h-4" />}
                className="bg-white text-emerald-900 hover:bg-emerald-50 border-none font-bold shadow-sm"
              >
                Mulai Presensi Kelas
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() =>
                  navigate(`/guru/jurnal-mengajar?schedule_id=${activeOrNextSession.schedule.id || ''}`)
                }
                leftIcon={<BookOpen className="w-4 h-4" />}
                className="bg-white/10 text-white hover:bg-white/20 border-white/30 text-xs font-semibold"
              >
                Isi Jurnal Mengajar
              </Button>
            </div>
          </div>
        </div>
      )}

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

                          return (
                            <div
                              key={d.id}
                              onClick={() => setSelectedSchedule(item)}
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
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {item.class_group_name || item.class_name || '-'}
                                  </span>
                                  {timeEval.isOngoing ? (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase animate-pulse">
                                      LIVE
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {item.room_name || 'KBM'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                                  {item.subject_name || item.subject_code}
                                </p>
                              </div>

                              <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-emerald-600 transition-colors">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[80px]">
                                    {item.room_name || 'R. Kelas'}
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
          <div className={viewMode === 'grid' ? 'md:hidden space-y-4' : 'space-y-4'}>
            {/* Horizontal Day Picker (Senin s/d Sabtu) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = d.id === selectedDay;
                const isToday = d.id === todayDayNumber;
                const dayCount = (schedulesByDay[d.id] || []).length;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDay(d.id)}
                    className={`flex flex-col items-center justify-center min-w-[62px] min-h-[68px] rounded-xl p-2 transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-wider ${
                        isSelected ? 'text-emerald-300' : isToday ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {d.short}
                    </span>
                    <span className="text-sm font-bold mt-0.5">{d.name.slice(0, 3)}</span>
                    <span
                      className={`text-[9px] font-mono font-bold mt-1 px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isToday
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
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
              <div className="relative pl-4 space-y-4 border-l-2 border-emerald-500/30 ml-2">
                {selectedDayItems.map((item, idx) => {
                  const isSelectedDayToday = selectedDay === todayDayNumber;
                  const timeEval = isSelectedDayToday
                    ? evaluateScheduleTime(item.start_time, item.end_time)
                    : { status: 'neutral', label: 'Terjadwal' };

                  const isJournalFilled = journalFilledMap.get(Number(item.id));
                  const isJournalUnfilledForPassedSchedule =
                    isSelectedDayToday && timeEval.isPassed && !isJournalFilled;

                  return (
                    <div key={item.id || idx} className="relative">
                      {/* Timeline Node Indicator */}
                      <div
                        className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full flex items-center justify-center ring-4 ${
                          timeEval.isOngoing
                            ? 'bg-rose-500 ring-rose-200'
                            : 'bg-emerald-600 ring-emerald-100 dark:ring-emerald-950'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Card Content */}
                      <Card
                        ribbon={
                          timeEval.isOngoing
                            ? 'emerald'
                            : isJournalUnfilledForPassedSchedule
                            ? 'amber'
                            : 'slate'
                        }
                        hoverable
                        onClick={() => setSelectedSchedule(item)}
                        className="space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.subject_name || item.subject_code}
                              </span>

                              {isSelectedDayToday && (
                                <StatusBadge
                                  status={
                                    timeEval.isOngoing
                                      ? 'danger'
                                      : timeEval.isUpcoming
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {timeEval.label}
                                </StatusBadge>
                              )}

                              {isSelectedDayToday && isJournalFilled && (
                                <StatusBadge status="success" size="sm" dot>
                                  Jurnal Terisi
                                </StatusBadge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                Kelas {item.class_group_name || item.class_name || '-'}
                              </span>
                              {item.room_name && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  Ruang {item.room_name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-md">
                              {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)} WIB
                            </span>
                          </div>
                        </div>

                        {/* Action Bar (Presensi & Jurnal) */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/guru/absensi-kelas?class_group_id=${
                                    item.class_group_id || ''
                                  }&schedule_id=${item.id || ''}`
                                );
                              }}
                              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                              className="text-xs min-h-[38px]"
                            >
                              Absensi Siswa
                            </Button>

                            <Button
                              variant={isJournalUnfilledForPassedSchedule ? 'brand-subtle' : 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`);
                              }}
                              leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                              className="text-xs min-h-[38px]"
                            >
                              {isJournalFilled ? 'Lihat Jurnal' : 'Isi Jurnal'}
                            </Button>
                          </div>

                          <span className="text-xs text-slate-400 flex items-center gap-0.5 hover:text-slate-600">
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Card>
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
                <span className="text-slate-500 block text-[11px]">Rombel / Kelas:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedSchedule.class_group_name || selectedSchedule.class_name || '-'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Lokasi Ruangan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {selectedSchedule.room_name || '-'}
                </span>
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
