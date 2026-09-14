import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Compass,
  Target,
  Award,
  AlertTriangle,
  CheckSquare,
  Calendar,
  ArrowRight,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  XCircle,
  GitBranch,
  Building,
  Sparkles,
  ClipboardList,
  FileCheck2,
  Flame
} from 'lucide-react';

export default function Dashboard() {
  const { user, activeSchoolUnit } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Executive Dashboard State
  const [data, setData] = useState({
    strategic: {
      active_renstra: null,
      total_goals: 0,
      goals_by_perspective: { learning_growth: 0, internal_process: 0, stakeholder: 0, financial: 0 }
    },
    programs: {
      total_programs: 0,
      priority_programs_count: 0,
      avg_progress_percentage: 0,
      total_budget_estimate: 0,
      total_budget_realization: 0,
      top_priority_programs: []
    },
    kpi: {
      total_indicators: 0,
      achieved_count: 0,
      pending_count: 0,
      critical_count: 0,
      avg_achievement_percentage: 0,
      highlights: []
    },
    risks: {
      total_risks: 0,
      by_level: { low: 0, medium: 0, high: 0, extreme: 0 },
      top_critical_risks: []
    },
    tasks: {
      total_tasks: 0,
      today_tasks: 0,
      overdue_tasks: 0,
      tomorrow_tasks: 0,
      week_tasks: 0,
      completed_tasks: 0
    },
    rtl: {
      total_rtl: 0,
      active_rtl: 0,
      completed_rtl: 0,
      overdue_rtl: 0
    },
    approvals: {
      total_requests: 0,
      pending_count: 0
    },
    upcoming_agendas: []
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/manajemen/dashboard/executive');
      setData(res.data?.data || data);
    } catch (err) {
      console.error('Error fetching executive dashboard:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat dashboard eksekutif');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeSchoolUnit]);

  // Cascading Workflow Stages for Visual Roadmap
  const cascadingStages = [
    { label: 'Profil Lembaga', path: '/manajemen/institution-profile', color: 'from-indigo-600 to-indigo-600', count: 'Legalitas' },
    { label: 'Rencana Induk (RIPS)', path: '/manajemen/planning/rips', color: 'from-indigo-600 to-indigo-600', count: data.strategic.active_rips ? 'Aktif' : 'Draft' },
    { label: 'RKJP & RKJM', path: '/manajemen/planning/rkjp-rkjm', color: 'from-indigo-600 to-indigo-600', count: 'Multi-Tahun' },
    { label: 'RKT Tahunan', path: '/manajemen/planning/rkt', color: 'from-indigo-600 to-rose-600', count: 'TA 2026/2027' },
    { label: 'Tugas & Proyek', path: '/manajemen/tasks', color: 'from-rose-600 to-rose-600', count: `${data.tasks.total_tasks} Tugas` },
    { label: 'Evaluasi Diri (EVADIR)', path: '/manajemen/evadir', color: 'from-amber-600 to-amber-600', count: 'Sasaran' },
    { label: 'Balanced Scorecard', path: '/manajemen/bsc', color: 'from-emerald-600 to-emerald-600', count: '4 Aspek' },
    { label: 'Akreditasi Lembaga', path: '/manajemen/quality', color: 'from-emerald-600 to-emerald-600', count: 'Evidence' },
    { label: 'Manajemen Risiko', path: '/manajemen/risks', color: 'from-emerald-600 to-indigo-600', count: `${data.risks.total_risks} Risiko` },
    { label: 'Pusat Persetujuan', path: '/manajemen/approvals', color: 'from-slate-700 to-slate-850', count: `${data.approvals.pending_count} Pending` }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto mj-animate-fade-in">
      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl mj-card-hover">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Sistem Perencanaan Terintegrasi — {activeSchoolUnit ? `Unit #${activeSchoolUnit}` : 'Seluruh Unit (Yayasan)'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard Eksekutif Perencanaan, Mutu & Otorisasi
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pemantauan terpadu seluruh siklus: Profil ➔ RIPS ➔ RKJP/RKJM ➔ RKT ➔ Tugas & Proyek ➔ EVADIR ➔ BSC ➔ Akreditasi ➔ Risiko ➔ Persetujuan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchDashboardData}
              title="Perbarui Data"
              className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/manajemen/planning/rips"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/50 transition border border-indigo-400/30"
            >
              <Layers className="w-4 h-4" />
              <span>Rencana Induk (RIPS)</span>
            </Link>
            <Link
              to="/manajemen/tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 transition"
            >
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>Tugas & Proyek</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Cascading Workflow Roadmap */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">
              Peta Alur Cascading Perencanaan Kelembagaan Terpadu
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Klik stage untuk membuka modul terkait</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {cascadingStages.map((stage, idx) => (
            <Link
              key={idx}
              to={stage.path}
              className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 transition flex flex-col justify-between text-center group space-y-1.5 hover:-translate-y-0.5"
            >
              <div className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-300 transition">
                #{idx + 1}
              </div>
              <div className="text-[11px] font-bold text-white group-hover:text-indigo-400 transition leading-tight">
                {stage.label}
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-900 text-indigo-300 border border-slate-800 truncate">
                {stage.count}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 6 Executive Summary Cards with Staggered Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Strategis */}
        <Link
          to="/manajemen/planning/rips"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-1"
          style={{ borderTop: '3px solid var(--mj-sky)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Sasaran RIPS</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <Compass className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white group-hover:text-indigo-400 transition">
              {data.strategic.total_goals}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {data.strategic.active_rips?.name || 'RIPS Terdaftar'}
            </div>
          </div>
        </Link>

        {/* Card 2: Program Prioritas */}
        <Link
          to="/manajemen/planning/rkt"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-2"
          style={{ borderTop: '3px solid var(--mj-primary)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Program RKT</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white group-hover:text-indigo-400 transition">
              {data.programs.total_programs}
            </div>
            <div className="text-[10px] text-indigo-400 font-semibold mt-0.5">
              ⭐ {data.programs.priority_programs_count} Program Unggulan
            </div>
          </div>
        </Link>

        {/* Card 3: EVADIR / BSC */}
        <Link
          to="/manajemen/bsc"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-3"
          style={{ borderTop: '3px solid var(--mj-done)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Capaian BSC</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">
              {data.kpi.avg_achievement_percentage}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {data.kpi.achieved_count} Tercapai | {data.kpi.critical_count} Kritis
            </div>
          </div>
        </Link>

        {/* Card 4: Manajemen Risiko */}
        <Link
          to="/manajemen/risks"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-4"
          style={{ borderTop: '3px solid var(--mj-risk)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Peta Risiko</span>
            <div className="w-7 h-7 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-400">
              {data.risks.total_risks}
            </div>
            <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
              🔥 {data.risks.by_level.extreme + data.risks.by_level.high} Ekstrem & Tinggi
            </div>
          </div>
        </Link>

        {/* Card 5: Task Hub */}
        <Link
          to="/manajemen/tasks"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-5"
          style={{ borderTop: '3px solid var(--mj-progress)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Tugas Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white group-hover:text-amber-400 transition">
              {data.tasks.total_tasks}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
              ⚠️ {data.tasks.overdue_tasks} Overdue | {data.tasks.today_tasks} Hari Ini
            </div>
          </div>
        </Link>

        {/* Card 6: RTL & Persetujuan */}
        <Link
          to="/manajemen/approvals"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition shadow-xl space-y-2 group mj-animate-fade-in mj-stagger-6"
          style={{ borderTop: '3px solid var(--mj-primary)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Approval Pending</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-400">
              {data.approvals.pending_count}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              📋 {data.rtl.active_rtl} RTL Aktif Berjalan
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Programs & KPI vs Risk & Agendas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Program Prioritas & KPI Health */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Prioritas Tracking */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span>Progres Program Unggulan Utama</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rata-rata progres aktivitas: <strong className="text-indigo-400">{data.programs.avg_progress_percentage}%</strong>
                </p>
              </div>
              <Link
                to="/manajemen/planning/rkt"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Buka RKT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data.programs.top_priority_programs.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-850/60 text-center text-slate-500 text-xs italic">
                  Belum ada program yang ditandai sebagai program prioritas.
                </div>
              ) : (
                data.programs.top_priority_programs.map((prog) => (
                  <div key={prog.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-400">[{prog.code || 'PRG'}]</span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{prog.title}</h4>
                        {prog.priority_reason && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">Urgensi: {prog.priority_reason}</p>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-950 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {prog.priority_level || 'Tinggi'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Pagu: <strong className="text-slate-200">Rp{(Number(prog.budget_estimate) || 0).toLocaleString('id-ID')}</strong>
                        </span>
                        <span className="font-bold text-indigo-400">{prog.progress_percentage || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${prog.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* KPI Indikator Mutu Highlight */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Kinerja Indikator Mutu & KPI</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Perbandingan target vs aktual capaian kamus indikator</p>
              </div>
              <Link
                to="/manajemen/quality"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Kamus KPI</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.kpi.highlights.map((kpi) => (
                <div key={kpi.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded">
                      {kpi.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      kpi.status === 'achieved' ? 'bg-emerald-500/20 text-emerald-400' :
                      kpi.status === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {kpi.status === 'achieved' ? 'Tercapai' : kpi.status === 'critical' ? 'Kritis' : 'On Track'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{kpi.name}</h4>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/50">
                    <span className="text-slate-400">Target: <strong className="text-slate-200">{kpi.target ?? '-'} {kpi.unit || ''}</strong></span>
                    <span className="text-slate-400">Realisasi: <strong className="text-emerald-400">{kpi.actual ?? '-'} {kpi.unit || ''}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Risiko & Agenda */}
        <div className="space-y-6">
          {/* Peta Risiko Summary */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Peta Risiko Lembaga</span>
              </h3>
              <Link to="/manajemen/risks" className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
                Detail
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
                <span>Sedang</span>
                <div className="text-base font-black text-amber-400">{data.risks.by_level.medium}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300">
                <span>Tinggi</span>
                <div className="text-base font-black text-amber-400">{data.risks.by_level.high}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300">
                <span>Ekstrem</span>
                <div className="text-base font-black text-rose-400">{data.risks.by_level.extreme}</div>
              </div>
            </div>

            {data.risks.top_critical_risks.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-rose-400 block">Isu Risiko Prioritas:</span>
                {data.risks.top_critical_risks.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-rose-400">
                      <span className="truncate">{r.title}</span>
                      <span className="text-[10px] bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 shrink-0">
                        Skor {r.risk_score}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] line-clamp-1">{r.mitigation_action || 'Mitigasi belum ditetapkan'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda & Jadwal Terdekat */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Agenda Perencanaan</span>
              </h3>
              <Link to="/manajemen/tasks" className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
                Kalender
              </Link>
            </div>

            <div className="space-y-2.5">
              {data.upcoming_agendas.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs italic">
                  Tidak ada agenda rapat dalam waktu dekat.
                </div>
              ) : (
                data.upcoming_agendas.map((agenda) => (
                  <div key={agenda.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white leading-tight truncate">{agenda.title}</h4>
                      <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded shrink-0">
                        {agenda.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-indigo-300">
                      <Clock className="w-3 h-3" />
                      <span>{agenda.start_date ? agenda.start_date.slice(0, 10) : '-'} {agenda.start_time ? `pukul ${agenda.start_time}` : ''}</span>
                    </div>
                    {agenda.location && <div className="text-[10px] text-slate-400">📍 {agenda.location}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
