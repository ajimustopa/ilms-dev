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

  // Pintasan Fitur Utama Portal Guru
  const quickActions = [
    {
      title: 'Presensi Guru',
      subtitle: 'Masuk & Pulang GPS',
      icon: MapPin,
      to: '/guru/absensi',
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    {
      title: 'Jadwal & KBM',
      subtitle: 'Roster Tatap Muka',
      icon: CalendarDays,
      to: '/guru/jadwal',
      color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
    },
    {
      title: 'Presensi Siswa',
      subtitle: 'Absensi Rombel',
      icon: UserCheck,
      to: '/guru/absensi-kelas',
      color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    {
      title: 'Jurnal Mengajar',
      subtitle: 'Materi & Catatan KBM',
      icon: BookOpen,
      to: '/guru/jurnal-mengajar',
      color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
    },
    {
      title: 'Penilaian Siswa',
      subtitle: 'Sesi & Capaian TP',
      icon: Award,
      to: '/guru/nilai',
      color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Kejadian Santri',
      subtitle: 'Pencatatan & Prestasi',
      icon: ShieldAlert,
      to: '/guru/kejadian-siswa',
      color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    },
    {
      title: 'Pengajuan Izin',
      subtitle: 'Cuti & Surat Dokter',
      icon: FileText,
      to: '/guru/izin',
      color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Direktori Santri',
      subtitle: 'Data & Kontak Wali',
      icon: Users,
      to: '/guru/santri',
      color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Banner Sambutan & Selector Konteks */}
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="success" size="sm">
              {roleTitle || 'Guru Pengajar'}
            </StatusBadge>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {todayDateStr}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {getGreetingByTime()}, {displayName}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Selamat bertugas di <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSchoolUnit?.name || 'Yayasan Aldepos'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <SelectorKonteks />
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* Slot Pengingat Absen (Tahap 18 Placeholder)                               */}
      {/* Slot ini dicadangkan untuk widget banner pengingat presensi otomatis        */}
      {/* ========================================================================= */}
      <div id="attendance-reminder-slot" />

      {/* 2. Grid Utama: Presensi Hari Ini & Jadwal Mengajar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ========================================== */}
        {/* Seksi A: Status Presensi Hari Ini           */}
        {/* ========================================== */}
        <Card
          ribbon={hasCheckedIn ? (hasCheckedOut ? 'indigo' : 'emerald') : 'amber'}
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Presensi Hari Ini</h2>
                  {workSchedule?.shift_name && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {workSchedule.shift_name} ({formatShortTime(workSchedule.start_time)} - {formatShortTime(workSchedule.end_time)})
                    </p>
                  )}
                </div>
              </div>

              <Link
                to="/guru/absensi"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <span>Riwayat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="py-3">
              {loadingAttendance ? (
                <div className="py-2 space-y-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : attendanceError ? (
                <ErrorState
                  compact
                  title="Gagal Memuat Presensi"
                  message={attendanceError}
                  onRetry={fetchAttendance}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Slot Masuk */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                      Presensi Masuk
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {attendanceData?.check_in_time ? formatShortTime(attendanceData.check_in_time) : '--:--'}
                    </span>
                    <div className="mt-1.5">
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

                  {/* Slot Pulang */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                      Presensi Pulang
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {attendanceData?.check_out_time ? formatShortTime(attendanceData.check_out_time) : '--:--'}
                    </span>
                    <div className="mt-1.5">
                      {hasCheckedOut ? (
                        <StatusBadge status="info" size="sm">Tercatat</StatusBadge>
                      ) : (
                        <StatusBadge status="neutral" size="sm">Belum Pulang</StatusBadge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <Link
              to="/guru/izin"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 min-h-[44px]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pengajuan Izin</span>
            </Link>

            <Button
              variant={hasCheckedIn && !hasCheckedOut ? 'primary' : (hasCheckedIn && hasCheckedOut ? 'secondary' : 'primary')}
              size="sm"
              onClick={() => navigate('/guru/absensi')}
              leftIcon={<Clock className="w-4 h-4" />}
            >
              {!hasCheckedIn ? 'Presensi Masuk' : (!hasCheckedOut ? 'Presensi Pulang' : 'Detail Presensi')}
            </Button>
          </div>
        </Card>

        {/* ========================================== */}
        {/* Seksi B: Jadwal Mengajar Hari Ini           */}
        {/* ========================================== */}
        <Card ribbon="indigo" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Jadwal Mengajar Hari Ini</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {todaySchedules.length} Sesi Tatap Muka Terjadwal
                  </p>
                </div>
              </div>

              <Link
                to="/guru/jadwal"
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="py-3">
              {loadingSchedules ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
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
                  icon={<CalendarDays className="w-5 h-5 text-slate-400" />}
                  title="Tidak Ada Jadwal Mengajar Hari Ini"
                  description="Tidak ada roster tatap muka terjadwal untuk hari ini."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/guru/jadwal')}
                      leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
                    >
                      Buka Roster Lengkap
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
                  {todaySchedules.map((item, idx) => {
                    const sessionStatus = getScheduleSessionStatus(item.start_time, item.end_time);
                    const classLabel = item.class_group_name || item.class_name || 'Rombel';
                    const roomLabel = item.room_name || item.location_name;

                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-lg border transition-all ${
                          sessionStatus.status === 'info'
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
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
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                              Kelas <span className="font-semibold text-slate-800 dark:text-slate-200">{classLabel}</span>
                              {roomLabel && ` • Ruang ${roomLabel}`}
                            </p>
                          </div>

                          <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 shrink-0 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {formatShortTime(item.start_time)} - {formatShortTime(item.end_time)}
                          </span>
                        </div>

                        {/* Action shortcuts per session */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/guru/absensi-kelas?class_group_id=${item.class_group_id || ''}&schedule_id=${item.id || ''}`)}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                            className="text-xs min-h-[36px] py-1"
                          >
                            Absensi Siswa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/guru/jurnal-mengajar?schedule_id=${item.id || ''}`)}
                            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                            className="text-xs min-h-[36px] py-1 text-slate-600 dark:text-slate-300"
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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/guru/jurnal-mengajar"
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center justify-between min-h-[44px]"
            >
              <span>Buka Rekap Jurnal Mengajar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 3. Pintasan Fitur Utama (Quick Shortcuts Grid) */}
      <Card>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pintasan Fitur Guru</h2>
          </div>
          <Link
            to="/guru/lainnya"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            <span>Semua Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((qa, idx) => {
            const Icon = qa.icon;
            return (
              <Link
                key={idx}
                to={qa.to}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800 transition-all flex flex-col items-center text-center group min-h-[90px] justify-center focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 border ${qa.color} group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate w-full">
                  {qa.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate w-full mt-0.5">
                  {qa.subtitle}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* 4. Pengumuman Internal Guru */}
      <Card>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pengumuman & Berita Guru</h2>
          </div>
          <Link
            to="/guru/pengumuman"
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
          >
            <span>Semua Pengumuman</span>
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
              icon={<BellRing className="w-5 h-5 text-slate-400" />}
              title="Belum Ada Pengumuman Guru"
              description="Pengumuman resmi dari yayasan atau pimpinan sekolah akan tampil di sini."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {announcements.map((news) => (
                <Link
                  key={news.id}
                  to={`/guru/pengumuman?id=${news.id}`}
                  className="py-3 px-1 block hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors min-h-[44px]"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <StatusBadge status="info" size="sm">
                      Pengumuman Internal
                    </StatusBadge>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {news.published_at ? formatIndonesianDate(news.published_at, false) : '-'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {news.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
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
