import React from 'react';

const VARIANT_STYLES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200'
};

const STATUS_MAP = {
  // Success (Emerald)
  success: 'success',
  aktif: 'success',
  active: 'success',
  lunas: 'success',
  paid: 'success',
  disetujui: 'success',
  approved: 'success',
  selesai: 'success',
  completed: 'success',
  baik: 'success',
  aman: 'success',
  milik_sendiri: 'success',
  verified: 'success',
  passed: 'success',
  hadir: 'success',

  // Danger (Rose)
  danger: 'danger',
  rusak_berat: 'danger',
  hilang: 'danger',
  ditolak: 'danger',
  rejected: 'danger',
  batal: 'danger',
  cancelled: 'danger',
  overdue: 'danger',
  unpaid: 'danger',
  failed: 'danger',
  menipis: 'danger',
  alpa: 'danger',

  // Warning (Amber)
  warning: 'warning',
  draft: 'warning',
  pending: 'warning',
  diajukan: 'warning',
  menunggu: 'warning',
  rusak_ringan: 'warning',
  dipinjam: 'warning',
  diproses: 'warning',
  in_progress: 'warning',
  dilaporkan: 'warning',
  partially_paid: 'warning',
  sebagian: 'warning',
  sewa: 'warning',
  izin: 'warning',
  sakit: 'warning',

  // Info / Netral-Penting (Indigo)
  info: 'info',
  pinjam: 'info',
  hibah: 'info',
  terjadwal: 'info',
  scheduled: 'info',
  booked: 'info',
  diterima: 'info',
  received: 'info',
  dikembalikan: 'info',
  returned: 'info',

  // Neutral (Slate)
  neutral: 'neutral',
  nonaktif: 'neutral',
  inactive: 'neutral',
  arsip: 'neutral',
  archived: 'neutral',
  ditutup: 'neutral',
  closed: 'neutral'
};

export default function StatusPill({
  status,
  variant,
  children,
  className = ''
}) {
  const normalizedKey = status ? String(status).toLowerCase().trim() : null;
  const resolvedVariant = variant || (normalizedKey ? (STATUS_MAP[normalizedKey] || 'neutral') : 'neutral');
  const variantClass = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.neutral;

  const displayText = children || (status ? String(status).replace(/_/g, ' ').toUpperCase() : resolvedVariant.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${variantClass} ${className}`}
    >
      {displayText}
    </span>
  );
}
