import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeacherContext } from '../context/TeacherContext';
import {
  Clock,
  CalendarCheck,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

/**
 * NextSessionBanner Component - Banner Sesi Mengajar Terdekat
 * Tampil tepat jika ada sesi mengajar dalam rentang 30 menit ke depan atau sedang berlangsung.
 * Sesuai PRD F3 dan instruksi Keputusan 1.
 */
export function NextSessionBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { nextTeachingSession } = useTeacherContext();

  // Jika sedang di halaman presensi kelas atau jadwal, atau tidak ada sesi aktif, sembunyikan
  if (
    !nextTeachingSession ||
    !nextTeachingSession.hasActiveSession ||
    location.pathname === '/guru/absensi-kelas' ||
    location.pathname === '/guru/presensi-siswa'
  ) {
    return null;
  }

  const { status, minutesDiff, subjectName, className, room, startTime } = nextTeachingSession;
  const isOngoing = status === 'ongoing';

  const handleOpenAttendance = () => {
    navigate('/guru/absensi-kelas');
  };

  return (
    <div
      role="region"
      aria-label="Pengingat Sesi Mengajar"
      className="w-full bg-emerald-800 text-white border-b border-emerald-900 shadow-xs px-4 sm:px-6 lg:px-8 py-2.5 transition-all animate-in slide-in-from-top-2 duration-200 select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Info Sesi */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-center shrink-0">
            {isOngoing ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
            ) : (
              <Clock className="w-4 h-4 text-emerald-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                {isOngoing
                  ? `Sesi Sedang Berlangsung • Berakhir dlm ${minutesDiff} mnt`
                  : `Sesi Berikutnya • ${minutesDiff} Menit Lagi`}
              </span>
              {startTime && !isOngoing && (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-950/50 text-emerald-200 border border-emerald-400/30">
                  Mulai {startTime} WIB
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate mt-0.5 leading-snug">
              {subjectName} ({className}) {room ? `• Ruang ${room}` : ''}
            </p>
          </div>
        </div>

        {/* CTA Button: Buka Presensi Kelas */}
        <div className="flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={handleOpenAttendance}
            className="min-h-[36px] px-3.5 bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-700" />
            <span>Buka Presensi Kelas</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NextSessionBanner;
