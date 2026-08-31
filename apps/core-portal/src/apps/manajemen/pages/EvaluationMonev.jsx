import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DatePickerField from '../components/shared/DatePickerField';
import {
  Activity,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Plus,
  Filter,
  Download,
  Clock,
  ArrowRight,
  ClipboardList,
  Search,
  RefreshCw,
  X,
  Check,
  ShieldCheck,
  ExternalLink,
  Flame,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Layers,
  Sparkles,
  GitBranch
} from 'lucide-react';

export default function EvaluationMonev() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('goals_mon'); // 'goals_mon' | 'programs_mon' | 'kpi_mon' | 'findings' | 'rtl'

  // Data states
  const [dashboardMetrics, setDashboardMetrics] = useState({
    goals_summary: { total: 0, achieved: 0, percentage: 0 },
    programs_summary: { total: 0, active: 0 },
    kpi_summary: { total: 0, avg_achievement_percentage: 0 },
    rtl_summary: { total: 0, active: 0, completed: 0, overdue: 0 }
  });
  const [monitoringGoals, setMonitoringGoals] = useState([]);
  const [monitoringPrograms, setMonitoringPrograms] = useState([]);
  const [monitoringKPIs, setMonitoringKPIs] = useState([]);
  const [findings, setFindings] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [references, setReferences] = useState({ employees: [] });

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // RTL Filters
  const [rtlStatusFilter, setRtlStatusFilter] = useState('all');
  const [rtlSourceFilter, setRtlSourceFilter] = useState('all');

  // Modals
  const [rtlModalOpen, setRtlModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRtl, setSelectedRtl] = useState(null);

  const [rtlFormData, setRtlFormData] = useState({
    id: null,
    source_type: 'kpi',
    source_id: '',
    source_code: '',
    source_name: '',
    issue: '',
    deviation_analysis: '',
    action_plan: '',
    pic_employee_id: '',
    deadline: '',
    status: 'in_progress',
    progress_percent: 0,
    completion_notes: '',
    evidence_url: ''
  });

  // Verify Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch All Evaluation Data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [dashRes, goalsRes, progsRes, kpiRes, findRes, rtlRes, refsRes] = await Promise.all([
        api.get('/manajemen/evaluation/dashboard'),
        api.get('/manajemen/evaluation/goals'),
        api.get('/manajemen/evaluation/programs'),
        api.get('/manajemen/evaluation/kpis'),
        api.get('/manajemen/evaluation/findings'),
        api.get('/manajemen/evaluation/follow-ups', {
          params: { status: rtlStatusFilter, source_type: rtlSourceFilter }
        }),
        api.get('/manajemen/planning-references')
      ]);

      setDashboardMetrics(dashRes.data?.data || {
        goals_summary: { total: 0, achieved: 0, percentage: 0 },
        programs_summary: { total: 0, active: 0 },
        kpi_summary: { total: 0, avg_achievement_percentage: 0 },
        rtl_summary: { total: 0, active: 0, completed: 0, overdue: 0 }
      });
      setMonitoringGoals(goalsRes.data?.data || []);
      setMonitoringPrograms(progsRes.data?.data || []);
      setMonitoringKPIs(kpiRes.data?.data || []);
      setFindings(findRes.data?.data || []);
      setFollowUps(rtlRes.data?.data || []);
      setReferences(refsRes.data?.data || { employees: [] });
    } catch (err) {
      console.error('Error fetching evaluation data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data monitoring & evaluasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit, rtlStatusFilter, rtlSourceFilter]);

  // Open Create RTL from an item
  const handleOpenCreateRtlFromSource = (sourceType, item) => {
    setEditMode(false);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const defaultDeadline = d.toISOString().slice(0, 10);

    let code = item.code || '';
    let name = item.name || item.title || '';
    let issue = '';
    let dev = '';

    if (sourceType === 'kpi') {
      issue = `Capaian indikator '${name}' baru mencapai ${item.achievement_percentage || 0}%, target: ${item.target_value} ${item.unit_of_measure || ''}.`;
      dev = `Gap deviasi aktual vs target: ${item.gap_deviation || 0} ${item.unit_of_measure || ''}.`;
    } else if (sourceType === 'program') {
      issue = `Program '${name}' memiliki deviasi penyerapan atau capaian output yang perlu akselerasi.`;
      dev = `Anggaran: Rencana Rp${(item.budget_planned || 0).toLocaleString('id-ID')} vs Realisasi Rp${(item.budget_realized || 0).toLocaleString('id-ID')}.`;
    } else if (sourceType === 'quality_goal') {
      issue = `Sasaran mutu '${name}' pada standar ${item.quality_standard} belum mencapai target ideal.`;
      dev = `Realisasi aktual: ${item.actual_value || 0} vs target ${item.target_value || 0}.`;
    }

    setRtlFormData({
      id: null,
      source_type: sourceType,
      source_id: item.id || '',
      source_code: code,
      source_name: name,
      issue,
      deviation_analysis: dev,
      action_plan: '',
      pic_employee_id: references.employees[0]?.id || '',
      deadline: defaultDeadline,
      status: 'in_progress',
      progress_percent: 0,
      completion_notes: '',
      evidence_url: ''
    });
    setRtlModalOpen(true);
  };

  const handleOpenEditRtl = (rtl) => {
    setEditMode(true);
    setRtlFormData({
      id: rtl.id,
      source_type: rtl.source_type || 'general',
      source_id: rtl.source_id || '',
      source_code: rtl.source_code || '',
      source_name: rtl.source_name || '',
      issue: rtl.issue || '',
      deviation_analysis: rtl.deviation_analysis || '',
      action_plan: rtl.action_plan || '',
      pic_employee_id: rtl.pic_employee_id || '',
      deadline: rtl.deadline ? rtl.deadline.slice(0, 10) : '',
      status: rtl.status || 'in_progress',
      progress_percent: rtl.progress_percent || 0,
      completion_notes: rtl.completion_notes || '',
      evidence_url: rtl.evidence_url || ''
    });
    setRtlModalOpen(true);
  };

  const handleSaveRtl = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...rtlFormData,
        source_id: rtlFormData.source_id ? Number(rtlFormData.source_id) : null,
        pic_employee_id: rtlFormData.pic_employee_id ? Number(rtlFormData.pic_employee_id) : null,
        progress_percent: Number(rtlFormData.progress_percent)
      };

      if (editMode) {
        await api.put(`/manajemen/evaluation/follow-ups/${rtlFormData.id}`, payload);
        setFeedbackMsg('Rencana tindak lanjut (RTL) berhasil diperbarui');
      } else {
        await api.post('/manajemen/evaluation/follow-ups', payload);
        setFeedbackMsg('Rencana tindak lanjut (RTL) berhasil dibuat');
      }

      setRtlModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan RTL');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVerifyModal = (rtl) => {
    setSelectedRtl(rtl);
    setVerifyNotes('Terverifikasi tuntas & efektif oleh Auditor Mutu.');
    setVerifyModalOpen(true);
  };

  const handleConfirmVerify = async (e) => {
    e.preventDefault();
    if (!selectedRtl) return;
    setSubmitting(true);
    try {
      await api.patch(`/manajemen/evaluation/follow-ups/${selectedRtl.id}/verify`, {
        notes: verifyNotes
      });
      setFeedbackMsg('Rencana tindak lanjut berhasil diverifikasi selesai');
      setVerifyModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg('Gagal memverifikasi RTL');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRtl = async (id) => {
    if (!window.confirm('Yakin ingin menghapus RTL ini?')) return;
    try {
      await api.delete(`/manajemen/evaluation/follow-ups/${id}`);
      setFeedbackMsg('RTL berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg('Gagal menghapus RTL');
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Terverifikasi Selesai</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40">Selesai (Menunggu Verifikasi)</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">Sedang Dijalankan</span>;
      case 'delayed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">Tertunda / Overdue</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-500/20 text-slate-400 border border-slate-500/40">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Notifications */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Monitoring, Evaluasi & Tindak Lanjut (Monev & RTL)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Siklus terpadu pengukuran target vs realisasi, gap deviasi, identifikasi temuan masalah, dan pengawalan rencana perbaikan (RTL).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            title="Muat Ulang Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateRtlFromSource('general', {})}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-950/50 transition border border-teal-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat RTL Baru</span>
          </button>
        </div>
      </div>

      {/* Dashboard Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-[11px] block">Sasaran Tercapai:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400">{dashboardMetrics.goals_summary.achieved}</span>
            <span className="text-xs text-slate-500">/ {dashboardMetrics.goals_summary.total} ({dashboardMetrics.goals_summary.percentage}%)</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-[11px] block">Rata-rata Capaian KPI:</span>
          <span className="text-xl font-black text-indigo-400">{dashboardMetrics.kpi_summary.avg_achievement_percentage}%</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-[11px] block">Temuan & Masalah:</span>
          <span className="text-xl font-black text-amber-400">{findings.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-[11px] block">RTL Aktif Berjalan:</span>
          <span className="text-xl font-black text-teal-400">{dashboardMetrics.rtl_summary.active}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-xl space-y-1">
          <span className="text-rose-400 text-[11px] font-bold block">RTL Overdue / Kritis:</span>
          <span className="text-xl font-black text-rose-400">{dashboardMetrics.rtl_summary.overdue}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'goals_mon', label: `Monitoring Sasaran (${monitoringGoals.length})`, icon: Target },
          { id: 'programs_mon', label: `Monitoring Program (${monitoringPrograms.length})`, icon: Layers },
          { id: 'kpi_mon', label: `Monitoring KPI (${monitoringKPIs.length})`, icon: Award },
          { id: 'findings', label: `Evaluasi & Temuan (${findings.length})`, icon: AlertTriangle },
          { id: 'rtl', label: `Rencana Tindak Lanjut / RTL (${followUps.length})`, icon: ClipboardList }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MONITORING SASARAN (BSC & MUTU) */}
      {activeTab === 'goals_mon' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Monitoring Sasaran Strategis BSC & Sasaran Mutu Unit</h3>
              <p className="text-xs text-slate-400">Pengukuran gap realisasi terhadap standar target yang ditetapkan</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Nama Sasaran Mutu</th>
                  <th className="p-3">Standar / Perspektif</th>
                  <th className="p-3 text-center">Target</th>
                  <th className="p-3 text-center">Realisasi</th>
                  <th className="p-3 text-center">Capaian %</th>
                  <th className="p-3 text-center">Deviasi</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi RTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monitoringGoals.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{g.code}</td>
                    <td className="p-3 font-bold text-white max-w-xs">{g.name}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {g.quality_standard || g.strategic_goal_perspective || 'Standar Mutu'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-200">{g.target_value ?? '-'}</td>
                    <td className="p-3 text-center font-bold text-slate-200">{g.actual_value ?? '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`font-black ${
                        (g.achievement_percentage || 0) >= 100 ? 'text-emerald-400' :
                        (g.achievement_percentage || 0) < 60 ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {g.achievement_percentage !== null ? `${g.achievement_percentage}%` : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={g.deviation < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {g.deviation > 0 ? `+${g.deviation}` : g.deviation}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        g.status === 'achieved' ? 'bg-emerald-500/20 text-emerald-400' :
                        g.status === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateRtlFromSource('quality_goal', g)}
                        className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px]"
                      >
                        + Buat RTL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING PROGRAM */}
      {activeTab === 'programs_mon' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Monitoring Penyerapan Anggaran & Capaian Output Program</h3>
              <p className="text-xs text-slate-400">Pengawasan progres pelaksanaan program kerja tahunan (RKT)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Nama Program Kerja</th>
                  <th className="p-3">RKT & Sasaran</th>
                  <th className="p-3 text-right">Rencana Anggaran</th>
                  <th className="p-3 text-right">Realisasi Anggaran</th>
                  <th className="p-3 text-center">Progres %</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi RTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monitoringPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-indigo-400">{p.code || 'PRG'}</td>
                    <td className="p-3 font-bold text-white max-w-xs">{p.title}</td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div>{p.rkt_title}</div>
                      {p.strategic_goal_name && <div className="text-[10px] text-indigo-400">↳ {p.strategic_goal_name}</div>}
                    </td>
                    <td className="p-3 text-right font-mono">Rp{p.budget_planned.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">Rp{p.budget_realized.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-center font-bold text-white">{p.progress_percentage || 0}%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateRtlFromSource('program', p)}
                        className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px]"
                      >
                        + Buat RTL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MONITORING KPI */}
      {activeTab === 'kpi_mon' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Monitoring Kamus Indikator Kinerja Utama (KPI / IKU)</h3>
              <p className="text-xs text-slate-400">Pengukuran formula multi-arah target vs aktual capaian indikator</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Indikator Kinerja</th>
                  <th className="p-3 text-center">Satuan</th>
                  <th className="p-3 text-center">Target</th>
                  <th className="p-3 text-center">Realisasi</th>
                  <th className="p-3 text-center">Capaian %</th>
                  <th className="p-3 text-center">Deviasi Gap</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi RTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {monitoringKPIs.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{k.code}</td>
                    <td className="p-3 max-w-xs">
                      <div className="font-bold text-white">{k.name}</div>
                      {k.strategic_goal_name && <div className="text-[10px] text-indigo-400">↳ {k.strategic_goal_name}</div>}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-400">{k.unit_of_measure || '-'}</td>
                    <td className="p-3 text-center font-bold text-slate-200">{k.target_value ?? '-'}</td>
                    <td className="p-3 text-center font-bold text-slate-200">{k.actual_value ?? '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`font-black ${
                        k.achievement_percentage >= 100 ? 'text-emerald-400' :
                        k.achievement_percentage < 75 ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {k.achievement_percentage}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={k.gap_deviation < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {k.gap_deviation > 0 ? `+${k.gap_deviation}` : k.gap_deviation}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        k.achievement_status === 'achieved' ? 'bg-emerald-500/20 text-emerald-400' :
                        k.achievement_status === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {k.achievement_status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateRtlFromSource('kpi', k)}
                        className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px]"
                      >
                        + Buat RTL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EVALUASI & TEMUAN */}
      {activeTab === 'findings' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Matriks Temuan Evaluasi Otomatis (Gap Analisis)</span>
              </h3>
              <p className="text-xs text-slate-400">Daftar kesenjangan kinerja, risiko kritis, dan sasaran yang membutuhkan rencana perbaikan</p>
            </div>
          </div>

          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Tidak ada temuan kritis yang terdeteksi saat ini. Seluruh indikator berada dalam toleransi target.
              </div>
            ) : (
              findings.map((f, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        f.severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        [{f.source_type.toUpperCase()}] {f.source_code || ''}
                      </span>
                      <h4 className="font-bold text-white text-sm">{f.title}</h4>
                    </div>
                    <p className="text-slate-300"><strong className="text-slate-400">Uraian Masalah:</strong> {f.issue}</p>
                    <p className="text-amber-400 font-semibold"><strong className="text-slate-400">Analisis Deviasi:</strong> {f.deviation_analysis}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateRtlFromSource(f.source_type, { id: f.source_id, code: f.source_code, name: f.source_name, title: f.title })}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow"
                    >
                      Eskalasi ke RTL ➔
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RENCANA TINDAK LANJUT (RTL) */}
      {activeTab === 'rtl' && (
        <div className="space-y-4">
          {/* RTL Filter Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={rtlStatusFilter}
                onChange={(e) => setRtlStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Semua Status RTL</option>
                <option value="in_progress">Sedang Dijalankan</option>
                <option value="completed">Selesai (Menunggu Verifikasi)</option>
                <option value="verified">Terverifikasi</option>
                <option value="delayed">Tertunda / Overdue</option>
              </select>

              <select
                value={rtlSourceFilter}
                onChange={(e) => setRtlSourceFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Semua Sumber Temuan</option>
                <option value="kpi">Kamus KPI</option>
                <option value="program">Program Kerja</option>
                <option value="quality_goal">Sasaran Mutu</option>
                <option value="risk">Manajemen Risiko</option>
                <option value="general">Umum / Bebas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCreateRtlFromSource('general', {})}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
            >
              + Catat RTL Baru
            </button>
          </div>

          {/* RTL Register Cards */}
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                Tidak ada data rencana tindak lanjut (RTL) yang ditemukan.
              </div>
            ) : (
              followUps.map((rtl) => (
                <div
                  key={rtl.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded">
                          [RTL #{rtl.id}] Sumber: {rtl.source_type.toUpperCase()} ({rtl.source_code || rtl.source_name || 'Umum'})
                        </span>
                        {renderStatusBadge(rtl.status)}
                      </div>
                      <h4 className="font-bold text-white text-sm leading-snug">{rtl.action_plan}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {rtl.status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => handleOpenVerifyModal(rtl)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                        >
                          Verifikasi Selesai
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditRtl(rtl)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRtl(rtl.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-850/80 border border-slate-800">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">Temuan / Akar Masalah:</span>
                      <p className="text-rose-400 font-medium">{rtl.issue}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px]">Analisis Deviasi:</span>
                      <p className="text-slate-300">{rtl.deviation_analysis || '-'}</p>
                    </div>
                  </div>

                  {/* Progress & Verification Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-4">
                      <span>PIC: <strong className="text-slate-200">{rtl.pic_name || 'Belum diatur'}</strong></span>
                      <span>Tenggat: <strong className="text-amber-400">{rtl.deadline ? rtl.deadline.slice(0, 10) : '-'}</strong></span>
                      <span>Progres: <strong className="text-teal-400">{rtl.progress_percent || 0}%</strong></span>
                    </div>

                    {rtl.status === 'verified' && (
                      <div className="text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Diverifikasi oleh: {rtl.verified_by_name || 'Auditor'} ({rtl.verified_at?.slice(0, 10)})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: BUAT / UBAH RTL */}
      {rtlModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editMode ? 'Ubah Rencana Tindak Lanjut (RTL)' : 'Catat Rencana Tindak Lanjut (RTL) Baru'}
              </h3>
              <button onClick={() => setRtlModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRtl} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipe Sumber Temuan</label>
                  <select
                    value={rtlFormData.source_type}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, source_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="kpi">Kamus KPI / IKU</option>
                    <option value="program">Program Kerja</option>
                    <option value="activity">Kegiatan Renop</option>
                    <option value="quality_goal">Sasaran Mutu</option>
                    <option value="risk">Manajemen Risiko</option>
                    <option value="general">Umum / Temuan Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode / Referensi Sumber</label>
                  <input
                    type="text"
                    value={rtlFormData.source_code}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, source_code: e.target.value })}
                    placeholder="Contoh: KPI-IKU-01 / PRG-02"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Uraian Temuan / Masalah / Kendala *</label>
                <textarea
                  rows={2}
                  required
                  value={rtlFormData.issue}
                  onChange={(e) => setRtlFormData({ ...rtlFormData, issue: e.target.value })}
                  placeholder="Deskripsi temuan ketidaktercapaian atau kendala operasional..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Analisis Deviasi & Akar Masalah</label>
                <textarea
                  rows={2}
                  value={rtlFormData.deviation_analysis}
                  onChange={(e) => setRtlFormData({ ...rtlFormData, deviation_analysis: e.target.value })}
                  placeholder="Penyebab kesenjangan antara target dan realisasi aktual..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rencana Tindakan Korektif (Action Plan) *</label>
                <textarea
                  rows={3}
                  required
                  value={rtlFormData.action_plan}
                  onChange={(e) => setRtlFormData({ ...rtlFormData, action_plan: e.target.value })}
                  placeholder="Langkah perbaikan konkret yang akan dieksekusi..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIC Penanggung Jawab</label>
                  <select
                    value={rtlFormData.pic_employee_id}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, pic_employee_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih PIC --</option>
                    {references.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tenggat Waktu (Deadline)</label>
                  <DatePickerField
                    value={rtlFormData.deadline}
                    onChange={(iso) => setRtlFormData({ ...rtlFormData, deadline: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status RTL</label>
                  <select
                    value={rtlFormData.status}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_progress">Sedang Dijalankan</option>
                    <option value="completed">Selesai (Menunggu Verifikasi)</option>
                    <option value="delayed">Tertunda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Persentase Progres (0 - 100%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rtlFormData.progress_percent}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, progress_percent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bukti Dukung (Evidence URL)</label>
                  <input
                    type="text"
                    value={rtlFormData.evidence_url}
                    onChange={(e) => setRtlFormData({ ...rtlFormData, evidence_url: e.target.value })}
                    placeholder="https://storage.aldepos.sch.id/..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRtlModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan RTL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFIKASI SELESAI RTL */}
      {verifyModalOpen && selectedRtl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verifikasi Hasil Tindak Lanjut (RTL)</span>
              </h3>
              <button onClick={() => setVerifyModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800 space-y-1.5 text-xs">
              <span className="font-mono text-teal-400 font-bold">[RTL #{selectedRtl.id}] {selectedRtl.source_code || ''}</span>
              <h4 className="font-bold text-white">{selectedRtl.action_plan}</h4>
              <div className="text-[10px] text-slate-400">PIC: {selectedRtl.pic_name || '-'} | Progres: {selectedRtl.progress_percent}%</div>
            </div>

            <form onSubmit={handleConfirmVerify} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Pengesahan / Verifikasi Auditor</label>
                <textarea
                  rows={3}
                  required
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Catatan hasil verifikasi efektivitas tindakan perbaikan..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Sahkan & Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
