import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  HeartPulse,
  Briefcase,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function PresensiStatCards({
  summary,
  loading,
  onCardClick,
  activeStatusFilter
}) {
  const total = Number(summary?.total_active) || 0;
  const hadir = Number(summary?.present_count) || 0;
  const terlambat = Number(summary?.late_count) || 0;
  const izinSakit = Number(summary?.permission_sick_count) || 0;
  const cutiDinas = Number(summary?.leave_duty_count) || 0;
  const alpa = Number(summary?.absent_count) || 0;
  const belumAbsen = Number(summary?.not_checked_in_count) || 0;

  const calcPercent = (val) => {
    if (!total || total === 0) return '0.0%';
    return `${((val / total) * 100).toFixed(1)}%`;
  };

  const cards = [
    {
      id: 'all',
      title: 'Pegawai Aktif',
      count: total,
      subText: '100%',
      icon: Users,
      iconBg: 'bg-slate-100 text-slate-700',
      activeBorder: 'ring-2 ring-slate-400',
      valueColor: 'text-slate-900',
      unit: 'Orang'
    },
    {
      id: 'present',
      title: 'Hadir',
      count: hadir,
      subText: calcPercent(hadir),
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      activeBorder: 'ring-2 ring-emerald-500 bg-emerald-50/20',
      valueColor: 'text-emerald-700',
      unit: 'Pegawai'
    },
    {
      id: 'late',
      title: 'Terlambat',
      count: terlambat,
      subText: calcPercent(terlambat),
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-700',
      activeBorder: 'ring-2 ring-amber-500 bg-amber-50/20',
      valueColor: 'text-amber-700',
      unit: 'Pegawai'
    },
    {
      id: 'permission_sick',
      title: 'Izin / Sakit',
      count: izinSakit,
      subText: calcPercent(izinSakit),
      icon: HeartPulse,
      iconBg: 'bg-sky-50 text-sky-700',
      activeBorder: 'ring-2 ring-sky-500 bg-sky-50/20',
      valueColor: 'text-sky-700',
      unit: 'Pegawai'
    },
    {
      id: 'leave_duty',
      title: 'Cuti / Dinas',
      count: cutiDinas,
      subText: calcPercent(cutiDinas),
      icon: Briefcase,
      iconBg: 'bg-indigo-50 text-indigo-700',
      activeBorder: 'ring-2 ring-indigo-500 bg-indigo-50/20',
      valueColor: 'text-indigo-700',
      unit: 'Pegawai'
    },
    {
      id: 'absent',
      title: 'Alpa',
      count: alpa,
      subText: calcPercent(alpa),
      icon: XCircle,
      iconBg: 'bg-rose-50 text-rose-600',
      activeBorder: 'ring-2 ring-rose-500 bg-rose-50/20',
      valueColor: 'text-rose-700',
      unit: 'Pegawai'
    },
    {
      id: 'not_checked_in',
      title: 'Belum Absen',
      count: belumAbsen,
      subText: calcPercent(belumAbsen),
      icon: AlertCircle,
      iconBg: 'bg-amber-100 text-amber-900',
      badgeTag: 'Perlu Aksi',
      isHighlight: true,
      activeBorder: 'ring-2 ring-amber-600',
      valueColor: 'text-amber-900',
      unit: 'Pegawai'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((card) => {
        const IconComponent = card.icon;
        const isSelected = activeStatusFilter === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            className={`rounded-xl p-3 shadow-2xs border transition-all cursor-pointer flex flex-col justify-between group ${
              card.isHighlight
                ? 'bg-amber-50/90 border-amber-200 hover:bg-amber-100/80 hover:shadow-xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
            } ${isSelected ? card.activeBorder : ''}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[11px] uppercase tracking-wider font-semibold truncate ${
                  card.isHighlight ? 'text-amber-900' : 'text-slate-500'
                }`}
              >
                {card.title}
              </span>
              {card.badgeTag ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 leading-none">
                  {card.badgeTag}
                </span>
              ) : (
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${card.iconBg}`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-lg font-bold font-mono tracking-tight ${card.valueColor} ${
                  loading ? 'opacity-50' : ''
                }`}
              >
                {loading ? '...' : card.count}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  card.isHighlight ? 'text-amber-800 font-semibold' : 'text-slate-400'
                }`}
              >
                {card.subText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
