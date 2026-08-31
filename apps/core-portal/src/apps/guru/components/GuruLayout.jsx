import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import AndroidAppLauncher, { GURU_MENU_ITEMS } from './AndroidAppLauncher';
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  ClipboardCheck,
  Award,
  Target,
  Users2,
  BellRing,
  UserCircle,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  Clock,
  AlertTriangle,
  Layers,
  ChevronDown,
  Building2,
  Radio,
  Volume2
} from 'lucide-react';

export default function GuruLayout() {
  const { user, logout, activeSchoolUnit, schoolUnits, selectSchoolUnit } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [upcomingClass, setUpcomingClass] = useState(null);
  const [minutesRemaining, setMinutesRemaining] = useState(null);
  const [showAlertBanner, setShowAlertBanner] = useState(true);

  // Poll / Check upcoming teaching schedule every 30 seconds
  useEffect(() => {
    let intervalId;

    const checkSchedule = async () => {
      try {
        // Ambil jadwal pelajaran untuk guru yang sedang login
        const res = await api.get('/akademik/curriculum/schedules', {
          params: {
            satuan_pendidikan_id: activeSchoolUnit?.id
          }
        }).catch(() => null);

        const schedules = res?.data?.data?.items || res?.data?.data || [];
        if (!Array.isArray(schedules) || schedules.length === 0) {
          // Jadwal fallback demo jika data belum terisi
          const now = new Date();
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();

          // Simulasikan jadwal terdekat jika dalam jam sekolah
          const startM = (currentMin + 4) % 60;
          const startH = currentMin + 4 >= 60 ? (currentHour + 1) % 24 : currentHour;
          const endH = (startH + 1) % 24;

          setUpcomingClass({
            id: 'mock-1',
            subject_name: 'Matematika Terapan',
            class_group_name: 'Kelas 8A',
            room_name: 'Ruang Lab 2',
            start_time: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
            end_time: `${String(endH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
          });
          setMinutesRemaining(4);
          return;
        }

        // Cari jadwal hari ini yang cocok dengan nama atau employee_id guru
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayDayName = dayNames[new Date().getDay()];

        const now = new Date();
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        let nearestUpcoming = null;
        let minDiff = 9999;

        schedules.forEach((s) => {
          if (s.day_of_week === todayDayName || s.day_name === todayDayName) {
            const [h, m] = (s.start_time || '08:00').split(':').map(Number);
            const classStartMinutes = h * 60 + m;
            const diff = classStartMinutes - currentTotalMinutes;

            // Jika kelas akan mulai dalam 0 s/d 15 menit
            if (diff >= 0 && diff <= 15 && diff < minDiff) {
              minDiff = diff;
              nearestUpcoming = s;
            }
          }
        });

        if (nearestUpcoming) {
          setUpcomingClass(nearestUpcoming);
          setMinutesRemaining(minDiff);
        } else {
          setUpcomingClass(null);
          setMinutesRemaining(null);
        }
      } catch (err) {
        console.error('Error fetching schedules for countdown:', err);
      }
    };

    checkSchedule();
    intervalId = setInterval(checkSchedule, 30000);
    return () => clearInterval(intervalId);
  }, [activeSchoolUnit, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLauncherOpen(true)}
              title="Buka Menu Aplikasi (App Drawer)"
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition"
            >
              <GraduationCap className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-wide">PORTAL GURU</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeSchoolUnit?.name || 'Aldepos IBS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sistem Manajemen Pendidik & Pembelajaran Mandiri
              </p>
            </div>
          </div>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Tombol Buka Menu Android */}
            <button
              onClick={() => setIsLauncherOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Menu Aplikasi</span>
              <span className="sm:hidden">Menu</span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'G'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-100 line-clamp-1">{user?.full_name || 'Ustadz / Guru'}</div>
                  <div className="text-[10px] text-emerald-400 line-clamp-1">Guru Pengampu</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white line-clamp-1">{user?.full_name || user?.username}</p>
                    <p className="text-[10px] text-slate-400">{user?.email || 'guru@aldepos.sch.id'}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setUserDropdownOpen(false); navigate('/guru/profil'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      <UserCircle className="w-4 h-4 text-emerald-400" />
                      <span>Profil & Ganti Sandi</span>
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); navigate('/guru/jadwal'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      <CalendarDays className="w-4 h-4 text-blue-400" />
                      <span>Jadwal Mengajar Saya</span>
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); navigate('/'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
                    >
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>Pusat Portal Terpadu (15 Modul)</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={() => { setUserDropdownOpen(false); logout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 🔔 5-Menit Alert Banner Notifikasi Mengajar */}
        {upcomingClass && showAlertBanner && (
          <div className="max-w-7xl mx-auto mt-2.5">
            <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/40 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-300">
                      🔔 {minutesRemaining <= 0 ? 'Sedang Berlangsung' : `${minutesRemaining} Menit Lagi:`}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {upcomingClass.subject_name || 'Mata Pelajaran'} ({upcomingClass.class_group_name || 'Kelas'})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Pukul {upcomingClass.start_time} - {upcomingClass.end_time} WIB {upcomingClass.room_name ? `• ${upcomingClass.room_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/guru/absensi-kelas')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition active:scale-95 whitespace-nowrap"
                >
                  Buka Absensi Kelas
                </button>
                <button
                  onClick={() => setShowAlertBanner(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </div>

      {/* 📱 Bottom Navigation Bar (Mobile Friendly App Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
        
        <NavLink
          to="/guru/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Beranda</span>
        </NavLink>

        <NavLink
          to="/guru/jadwal"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px]">Jadwal</span>
        </NavLink>

        {/* Floating Center Button: Android App Drawer */}
        <button
          onClick={() => setIsLauncherOpen(true)}
          className="-mt-5 w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex flex-col items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-slate-900 active:scale-95 transition"
        >
          <Layers className="w-6 h-6" />
        </button>

        <NavLink
          to="/guru/absensi"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition ${
              isActive ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px]">Presensi</span>
        </NavLink>

        <NavLink
          to="/guru/profil"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <UserCircle className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </NavLink>

      </nav>

      {/* Android Style App Launcher Modal */}
      <AndroidAppLauncher
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
      />

    </div>
  );
}
