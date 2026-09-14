import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../components/shared/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  Activity,
  Award,
  Building2,
  School,
  Plus,
  Save,
  Send,
  History,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Clock,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Target,
  FileCheck
} from 'lucide-react';

export default function SelfEvaluation() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context: Unit vs Foundation
  const [contextType, setContextType] = useState('school_unit');
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );

  // Active Main Tab: 'evadir' | 'publications'
  const [mainTab, setMainTab] = useState('evadir');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [ripsDoc, setRipsDoc] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [goalResults, setGoalResults] = useState([]);
  const [inputsState, setInputsState] = useState({}); // { [goal_id]: { input_mode, achieved_percent, achieved_numerator, achieved_denominator, analysis_notes } }
  const [saveLoading, setSaveLoading] = useState(false);
  const [publications, setPublications] = useState([]);

  // Modals
  const [modalType, setModalType] = useState(null); // 'create_report' | 'publish' | 'view_pub' | 'create_rtl'
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPubSnapshot, setSelectedPubSnapshot] = useState(null);
  const [selectedGoalForRtl, setSelectedGoalForRtl] = useState(null);

  // Sync active school unit
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // 1. Fetch RIPS Doc & Reports List
  const fetchReports = async () => {
    try {
      setLoading(true);
      const schoolUnitQuery = contextType === 'school_unit' ? `?school_unit_id=${selectedUnitId}` : '';
      
      // Get RIPS Doc
      const docRes = await api.get(`/manajemen/rips/documents/current${schoolUnitQuery}`);
      if (docRes.data?.success) {
        setRipsDoc(docRes.data.data);
      }

      // Get EVADIR Reports
      const query = contextType === 'school_unit'
        ? `school_unit_id=${selectedUnitId}`
        : `foundation_only=true`;
      const repRes = await api.get(`/manajemen/evadir/evadir-reports?${query}`);
      if (repRes.data?.success) {
        const list = repRes.data.data || [];
        setReportsList(list);
        if (list.length > 0) {
          fetchReportDetails(list[0].id);
        } else {
          setActiveReport(null);
          setGoalResults([]);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching EVADIR reports:', err);
      setLoading(false);
    }
  };

  // 2. Fetch Report Goal Results
  const fetchReportDetails = async (reportId) => {
    try {
      setLoading(true);
      const [repRes, goalRes, pubRes] = await Promise.all([
        api.get(`/manajemen/evadir/evadir-reports/${reportId}`),
        api.get(`/manajemen/evadir/evadir-reports/${reportId}/goal-results`),
        api.get(`/manajemen/evadir/evadir-reports/${reportId}/publications`),
      ]);

      if (repRes.data?.success) setActiveReport(repRes.data.data);
      if (pubRes.data?.success) setPublications(pubRes.data.data || []);

      if (goalRes.data?.success) {
        const results = goalRes.data.data || [];
        setGoalResults(results);

        // Pre-fill inputs state
        const initial = {};
        results.forEach((g) => {
          initial[g.goal_id] = {
            input_mode: g.input_mode || 'percent',
            achieved_percent: g.achieved_percent !== null && g.achieved_percent !== undefined ? g.achieved_percent : '',
            achieved_numerator: g.achieved_numerator !== null && g.achieved_numerator !== undefined ? g.achieved_numerator : '',
            achieved_denominator: g.achieved_denominator !== null && g.achieved_denominator !== undefined ? g.achieved_denominator : '',
            analysis_notes: g.analysis_notes || '',
          };
        });
        setInputsState(initial);
      }
    } catch (err) {
      console.error('Error fetching EVADIR report details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [contextType, selectedUnitId]);

  // Handle cell input change
  const handleInputChange = (goalId, field, val) => {
    setInputsState((prev) => {
      const current = prev[goalId] || { input_mode: 'percent' };
      const updated = { ...current, [field]: val };

      // Auto-compute achieved_percent preview if unit_ratio
      if (updated.input_mode === 'unit_ratio' && (field === 'achieved_numerator' || field === 'achieved_denominator')) {
        const num = Number(field === 'achieved_numerator' ? val : updated.achieved_numerator) || 0;
        const den = Number(field === 'achieved_denominator' ? val : updated.achieved_denominator) || 0;
        updated.achieved_percent = den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0;
      }

      return {
        ...prev,
        [goalId]: updated,
      };
    });
  };

  // Toggle mode percent vs unit_ratio
  const toggleInputMode = (goalId) => {
    setInputsState((prev) => {
      const current = prev[goalId] || {};
      const newMode = current.input_mode === 'unit_ratio' ? 'percent' : 'unit_ratio';
      return {
        ...prev,
        [goalId]: {
          ...current,
          input_mode: newMode,
        },
      };
    });
  };

  // Save Goal Results in Bulk
  const handleSaveResults = async () => {
    if (!activeReport) return;
    setSaveLoading(true);

    const items = Object.keys(inputsState).map((gId) => {
      const st = inputsState[gId];
      return {
        rips_goal_id: Number(gId),
        input_mode: st.input_mode,
        achieved_percent: st.achieved_percent !== '' && st.achieved_percent !== null ? Number(st.achieved_percent) : null,
        achieved_numerator: st.achieved_numerator !== '' && st.achieved_numerator !== null ? Number(st.achieved_numerator) : null,
        achieved_denominator: st.achieved_denominator !== '' && st.achieved_denominator !== null ? Number(st.achieved_denominator) : null,
        analysis_notes: st.analysis_notes || null,
      };
    });

    try {
      await api.put(`/manajemen/evadir/evadir-reports/${activeReport.id}/goal-results/bulk`, { items });
      alert('Hasil evaluasi sasaran berhasil disimpan!');
      fetchReportDetails(activeReport.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil evaluasi');
    } finally {
      setSaveLoading(false);
    }
  };

  // Create Report Submit
  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!ripsDoc?.id) {
      alert('Dokumen RIPS belum tersedia.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post('/manajemen/evadir/evadir-reports', {
        school_unit_id: contextType === 'school_unit' ? selectedUnitId : null,
        rips_document_id: ripsDoc.id,
        period_label: formData.period_label,
        evaluation_date: formData.evaluation_date,
      });

      setModalType(null);
      setFormData({});
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat laporan EVADIR');
    } finally {
      setFormLoading(false);
    }
  };

  // Publish Report Submit
  const handlePublishReport = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post(`/manajemen/evadir/evadir-reports/${activeReport.id}/publish`, {
        document_number: formData.document_number,
        title: formData.title,
        effective_date: formData.effective_date,
        change_summary: formData.change_summary,
      });

      setModalType(null);
      setFormData({});
      fetchReportDetails(activeReport.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan laporan EVADIR');
    } finally {
      setFormLoading(false);
    }
  };

  // Create RTL (Rencana Tindak Lanjut)
  const handleCreateRtlSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/manajemen/evaluation-follow-ups', {
        school_unit_id: contextType === 'school_unit' ? selectedUnitId : null,
        source_type: 'evadir',
        source_id: activeReport.id,
        finding_notes: formData.finding_notes,
        action_plan: formData.action_plan,
        pic_employee_id: formData.pic_employee_id ? Number(formData.pic_employee_id) : null,
        due_date: formData.due_date,
        status: 'pending',
      });
      alert('Rencana Tindak Lanjut (RTL) berhasil dibuat ke modul RTL!');
      setModalType(null);
      setFormData({});
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat RTL');
    } finally {
      setFormLoading(false);
    }
  };

  const selectedUnit = schoolUnits?.find((u) => u.id === Number(selectedUnitId));

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Evaluasi Diri (EVADIR)</h1>
                {activeReport && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeReport.period_label} (v{activeReport.current_version})
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Pengukuran ketercapaian sasaran strategis RIPS & BSC secara objektif dengan analisis gap target dan tindak lanjut (RTL)
              </p>
            </div>
          </div>

          {/* Context Controls & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Context Switcher */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setContextType('school_unit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  contextType === 'school_unit'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Satuan
              </button>
              <button
                onClick={() => setContextType('foundation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  contextType === 'foundation'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Yayasan
              </button>

              {contextType === 'school_unit' && (
                <SearchableSelect
                  value={selectedUnitId}
                  onChange={(val) => setSelectedUnitId(Number(val))}
                  className="w-56"
                  options={schoolUnits?.map((unit) => ({
                    value: unit.id,
                    label: `${unit.name} (${unit.level})`,
                  })) || []}
                />
              )}
            </div>

            {/* Create Report Button */}
            <button
              onClick={() => {
                setFormData({
                  period_label: `Semester 1 ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
                  evaluation_date: new Date().toISOString().substring(0, 10),
                });
                setModalType('create_report');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Buat Periode Evaluasi
            </button>

            {/* Save Results Button */}
            {activeReport && (
              <button
                onClick={handleSaveResults}
                disabled={saveLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/40"
              >
                <Save className="w-3.5 h-3.5" />
                {saveLoading ? 'Menyimpan...' : 'Simpan Capaian'}
              </button>
            )}

            {/* Publish Report Button */}
            {activeReport && (
              <button
                onClick={() => {
                  setFormData({
                    document_number: `SK-EVADIR/${activeReport.period_label.replace(/[^a-zA-Z0-9]/g, '-')}/V${activeReport.current_version || 1}`,
                    title: `Laporan EVADIR ${activeReport.period_label} (Versi Resmi ${activeReport.current_version || 1})`,
                    effective_date: activeReport.evaluation_date,
                    change_summary: '',
                  });
                  setModalType('publish');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-3.5 h-3.5" />
                Terbitkan EVADIR
              </button>
            )}
          </div>
        </div>

        {/* Report Selector Banner if multiple */}
        {reportsList.length > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs overflow-x-auto pb-1">
            <span className="text-slate-400 font-semibold whitespace-nowrap">Pilih Periode Laporan:</span>
            {reportsList.map((rep) => (
              <button
                key={rep.id}
                onClick={() => fetchReportDetails(rep.id)}
                className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition ${
                  activeReport?.id === rep.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {rep.period_label} ({new Date(rep.evaluation_date).toLocaleDateString('id-ID')})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setMainTab('evadir')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            mainTab === 'evadir'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          Matriks Capaian Sasaran RIPS ({goalResults.length})
        </button>

        <button
          onClick={() => setMainTab('publications')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            mainTab === 'publications'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Penerbitan SK EVADIR ({publications.length})
        </button>
      </div>

      {/* TAB 1: MATRIKS EVALUASI SASARAN */}
      {mainTab === 'evadir' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          {!activeReport ? (
            <div className="py-12 text-center space-y-3">
              <Activity className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Belum Ada Laporan EVADIR</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Klik tombol "Buat Periode Evaluasi" di atas untuk memulai evaluasi diri ketercapaian sasaran RIPS.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    Penilaian Sasaran Strategis ({activeReport.period_label})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bandingkan capaian nyata terhadap target RIPS. Gunakan toggle % vs Rasio Satuan untuk kemudahan input.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Status Laporan:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      activeReport.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {activeReport.status}
                  </span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Kode / Sasaran RIPS</th>
                      <th className="py-3 px-3">Bidang & BSC</th>
                      <th className="py-3 px-2 text-center">Baseline</th>
                      <th className="py-3 px-2 text-center">Target</th>
                      <th className="py-3 px-3 min-w-[200px]">Input Realisasi Capaian</th>
                      <th className="py-3 px-2 text-center">Hasil (%)</th>
                      <th className="py-3 px-3">Catatan Analisis & Evaluasi</th>
                      <th className="py-3 px-3 text-right">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {goalResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Belum ada sasaran RIPS yang terhubung ke dokumen ini.
                        </td>
                      </tr>
                    ) : (
                      goalResults.map((row) => {
                        const st = inputsState[row.goal_id] || { input_mode: 'percent' };
                        const finalPct = Number(st.achieved_percent) || 0;
                        const targetPct = Number(row.target_percent) || 100;
                        const gap = finalPct - targetPct;
                        const isUnder = gap < -10;

                        return (
                          <tr key={row.goal_id} className="hover:bg-slate-800/30 transition">
                            {/* Sasaran */}
                            <td className="py-3 px-3 max-w-xs">
                              <span className="font-mono text-xs font-bold text-indigo-400 block">{row.goal_code}</span>
                              <span className="font-semibold text-white block text-xs">{row.goal_title}</span>
                              <span className="text-[11px] text-slate-400 mt-0.5 block">
                                {row.indicator_name} ({row.indicator_unit})
                              </span>
                            </td>

                            {/* Bidang & BSC */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-slate-300 block font-medium">{row.domain_name || '-'}</span>
                              <span className="text-[10px] text-indigo-400">{row.bsc_aspect_name || '-'}</span>
                            </td>

                            {/* Baseline */}
                            <td className="py-3 px-2 text-center font-bold text-slate-400">
                              {row.baseline_percent}%
                            </td>

                            {/* Target */}
                            <td className="py-3 px-2 text-center font-bold text-emerald-400">
                              {row.target_percent}%
                            </td>

                            {/* Input Form Cell (Toggle mode) */}
                            <td className="py-3 px-3">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => toggleInputMode(row.goal_id)}
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                                  >
                                    {st.input_mode === 'unit_ratio' ? '🔁 Mode Persen Langsung' : '🔁 Mode Rasio Satuan'}
                                  </button>
                                </div>

                                {st.input_mode === 'unit_ratio' ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Capaian"
                                      value={st.achieved_numerator ?? ''}
                                      onChange={(e) => handleInputChange(row.goal_id, 'achieved_numerator', e.target.value)}
                                      className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-center text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-slate-500 font-bold">/</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Total"
                                      value={st.achieved_denominator ?? ''}
                                      onChange={(e) => handleInputChange(row.goal_id, 'achieved_denominator', e.target.value)}
                                      className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-center text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="0 - 100"
                                    value={st.achieved_percent ?? ''}
                                    onChange={(e) => handleInputChange(row.goal_id, 'achieved_percent', e.target.value)}
                                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-center text-xs text-emerald-400 font-bold outline-none focus:border-indigo-500"
                                  />
                                )}
                              </div>
                            </td>

                            {/* Computed Result % */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <span className={`font-bold text-xs ${isUnder ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {st.achieved_percent !== '' ? `${st.achieved_percent}%` : '-'}
                              </span>
                              {st.achieved_percent !== '' && (
                                <span className={`block text-[10px] ${gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {gap >= 0 ? `+${gap}%` : `${gap}%`}
                                </span>
                              )}
                            </td>

                            {/* Analysis Notes */}
                            <td className="py-3 px-3">
                              <textarea
                                rows={2}
                                value={st.analysis_notes ?? ''}
                                onChange={(e) => handleInputChange(row.goal_id, 'analysis_notes', e.target.value)}
                                placeholder="Analisis penyebab atau kendala..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* RTL Action Button */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {isUnder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGoalForRtl(row);
                                    setFormData({
                                      finding_notes: `Sasaran ${row.goal_code} (${row.goal_title}) tidak tercapai pada EVADIR ${activeReport.period_label}. Capaian: ${st.achieved_percent}%, Target: ${row.target_percent}%. Analisis: ${st.analysis_notes || '-'}`,
                                      action_plan: '',
                                      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
                                    });
                                    setModalType('create_rtl');
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                                >
                                  <AlertTriangle className="w-3 h-3" /> Buat RTL
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
                <span>
                  💡 <strong>Integrasi Sasaran:</strong> Evaluasi ini langsung menggunakan kamus sasaran RIPS dan tidak menduplikasi indikator baru.
                </span>
                <button
                  onClick={handleSaveResults}
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shrink-0 ml-3"
                >
                  {saveLoading ? 'Menyimpan...' : 'Simpan Semua Capaian'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLICATIONS HISTORY */}
      {mainTab === 'publications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Riwayat Penerbitan Dokumen Resmi EVADIR
            </h3>
            <p className="text-xs text-slate-400">
              Daftar snapshot freeze laporan evaluasi diri yang telah diterbitkan dengan SK resmi
            </p>
          </div>

          <div className="space-y-4">
            {publications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada versi resmi EVADIR yang diterbitkan untuk laporan ini.
              </div>
            ) : (
              publications.map((pub) => {
                let snapshot = null;
                try {
                  snapshot = typeof pub.snapshot_json === 'string' ? JSON.parse(pub.snapshot_json) : pub.snapshot_json;
                } catch (e) {}

                return (
                  <div
                    key={pub.id}
                    className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          EVADIR v{pub.version_number}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          No. SK: {pub.document_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pub.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {pub.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{pub.title}</h4>
                      <p className="text-xs text-slate-400">{pub.change_summary || 'Tidak ada catatan perubahan.'}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Berlaku: {pub.effective_date ? new Date(pub.effective_date).toLocaleDateString('id-ID') : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Diterbitkan: {new Date(pub.published_at || pub.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          setSelectedPubSnapshot(snapshot);
                          setModalType('view_pub');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        Lihat Snapshot
                      </button>

                      {pub.file_url && (
                        <a
                          href={pub.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Unduh Dokumen
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE REPORT */}
      {modalType === 'create_report' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Buat Periode Laporan EVADIR Baru</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Label Periode Evaluasi</label>
                <input
                  type="text"
                  required
                  value={formData.period_label || ''}
                  onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                  placeholder="Contoh: Semester 1 2026/2027 atau Triwulan IV 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Evaluasi</label>
                <DatePickerField
                  value={formData.evaluation_date || ''}
                  onChange={(iso) => setFormData({ ...formData, evaluation_date: iso })}
                  required={true}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                >
                  {formLoading ? 'Membuat...' : 'Buat Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PUBLISH EVADIR */}
      {modalType === 'publish' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Terbitkan Laporan Resmi EVADIR
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handlePublishReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Surat / SK</label>
                <input
                  type="text"
                  required
                  value={formData.document_number || ''}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen Publikasi</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Berlaku</label>
                <DatePickerField
                  value={formData.effective_date || ''}
                  onChange={(iso) => setFormData({ ...formData, effective_date: iso })}
                  required={true}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ringkasan Temuan & Catatan</label>
                <textarea
                  rows={3}
                  value={formData.change_summary || ''}
                  onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                  placeholder="Ringkasan eksekutif capaian mutu..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                >
                  {formLoading ? 'Menerbitkan...' : 'Terbitkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE RTL (FOLLOW UP) */}
      {modalType === 'create_rtl' && selectedGoalForRtl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Buat Rencana Tindak Lanjut (RTL)
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRtlSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Temuan / Masalah</label>
                <textarea
                  rows={3}
                  value={formData.finding_notes || ''}
                  onChange={(e) => setFormData({ ...formData, finding_notes: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rencana Tindak Lanjut (Action Plan)</label>
                <textarea
                  rows={3}
                  value={formData.action_plan || ''}
                  onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                  required
                  placeholder="Langkah perbaikan yang akan dilakukan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tenggat Waktu Pelaksanaan</label>
                <DatePickerField
                  value={formData.due_date || ''}
                  onChange={(iso) => setFormData({ ...formData, due_date: iso })}
                  required={true}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan RTL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW SNAPSHOT */}
      {modalType === 'view_pub' && selectedPubSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Snapshot Freeze Laporan EVADIR</h3>
                <p className="text-xs text-slate-400">
                  Diterbitkan pada: {new Date(selectedPubSnapshot.published_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400 uppercase text-[10px]">Periode Laporan</span>
                <h4 className="text-sm font-bold text-white">{selectedPubSnapshot.report?.period_label}</h4>
                <p className="text-slate-400">
                  Tanggal Evaluasi: {selectedPubSnapshot.report?.evaluation_date ? new Date(selectedPubSnapshot.report.evaluation_date).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Sasaran</th>
                      <th className="p-2.5 text-center">Baseline</th>
                      <th className="p-2.5 text-center">Target</th>
                      <th className="p-2.5 text-center">Capaian</th>
                      <th className="p-2.5">Analisis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedPubSnapshot.goal_results?.map((g) => (
                      <tr key={g.goal_id}>
                        <td className="p-2.5 font-medium text-white">{g.goal_code}: {g.goal_title}</td>
                        <td className="p-2.5 text-center">{g.baseline_percent}%</td>
                        <td className="p-2.5 text-center text-emerald-400 font-bold">{g.target_percent}%</td>
                        <td className="p-2.5 text-center font-bold text-indigo-400">{g.achieved_percent !== null ? `${g.achieved_percent}%` : '-'}</td>
                        <td className="p-2.5 text-slate-400">{g.analysis_notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
