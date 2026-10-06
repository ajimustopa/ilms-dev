import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { announcementService } from '../services/announcementService';
import { formatIndonesianDate, getGreetingByTime, getIndonesianDayName } from '../utils/dateHelper';
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
  HeartHandshake,
  ArrowRight,
  Loader2,
  ChevronRight,
  GraduationCap,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, roleTitle, activeSchoolUnit, teacherRoles } = useTeacherAuth();
  const { isHomeroom, isCounselor } = teacherRoles;

  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceError, setAttendanceError] = useState(null);

  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [todaySchedules, setTodaySchedules] = useState([]);

  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  const todayDateStr = formatIndonesianDate(new Date(), true);
  const currentDayName = getIndonesianDayName(new Date()).toLowerCase();

  useEffect(() => {
    loadDashboardData();
  }, [activeSchoolUnit?.id]);

  const loadDashboardData = async () => {
    // 1. Presensi Hari Ini
    setLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const res = await attendanceService.getTodayStatus();
      setTodayAttendance(res?.attendance || null);
    } catch (err) {
      setAttendanceError(err.message);
    } finally {
      setLoadingAttendance(false);
    }

    // 2. Jadwal Mengajar Hari Ini
    setLoadingSchedules(true);
    try {
      const schedules = await scheduleService.getMySchedules();
      if (Array.isArray(schedules)) {
        // Filter jadwal hari ini
        const filtered = schedules.filter(
          (s) => String(s.day_of_week).toLowerCase() === currentDayName
        );
        setTodaySchedules(filtered);
      }
    } catch (err) {
      // Biarkan empty state bersih
      setTodaySchedules([]);
    } finally {
      setLoadingSchedules(false);
    }

    // 3. Pengumuman Internal Guru
    setLoadingAnnouncements(true);
    try {
      const newsRes = await announcementService.getTeacherAnnouncements({ limit: 3 });
      const items = Array.isArray(newsRes) ? newsRes : newsRes?.items || [];
      setAnnouncements(items);
    } catch (err) {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const displayName = user?.full_name || user?.name || user?.username || 'Ustadz / Ustadzah';
  const hasCheckedIn = Boolean(todayAttendance?.check_in_time);
  const hasCheckedOut = Boolean(todayAttendance?.check_out_time);

  // Pintasan Fitur Cepat
  const quickActions = [
    {
      title: 'Presensi Guru',
      subtitle: 'Check-in / Check-out',
      icon: MapPin,
      to: '/guru/absensi',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Jadwal & KBM',
      subtitle: 'Roster mengajar',
      icon: CalendarDays,
      to: '/guru/jadwal',
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Presensi Santri',
      subtitle: 'Kehadiran rombel',
      icon: UserCheck,
      to: '/guru/presensi-siswa',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Jurnal Harian',
      subtitle: 'Materi ajar KBM',
      icon: Layers,
      to: '/guru/jurnal-mengajar',
      color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      title: 'Penilaian Siswa',
      subtitle: 'Sesi & capaian TP',
      icon: Award,
      to: '/guru/nilai',
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      title: 'Kejadian Santri',
      subtitle: 'Pelanggaran & poin',
      icon: ShieldAlert,
      to: '/guru/kejadian-siswa',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Banner Sambutan */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                {roleTitle}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {todayDateStr}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {getGreetingByTime()}, {displayName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Selamat bertugas di <span className="font-semibold text-slate-800">{activeSchoolUnit?.name || 'Yayasan Aldepos'}</span>
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/guru/absensi"
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
                hasCheckedIn
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{hasCheckedIn ? `Masuk: ${todayAttendance.check_in_time.slice(0, 5)}` : 'Belum Presensi'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Grid Utama: Presensi Hari Ini & Jadwal Mengajar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kartu Presensi Hari Ini */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Presensi Hari Ini</h2>
              </div>
              <Link
                to="/guru/absensi"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingAttendance ? (
              <div className="py-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Memeriksa status presensi...</p>
              </div>
            ) : attendanceError ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Status Presensi</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{attendanceError}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Check-In</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {todayAttendance?.check_in_time ? todayAttendance.check_in_time.slice(0, 5) : '--:--'}
                  </span>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                    hasCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {hasCheckedIn ? 'Tercatat' : 'Belum'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Check-Out</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {todayAttendance?.check_out_time ? todayAttendance.check_out_time.slice(0, 5) : '--:--'}
                  </span>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                    hasCheckedOut ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {hasCheckedOut ? 'Tercatat' : 'Belum'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <Link
              to="/guru/absensi"
              className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Pengajuan Izin / Cuti</span>
            </Link>
            <Link
              to="/guru/absensi"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Buka Presensi
            </Link>
          </div>
        </div>

        {/* Kartu Jadwal Mengajar Hari Ini */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Jadwal Mengajar Hari Ini</h2>
              </div>
              <Link
                to="/guru/jadwal"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingSchedules ? (
              <div className="py-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Memuat jadwal mengajar...</p>
              </div>
            ) : todaySchedules.length === 0 ? (
              <div className="py-5 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-center my-2">
                <CalendarDays className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">Tidak ada jadwal KBM hari ini</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Nikmati waktu persiapan atau kegiatan non-tatap muka.</p>
              </div>
            ) : (
              <div className="space-y-2 my-2 max-h-40 overflow-y-auto pr-1">
                {todaySchedules.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {item.subject_name || item.subject_code || 'Mata Pelajaran'}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Kelas {item.class_name || item.class_group_name || '-'} • Ruang {item.room_name || '-'}
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              to="/guru/jurnal-mengajar"
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center justify-between"
            >
              <span>Isi Jurnal Mengajar Harian</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Pintasan Fitur Cepat (Quick Access Grid) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Pintasan Fitur Guru</h2>
          <Link
            to="/guru/lainnya"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Semua Fitur</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {quickActions.map((qa, idx) => {
            const Icon = qa.icon;
            return (
              <Link
                key={idx}
                to={qa.to}
                className="p-3 rounded-lg border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col items-center text-center group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 border ${qa.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 block truncate w-full group-hover:text-emerald-800">
                  {qa.title}
                </span>
                <span className="text-[10px] text-slate-500 block truncate w-full mt-0.5">
                  {qa.subtitle}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Pengumuman Internal Guru */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <BellRing className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Pengumuman & Berita Guru</h2>
          </div>
          <Link
            to="/guru/pengumuman"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingAnnouncements ? (
          <div className="py-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Memuat pengumuman guru...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-5 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-center">
            <BellRing className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-700">Belum ada pengumuman terbaru</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Pengumuman resmi dari yayasan atau pimpinan sekolah akan tampil di sini.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {announcements.map((news, idx) => (
              <Link
                key={idx}
                to={`/guru/pengumuman?id=${news.id}`}
                className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/70 transition block"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                    Pengumuman Guru
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {news.published_at ? formatIndonesianDate(news.published_at, false) : '-'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                  {news.title}
                </h3>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                  {news.summary || news.excerpt || (news.content ? news.content.replace(/<[^>]*>?/gm, '').slice(0, 120) : '-')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
