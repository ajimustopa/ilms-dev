import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { attendanceService } from '../services/attendanceService';
import { formatShortTime } from '../utils/dateHelper';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  MapPin
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'aldepos_dismissed_reminder_state';

/**
 * AttendanceReminderBanner Component - Design System Portal Guru
 * Banner pengingat presensi otomatis berdasarkan shift kerja nyata.
 */
export const AttendanceReminderBanner = ({ onVisibilityChange = null }) => {
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

  const fetchStatus = useCallback(async () => {
    try {
      const res = await attendanceService.getTodayStatus();
      const data = res?.data || res || null;
      setTodayData(data);
    } catch {
      setTodayData(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [location.pathname, fetchStatus]);

  // Evaluasi visibilitas
  const isVisible = (() => {
    if (!todayData || !todayData.work_schedule) return false;
    if (location.pathname === '/guru/absensi' || location.pathname === '/guru/presensi') return false;

    const { attendance, work_schedule, date: todayDate } = todayData;
    const hasCheckedIn = Boolean(attendance?.check_in_time);
    const hasCheckedOut = Boolean(attendance?.check_out_time);

    if (hasCheckedIn && hasCheckedOut) return false;

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = String(timeStr).split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(work_schedule.start_time);
    const endMinutes = parseTimeToMinutes(work_schedule.end_time);

    let type = null;
    if (!hasCheckedIn) {
      if (currentMinutes >= startMinutes - 60 && currentMinutes < endMinutes) {
        type = 'checkin';
      }
    } else if (hasCheckedIn && !hasCheckedOut) {
      if (currentMinutes >= endMinutes) {
        type = 'checkout';
      }
    }

    if (!type) return false;

    const currentKey = `${todayDate || 'today'}_${type}`;
    if (dismissedKey === currentKey) return false;

    return true;
  })();

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  if (!isVisible || !todayData || !todayData.work_schedule) {
    return null;
  }

  const { attendance, work_schedule, date: todayDate } = todayData;
  const hasCheckedIn = Boolean(attendance?.check_in_time);
  const hasCheckedOut = Boolean(attendance?.check_out_time);

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

  let reminderType = 'checkin_normal';
  let reminderTitle = 'Pengingat Presensi Masuk';
  let reminderMessage = `Jam kerja shift dimulai pukul ${formatShortTime(work_schedule.start_time)} WIB (${work_schedule.shift_name || 'Shift Pagi'}).`;
  let bannerVariant = 'amber';

  if (!hasCheckedIn) {
    if (currentMinutes > lateCutoffMinutes) {
      reminderType = 'checkin_late';
      bannerVariant = 'rose';
      reminderTitle = 'Peringatan Terlambat';
      reminderMessage = `Jam shift (${formatShortTime(work_schedule.start_time)} WIB) & toleransi terlewati. Segera lakukan presensi.`;
    }
  } else if (hasCheckedIn && !hasCheckedOut) {
    reminderType = 'checkout';
    bannerVariant = 'indigo';
    reminderTitle = 'Pengingat Presensi Pulang';
    reminderMessage = `Jam kerja berakhir pukul ${formatShortTime(work_schedule.end_time)} WIB. Jangan lupa lakukan presensi pulang.`;
  }

  const currentKey = `${todayDate || 'today'}_${reminderType}`;

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
      wrapper: 'bg-amber-50 border-b border-amber-200 text-amber-900',
      iconBox: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <Clock className="w-4 h-4 text-amber-800" />,
      cta: 'text-amber-900 font-bold'
    },
    rose: {
      wrapper: 'bg-rose-50 border-b border-rose-200 text-rose-900',
      iconBox: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: <AlertTriangle className="w-4 h-4 text-rose-800" />,
      cta: 'text-rose-900 font-bold'
    },
    indigo: {
      wrapper: 'bg-indigo-50 border-b border-indigo-200 text-indigo-900',
      iconBox: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: <MapPin className="w-4 h-4 text-indigo-800" />,
      cta: 'text-indigo-900 font-bold'
    }
  };

  const currentStyle = styles[bannerVariant] || styles.amber;

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={handleOpenAttendance}
      className={`w-full px-4 sm:px-6 lg:px-8 py-2.5 transition-all shadow-2xs select-none cursor-pointer ${currentStyle.wrapper}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${currentStyle.iconBox}`}>
            {currentStyle.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {reminderTitle}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-white/80 border border-current/20">
                Shift: {formatShortTime(work_schedule.start_time)} - {formatShortTime(work_schedule.end_time)}
              </span>
            </div>
            <p className="text-xs mt-0.5 leading-snug line-clamp-1">
              {reminderMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline-flex text-xs items-center gap-1 ${currentStyle.cta}`}>
            <span>Buka Presensi</span>
            <ChevronRight className="w-4 h-4" />
          </span>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup pengingat"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition text-current focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReminderBanner;
