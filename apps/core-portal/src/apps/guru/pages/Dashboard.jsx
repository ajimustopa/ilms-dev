import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { announcementService } from '../services/announcementService';
import { formatIndonesianDate, getGreetingByTime, getIndonesianDayName, formatShortTime } from '../utils/dateHelper';
import {
  Button,
  Card,
  ListItem,
  StatusBadge,
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
  AlertTriangle,
  Award,
  BookOpen,
  UserCheck,
  BellRing,
  Layers,
  ShieldAlert,
  FileText,
  Users,
  ChevronRight,
  Sparkles,
  ArrowRight,
  GraduationCap,
  School,
  RotateCw
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, roleTitle, activeSchoolUnit } = useTeacherAuth();

  // 1. Granular State: Attendance Today
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [attendanceError, setAttendanceError] = useState(null);

  // 2. Granular State: Schedules Today
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [schedulesError, setSchedulesError] = useState(null);

  // 3. Granular State: Announcements
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsError, setAnnouncementsError] = useState(null);

  const todayDateStr = useMemo(() => formatIndonesianDate(new Date(), true), []);

  // Fetching Functions with Granular Isolation
  const fetchAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const res = await attendanceService.getTodayStatus();
      const data = res?.data || res || {};
      setAttendanceData(data.attendance || null);
      setWorkSchedule(data.work_schedule || null);
    } catch (err) {
      setAttendanceError(err?.message || 'Gagal memuat status presensi');
      setAttendanceData(null);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setSchedulesError(null);
    try {
      const res = await scheduleService.getMySchedules();
      const scheduleList = res?.schedules || (Array.isArray(res) ? res : []);

      // Filter jadwal hari ini (Senin=1..Minggu=7 atau nama hari)
      const dayIndex = new Date().getDay(); // 0 is Sunday
      const dayNumber = dayIndex === 0 ? 7 : dayIndex; // 1=Senin..7=Minggu
      const dayNameLower = getIndonesianDayName(new Date()).toLowerCase();

      const filtered = scheduleList.filter((s) => {
        if (!s) return false;
        // Check numeric day_of_week
        if (Number(s.day_of_week) === dayNumber) return true;
        // Check string day_of_week
        const sDay = String(s.day_of_week || '').toLowerCase();
        return sDay === dayNameLower || sDay.includes(dayNameLower);
      });

      // Sort by start_time
      filtered.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
      setTodaySchedules(filtered);
    } catch (err) {
      setSchedulesError(err?.message || 'Gagal memuat jadwal mengajar');
      setTodaySchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    setAnnouncementsError(null);
    try {
      const res = await announcementService.getTeacherAnnouncements({ limit: 3 });
      const items = res?.items || (Array.isArray(res) ? res : res?.data || []);
      setAnnouncements(items);
    } catch (err) {
      setAnnouncementsError(err?.message || 'Gagal memuat pengumuman guru');
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchSchedules();
    fetchAnnouncements();
  }, [fetchAttendance, fetchSchedules, fetchAnnouncements]);

  const displayName = user?.full_name || user?.name || user?.username || 'Ustadz / Ustadzah';
  const hasCheckedIn = Boolean(attendanceData?.check_in_time);
  const hasCheckedOut = Boolean(attendanceData?.check_out_time);

  // Helper evaluasi status sesi KBM (Sedang Berlangsung, Berikutnya, Selesai)
  const getScheduleSessionStatus = (startTime, endTime) => {
    if (!startTime || !endTime) return { label: 'Terjadwal', status: 'neutral' };
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return { label: 'Sedang Berlangsung', status: 'info', code: 'KBM' };
    }
    if (currentMinutes < startMinutes) {
      return { label: 'Berikutnya', status: 'warning' };
    }
    return { label: 'Selesai', status: 'success' };
  };

  // Pintasan Fitur Utama Portal Guru - 8 Colorful Squircles matching the reference style
  const quickActions = [
    {
      title: 'Presensi',
      subtitle: 'GPS Masuk & Pulang',
      icon: MapPin,
      to: '/guru/absensi',
      bgClass: 'bg-[#5B61F4] text-white shadow-md shadow-indigo-500/20 hover:bg-[#4d53eb]'
    },
    {
      title: 'Jadwal',
      subtitle: 'Roster KBM',
      icon: CalendarDays,
      to: '/guru/jadwal',
      bgClass: 'bg-[#FF6433] text-white shadow-md shadow-orange-500/20 hover:bg-[#ea5525]'
    },
    {
      title: 'Absensi',
      subtitle: 'Presensi Rombel',
      icon: UserCheck,
      to: '/guru/absensi-kelas',
      bgClass: 'bg-[#FFA826] text-white shadow-md shadow-amber-500/20 hover:bg-[#ee9715]'
    },
    {
      title: 'Jurnal',
      subtitle: 'Materi Mengajar',
      icon: BookOpen,
      to: '/guru/jurnal-mengajar',
      bgClass: 'bg-[#00B7FE] text-white shadow-md shadow-cyan-500/20 hover:bg-[#00a3e3]'
    },
    {
      title: 'Penilaian',
      subtitle: 'Capaian & TP',
      icon: Award,
      to: '/guru/nilai',
      bgClass: 'bg-[#8B5CF6] text-white shadow-md shadow-purple-500/20 hover:bg-[#7c4ce7]'
    },
    {
      title: 'Kejadian',
      subtitle: 'Catatan Santri',
      icon: ShieldAlert,
      to: '/guru/kejadian-siswa',
      bgClass: 'bg-[#FF4B72] text-white shadow-md shadow-rose-500/20 hover:bg-[#e63a60]'
    },
    {
      title: 'Izin Guru',
      subtitle: 'Cuti & Tugas',
      icon: FileText,
      to: '/guru/izin',
      bgClass: 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20 hover:bg-[#2563eb]'
    },
    {
      title: 'Santri & Wali',
      subtitle: 'Data & Kontak',
      icon: Users,
      to: '/guru/santri',
      bgClass: 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20 hover:bg-[#059669]'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      {/* 1. Header Banner / Greeting Area matching "Hi, Robert / Find Deals" */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-400">
            {getGreetingByTime()}, Ust. {displayName.split(' ')[0]}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Portal Guru
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {activeSchoolUnit?.name || 'Yayasan Aldepos'} • {todayDateStr}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <SelectorKonteks />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Slot Pengingat Absen (Tahap 18 Placeholder)                               */}
      {/* ========================================================================= */}
      <div id="attendance-reminder-slot" />

      {/* 2. Colorful Squircle Quick Action Tiles (Like Flight / Hotels / Taxi / More in reference) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Menu Cepat
          </h2>
          <Link
            to="/guru/lainnya"
            className="text-xs font-semibold text-[#5B61F4] hover:underline flex items-center gap-0.5"
          >
            <span>Semua Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
          {quickActions.map((qa, idx) => {
            const Icon = qa.icon;
            return (
              <Link
                key={idx}
                to={qa.to}
                className="flex flex-col items-center text-center group focus-visible:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 active:scale-95 ${qa.bgClass}`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 block truncate w-full group-hover:text-[#5B61F4] transition-colors">
                  {qa.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Grid Utama: Presensi Hari Ini & Jadwal Mengajar (Boarding Pass / Ticket Aesthetics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ========================================== */}
        {/* Seksi A: Status Presensi Hari Ini           */}
        {/* ========================================== */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            {/* Top Ticket Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5B61F4]/10 text-[#5B61F4] flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Presensi Hari Ini
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
                    {workSchedule?.shift_name || 'Jam Kerja Guru'}
                    {workSchedule?.start_time && ` (${formatShortTime(workSchedule.start_time)} - ${formatShortTime(workSchedule.end_time)})`}
                  </p>
                </div>
              </div>

              <Link
                to="/guru/absensi"
                className="text-xs font-bold text-[#5B61F4] hover:underline flex items-center gap-0.5 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full"
              >
                <span>Riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Middle Ticket Body: Masuk & Pulang Nodes */}
            <div className="py-5">
              {loadingAttendance ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : attendanceError ? (
                <ErrorState
                  compact
                  title="Gagal Memuat Presensi"
                  message={attendanceError}
                  onRetry={fetchAttendance}
                />
              ) : (
                <div className="bg-[#F8FAFD] dark:bg-slate-800/60 rounded-3xl p-4 border border-slate-100 dark:border-slate-700/60">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    {/* Node Masuk */}
                    <div className="text-left">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Presensi Masuk
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight block mt-0.5">
                        {attendanceData?.check_in_time ? formatShortTime(attendanceData.check_in_time) : '--:--'}
                      </span>
                      <div className="mt-2">
                        {hasCheckedIn ? (
                          <StatusBadge
                            status={attendanceData?.status === 'late' || attendanceData?.late_minutes > 0 ? 'danger' : 'success'}
                            size="sm"
                          >
                            {attendanceData?.status === 'late' || attendanceData?.late_minutes > 0
                              ? `Terlambat ${attendanceData.late_minutes}m`
                              : 'Tepat Waktu'}
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="warning" size="sm">Belum Masuk</StatusBadge>
                        )}
                      </div>
                    </div>

                    {/* Node Pulang */}
                    <div className="text-right border-l border-dashed border-slate-200 dark:border-slate-700 pl-4">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Presensi Pulang
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight block mt-0.5">
                        {attendanceData?.check_out_time ? formatShortTime(attendanceData.check_out_time) : '--:--'}
                      </span>
                      <div className="mt-2 flex justify-end">
                        {hasCheckedOut ? (
                          <StatusBadge status="info" size="sm">Tercatat</StatusBadge>
                        ) : (
                          <StatusBadge status="neutral" size="sm">Belum Pulang</StatusBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Bottom CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Link
              to="/guru/izin"
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#5B61F4] dark:hover:text-[#5B61F4] flex items-center justify-center gap-1.5 py-2"
            >
              <FileText className="w-4 h-4" />
              <span>Pengajuan Izin / Cuti</span>
            </Link>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/guru/absensi')}
              leftIcon={<Clock className="w-4 h-4" />}
              className="rounded-2xl py-3.5 px-6 font-bold shadow-lg shadow-indigo-500/25"
            >
              {!hasCheckedIn ? 'Presensi Masuk Sekarang' : (!hasCheckedOut ? 'Presensi Pulang Sekarang' : 'Buka Detail Presensi')}
            </Button>
          </div>
        </Card>

        {/* ========================================== */}
        {/* Seksi B: Jadwal Mengajar Hari Ini           */}
        {/* ========================================== */}
        <Card className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF6433]/10 text-[#FF6433] flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Jadwal Mengajar Hari Ini
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
                    {todaySchedules.length} Sesi Tatap Muka
                  </p>
                </div>
              </div>

              <Link
                to="/guru/jadwal"
                className="text-xs font-bold text-[#FF6433] hover:underline flex items-center gap-0.5 bg-orange-50/70 dark:bg-orange-950/40 px-3 py-1.5 rounded-full"
              >
                <span>Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="py-4">
              {loadingSchedules ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
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
                  icon={<CalendarDays className="w-6 h-6 text-slate-400" />}
                  title="Tidak Ada Jadwal Hari Ini"
                  description="Tidak ada roster tatap muka terjadwal untuk hari ini."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/guru/jadwal')}
                      leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
                      className="rounded-xl"
                    >
                      Lihat Roster Mingguan
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {todaySchedules.map((item, idx) => {
                    const sessionStatus = getScheduleSessionStatus(item.start_time, item.end_time);
                    const classLabel = item.class_group_name || item.class_name || 'Rombel';
                    const roomLabel = item.room_name || item.location_name;

                    return (
                      <div
                        key={item.id || idx}
                        className={`p-4 rounded-3xl border transition-all ${
                          sessionStatus.status === 'info'
                            ? 'bg-[#F4F6FC] dark:bg-indigo-950/20 border-indigo-200/90 dark:border-indigo-800'
                            : 'bg-[#F8FAFD] dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {item.subject_name || item.subject_code || 'Mata Pelajaran'}
                              </h3>
                              <StatusBadge
                                status={sessionStatus.status}
                                code={sessionStatus.code}
                                size="sm"
                              >
                                {sessionStatus.label}
                              </StatusBadge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
                              Kelas <span className="font-bold text-slate-800 dark:text-slate-200">{classLabel}</span>
                              {roomLabel && ` • Ruang ${roomLabel}`}
                            </p>
                          </div>

                          <span className="text-xs font-mono font-bold text-[#5B61F4] dark:text-indigo-400 shrink-0 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-2xs">
                            {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                          </span>
                        </div>

                        {/* Action buttons inside ticket */}
                        <div className="mt-3 pt-3 border-t border-dashed border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/guru/absensi-kelas?class_group_id=${item.class_group_id || ''}&schedule_id=${item.id || ''}`)}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                            className="text-xs rounded-xl flex-1 justify-center py-2"
                          >
                            Absensi Siswa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`)}
                            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                            className="text-xs rounded-xl flex-1 justify-center py-2"
                          >
                            Isi Jurnal
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/guru/jurnal-mengajar"
              className="text-xs font-bold text-[#5B61F4] hover:underline flex items-center justify-between py-2"
            >
              <span>Buka Rekap Jurnal Mengajar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. Pengumuman Internal Guru (Clean Modern Cards) */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00B7FE]/10 text-[#00B7FE] flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                Pengumuman & Berita Guru
              </h2>
              <p className="text-xs text-slate-400 font-medium">Informasi resmi sekolah</p>
            </div>
          </div>
          <Link
            to="/guru/pengumuman"
            className="text-xs font-bold text-[#00B7FE] hover:underline flex items-center gap-0.5 bg-cyan-50/70 dark:bg-cyan-950/40 px-3 py-1.5 rounded-full"
          >
            <span>Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div>
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
              description="Pengumuman resmi dari yayasan atau pimpinan sekolah akan tampil di sini."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {announcements.map((news) => (
                <Link
                  key={news.id}
                  to={`/guru/pengumuman?id=${news.id}`}
                  className="p-4 rounded-3xl bg-[#F8FAFD] dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 hover:border-[#5B61F4]/40 hover:bg-white dark:hover:bg-slate-800 transition-all block group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5B61F4] bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                      Pengumuman
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {news.published_at ? formatIndonesianDate(news.published_at, false) : '-'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-[#5B61F4] transition-colors line-clamp-1">
                    {news.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-medium leading-relaxed">
                    {news.summary || news.excerpt || (news.content ? news.content.replace(/<[^>]*>?/gm, '').slice(0, 140) : '-')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
