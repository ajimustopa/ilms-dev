import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherContext } from '../context/TeacherContext';
import { getScheduleClassGroupDisplay, getScheduleRoomDisplay } from '../utils/scheduleHelper';
import {
  Clock,
  UserCheck,
  BookOpen,
  MapPin,
  GraduationCap,
  ChevronRight
} from 'lucide-react';

/**
 * NextSessionBanner Component - Banner Sesi Mengajar Terdekat / Sedang Berlangsung
 * Ramping, konsisten, dan seragam tampil di bagian paling atas seluruh halaman Portal Guru
 * saat ada sesi KBM yang sedang berlangsung atau dalam rentang 30 menit ke depan.
 */
export function NextSessionBanner() {
  const navigate = useNavigate();
  const { nextTeachingSession } = useTeacherContext();

  if (!nextTeachingSession || !nextTeachingSession.hasActiveSession) {
    return null;
  }

  const {
    status,
    minutesDiff,
    subjectName,
    className,
    room,
    startTime,
    endTime,
    session
  } = nextTeachingSession;

  const isOngoing = status === 'ongoing';

  // Format display nama rombel reguler & ruang
  const displayClassName = (() => {
    if (className && className !== '-' && className !== 'Kelas') {
      return className;
    }
    if (session) {
      const helperName = getScheduleClassGroupDisplay(session);
      if (helperName && helperName !== '-' && helperName !== 'Kelas') {
        return helperName;
      }
    }
    return 'Rombel Reguler';
  })();

  const displayRoom = (() => {
    if (room && room !== '-' && room !== 'Ruang Kelas') {
      return room.toLowerCase().startsWith('ruang') ? room : `Ruang ${room}`;
    }
    if (session) {
      return getScheduleRoomDisplay(session);
    }
    return '';
  })();

  const scheduleId = session?.id || '';
  const classGroupId = session?.class_group_id || '';

  const handleOpenAttendance = (e) => {
    e.stopPropagation();
    navigate(`/guru/absensi-kelas?schedule_id=${scheduleId}&class_group_id=${classGroupId}`);
  };

  const handleOpenJournal = (e) => {
    e.stopPropagation();
    navigate(`/guru/jurnal-mengajar?schedule_id=${scheduleId}`);
  };

  return (
    <div
      role="region"
      aria-label="Informasi Sesi Mengajar Terkini"
      className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white border-b border-emerald-800/80 shadow-xs px-3 sm:px-5 lg:px-8 py-1.5 sm:py-2 transition-all select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        {/* Info Sesi (Status, Mapel, Rombel, Waktu & Ruang) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          {/* Status Badge Live / Upcoming */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide border shrink-0 ${
              isOngoing
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-2xs'
                : 'bg-amber-950/90 text-amber-200 border-amber-500/50 shadow-2xs'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOngoing ? 'bg-rose-400 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isOngoing ? 'SEDANG BERLANGSUNG' : 'SESI BERIKUTNYA'}</span>
          </span>

          {/* Informasi Waktu & Countdown Jam (Tampil di Mobile & Desktop) */}
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-black/40 text-emerald-200 border border-white/10 shrink-0">
            <Clock className="w-3 h-3 text-emerald-400" />
            {startTime && (
              <span>
                {startTime}{endTime ? `-${endTime}` : ''}
              </span>
            )}
            <span className="text-emerald-300 font-semibold">
              • {isOngoing ? `Sisa ${minutesDiff}m` : `Dalam ${minutesDiff}m`}
            </span>
          </span>

          {/* Nama Mata Pelajaran */}
          <span className="font-extrabold text-white text-xs sm:text-sm truncate">
            {subjectName}
          </span>

          {/* Badge Nama Rombel Reguler */}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-800/90 text-emerald-100 text-[10px] sm:text-[11px] font-bold border border-emerald-600/50 shrink-0 shadow-2xs">
            <GraduationCap className="w-3 h-3 text-emerald-300" />
            <span>{displayClassName}</span>
          </span>

          {/* Lokasi Ruangan */}
          {displayRoom && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-200/90 shrink-0">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{displayRoom}</span>
            </span>
          )}
        </div>

        {/* Action Buttons (Presensi & Jurnal) */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleOpenAttendance}
            className="h-7 sm:h-8 px-2.5 sm:px-3 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-950 font-extrabold text-[11px] sm:text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Presensi Kelas</span>
            <ChevronRight className="w-3 h-3 text-emerald-700 hidden sm:inline" />
          </button>

          <button
            type="button"
            onClick={handleOpenJournal}
            className="h-7 sm:h-8 px-2.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-emerald-100 border border-white/20 text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Isi Jurnal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NextSessionBanner;
