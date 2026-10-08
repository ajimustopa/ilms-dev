import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Briefcase,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const STATUS_CONFIGS = {
  // 1. Hadir / Tepat Waktu
  present: {
    label: 'Hadir',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  hadir: {
    label: 'Hadir',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  on_time: {
    label: 'Tepat Waktu',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  hadir_tepat_waktu: {
    label: 'Tepat Waktu',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },

  // 2. Terlambat
  late: {
    label: 'Terlambat',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  terlambat: {
    label: 'Terlambat',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200'
  },

  // 3. Izin
  permitted: {
    label: 'Izin',
    icon: Calendar,
    className: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  izin: {
    label: 'Izin',
    icon: Calendar,
    className: 'bg-sky-50 text-sky-700 border-sky-200'
  },

  // 4. Sakit
  sick: {
    label: 'Sakit',
    icon: AlertCircle,
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  sakit: {
    label: 'Sakit',
    icon: AlertCircle,
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },

  // 5. Cuti
  leave: {
    label: 'Cuti',
    icon: Calendar,
    className: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  cuti: {
    label: 'Cuti',
    icon: Calendar,
    className: 'bg-teal-50 text-teal-700 border-teal-200'
  },

  // 6. Dinas Luar / Tugas
  duty_travel: {
    label: 'Dinas Luar',
    icon: Briefcase,
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  dinas_luar: {
    label: 'Dinas Luar',
    icon: Briefcase,
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },

  // 7. Alpa / Tanpa Keterangan
  absent: {
    label: 'Alpa',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  alpa: {
    label: 'Alpa',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200'
  },

  // 8. Libur / Off
  holiday: {
    label: 'Libur',
    icon: Calendar,
    className: 'bg-slate-100 text-slate-600 border-slate-200'
  },
  libur: {
    label: 'Libur',
    icon: Calendar,
    className: 'bg-slate-100 text-slate-600 border-slate-200'
  },

  // 9. Belum Presensi
  belum_presensi: {
    label: 'Belum Presensi',
    icon: Clock,
    className: 'bg-amber-100/70 text-amber-900 border-amber-300'
  },

  // 10. Status Klarifikasi
  pending_review: {
    label: 'Menunggu Review',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  approved: {
    label: 'Disetujui',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200'
  }
};

/**
 * StatusBadge — Badge visual terstandarisasi untuk modul presensi & kepegawaian.
 */
export default function StatusBadge({
  status,
  label,
  lateMinutes,
  showIcon = true,
  className = ''
}) {
  const normalized = status ? String(status).toLowerCase().trim() : 'hadir';
  const config = STATUS_CONFIGS[normalized] || {
    label: status || 'Hadir',
    icon: HelpCircle,
    className: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const IconComponent = config.icon;
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.className} ${className}`}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3 shrink-0" />}
      <span>{displayLabel}</span>
      {lateMinutes > 0 && (
        <span className="font-mono text-[10px] opacity-90">({lateMinutes}m)</span>
      )}
    </span>
  );
}
