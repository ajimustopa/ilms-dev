import React from 'react';
import {
  ChevronRight,
  RefreshCw,
  LogIn,
  PlusCircle,
  Lock,
  CalendarCheck
} from 'lucide-react';

export default function PresensiHeader({
  loading,
  periodStatus = 'review',
  onRefresh,
  onSelfCheckIn,
  onOpenManualModal,
  onOpenLockModal
}) {
  const getPeriodBadge = () => {
    if (periodStatus === 'submitted_to_payroll') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          Periode Terkirim ke Payroll
        </span>
      );
    }
    if (periodStatus === 'locked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Periode Terkunci
        </span>
      );
    }
    if (periodStatus === 'review') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Periode Ditinjau
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Periode Terbuka
      </span>
    );
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px] tracking-wide">
          <span className="hover:text-emerald-700 cursor-pointer transition-colors">Beranda</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="hover:text-emerald-700 cursor-pointer transition-colors">Kepegawaian</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold">Presensi &amp; Absensi</span>
        </nav>

        {/* Title & Period Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Presensi &amp; Absensi Pegawai
          </h1>
          {getPeriodBadge()}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Tahun Ajaran 2026/2027
          </span>
        </div>

        <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
          Pencatatan jam masuk, pulang, dan status kehadiran harian secara presisi dan terverifikasi GPS.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 w-9 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-60"
          title="Refresh Data Presensi"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>

        {/* Check-In Mandiri (Outlined Green) */}
        <button
          type="button"
          onClick={onSelfCheckIn}
          className="h-9 px-3.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-emerald-600" />
          <span>Check-In Mandiri</span>
        </button>

        {/* Tutup Periode Presensi */}
        <button
          type="button"
          onClick={onOpenLockModal}
          className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="Tutup & Kunci Periode Presensi Bulanan"
        >
          <Lock className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Tutup Periode</span>
        </button>

        {/* Input Presensi Manual (Solid Emerald) */}
        <button
          type="button"
          onClick={onOpenManualModal}
          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Input Presensi Manual</span>
        </button>
      </div>
    </div>
  );
}
