import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { announcementService } from '../services/announcementService';
import {
  formatIndonesianDate,
  getGreetingByTime,
  getIndonesianDayName,
  formatShortTime
} from '../utils/dateHelper';
import {
  StatRibbonCard,
  StatusBadge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SelectorKonteks
} from '../components';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  UserCheck,
  BellRing,
  Users,
  ChevronRight,
  Search,
  FileText,
  Hourglass,
  TrendingUp,
  Table as TableIcon,
  LayoutList,
  Compass,
  CalendarCheck
} from 'lucide-react';

/**
 * Helper evaluasi status sesi KBM hari ini (Sedang Berlangsung, Akan Datang, Selesai)
 */
function evaluateSessionStatus(startTime, endTime) {
  if (!startTime || !endTime) return { label: 'Terjadwal', status: 'neutral', code: 'upcoming' };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = String(startTime).split(':').map(Number);
  const [eH, eM] = String(endTime).split(':').map(Number);
  const startMinutes = (sH || 0) * 60 + (sM || 0);
  const endMinutes = (eH || 0) * 60 + (eM || 0);

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    const minutesLeft = endMinutes - currentMinutes;
    return {
      label: 'Sedang Berlangsung',
      status: 'success',
      code: 'ongoing',
      minutesLeft
    };
  }
  if (currentMinutes < startMinutes) {
    const minutesUntil = startMinutes - currentMinutes;
    return {
      label: 'Akan Datang',
      status: 'neutral',
      code: 'upcoming',
      minutesUntil
    };
  }
  return {
    label: 'Selesai',
    status: 'neutral',
    code: 'finished'
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useTeacherAuth();
  const { activeContext, nextTeachingSession } = useTeacherContext();

  // 1. Granular State: Attendance Status & History
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [monthlyAttendanceRate, setMonthlyAttendanceRate] = useState(100);
  const [presentDaysCount, setPresentDaysCount] = useState(0);
  const [attendanceError, setAttendanceError] = useState(null);

  // 2. Granular State: Schedules & Assignments
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [allWeeklySchedules, setAllWeeklySchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalRombelsCount, setTotalRombelsCount] = useState(0);
  const [schedulesError, setSchedulesError] = useState(null);

  // 3. Granular State: Announcements
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsError, setAnnouncementsError] = useState(null);

  // 4. UI Filters & Views
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'ongoing' | 'upcoming' | 'finished'
  const [searchSchedule, setSearchSchedule] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const todayDateStr = useMemo(() => formatIndonesianDate(new Date(), true), []);

  // Fetch Presensi Mandiri & Riwayat Kehadiran Bulan Berjalan
  const fetchAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const todayRes = await attendanceService.getTodayStatus();
      const todayData = todayRes?.data || todayRes || {};
      setAttendanceData(todayData.attendance || null);
      setWorkSchedule(todayData.work_schedule || null);

      // Hitung ringkasan persentase kehadiran bulanan
      const now = new Date();
      const monthRes = await attendanceService.getMonthlyAttendance({
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }).catch(() => null);

      const records = monthRes?.data || monthRes?.attendances || (Array.isArray(monthRes) ? monthRes : []);
      if (Array.isArray(records) && records.length > 0) {
        const presentCount = records.filter(r => r.check_in_time || r.status === 'present' || r.status === 'late').length;
        setPresentDaysCount(presentCount);
        const rate = Math.round((presentCount / records.length) * 100);
        setMonthlyAttendanceRate(isNaN(rate) ? 100 : rate);
      } else {
        setPresentDaysCount(todayData.attendance?.check_in_time ? 1 : 0);
        setMonthlyAttendanceRate(100);
      }
    } catch (err) {
      setAttendanceError(err?.message || 'Gagal memuat status presensi.');
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  // Fetch Jadwal Mengajar & Penugasan Rombel
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setSchedulesError(null);
    try {
      const [schedRes, assignRes] = await Promise.allSettled([
        scheduleService.getMySchedules({
          satuan_pendidikan_id: activeContext?.satuanPendidikanId || undefined,
          academic_year_id: activeContext?.academicYearId || undefined
        }),
        scheduleService.getMyTeachingAssignments({
          satuan_pendidikan_id: activeContext?.satuanPendidikanId || undefined,
          academic_year_id: activeContext?.academicYearId || undefined
        })
      ]);

      let scheduleList = [];
      if (schedRes.status === 'fulfilled') {
        const resVal = schedRes.value;
        scheduleList = resVal?.schedules || (Array.isArray(resVal) ? resVal : resVal?.data || []);
      }
      setAllWeeklySchedules(scheduleList);

      // Filter jadwal khusus hari ini (1=Senin..7=Minggu)
      const dayIndex = new Date().getDay(); // 0 is Sunday
      const dayNumber = dayIndex === 0 ? 7 : dayIndex;
      const dayNameLower = getIndonesianDayName(new Date()).toLowerCase();

      const todayList = scheduleList.filter((s) => {
        if (!s) return false;
        if (Number(s.day_of_week) === dayNumber) return true;
        const sDay = String(s.day_of_week || '').toLowerCase();
        return sDay === dayNameLower || sDay.includes(dayNameLower);
      });

      // Urutkan berdasarkan waktu mulai (start_time)
      todayList.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
      setTodaySchedules(todayList);

      // Hitung total rombel & santri diampu dari assignments
      if (assignRes.status === 'fulfilled') {
        const aVal = assignRes.value?.data || assignRes.value || {};
        const assignments = aVal.assignments || [];
        const homerooms = aVal.homeroom_classes || [];

        const uniqueRombelIds = new Set();
        let studentSum = 0;

        assignments.forEach((a) => {
          if (a.class_group_id) {
            uniqueRombelIds.add(String(a.class_group_id));
            if (a.student_count) studentSum += Number(a.student_count) || 0;
          }
        });
        homerooms.forEach((h) => {
          if (h.id) uniqueRombelIds.add(String(h.id));
        });

        setTotalRombelsCount(uniqueRombelIds.size);
        setTotalStudentsCount(studentSum > 0 ? studentSum : uniqueRombelIds.size * 32);
      }
    } catch (err) {
      setSchedulesError(err?.message || 'Gagal memuat jadwal mengajar.');
      setTodaySchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, [activeContext?.satuanPendidikanId, activeContext?.academicYearId]);

  // Fetch Pengumuman Internal Guru
  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    setAnnouncementsError(null);
    try {
      const res = await announcementService.getTeacherAnnouncements({
        limit: 3,
        school_unit_id: activeContext?.satuanPendidikanId || undefined
      });
      const items = res?.items || (Array.isArray(res) ? res : res?.data || []);
      setAnnouncements(items);
    } catch (err) {
      setAnnouncementsError(err?.message || 'Gagal memuat pengumuman.');
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [activeContext?.satuanPendidikanId]);

  useEffect(() => {
    fetchAttendance();
    fetchSchedules();
    fetchAnnouncements();
  }, [fetchAttendance, fetchSchedules, fetchAnnouncements]);

  const displayName = user?.full_name || user?.name || user?.username || 'Ustadz / Ustadzah';
  const hasCheckedIn = Boolean(attendanceData?.check_in_time);

  // Kalkulasi total JP pekanan (1 JP = ~45 menit atau 2 JP per blok)
  const totalWeeklyJp = useMemo(() => {
    if (!allWeeklySchedules || allWeeklySchedules.length === 0) return 0;
    return allWeeklySchedules.reduce((acc, curr) => {
      if (curr.jp_count) return acc + Number(curr.jp_count);
      if (curr.start_time && curr.end_time) {
        const [sH, sM] = String(curr.start_time).split(':').map(Number);
        const [eH, eM] = String(curr.end_time).split(':').map(Number);
        const diffMin = ((eH || 0) * 60 + (eM || 0)) - ((sH || 0) * 60 + (sM || 0));
        return acc + Math.max(1, Math.round(diffMin / 45));
      }
      return acc + 2;
    }, 0);
  }, [allWeeklySchedules]);

  // Evaluasi jadwal hari ini dengan status real time
  const enrichedTodaySchedules = useMemo(() => {
    return todaySchedules.map((s) => {
      const statusInfo = evaluateSessionStatus(s.start_time, s.end_time);
      return {
        ...s,
        sessionStatus: statusInfo
      };
    });
  }, [todaySchedules]);

  // Filtered schedules berdasarkan chip dan search query
  const filteredSchedules = useMemo(() => {
    return enrichedTodaySchedules.filter((item) => {
      // Filter status
      if (sessionFilter !== 'all' && item.sessionStatus.code !== sessionFilter) {
        return false;
      }
      // Filter search
      if (searchSchedule.trim()) {
        const q = searchSchedule.toLowerCase();
        const mapel = String(item.subject_name || item.mata_pelajaran || '').toLowerCase();
        const rombel = String(item.class_name || item.class_group_name || '').toLowerCase();
        const ruang = String(item.room_name || item.ruang || '').toLowerCase();
        return mapel.includes(q) || rombel.includes(q) || ruang.includes(q);
      }
      return true;
    });
  }, [enrichedTodaySchedules, sessionFilter, searchSchedule]);

  // Hitung jumlah status sesi
  const sessionCounts = useMemo(() => {
    let ongoing = 0;
    let upcoming = 0;
    let finished = 0;
    enrichedTodaySchedules.forEach((s) => {
      if (s.sessionStatus.code === 'ongoing') ongoing++;
      else if (s.sessionStatus.code === 'upcoming') upcoming++;
      else if (s.sessionStatus.code === 'finished') finished++;
    });
    return {
      all: enrichedTodaySchedules.length,
      ongoing,
      upcoming,
      finished
    };
  }, [enrichedTodaySchedules]);

  // Evaluasi daftar item "Perlu Tindakan"
  const pendingActionItems = useMemo(() => {
    const items = [];

    // 1. Tindakan Presensi Mandiri jika belum check-in
    if (!hasCheckedIn && !loadingAttendance) {
      items.push({
        id: 'action-checkin',
        title: 'Presensi Masuk Harian',
        description: 'Anda belum mencatat presensi masuk GPS hari ini.',
        badge: 'Mendesak',
        badgeType: 'danger',
        actionLabel: 'Check-in Sekarang',
        to: '/guru/absensi-diri',
        icon: MapPin
      });
    }

    // 2. Tindakan Sesi KBM hari ini yang sedang berlangsung
    const ongoingSession = enrichedTodaySchedules.find((s) => s.sessionStatus.code === 'ongoing');
    if (ongoingSession) {
      items.push({
        id: `action-kbm-${ongoingSession.id}`,
        title: `Presensi KBM ${ongoingSession.subject_name || 'Mapel'}`,
        description: `Sesi ${ongoingSession.class_name || 'Kelas'} sedang berlangsung di ${ongoingSession.room_name || 'Ruang Kelas'}.`,
        badge: 'Berlangsung',
        badgeType: 'warning',
        actionLabel: 'Buka Presensi Kelas',
        to: `/guru/absensi-kelas?schedule_id=${ongoingSession.id || ''}&class_group_id=${ongoingSession.class_group_id || ''}`,
        icon: UserCheck
      });
    }

    // 3. Sesi KBM selesai hari ini yang butuh input jurnal
    const finishedWithoutJournal = enrichedTodaySchedules.filter(
      (s) => s.sessionStatus.code === 'finished' && !s.has_journal_filled
    );
    if (finishedWithoutJournal.length > 0) {
      const first = finishedWithoutJournal[0];
      items.push({
        id: `action-journal-${first.id}`,
        title: `Jurnal ${first.subject_name || 'Mapel'} (${first.class_name || 'Kelas'})`,
        description: `${finishedWithoutJournal.length} sesi mengajar hari ini menunggu pengisian materi jurnal KBM.`,
        badge: 'Jurnal',
        badgeType: 'info',
        actionLabel: 'Isi Jurnal Mengajar',
        to: `/guru/jurnal-mengajar?schedule_id=${first.id || ''}`,
        icon: BookOpen
      });
    }

    return items;
  }, [hasCheckedIn, loadingAttendance, enrichedTodaySchedules]);

  // Menentukan data sesi terdekat untuk Hero Banner
  const heroSession = useMemo(() => {
    // Prioritas 1: Sesi sedang berlangsung
    const ongoing = enrichedTodaySchedules.find((s) => s.sessionStatus.code === 'ongoing');
    if (ongoing) return { ...ongoing, isHeroOngoing: true };

    // Prioritas 2: Sesi berikutnya terdekat
    const upcoming = enrichedTodaySchedules.find((s) => s.sessionStatus.code === 'upcoming');
    if (upcoming) return { ...upcoming, isHeroOngoing: false };

    // Prioritas 3: Sesi dari context nextTeachingSession jika ada
    if (nextTeachingSession?.hasActiveSession && nextTeachingSession?.session) {
      return {
        ...nextTeachingSession.session,
        isHeroOngoing: nextTeachingSession.status === 'ongoing',
        sessionStatus: {
          minutesDiff: nextTeachingSession.minutesDiff
        }
      };
    }

    return null;
  }, [enrichedTodaySchedules, nextTeachingSession]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Konteks Unit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {getGreetingByTime()}, Ust. {displayName.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            {todayDateStr} • {activeContext?.satuanPendidikanName || 'Unit Sekolah'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SelectorKonteks />
        </div>
      </div>

      {/* 2. Hero Card: Sesi Terdekat / Sesi Sedang Berlangsung */}
      {loadingSchedules ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
          <div className="h-10 bg-slate-200 rounded w-36"></div>
        </div>
      ) : heroSession ? (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-sm border border-emerald-700/50 p-5 sm:p-6">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Info Kiri */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  {heroSession.isHeroOngoing ? 'SESI SEDANG BERLANGSUNG' : 'SESI BERIKUTNYA'}
                </span>

                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white/10 text-emerald-100 border border-white/10">
                  {formatShortTime(heroSession.start_time)} - {formatShortTime(heroSession.end_time)} WIB
                </span>
              </div>

              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">
                  {heroSession.subject_name || heroSession.mata_pelajaran || 'Mata Pelajaran'} ({heroSession.class_name || heroSession.class_group_name || 'Kelas'})
                </h2>
                <div className="flex items-center gap-3 text-xs text-emerald-100/90 mt-1 flex-wrap font-medium">
                  {heroSession.room_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>Ruang {heroSession.room_name}</span>
                    </span>
                  )}
                  {heroSession.period_label && (
                    <span>• {heroSession.period_label}</span>
                  )}
                  <span>• Tatap Muka KBM</span>
                </div>
              </div>
            </div>

            {/* Tombol CTA */}
            <div className="shrink-0 flex items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  navigate(
                    `/guru/absensi-kelas?schedule_id=${heroSession.id || ''}&class_group_id=${heroSession.class_group_id || ''}`
                  )
                }
                leftIcon={<UserCheck className="w-4 h-4 text-emerald-700" />}
                className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm"
              >
                Buka Presensi Kelas
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Banner saat tidak ada sesi mengajar aktif */
        <div className="rounded-xl bg-slate-900 text-white p-5 sm:p-6 border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agenda Mengajar Selesai</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Tidak ada sesi mengajar aktif saat ini.
            </h2>
            <p className="text-xs text-slate-400">
              Gunakan waktu untuk persiapan materi ajar, memeriksa tugas siswa, atau input capaian TP.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/guru/jadwal')}
            leftIcon={<CalendarDays className="w-4 h-4 text-slate-300" />}
            className="text-white border-slate-700 hover:bg-slate-800 text-xs shrink-0 self-start sm:self-auto rounded-lg"
          >
            Lihat Jadwal Pekanan
          </Button>
        </div>
      )}

      {/* 3. Empat Kartu Aksi Cepat (Quick Actions) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Aksi 1: Presensi Mandiri */}
        <Link
          to="/guru/absensi-diri"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm transition-all group block"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">Presensi Guru</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {hasCheckedIn
                  ? `Masuk: ${formatShortTime(attendanceData?.check_in_time)}`
                  : 'Belum Check-In GPS'}
              </p>
            </div>
          </div>
        </Link>

        {/* Aksi 2: Presensi Santri KBM */}
        <Link
          to="/guru/absensi-kelas"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm transition-all group block"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">Presensi Kelas</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Jurnal & Absensi Santri
              </p>
            </div>
          </div>
        </Link>

        {/* Aksi 3: Input Nilai & TP */}
        <Link
          to="/guru/penilaian"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all group block"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">Input Nilai</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                STS, SAS & Asesmen TP
              </p>
            </div>
          </div>
        </Link>

        {/* Aksi 4: Pengajuan Izin / Cuti */}
        <Link
          to="/guru/absensi-diri"
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-sm transition-all group block"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">Izin & Cuti</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Form Izin & Dinas Luar
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* 4. Tiga StatRibbonCard (Jam Ajar, Santri Diampu, Kehadiran) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat 1: Jam Ajar Pekan Ini */}
        {loadingSchedules ? (
          <SkeletonCard />
        ) : (
          <StatRibbonCard
            label="JAM AJAR PEKAN INI"
            value={<span className="tnum font-bold text-2xl text-slate-900">{totalWeeklyJp} <span className="text-xs text-slate-500 font-medium">JP</span></span>}
            context={
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target 24 JP terpenuhi</span>
                  <span className="text-emerald-700 font-bold tnum">
                    {Math.min(100, Math.round((totalWeeklyJp / 24) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalWeeklyJp / 24) * 100)}%` }}
                  />
                </div>
              </div>
            }
            status="success"
            icon={Hourglass}
            to="/guru/jadwal"
          />
        )}

        {/* Stat 2: Total Santri Diampu */}
        {loadingSchedules ? (
          <SkeletonCard />
        ) : (
          <StatRibbonCard
            label="TOTAL SANTRI DIAMPU"
            value={<span className="tnum font-bold text-2xl text-slate-900">{totalStudentsCount} <span className="text-xs text-slate-500 font-medium">Santri</span></span>}
            context={
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>{totalRombelsCount} Rombel Terdaftar</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-[10px]">
                  Aktif TA Ini
                </span>
              </div>
            }
            status="info"
            icon={Users}
            to="/guru/siswa"
          />
        )}

        {/* Stat 3: Kehadiran Mengajar */}
        {loadingAttendance ? (
          <SkeletonCard />
        ) : (
          <StatRibbonCard
            label="KEHADIRAN MENGAJAR"
            value={<span className="tnum font-bold text-2xl text-slate-900">{monthlyAttendanceRate}%</span>}
            context={
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{presentDaysCount} Hari Hadir Bulan Ini</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> Stabil
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all"
                    style={{ width: `${monthlyAttendanceRate}%` }}
                  />
                </div>
              </div>
            }
            status="success"
            icon={CheckCircle2}
            to="/guru/absensi-diri"
          />
        )}
      </div>

      {/* 5. Layout Dua Kolom: Jadwal Mengajar (Kiri) & Widget Sidebar (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Jadwal Mengajar Hari Ini (8 Span) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 sm:p-6">
            {/* Header Seksi Jadwal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Jadwal Mengajar Hari Ini
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {todayDateStr}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold self-start sm:self-auto border border-slate-200/60 tnum">
                Total {todaySchedules.length} Sesi Tatap Muka
              </span>
            </div>

            {/* Bar Kontrol & Filter Sesi */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 my-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSessionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    sessionFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  Semua ({sessionCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('ongoing')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    sessionFilter === 'ongoing'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  Berlangsung ({sessionCounts.ongoing})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('upcoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    sessionFilter === 'upcoming'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  Akan Datang ({sessionCounts.upcoming})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionFilter('finished')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    sessionFilter === 'finished'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  Selesai ({sessionCounts.finished})
                </button>
              </div>

              {/* Mini Search & View Toggle */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchSchedule}
                    onChange={(e) => setSearchSchedule(e.target.value)}
                    placeholder="Cari mapel / kelas..."
                    className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1 rounded ${viewMode === 'table' ? 'bg-slate-100 text-emerald-800' : 'text-slate-400 hover:text-slate-700'}`}
                    title="Tampilan Tabel"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1 rounded ${viewMode === 'cards' ? 'bg-slate-100 text-emerald-800' : 'text-slate-400 hover:text-slate-700'}`}
                    title="Tampilan Kartu"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Isi Jadwal: Loading, Error, Empty, atau Tabel */}
            {loadingSchedules ? (
              <div className="space-y-2.5 py-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : schedulesError ? (
              <ErrorState
                compact
                title="Gagal Memuat Jadwal"
                message={schedulesError}
                onRetry={fetchSchedules}
              />
            ) : todaySchedules.length === 0 ? (
              <EmptyState
                compact
                icon={<CalendarCheck className="w-8 h-8 text-emerald-600" />}
                title="Tidak ada jadwal mengajar hari ini. Selamat beristirahat!"
                description="Anda tidak memiliki jadwal tatap muka KBM untuk hari ini."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/guru/jadwal')}
                    leftIcon={<CalendarDays className="w-4 h-4" />}
                    className="rounded-lg text-xs"
                  >
                    Lihat Roster Mingguan
                  </Button>
                }
              />
            ) : filteredSchedules.length === 0 ? (
              <EmptyState
                compact
                title="Tidak Ada Jadwal yang Cocok"
                description="Tidak ada sesi mengajar yang sesuai dengan filter atau kata kunci pencarian Anda."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSessionFilter('all');
                      setSearchSchedule('');
                    }}
                    className="rounded-lg text-xs"
                  >
                    Reset Filter
                  </Button>
                }
              />
            ) : viewMode === 'table' ? (
              /* Tabel Jadwal Responsif */
              <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 font-mono">
                      <th className="py-3 px-3.5">WAKTU</th>
                      <th className="py-3 px-3.5">MATA PELAJARAN</th>
                      <th className="py-3 px-3.5">KELAS & RUANG</th>
                      <th className="py-3 px-3.5">STATUS</th>
                      <th className="py-3 px-3.5 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSchedules.map((item) => {
                      const isOngoing = item.sessionStatus.code === 'ongoing';
                      const isUpcoming = item.sessionStatus.code === 'upcoming';
                      const isFinished = item.sessionStatus.code === 'finished';

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isOngoing
                              ? 'bg-emerald-50/50 hover:bg-emerald-50 border-l-4 border-l-emerald-600'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className={`font-mono text-xs sm:text-sm font-bold tnum ${isOngoing ? 'text-emerald-800' : 'text-slate-800'}`}>
                              {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {item.period_label || 'Tatap Muka'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5">
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px]">
                              {item.subject_name || item.mata_pelajaran || 'Mata Pelajaran'}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">
                              {item.class_name || item.class_group_name || 'Kelas'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.room_name ? `R. ${item.room_name}` : 'Ruang Kelas'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {isOngoing && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Berlangsung
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                                Akan Datang
                              </span>
                            )}
                            {isFinished && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant={isOngoing ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/guru/absensi-kelas?schedule_id=${item.id || ''}&class_group_id=${item.class_group_id || ''}`
                                  )
                                }
                                className="text-xs rounded-lg py-1 px-2.5"
                              >
                                Buka Presensi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`)
                                }
                                title="Isi Jurnal Mengajar"
                                className="text-xs rounded-lg py-1 px-2 text-slate-600"
                              >
                                Jurnal
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Tampilan Stack Card Sesi */
              <div className="space-y-3">
                {filteredSchedules.map((item) => {
                  const isOngoing = item.sessionStatus.code === 'ongoing';
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isOngoing
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {item.subject_name || item.mata_pelajaran || 'Mata Pelajaran'}
                            </h3>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                              {item.class_name || item.class_group_name || 'Kelas'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
                            <span className="tnum font-mono font-semibold text-slate-700">
                              {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)} WIB
                            </span>
                            {item.room_name && <span>• Ruang {item.room_name}</span>}
                          </p>
                        </div>
                        <span className="shrink-0">
                          {isOngoing ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                              Berlangsung
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                              {item.sessionStatus.label}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`)}
                          className="text-xs rounded-lg py-1.5 flex-1 sm:flex-initial justify-center"
                        >
                          Isi Jurnal
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/guru/absensi-kelas?schedule_id=${item.id || ''}&class_group_id=${item.class_group_id || ''}`
                            )
                          }
                          className="text-xs rounded-lg py-1.5 flex-1 sm:flex-initial justify-center"
                        >
                          Buka Presensi Kelas
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Notice: Waktu Istirahat & Sholat */}
            <div className="mt-4 p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-slate-700 text-xs">
                <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Istirahat Dzuhur & Sholat Berjamaah:</strong> 11.45 - 13.00 WIB di Masjid Utama.
                </span>
              </div>
              <Link
                to="/guru/jadwal"
                className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline shrink-0"
              >
                <span>Lihat Jadwal Lengkap</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Kolom Kanan: Perlu Tindakan & Pengumuman (4 Span) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Perlu Tindakan */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Perlu Tindakan</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200 tnum">
                {pendingActionItems.length} Tugas
              </span>
            </div>

            <div className="space-y-3 mt-3.5">
              {pendingActionItems.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-emerald-900">Alhamdulillah, Semua Tuntas!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Tidak ada tindakan atau jurnal mengajar yang tertunda saat ini.
                  </p>
                </div>
              ) : (
                pendingActionItems.map((action) => {
                  const IconComponent = action.icon || AlertCircle;
                  return (
                    <div
                      key={action.id}
                      className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <IconComponent className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <h3 className="font-bold text-slate-900 text-xs truncate">
                            {action.title}
                          </h3>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            action.badgeType === 'danger'
                              ? 'bg-rose-100 text-rose-800'
                              : action.badgeType === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {action.badge}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed mt-0.5">
                        {action.description}
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(action.to)}
                        className="mt-2.5 w-full text-xs rounded-lg py-1.5 font-bold justify-center"
                      >
                        {action.actionLabel}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Card 2: Pengumuman Asatidz */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <BellRing className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Pengumuman Asatidz</h2>
              </div>
              <Link
                to="/guru/pengumuman"
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
              >
                Lihat Semua &gt;
              </Link>
            </div>

            <div className="space-y-3 mt-3.5">
              {loadingAnnouncements ? (
                <SkeletonList count={2} />
              ) : announcementsError ? (
                <ErrorState
                  compact
                  title="Gagal Memuat Pengumuman"
                  message={announcementsError}
                  onRetry={fetchAnnouncements}
                />
              ) : announcements.length === 0 ? (
                <EmptyState
                  compact
                  icon={<BellRing className="w-6 h-6 text-slate-400" />}
                  title="Belum Ada Pengumuman"
                  description="Pengumuman resmi dari pimpinan sekolah akan tampil di sini."
                />
              ) : (
                announcements.map((news) => (
                  <Link
                    key={news.id}
                    to={`/guru/pengumuman?id=${news.id}`}
                    className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 hover:border-slate-300 transition-all block group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase">
                        {news.category || 'PENGUMUMAN'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono tnum">
                        {news.published_at ? formatIndonesianDate(news.published_at, false) : '-'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {news.title}
                    </h4>
                    <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {news.summary || news.excerpt || (news.content ? news.content.replace(/<[^>]*>?/gm, '').slice(0, 120) : '-')}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
