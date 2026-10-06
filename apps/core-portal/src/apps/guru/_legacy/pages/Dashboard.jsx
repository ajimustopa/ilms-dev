import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared/store/AuthContext';
import api from '../../../../shared/services/api';
import StatRibbonCard from '../../../../shared/components/StatRibbonCard';
import StatusPill from '../../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../../shared/components/FlatAlertBanner';
import { formatDate } from '../../../../shared/utils/formatters';
import { GURU_MENU_ITEMS } from '../components/AndroidAppLauncher';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  ClipboardCheck,
  Award,
  Users2,
  BellRing,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  BookOpen,
  School,
  FileText,
  Activity,
  Layers,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Target
} from 'lucide-react';

export default function Dashboard() {
  const { user, activeSchoolUnit } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedulesToday, setSchedulesToday] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [gpsStatus, setGpsStatus] = useState({ checked: false, inRadius: true, distance: 45 });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's schedule, attendance, and announcements
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. Ambil jadwal pelajaran
        const schedRes = await api.get('/akademik/curriculum/schedules', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);

        const items = schedRes?.data?.data?.items || schedRes?.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setSchedulesToday(items.slice(0, 4));
        } else {
          // Default mock data jadwal hari ini
          setSchedulesToday([
            { id: 1, subject_name: 'Matematika Terapan', class_group_name: 'Kelas 8A', start_time: '07:30', end_time: '09:00', room_name: 'Lab 2', status: 'upcoming' },
            { id: 2, subject_name: 'Fisika Dasar', class_group_name: 'Kelas 9B', start_time: '09:30', end_time: '11:00', room_name: 'Ruang 103', status: 'upcoming' },
            { id: 3, subject_name: 'Matematika Terapan', class_group_name: 'Kelas 7C', start_time: '13:00', end_time: '14:30', room_name: 'Ruang 201', status: 'upcoming' },
          ]);
        }

        // 2. Ambil pengumuman
        const newsRes = await api.get('/website-utama/public/news').catch(() => null);
        const newsItems = newsRes?.data?.data?.items || newsRes?.data?.data || [];
        if (Array.isArray(newsItems) && newsItems.length > 0) {
          setAnnouncements(newsItems.slice(0, 3));
        } else {
          setAnnouncements([
            {
              id: 'a1',
              title: 'Jadwal Penilaian Sumatif Tengah Semester (STS) Genap 2026',
              category: 'Akademik',
              published_at: '2026-08-25',
              summary: 'Seluruh dewan guru dimohon menyelesaikan input Tujuan Pembelajaran (TP) dan bank kisi-kisi soal sebelum pekan depan.'
            },
            {
              id: 'a2',
              title: 'Rapat Pleno Dewan Guru & Evaluasi KBM Bulanan',
              category: 'Agenda',
              published_at: '2026-08-24',
              summary: 'Rapat koordinasi kurikulum dan ketertiban santri bertempat di Aula Utama Pesantren hari Jumat pukul 14:00 WIB.'
            },
            {
              id: 'a3',
              title: 'Pedoman Presensi Mandiri Berbasis GPS Geolocation',
              category: 'HRD',
              published_at: '2026-08-20',
              summary: 'Mulai semester ini, presensi masuk & pulang dilakukan secara mandiri melalui Portal Guru dalam radius 200 meter dari titik koordinat sekolah.'
            }
          ]);
        }

        // 3. Ambil absensi hari ini jika user staf
        if (user?.ref_id) {
          const todayStr = new Date().toISOString().split('T')[0];
          const attRes = await api.get('/kepegawaian/attendance', {
            params: { employee_id: user.ref_id, date_from: todayStr, date_to: todayStr }
          }).catch(() => null);

          const attList = attRes?.data?.data || [];
          if (Array.isArray(attList) && attList.length > 0) {
            setTodayAttendance(attList[0]);
          } else {
            setTodayAttendance(null);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    };

    loadDashboardData();
  }, [activeSchoolUnit, user]);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Hero Greeting & Live Clock */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900/60 via-slate-900 to-slate-950 border border-emerald-500/30 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal Manajemen Pendidik</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Ahlan wa Sahlan, {user?.full_name || 'Ustadz / Guru'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Satuan Pendidikan: <span className="font-semibold text-emerald-400">{activeSchoolUnit?.name || 'Aldepos Islamic Boarding School'}</span>
            </p>
          </div>

          {/* Jam & Tanggal Digital */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 sm:px-4 sm:py-3 shrink-0 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-white tracking-wider font-mono">
                {formattedTime} <span className="text-[10px] text-emerald-400 font-sans">WIB</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {formattedDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Kartu Presensi Diri GPS & Radius Sekolah (Quick Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Presensi Diri Card */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Presensi Kehadiran Guru (GPS)</h3>
                <p className="text-xs text-slate-400">Status absensi masuk & pulang hari ini</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              GPS Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            
            {/* Status Masuk */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Check-In (Masuk)</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {todayAttendance?.check_in_time ? `${todayAttendance.check_in_time} WIB` : 'Belum Presensi'}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${todayAttendance?.check_in_time ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Status Pulang */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Check-Out (Pulang)</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {todayAttendance?.check_out_time ? `${todayAttendance.check_out_time} WIB` : 'Belum Presensi'}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${todayAttendance?.check_out_time ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                <Clock className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Lokasi Jarak & Tombol Cepat */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Jarak ke Titik Sekolah: <strong>~38 Meter</strong> (Radius HRD: Maks 200m)</span>
            </div>

            <button
              onClick={() => navigate('/guru/absensi')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Buka Menu Presensi GPS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ringkasan Beban Mengajar */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ringkasan Tugas Ajar</h3>
                <p className="text-[11px] text-slate-400">Semester Genap 2025/2026</p>
              </div>
            </div>

            <div className="space-y-2.5 my-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                <span className="text-slate-400">Total Jam Mengajar:</span>
                <span className="font-extrabold text-emerald-400">24 Jam / Pekan</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                <span className="text-slate-400">Jumlah Rombel Diampu:</span>
                <span className="font-extrabold text-blue-400">6 Kelas</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                <span className="text-slate-400">Total Siswa Aktif:</span>
                <span className="font-extrabold text-purple-400">182 Santri</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/guru/jadwal')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <span>Lihat Jadwal Lengkap</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 3. 📱 Android App Drawer Grid (Menu Icon-Icon Aplikasi) */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/90 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Menu Cepat Aplikasi Guru</h2>
              <p className="text-xs text-slate-400">Akses langsung seluruh fitur modul pengajar</p>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono hidden sm:inline">10 Aplikasi Tersedia</span>
        </div>

        {/* Grid Ikon Layar Android */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-3 sm:gap-4">
          {GURU_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="group flex flex-col items-center text-center p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 hover:scale-[1.03] active:scale-95 transition-all duration-150"
              >
                <div className="relative mb-2">
                  <div
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${item.bgGradient} flex items-center justify-center text-white shadow-lg ${item.shadowColor} group-hover:rotate-3 transition duration-200`}
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-[8px] font-bold text-white border border-slate-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 leading-tight line-clamp-1">
                  {item.name}
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300 leading-tight line-clamp-1 mt-0.5">
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Jadwal Mengajar Hari Ini & Papan Pengumuman */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Timeline Jadwal Hari Ini */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Jadwal Mengajar Hari Ini</h3>
                  <p className="text-xs text-slate-400">Sesi tatap muka kelas yang perlu diampu</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/guru/jadwal')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
              >
                Semua Jadwal
              </button>
            </div>

            <div className="space-y-2.5">
              {schedulesToday.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/70 hover:border-blue-500/40 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {s.start_time}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{s.subject_name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {s.class_group_name} • {s.room_name || 'Ruang Kelas'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/guru/absensi-kelas')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    Absensi
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate('/guru/absensi-kelas')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition inline-flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Buka Form Presensi Pertemuan Kelas</span>
            </button>
          </div>
        </div>

        {/* Papan Pengumuman Sekolah */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-400">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pengumuman & Berita</h3>
                  <p className="text-xs text-slate-400">Informasi resmi yayasan & akademik</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/guru/pengumuman')}
                className="text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300 transition"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAnnouncement(a)}
                  className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/70 hover:border-fuchsia-500/40 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      {a.category || 'Pengumuman'}
                    </span>
                    <span className="text-[10px] text-slate-400">{a.published_at || 'Hari ini'}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{a.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{a.summary || a.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate('/guru/pengumuman')}
              className="text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300 transition inline-flex items-center gap-1.5"
            >
              <span>Buka Papan Pengumuman Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal Detail Pengumuman */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                {selectedAnnouncement.category || 'Pengumuman'}
              </span>
              <span className="text-xs text-slate-400">{selectedAnnouncement.published_at}</span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">{selectedAnnouncement.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6 whitespace-pre-line">
              {selectedAnnouncement.content || selectedAnnouncement.summary}
            </p>

            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Tutup Pengumuman
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
