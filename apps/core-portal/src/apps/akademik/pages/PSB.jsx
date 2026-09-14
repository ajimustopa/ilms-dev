import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  CalendarDays,
  Layers,
  FileCheck2,
  GraduationCap,
  Sparkles,
  Users2,
  Compass,
  ArrowRight
} from 'lucide-react';

import PSBRegistrants from './PSBRegistrants';
import PSBProcess from './PSBProcess';
import PSBGroups from './PSBGroups';
import PSBTests from './PSBTests';
import PSBPlacement from './PSBPlacement';

export default function PSB() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab definitions
  const tabs = [
    {
      key: 'pendataan',
      label: 'Pendataan Calon Murid',
      shortLabel: 'Calon Murid',
      icon: UserPlus,
      description: 'Pendaftaran & verifikasi berkas calon santri/murid baru'
    },
    {
      key: 'proses',
      label: 'Periode & Kuota',
      shortLabel: 'Periode & Kuota',
      icon: CalendarDays,
      description: 'Pengaturan periode PSB, target kuota L/P & kode registrasi'
    },
    {
      key: 'kelompok',
      label: 'Kelompok / Gelombang',
      shortLabel: 'Gelombang',
      icon: Layers,
      description: 'Master gelombang pendaftaran, kuota, & biaya formulir'
    },
    {
      key: 'testing',
      label: 'Tes Seleksi Masuk',
      shortLabel: 'Tes Seleksi',
      icon: FileCheck2,
      description: 'Bank soal, sesi ujian seleksi & rekap penilaian kelulusan'
    },
    {
      key: 'penempatan',
      label: 'Penempatan Rombel',
      shortLabel: 'Penempatan',
      icon: GraduationCap,
      description: 'Plotting santri baru yang lulus seleksi ke rombel kelas'
    }
  ];

  // Active tab derived from query parameter ?tab=...
  const rawTab = searchParams.get('tab') || 'pendataan';
  const activeTab = tabs.some(t => t.key === rawTab) ? rawTab : 'pendataan';

  const handleTabChange = (newTabKey) => {
    setSearchParams({ tab: newTabKey });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Hub Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        {/* Ambient Decorative Background */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Penerimaan Murid Baru (PSB / PMB)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Penerimaan Santri & Murid Baru</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pusat kendali terpadu seluruh tahapan penerimaan murid baru: penetapan kuota & periode, gelombang pendaftaran, verifikasi berkas calon murid, pelaksanaan tes seleksi masuk, hingga plotting penempatan rombel kelas.
            </p>
          </div>

          {/* Quick Stats / Info Widget */}
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl shrink-0 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahapan Aktif</div>
              <div className="text-sm font-extrabold text-white">
                {tabs.find(t => t.key === activeTab)?.label}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25 font-black scale-[1.02]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                <span>{idx + 1}. {tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Submodule Render */}
      <div className="transition-opacity duration-200">
        {activeTab === 'pendataan' && <PSBRegistrants />}
        {activeTab === 'proses' && <PSBProcess />}
        {activeTab === 'kelompok' && <PSBGroups />}
        {activeTab === 'testing' && <PSBTests />}
        {activeTab === 'penempatan' && <PSBPlacement />}
      </div>
    </div>
  );
}
