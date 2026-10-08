import React from 'react';
import {
  CalendarDays,
  UserX,
  AlertTriangle,
  FileCheck2,
  TableProperties
} from 'lucide-react';

export default function PresensiTabNav({
  activeTab,
  onTabChange,
  counts = {}
}) {
  const tabs = [
    {
      id: 'today',
      label: 'Presensi Hari Ini',
      icon: CalendarDays,
      count: counts.today ?? counts.present_count ?? null,
      badgeColor: 'bg-emerald-600 text-white',
      inactiveBadge: 'bg-slate-100 text-slate-600'
    },
    {
      id: 'absent',
      label: 'Belum Presensi',
      icon: UserX,
      count: counts.not_checked_in_count ?? null,
      badgeColor: 'bg-amber-600 text-white',
      inactiveBadge: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'anomalies',
      label: 'Perlu Ditindaklanjuti',
      icon: AlertTriangle,
      count: counts.anomalies_count ?? null,
      badgeColor: 'bg-rose-600 text-white',
      inactiveBadge: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'clarifications',
      label: 'Antrean Koreksi',
      icon: FileCheck2,
      count: counts.clarifications_count ?? null,
      badgeColor: 'bg-indigo-600 text-white',
      inactiveBadge: 'bg-indigo-100 text-indigo-700'
    },
    {
      id: 'monthly',
      label: 'Rekap Bulanan',
      icon: TableProperties,
      count: null
    }
  ];

  return (
    <div className="border-b border-slate-200">
      <div className="flex items-center gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
                    isActive ? tab.badgeColor : tab.inactiveBadge
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
