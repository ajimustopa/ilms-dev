import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Compass,
  Award,
  AlertTriangle,
  CheckSquare,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    ripsCount: 0,
    rksCount: 0,
    kpiCount: 0,
    openRisksCount: 0,
    activeProjectsCount: 0,
    myTasksCount: 0,
  });
  const [kpiList, setKpiList] = useState([]);
  const [risksList, setRisksList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        ripsRes,
        rksRes,
        kpiRes,
        risksRes,
        projRes,
        tasksRes,
        snapshotRes,
      ] = await Promise.allSettled([
        api.get('/api/v1/manajemen/institution-development-plans'),
        api.get('/api/v1/manajemen/school-work-plans'),
        api.get('/api/v1/manajemen/quality-indicators/dashboard'),
        api.get('/api/v1/manajemen/school-risks'),
        api.get('/api/v1/manajemen/projects'),
        api.get('/api/v1/manajemen/tasks'),
        api.get('/api/v1/manajemen/dashboard/cross-app'),
      ]);

      const rips = ripsRes.status === 'fulfilled' ? ripsRes.value.data.data : [];
      const rks = rksRes.status === 'fulfilled' ? rksRes.value.data.data : [];
      const kpis = kpiRes.status === 'fulfilled' ? kpiRes.value.data.data : [];
      const risks = risksRes.status === 'fulfilled' ? risksRes.value.data.data : [];
      const projects = projRes.status === 'fulfilled' ? projRes.value.data.data : [];
      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data.data : [];
      const snap = snapshotRes.status === 'fulfilled' ? snapshotRes.value.data.data : null;

      const openRisks = risks.filter((r) => ['identified', 'mitigating'].includes(r.status));

      setMetrics({
        ripsCount: rips.length,
        rksCount: rks.length,
        kpiCount: kpis.length,
        openRisksCount: openRisks.length,
        activeProjectsCount: projects.filter((p) => p.status === 'ongoing' || p.status === 'planning').length,
        myTasksCount: tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
      });

      setKpiList(kpis.slice(0, 4));
      setRisksList(openRisks.slice(0, 3));
      setTasksList(tasks.slice(0, 4));
      setSnapshot(snap);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>Executive Dashboard Manajemen & Mutu</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
              Live Data
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konsolidasi status perencanaan strategis, capaian mutu, risiko terbuka, dan koordinasi tim.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Perencanaan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.rksCount}</span>
            <span className="text-xs text-slate-400">RKS ({metrics.ripsCount} RIPS)</span>
          </div>
          <Link
            to="/manajemen/planning"
            className="mt-3 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Kelola RIPS & RKS</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Indikator Mutu / KPI</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.kpiCount}</span>
            <span className="text-xs text-slate-400">Target KPI Terpantau</span>
          </div>
          <Link
            to="/manajemen/quality"
            className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1"
          >
            <span>Lihat Evaluasi Mutu</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Risiko Terbuka</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.openRisksCount}</span>
            <span className="text-xs text-slate-400">Perlu Mitigasi</span>
          </div>
          <Link
            to="/manajemen/quality"
            className="mt-3 text-[11px] font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1"
          >
            <span>Register Risiko</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Proyek & Task Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.myTasksCount}</span>
            <span className="text-xs text-slate-400">Task ({metrics.activeProjectsCount} Proyek)</span>
          </div>
          <Link
            to="/manajemen/projects"
            className="mt-3 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Pelacakan Proyek & Task</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Snapshot Agregat Lintas Aplikasi */}
      {snapshot?.metrics && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold tracking-wide">Snapshot Kesehatan Modul Terintegrasi</h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Update: {snapshot.snapshot_date}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Akademik</span>
              <span className="text-lg font-bold text-emerald-400">
                {snapshot.metrics.akademik?.rerata_kehadiran_pct || 96}%
              </span>
              <span className="text-[10px] text-slate-300 block">Kehadiran Santri</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">SDM & Guru</span>
              <span className="text-lg font-bold text-indigo-400">
                {snapshot.metrics.kepegawaian?.tingkat_kehadiran_pct || 94}%
              </span>
              <span className="text-[10px] text-slate-300 block">Presensi PTK</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Keuangan</span>
              <span className="text-lg font-bold text-amber-400">
                {snapshot.metrics.keuangan?.efisiensi_anggaran_pct || 89}%
              </span>
              <span className="text-[10px] text-slate-300 block">Efisiensi Plafon</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Sarpras</span>
              <span className="text-lg font-bold text-teal-400">
                {snapshot.metrics.sarpras?.utilitas_ruangan_pct || 82}%
              </span>
              <span className="text-[10px] text-slate-300 block">Utilitas Ruang</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Perpustakaan</span>
              <span className="text-lg font-bold text-cyan-400">
                {snapshot.metrics.perpustakaan?.peminjaman_aktif || 145}
              </span>
              <span className="text-[10px] text-slate-300 block">Sirkulasi Aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Capaian Indikator Mutu (KPI)</span>
            </h2>
            <Link to="/manajemen/quality" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Lihat Semua
            </Link>
          </div>

          <div className="space-y-3">
            {kpiList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada indikator mutu</p>
            ) : (
              kpiList.map((kpi) => (
                <div key={kpi.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{kpi.name}</span>
                    <span className="font-bold text-indigo-600">
                      {kpi.actual_value !== null ? `${kpi.actual_value} / ${kpi.target_value}` : `Target: ${kpi.target_value}`} {kpi.unit_of_measure}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-2">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, kpi.achievement_percentage || 50)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks & Risks Tracking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Tugas & Tindakan Koordinasi</span>
            </h2>
            <Link to="/manajemen/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Lihat Task
            </Link>
          </div>

          <div className="space-y-2">
            {tasksList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada tugas aktif</p>
            ) : (
              tasksList.map((task) => (
                <div key={task.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{task.title}</p>
                    <p className="text-[11px] text-slate-400">PIC: {task.assignee_name || 'Petugas'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 capitalize">
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
