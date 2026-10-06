import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { attendanceService } from '../services/attendanceService';
import { formatShortTime } from '../utils/dateHelper';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  MapPin,
  CheckCircle2
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'aldepos_dismissed_reminder_state';

/**
 * AttendanceReminderBanner Component - Design System Portal Guru
 * Banner pengingat presensi otomatis di bagian atas shell Portal Guru berdasarkan jam shift kerja nyata.
 * Hilang otomatis saat sudah presensi, tidak mengganggu, dan dapat ditutup sementara untuk sesi aktif.
 */
export const AttendanceReminderBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [todayData, setTodayData] = useState(null);
  const [dismissedKey, setDismissedKey] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Fetch status presensi hari ini
  const fetchStatus = useCallback(async () => {
    try {
      const res = await attendanceService.getTodayStatus();
      const data = res?.data || res || null;
      setTodayData(data);
    } catch {
      // Jika API gagal, jangan tampilkan banner palsu (Anti-Mock)
      setTodayData(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Refresh status setiap 60 detik untuk memperbarui transisi waktu shift
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Refresh status juga saat berpindah rute (misal baru kembali dari halaman absensi)
  useEffect(() => {
    fetchStatus();
  }, [location.pathname, fetchStatus]);

  // Jika tidak ada data atau tidak ada jadwal shift kerja, jangan tampilkan apa-apa
  if (!todayData || !todayData.work_schedule) {
    return null;
  }

  // Jika user sedang berada di halaman absensi (/guru/absensi), sembunyikan banner agar tidak redundan
  if (location.pathname === '/guru/absensi') {
    return null;
  }

  const { attendance, work_schedule, date: todayDate } = todayData;
  const hasCheckedIn = Boolean(attendance?.check_in_time);
  const hasCheckedOut = Boolean(attendance?.check_out_time);

  // Jika sudah presensi masuk dan pulang, banner selesai (hilang otomatis)
  if (hasCheckedIn && hasCheckedOut) {
    return null;
  }

  // Helper konversi "HH:mm:ss" atau "HH:mm" ke menit harian (0 - 1439)
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = String(timeStr).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const startMinutes = parseTimeToMinutes(work_schedule.start_time);
  const endMinutes = parseTimeToMinutes(work_schedule.end_time);
  const lateTolerance = Number(work_schedule.late_tolerance_minutes || 0);
  const lateCutoffMinutes = startMinutes + lateTolerance;

  let reminderType = null; // 'checkin_normal' | 'checkin_late' | 'checkout'
  let reminderTitle = '';
  let reminderMessage = '';
  let bannerVariant = 'amber'; // 'amber' | 'rose' | 'indigo'

  // 1. Evaluasi Pengingat Presensi Masuk (Pagi / Jam Mulai Shift)
  if (!hasCheckedIn) {
    // Pengingat aktif sejak 60 menit sebelum shift mulai hingga jam pulang
    if (currentMinutes >= startMinutes - 60 && currentMinutes < endMinutes) {
      if (currentMinutes > lateCutoffMinutes) {
        reminderType = 'checkin_late';
        bannerVariant = 'rose';
        reminderTitle = 'Peringatan Terlambat';
        reminderMessage = `Jam shift (${formatShortTime(work_schedule.start_time)} WIB) & toleransi telah terlewati. Segera lakukan presensi masuk.`;
      } else {
        reminderType = 'checkin_normal';
        bannerVariant = 'amber';
        reminderTitle = 'Pengingat Presensi Masuk';
        reminderMessage = `Jam kerja dimulai pukul ${formatShortTime(work_schedule.start_time)} WIB (${work_schedule.shift_name || 'Shift Pagi'}). Ketuk untuk absen masuk.`;
      }
    }
  }
  // 2. Evaluasi Pengingat Presensi Pulang (Sore / Jam Selesai Shift)
  else if (hasCheckedIn && !hasCheckedOut) {
    // Pengingat aktif mulai jam shift selesai hingga tengah malam
    if (currentMinutes >= endMinutes) {
      reminderType = 'checkout';
      bannerVariant = 'indigo';
      reminderTitle = 'Pengingat Presensi Pulang';
      reminderMessage = `Jam kerja shift berakhir pukul ${formatShortTime(work_schedule.end_time)} WIB. Jangan lupa lakukan presensi pulang (check-out).`;
    }
  }

  // Jika kondisi waktu tidak memicu pengingat, jangan tampilkan
  if (!reminderType) {
    return null;
  }

  // Cek apakah user telah menutup pengingat untuk sesi ini
  const currentKey = `${todayDate || 'today'}_${reminderType}`;
  if (dismissedKey === currentKey) {
    return null;
  }

  const handleDismiss = (e) => {
    e.stopPropagation();
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, currentKey);
    } catch {
      // ignore
    }
    setDismissedKey(currentKey);
  };

  const handleOpenAttendance = () => {
    navigate('/guru/absensi');
  };

  const styles = {
    amber: {
      wrapper: 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100',
      iconBox: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      icon: <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" />,
      cta: 'text-amber-800 dark:text-amber-200 hover:text-amber-950'
    },
    rose: {
      wrapper: 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100',
      iconBox: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
      icon: <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-300" />,
      cta: 'text-rose-800 dark:text-rose-200 hover:text-rose-950'
    },
    indigo: {
      wrapper: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100',
      iconBox: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
      icon: <MapPin className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />,
      cta: 'text-indigo-800 dark:text-indigo-200 hover:text-indigo-950'
    }
  };

  const currentStyle = styles[bannerVariant] || styles.amber;

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={handleOpenAttendance}
      className={`w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 transition-all animate-in slide-in-from-top-2 duration-200 cursor-pointer select-none`}
    >
      <div
        className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border shadow-xs transition hover:opacity-95 active:scale-[0.99] ${currentStyle.wrapper}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${currentStyle.iconBox}`}>
            {currentStyle.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                {reminderTitle}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/70 dark:bg-slate-900/60 border border-current/20">
                Shift: {formatShortTime(work_schedule.start_time)} - {formatShortTime(work_schedule.end_time)}
              </span>
            </div>
            <p className="text-xs mt-0.5 leading-snug line-clamp-2">
              {reminderMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`hidden sm:inline-flex text-xs font-semibold items-center gap-1 ${currentStyle.cta}`}>
            <span>Buka Presensi</span>
            <ChevronRight className="w-4 h-4" />
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup pengingat untuk sesi ini"
            className="w-8 h-8 min-w-[32px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition text-current/80 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReminderBanner;
