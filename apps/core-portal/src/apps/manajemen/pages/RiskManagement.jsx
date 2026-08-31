import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DatePickerField from '../components/shared/DatePickerField';
import {
  AlertTriangle,
  ShieldAlert,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Layers,
  ArrowRight,
  Download,
  AlertCircle,
  TrendingDown,
  RefreshCw,
  Search,
  Grid,
  List,
  ShieldCheck,
  Edit,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Flame,
  ArrowDownRight
} from 'lucide-react';

export default function RiskManagement() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'heatmap' | 'mitigation' | 'residual'

  // Data States
  const [risks, setRisks] = useState([]);
  const [heatmapData, setHeatmapData] = useState({ stats: { total: 0, extreme: 0, high: 0, medium: 0, low: 0 }, matrix: {}, risks: [] });
  const [references, setReferences] = useState({ employees: [] });
  const [strategicGoals, setStrategicGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Heatmap Selected Cell Modal
  const [selectedCellRisks, setSelectedCellRisks] = useState(null);
  const [cellModalOpen, setCellModalOpen] = useState(false);

  // Risk Form Modal States
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [riskEditMode, setRiskEditMode] = useState(false);
  const [riskFormData, setRiskFormData] = useState({
    id: null,
    code: '',
    title: '',
    category: 'Operasional',
    source: 'Internal Lembaga',
    description: '',
    root_cause: '',
    impact_description: '',
    probability_val: 3,
    impact_val: 3,
    relation_type: 'none',
    relation_id: '',
    relation_code: '',
    relation_name: '',
    owner_employee_id: '',
    status: 'identified'
  });

  // Mitigation & Residual Modal States
  const [mitigationModalOpen, setMitigationModalOpen] = useState(false);
  const [mitigationFormData, setMitigationFormData] = useState({
    id: null,
    code: '',
    title: '',
    risk_score: 9,
    risk_level: 'medium',
    mitigation_action: '',
    mitigation_pic_id: '',
    mitigation_deadline: '',
    mitigation_status: 'planned',
    residual_probability: 2,
    residual_impact: 2
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch Risks & References
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [risksRes, heatRes, refsRes, goalsRes] = await Promise.all([
        api.get('/manajemen/school-risks'),
        api.get('/manajemen/school-risks/heatmap'),
        api.get('/manajemen/planning-references'),
        api.get('/manajemen/strategic-goals')
      ]);
      setRisks(risksRes.data?.data || []);
      setHeatmapData(heatRes.data?.data || { stats: { total: 0, extreme: 0, high: 0, medium: 0, low: 0 }, matrix: {}, risks: [] });
      setReferences(refsRes.data?.data || { employees: [] });
      setStrategicGoals(goalsRes.data?.data || []);
    } catch (err) {
      console.error('Error loading risk data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data manajemen risiko');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  // Risk Create / Edit Handlers
  const handleOpenCreateRisk = () => {
    setRiskEditMode(false);
    const nextNum = risks.length + 1;
    setRiskFormData({
      id: null,
      code: `RSK-${String(nextNum).padStart(2, '0')}`,
      title: '',
      category: 'Operasional & Sarpras',
      source: 'Internal Lembaga',
      description: '',
      root_cause: '',
      impact_description: '',
      probability_val: 3,
      impact_val: 3,
      relation_type: 'none',
      relation_id: '',
      relation_code: '',
      relation_name: '',
      owner_employee_id: references.employees[0]?.id || '',
      status: 'identified'
    });
    setRiskModalOpen(true);
  };

  const handleOpenEditRisk = (r) => {
    setRiskEditMode(true);
    setRiskFormData({
      id: r.id,
      code: r.code || '',
      title: r.title || '',
      category: r.category || 'Operasional',
      source: r.source || '',
      description: r.description || '',
      root_cause: r.root_cause || '',
      impact_description: r.impact_description || '',
      probability_val: r.probability_val || 3,
      impact_val: r.impact_val || 3,
      relation_type: r.relation_type || 'none',
      relation_id: r.relation_id || '',
      relation_code: r.relation_code || '',
      relation_name: r.relation_name || '',
      owner_employee_id: r.owner_employee_id || '',
      status: r.status || 'identified'
    });
    setRiskModalOpen(true);
  };

  const handleSaveRisk = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...riskFormData,
        probability_val: Number(riskFormData.probability_val),
        impact_val: Number(riskFormData.impact_val),
        owner_employee_id: riskFormData.owner_employee_id ? Number(riskFormData.owner_employee_id) : null,
        relation_id: riskFormData.relation_id ? Number(riskFormData.relation_id) : null,
      };

      if (riskEditMode) {
        await api.put(`/manajemen/school-risks/${riskFormData.id}`, payload);
        setFeedbackMsg('Data risiko berhasil diperbarui');
      } else {
        await api.post('/manajemen/school-risks', payload);
        setFeedbackMsg('Risiko baru berhasil diidentifikasi');
      }

      setRiskModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data risiko');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRisk = async (id) => {
    if (!window.confirm('Yakin ingin menghapus risiko ini?')) return;
    try {
      await api.delete(`/manajemen/school-risks/${id}`);
      setFeedbackMsg('Risiko berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus risiko');
    }
  };

  // Mitigation & Residual Modal Handlers
  const handleOpenMitigationModal = (r) => {
    setMitigationFormData({
      id: r.id,
      code: r.code,
      title: r.title,
      risk_score: r.risk_score,
      risk_level: r.risk_level,
      mitigation_action: r.mitigation_action || r.mitigation_plan || '',
      mitigation_pic_id: r.mitigation_pic_id || references.employees[0]?.id || '',
      mitigation_deadline: r.mitigation_deadline ? r.mitigation_deadline.slice(0, 10) : '',
      mitigation_status: r.mitigation_status || 'planned',
      residual_probability: r.residual_probability || Math.max(1, r.probability_val - 1),
      residual_impact: r.residual_impact || Math.max(1, r.impact_val - 1)
    });
    setMitigationModalOpen(true);
  };

  const handleSaveMitigation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.patch(`/manajemen/school-risks/${mitigationFormData.id}/mitigation`, {
        mitigation_action: mitigationFormData.mitigation_action,
        mitigation_pic_id: mitigationFormData.mitigation_pic_id ? Number(mitigationFormData.mitigation_pic_id) : null,
        mitigation_deadline: mitigationFormData.mitigation_deadline || null,
        mitigation_status: mitigationFormData.mitigation_status,
        residual_probability: Number(mitigationFormData.residual_probability),
        residual_impact: Number(mitigationFormData.residual_impact)
      });

      setFeedbackMsg('Rencana mitigasi dan penilaian residual risk berhasil disimpan');
      setMitigationModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan mitigasi risiko');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Score Calculator
  const calcScore = (prob, imp) => {
    const p = Math.max(1, Math.min(5, Number(prob) || 3));
    const i = Math.max(1, Math.min(5, Number(imp) || 3));
    const score = p * i;
    let level = 'low';
    if (score >= 20) level = 'extreme';
    else if (score >= 12) level = 'high';
    else if (score >= 6) level = 'medium';
    return { score, level };
  };

  // Helper Level Badge
  const renderLevelBadge = (level) => {
    switch (level) {
      case 'extreme':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600/20 text-rose-400 border border-rose-600/40">Ekstrem (Kritis)</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/40">Tinggi</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">Sedang</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Rendah</span>;
    }
  };

  // Cell Color for 5x5 Heatmap Matrix
  const getHeatmapCellColor = (score) => {
    if (score >= 20) return 'bg-rose-600/80 hover:bg-rose-600 text-white border-rose-500 shadow-rose-950/50';
    if (score >= 12) return 'bg-orange-500/80 hover:bg-orange-500 text-white border-orange-400 shadow-orange-950/50';
    if (score >= 6) return 'bg-amber-500/80 hover:bg-amber-500 text-slate-950 font-black border-amber-400 shadow-amber-950/50';
    return 'bg-emerald-600/70 hover:bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/50';
  };

  // Filtered Risks
  const filteredRisks = risks.filter((r) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (levelFilter !== 'all' && r.risk_level !== levelFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const code = (r.code || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const cause = (r.root_cause || '').toLowerCase();
      if (!code.includes(s) && !title.includes(s) && !cause.includes(s)) return false;
    }
    return true;
  });

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center text-white font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Manajemen Risiko & Mitigasi Mutu</h2>
          </div>
          <p className="text-xs text-slate-400">
            Identifikasi risiko kelembagaan, pemetaan matriks Heatmap 5×5 interaktif, rencana mitigasi, dan monitoring residual risk.
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
            onClick={handleOpenCreateRisk}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50 transition border border-rose-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Identifikasi Risiko Baru</span>
          </button>
        </div>
      </div>

      {/* Risk Metrics Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-[11px] block">Total Risiko:</span>
          <span className="text-xl font-black text-white">{heatmapData.stats.total}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-600/30 shadow-xl space-y-1">
          <span className="text-rose-400 text-[11px] font-bold block">Ekstrem (20–25):</span>
          <span className="text-xl font-black text-rose-400">{heatmapData.stats.extreme}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-orange-500/30 shadow-xl space-y-1">
          <span className="text-orange-400 text-[11px] font-bold block">Tinggi (12–19):</span>
          <span className="text-xl font-black text-orange-400">{heatmapData.stats.high}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-1">
          <span className="text-amber-400 text-[11px] font-bold block">Sedang (6–11):</span>
          <span className="text-xl font-black text-amber-400">{heatmapData.stats.medium}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-1">
          <span className="text-emerald-400 text-[11px] font-bold block">Rendah (1–5):</span>
          <span className="text-xl font-black text-emerald-400">{heatmapData.stats.low}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'list', label: `Daftar Risiko (${risks.length})`, icon: List },
          { id: 'heatmap', label: 'Peta Risiko (Heatmap 5×5)', icon: Grid },
          { id: 'mitigation', label: 'Mitigasi & Tindakan', icon: ShieldCheck },
          { id: 'residual', label: 'Monitoring Residual Risk', icon: TrendingDown },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DAFTAR RISIKO */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari kode, judul risiko, atau penyebab..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="all">Semua Level Risiko</option>
                <option value="extreme">Ekstrem (20–25)</option>
                <option value="high">Tinggi (12–19)</option>
                <option value="medium">Sedang (6–11)</option>
                <option value="low">Rendah (1–5)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="identified">Teridentifikasi</option>
                <option value="mitigating">Sedang Dimitigasi</option>
                <option value="resolved">Terselesaikan</option>
                <option value="closed">Ditutup</option>
              </select>
            </div>
          </div>

          {/* Table Daftar Risiko */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Judul Risiko & Penyebab</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3 text-center">Prob (1-5)</th>
                  <th className="p-3 text-center">Impact (1-5)</th>
                  <th className="p-3 text-center">Skor & Level</th>
                  <th className="p-3">Relasi Perencanaan</th>
                  <th className="p-3">Risk Owner</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRisks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                      Tidak ada data risiko yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRisks.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{r.code}</td>
                      <td className="p-3 max-w-sm">
                        <div className="font-bold text-white leading-snug">{r.title}</div>
                        {r.root_cause && <div className="text-[10px] text-slate-400 mt-0.5">Penyebab: {r.root_cause}</div>}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-semibold">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-200">{r.probability_val || 3}</td>
                      <td className="p-3 text-center font-bold text-slate-200">{r.impact_val || 3}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-white text-sm">{r.risk_score}</span>
                          {renderLevelBadge(r.risk_level)}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.relation_type && r.relation_type !== 'none' ? (
                          <div className="text-[11px]">
                            <span className="text-indigo-400 font-bold uppercase text-[9px] block">↳ {r.relation_type}:</span>
                            <span className="text-slate-200 font-semibold">{r.relation_name || r.relation_code}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-200">👤 {r.owner_name || 'Belum diatur'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenMitigationModal(r)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                          >
                            Mitigasi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRisk(r)}
                            className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRisk(r.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PETA RISIKO HEATMAP 5x5 */}
      {activeTab === 'heatmap' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Matriks Peta Risiko 5 × 5 (Likelihood vs Impact)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Klik sel matriks untuk melihat daftar risiko spesifik pada kuadran tersebut.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span> Rendah (1-5)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Sedang (6-11)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"></span> Tinggi (12-19)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-600 inline-block"></span> Ekstrem (20-25)</span>
            </div>
          </div>

          {/* 5x5 Grid Heatmap */}
          <div className="overflow-x-auto py-2">
            <div className="min-w-[650px] space-y-2">
              {/* Rows from Prob 5 down to Prob 1 */}
              {[5, 4, 3, 2, 1].map((p) => {
                const probLabels = {
                  5: '5 - Hampir Pasti',
                  4: '4 - Sering',
                  3: '3 - Mungkin',
                  2: '2 - Jarang',
                  1: '1 - Sangat Jarang'
                };

                return (
                  <div key={p} className="flex items-center gap-2">
                    {/* Y-Axis Label */}
                    <div className="w-36 text-right text-[11px] font-bold text-slate-400 pr-2 truncate">
                      {probLabels[p]}
                    </div>

                    {/* 5 Columns for Impact 1..5 */}
                    <div className="grid grid-cols-5 gap-2 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const cell = heatmapData.matrix[p]?.[i] || { score: p * i, count: 0, risks: [] };
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedCellRisks(cell);
                              setCellModalOpen(true);
                            }}
                            className={`p-3 rounded-xl border text-center transition shadow-lg flex flex-col items-center justify-center gap-1 h-20 ${getHeatmapCellColor(cell.score)}`}
                          >
                            <span className="text-[10px] font-mono uppercase opacity-80">Skor {cell.score}</span>
                            <span className="text-xl font-black">{cell.count}</span>
                            <span className="text-[9px] font-bold uppercase">{cell.count > 0 ? 'Risiko' : '-'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* X-Axis Header */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <div className="w-36 text-right text-[10px] text-slate-500 font-bold uppercase">Dampak ➔</div>
                <div className="grid grid-cols-5 gap-2 flex-1 text-center text-[10px] font-bold text-slate-400">
                  <div>1 - Sangat Rendah</div>
                  <div>2 - Rendah</div>
                  <div>3 - Sedang</div>
                  <div>4 - Tinggi</div>
                  <div>5 - Kritis/Katastropik</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MITIGASI */}
      {activeTab === 'mitigation' && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Judul Risiko</th>
                  <th className="p-3">Rencana Tindakan Mitigasi</th>
                  <th className="p-3">PIC Penanggung Jawab</th>
                  <th className="p-3">Tenggat Waktu</th>
                  <th className="p-3">Status Mitigasi</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {risks.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{r.code}</td>
                    <td className="p-3 font-bold text-white max-w-xs">{r.title}</td>
                    <td className="p-3 max-w-sm text-slate-200">
                      {r.mitigation_action || r.mitigation_plan ? (
                        <div>{r.mitigation_action || r.mitigation_plan}</div>
                      ) : (
                        <span className="text-slate-500 italic">Belum ada tindakan mitigasi</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-200">👤 {r.mitigation_pic_name || 'Belum diatur'}</td>
                    <td className="p-3 font-semibold text-slate-300">{r.mitigation_deadline ? r.mitigation_deadline.slice(0, 10) : '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.mitigation_status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        r.mitigation_status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        r.mitigation_status === 'delayed' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {r.mitigation_status || 'planned'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenMitigationModal(r)}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px]"
                      >
                        Update Mitigasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MONITORING RESIDUAL RISK */}
      {activeTab === 'residual' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Monitoring Penurunan Tingkat Risiko (Inherent vs Residual)</h3>
            <span className="text-xs text-slate-400">Efektivitas Implementasi Kontrol Mitigasi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Judul Risiko</th>
                  <th className="p-3 text-center">Inherent Risk (Awal)</th>
                  <th className="p-3 text-center"></th>
                  <th className="p-3 text-center">Residual Risk (Pasca-Mitigasi)</th>
                  <th className="p-3 text-center">Reduksi Skor</th>
                  <th className="p-3 text-center rounded-r-xl">Status Mitigasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {risks.map((r) => {
                  const hasResidual = r.residual_score !== null && r.residual_score !== undefined;
                  const reduction = hasResidual ? r.risk_score - r.residual_score : null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{r.code}</td>
                      <td className="p-3 font-bold text-white max-w-xs">{r.title}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-white">{r.risk_score} (P:{r.probability_val} × I:{r.impact_val})</span>
                          {renderLevelBadge(r.risk_level)}
                        </div>
                      </td>
                      <td className="p-3 text-center text-slate-500">
                        <ArrowRight className="w-4 h-4 mx-auto" />
                      </td>
                      <td className="p-3 text-center">
                        {hasResidual ? (
                          <div className="flex flex-col items-center">
                            <span className="font-black text-emerald-400">{r.residual_score} (P:{r.residual_probability} × I:{r.residual_impact})</span>
                            {renderLevelBadge(r.residual_level)}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Belum dinilai</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {reduction !== null ? (
                          <span className="font-black text-emerald-400 text-sm flex items-center justify-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>-{reduction} Poin</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {r.mitigation_status || 'planned'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DAFTAR RISIKO PER SEL HEATMAP */}
      {cellModalOpen && selectedCellRisks && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Risiko pada Koordinat: Probabilitas {selectedCellRisks.probability} × Dampak {selectedCellRisks.impact}
                </h3>
                <span className="text-xs text-slate-400 font-mono">Skor Risiko: {selectedCellRisks.score} ({selectedCellRisks.level.toUpperCase()})</span>
              </div>
              <button onClick={() => setCellModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedCellRisks.risks.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">Tidak ada risiko pada koordinat ini.</div>
              ) : (
                selectedCellRisks.risks.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-mono text-amber-400 font-bold">{r.code}</span>
                      <h4 className="font-bold text-white">{r.title}</h4>
                      <div className="text-[10px] text-slate-400">Kategori: {r.category} | Owner: {r.owner_name || '-'}</div>
                    </div>
                    <div>{renderLevelBadge(r.risk_level)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setCellModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IDENTIFIKASI / UBAH RISIKO */}
      {riskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {riskEditMode ? 'Ubah Data Identifikasi Risiko' : 'Identifikasi Risiko Baru'}
              </h3>
              <button onClick={() => setRiskModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Risiko *</label>
                  <input
                    type="text"
                    required
                    value={riskFormData.code}
                    onChange={(e) => setRiskFormData({ ...riskFormData, code: e.target.value })}
                    placeholder="RSK-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori Risiko *</label>
                  <select
                    value={riskFormData.category}
                    onChange={(e) => setRiskFormData({ ...riskFormData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Operasional & Sarpras">Operasional & Sarpras</option>
                    <option value="Akademik & Kurikulum">Akademik & Kurikulum</option>
                    <option value="Sumber Daya Manusia (SDM)">Sumber Daya Manusia (SDM)</option>
                    <option value="Keuangan & Likuiditas">Keuangan & Likuiditas</option>
                    <option value="Teknologi Informasi & Keamanan">Teknologi Informasi & Keamanan</option>
                    <option value="Kepatuhan & Regulasi">Kepatuhan & Regulasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul / Peristiwa Risiko *</label>
                <input
                  type="text"
                  required
                  value={riskFormData.title}
                  onChange={(e) => setRiskFormData({ ...riskFormData, title: e.target.value })}
                  placeholder="Contoh: Keterlambatan Penyediaan Sarana Komputer Ujian Asesmen"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Penyebab Pokok (Root Cause)</label>
                  <textarea
                    rows={2}
                    value={riskFormData.root_cause}
                    onChange={(e) => setRiskFormData({ ...riskFormData, root_cause: e.target.value })}
                    placeholder="Faktor penyebab munculnya risiko..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dampak Potensial</label>
                  <textarea
                    rows={2}
                    value={riskFormData.impact_description}
                    onChange={(e) => setRiskFormData({ ...riskFormData, impact_description: e.target.value })}
                    placeholder="Dampak terhadap operasional/mutu sekolah..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  ></textarea>
                </div>
              </div>

              {/* Matriks Penilaian 1-5 & Live Score */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <span className="font-bold text-amber-400 uppercase text-[10px] block">
                  Penilaian Probabilitas & Dampak Inherent (Skala 1 - 5):
                </span>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Probabilitas (1 - 5)</label>
                    <select
                      value={riskFormData.probability_val}
                      onChange={(e) => setRiskFormData({ ...riskFormData, probability_val: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value={1}>1 - Sangat Jarang</option>
                      <option value={2}>2 - Jarang</option>
                      <option value={3}>3 - Mungkin</option>
                      <option value={4}>4 - Sering</option>
                      <option value={5}>5 - Hampir Pasti</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Dampak / Severity (1 - 5)</label>
                    <select
                      value={riskFormData.impact_val}
                      onChange={(e) => setRiskFormData({ ...riskFormData, impact_val: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value={1}>1 - Sangat Rendah</option>
                      <option value={2}>2 - Rendah</option>
                      <option value={3}>3 - Sedang</option>
                      <option value={4}>4 - Tinggi</option>
                      <option value={5}>5 - Kritis / Katastropik</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Skor & Level Terhitung:</span>
                    <span className="text-xl font-black text-white">{calcScore(riskFormData.probability_val, riskFormData.impact_val).score}</span>
                    <div className="mt-1">{renderLevelBadge(calcScore(riskFormData.probability_val, riskFormData.impact_val).level)}</div>
                  </div>
                </div>
              </div>

              {/* Relasi Perencanaan & Risk Owner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Keterhubungan Sasaran Strategis</label>
                  <select
                    value={riskFormData.relation_id}
                    onChange={(e) => {
                      const sg = strategicGoals.find(g => String(g.id) === e.target.value);
                      setRiskFormData({
                        ...riskFormData,
                        relation_type: sg ? 'sasaran' : 'none',
                        relation_id: e.target.value,
                        relation_code: sg?.code || '',
                        relation_name: sg?.name || ''
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Tidak Ditautkan --</option>
                    {strategicGoals.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.code}: {sg.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Penanggung Jawab (Risk Owner)</label>
                  <select
                    value={riskFormData.owner_employee_id}
                    onChange={(e) => setRiskFormData({ ...riskFormData, owner_employee_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih Pegawai --</option>
                    {references.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRiskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Risiko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TINDAKAN MITIGASI & RESIDUAL RISK */}
      {mitigationModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded">
                  {mitigationFormData.code}
                </span>
                <h3 className="text-sm font-bold text-white">{mitigationFormData.title}</h3>
                <div className="text-[11px] text-slate-400">Inherent Risk Score: <strong className="text-white">{mitigationFormData.risk_score}</strong> ({mitigationFormData.risk_level.toUpperCase()})</div>
              </div>
              <button onClick={() => setMitigationModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMitigation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rencana Tindakan Mitigasi *</label>
                <textarea
                  rows={3}
                  required
                  value={mitigationFormData.mitigation_action}
                  onChange={(e) => setMitigationFormData({ ...mitigationFormData, mitigation_action: e.target.value })}
                  placeholder="Langkah preventif atau perbaikan yang akan dieksekusi..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">PIC Mitigasi</label>
                  <select
                    value={mitigationFormData.mitigation_pic_id}
                    onChange={(e) => setMitigationFormData({ ...mitigationFormData, mitigation_pic_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih PIC --</option>
                    {references.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tenggat Waktu</label>
                  <DatePickerField
                    value={mitigationFormData.mitigation_deadline}
                    onChange={(iso) => setMitigationFormData({ ...mitigationFormData, mitigation_deadline: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Progres</label>
                  <select
                    value={mitigationFormData.mitigation_status}
                    onChange={(e) => setMitigationFormData({ ...mitigationFormData, mitigation_status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="planned">Direncanakan</option>
                    <option value="in_progress">Sedang Berjalan</option>
                    <option value="completed">Selesai / Efektif</option>
                    <option value="delayed">Tertunda</option>
                  </select>
                </div>
              </div>

              {/* Penilaian Residual Risk (Pasca Mitigasi) */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <span className="font-bold text-teal-400 uppercase text-[10px] block">
                  Penilaian Residual Risk (Sisa Risiko Setelah Mitigasi):
                </span>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Residual Prob (1 - 5)</label>
                    <select
                      value={mitigationFormData.residual_probability}
                      onChange={(e) => setMitigationFormData({ ...mitigationFormData, residual_probability: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value={1}>1 - Sangat Jarang</option>
                      <option value={2}>2 - Jarang</option>
                      <option value={3}>3 - Mungkin</option>
                      <option value={4}>4 - Sering</option>
                      <option value={5}>5 - Hampir Pasti</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Residual Impact (1 - 5)</label>
                    <select
                      value={mitigationFormData.residual_impact}
                      onChange={(e) => setMitigationFormData({ ...mitigationFormData, residual_impact: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value={1}>1 - Sangat Rendah</option>
                      <option value={2}>2 - Rendah</option>
                      <option value={3}>3 - Sedang</option>
                      <option value={4}>4 - Tinggi</option>
                      <option value={5}>5 - Kritis</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-center space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Skor Residual:</span>
                    <span className="text-xl font-black text-emerald-400">
                      {calcScore(mitigationFormData.residual_probability, mitigationFormData.residual_impact).score}
                    </span>
                    <div className="mt-1">
                      {renderLevelBadge(calcScore(mitigationFormData.residual_probability, mitigationFormData.residual_impact).level)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMitigationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Mitigasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
