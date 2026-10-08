import React from 'react';
import { Calendar, School, Sparkles } from 'lucide-react';
import LatticePattern from '../../../shared/components/brand/LatticePattern';
import { getRoleLabel } from '../roleLabels';
import { useAcademicPeriod } from '../useAcademicPeriod';

/**
 * LauncherGreeting — Area Sapaan Pengguna Institusional
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 4:
 * - "Selamat datang, <nama lengkap atau username>"
 * - Chip role resmi (getRoleLabel)
 * - Baris Tahun Ajaran & Semester HANYA dirender jika `useAcademicPeriod` mengembalikan data nyata
 * - Latar tone-on-tone emerald-50 dengan LatticePattern sangat samar (tanpa animasi)
 */
export default function LauncherGreeting({
  user,
  activeSchoolUnit,
  className = ''
}) {
  const userName = user?.full_name || user?.name || user?.username || 'Pengguna';
  const roleLabel = getRoleLabel(user);
  const { academicYear, semester, hasPeriodData } = useAcademicPeriod(activeSchoolUnit);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-emerald-50/70 dark:bg-slate-900/90 border border-emerald-200/60 dark:border-slate-800 shadow-2xs p-5 sm:p-7 ${className}`}
    >
      {/* Ornamen Geometris Hairline Islami (LatticePattern - Tanpa Animasi) */}
      <LatticePattern
        opacity={0.04}
        animated={false}
        patternSize={64}
        color="currentColor"
        className="text-emerald-900 dark:text-emerald-400"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Greeting, Role Chip & Academic Period */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Selamat datang, {userName}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 tracking-wide">
              {roleLabel}
            </span>
          </div>

          {/* Baris Tahun Ajaran & Semester (HANYA bila ada data nyata) */}
          {hasPeriodData && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 pt-0.5 font-medium">
              <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Tahun Ajaran {academicYear}
                {semester ? ` · Semester ${semester}` : ''}
              </span>
            </p>
          )}
        </div>

        {/* Right Side: Status Tag Terintegrasi Penuh (Desktop) */}
        <div className="hidden sm:flex items-center gap-2.5 bg-white/80 dark:bg-slate-850/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-emerald-200/40 dark:border-slate-700/60 shadow-2xs self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
              Sistem Terintegrasi
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">
              Semua modul beroperasi normal
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
