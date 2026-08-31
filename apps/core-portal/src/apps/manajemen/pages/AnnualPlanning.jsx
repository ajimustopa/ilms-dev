import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DatePickerField from '../components/shared/DatePickerField';
import {
  CalendarDays,
  Target,
  FileText,
  Plus,
  Compass,
  Layers,
  Award,
  CheckCircle2,
  DollarSign,
  Clock,
  User,
  ChevronRight,
  Filter,
  Download,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  X,
  ExternalLink,
  Calendar,
  Building,
  TrendingUp,
  Percent,
  Check,
  GitBranch,
  FolderTree
} from 'lucide-react';

export default function AnnualPlanning() {
  const { user, activeSchoolUnit, schoolUnits } = useAuth();
  const [activeTab, setActiveTab] = useState('rkt'); // 'rkt' | 'renop' | 'programs' | 'activities' | 'targets' | 'budget' | 'timeline' | 'documents'
  const [renopViewMode, setRenopViewMode] = useState('tree'); // 'tree' | 'list'

  // Data States
  const [rktList, setRktList] = useState([]);
  const [selectedRkt, setSelectedRkt] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [strategicGoals, setStrategicGoals] = useState([]);
  const [rkjmList, setRkjmList] = useState([]);
  const [references, setReferences] = useState({ employees: [], academic_years: [] });

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modal RKT States
  const [rktModalOpen, setRktModalOpen] = useState(false);
  const [rktEditMode, setRktEditMode] = useState(false);
  const [rktFormData, setRktFormData] = useState({
    id: null,
    plan_type: 'rkt',
    code: '',
    title: '',
    parent_plan_id: '',
    academic_year_id: '',
    period_start_year: 2026,
    period_end_year: 2027,
    program_focus: '',
    budget_ceiling_reference: '',
    description: '',
    document_url: '',
    school_unit_id: '',
    status: 'draft'
  });

  // Modal Program States
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programEditMode, setProgramEditMode] = useState(false);
  const [programFormData, setProgramFormData] = useState({
    id: null,
    school_work_plan_id: '',
    strategic_goal_id: '',
    code: '',
    title: '',
    unit_name: 'Bidang Kurikulum & Akademik',
    pic_employee_id: '',
    description: '',
    target: '',
    indicator: '',
    budget_estimate_reference: '',
    progress_percent: 0,
    status: 'ongoing',
    start_date: '',
    end_date: '',
    school_unit_id: ''
  });

  // Modal Activity States (Renop)
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityEditMode, setActivityEditMode] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    id: null,
    work_plan_program_id: '',
    parent_activity_id: '',
    code: '',
    name: '',
    description: '',
    output: '',
    target_output: '',
    unit: 'Dokumen',
    start_date: '',
    end_date: '',
    pic_employee_id: '',
    unit_name: 'Bidang Kurikulum & Akademik',
    budget_reference: '',
    budget_account_code: '',
    progress_percent: 0,
    status: 'in_progress',
    document_url: '',
    school_unit_id: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch all RKT, Programs, Activities
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [rktRes, progRes, actRes, refsRes, goalsRes, rkjmRes] = await Promise.all([
        api.get('/manajemen/school-work-plans?plan_type=rkt'),
        api.get('/manajemen/work-plan-programs'),
        api.get('/manajemen/work-plan-activities'),
        api.get('/manajemen/planning-references'),
        api.get('/manajemen/strategic-goals'),
        api.get('/manajemen/school-work-plans?plan_type=rkjm')
      ]);

      const rkts = rktRes.data?.data || [];
      const progs = progRes.data?.data || [];
      const acts = actRes.data?.data || [];
      const refs = refsRes.data?.data || { employees: [], academic_years: [] };

      setRktList(rkts);
      setPrograms(progs);
      setActivities(acts);
      setReferences(refs);
      setStrategicGoals(goalsRes.data?.data || []);
      setRkjmList(rkjmRes.data?.data || []);

      if (rkts.length > 0) {
        if (!selectedRkt || !rkts.find((r) => r.id === selectedRkt.id)) {
          setSelectedRkt(rkts[0]);
        } else {
          setSelectedRkt(rkts.find((r) => r.id === selectedRkt.id));
        }
      } else {
        setSelectedRkt(null);
      }
    } catch (err) {
      console.error('Error fetching annual planning data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data RKT & Renop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  // Open Create RKT Modal
  const handleOpenCreateRkt = () => {
    setRktEditMode(false);
    const startYear = new Date().getFullYear();
    setRktFormData({
      id: null,
      plan_type: 'rkt',
      code: `RKT-${startYear}/${startYear + 1}`,
      title: `Rencana Kerja Tahunan TA ${startYear}/${startYear + 1}`,
      parent_plan_id: rkjmList[0]?.id || '',
      academic_year_id: references.academic_years[0]?.id || '',
      period_start_year: startYear,
      period_end_year: startYear + 1,
      program_focus: 'Peningkatan Mutu Pembelajaran & Layanan Santri',
      budget_ceiling_reference: 'Rp 500.000.000',
      description: 'Dokumen RKT panduan kerja operasional tahunan satuan',
      document_url: '',
      school_unit_id: activeSchoolUnit?.id || '',
      status: 'draft'
    });
    setRktModalOpen(true);
  };

  // Open Edit RKT Modal
  const handleOpenEditRkt = (rkt) => {
    setRktEditMode(true);
    setRktFormData({
      id: rkt.id,
      plan_type: 'rkt',
      code: rkt.code || '',
      title: rkt.title,
      parent_plan_id: rkt.parent_plan_id || '',
      academic_year_id: rkt.academic_year_id || '',
      period_start_year: rkt.period_start_year || 2026,
      period_end_year: rkt.period_end_year || 2027,
      program_focus: rkt.program_focus || '',
      budget_ceiling_reference: rkt.budget_ceiling_reference || '',
      description: rkt.description || '',
      document_url: rkt.document_url || '',
      school_unit_id: rkt.school_unit_id || '',
      status: rkt.status || 'draft'
    });
    setRktModalOpen(true);
  };

  // Save RKT
  const handleSaveRkt = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...rktFormData,
        plan_type: 'rkt',
        parent_plan_id: rktFormData.parent_plan_id ? Number(rktFormData.parent_plan_id) : null,
        academic_year_id: rktFormData.academic_year_id ? Number(rktFormData.academic_year_id) : null,
        school_unit_id: rktFormData.school_unit_id ? Number(rktFormData.school_unit_id) : null,
        period_start_year: Number(rktFormData.period_start_year),
        period_end_year: Number(rktFormData.period_end_year)
      };

      if (rktEditMode) {
        await api.put(`/manajemen/school-work-plans/${rktFormData.id}`, payload);
        setFeedbackMsg('RKT berhasil diperbarui');
      } else {
        await api.post('/manajemen/school-work-plans', payload);
        setFeedbackMsg('RKT baru berhasil dibuat');
      }

      setRktModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data RKT');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete RKT
  const handleDeleteRkt = async (id) => {
    if (!window.confirm('Yakin ingin menghapus dokumen RKT ini beserta seluruh program dan kegiatan di dalamnya?')) return;
    try {
      await api.delete(`/manajemen/school-work-plans/${id}`);
      setFeedbackMsg('RKT berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus RKT');
    }
  };

  // Open Create Program Modal
  const handleOpenCreateProgram = () => {
    const currentRktId = selectedRkt?.id || rktList[0]?.id || '';
    const filteredProgs = programs.filter((p) => p.school_work_plan_id === currentRktId);
    setProgramEditMode(false);
    setProgramFormData({
      id: null,
      school_work_plan_id: currentRktId,
      strategic_goal_id: strategicGoals[0]?.id || '',
      code: `PRG-2026-${String(filteredProgs.length + 1).padStart(2, '0')}`,
      title: '',
      unit_name: 'Bidang Kurikulum & Akademik',
      pic_employee_id: references.employees[0]?.id || '',
      description: '',
      target: '',
      indicator: '',
      budget_estimate_reference: 'Rp 25.000.000',
      progress_percent: 0,
      status: 'ongoing',
      start_date: '2026-09-01',
      end_date: '2026-11-30',
      school_unit_id: activeSchoolUnit?.id || ''
    });
    setProgramModalOpen(true);
  };

  // Open Edit Program Modal
  const handleOpenEditProgram = (prog) => {
    setProgramEditMode(true);
    setProgramFormData({
      id: prog.id,
      school_work_plan_id: prog.school_work_plan_id || '',
      strategic_goal_id: prog.strategic_goal_id || '',
      code: prog.code || '',
      title: prog.title,
      unit_name: prog.unit_name || 'Bidang Kurikulum & Akademik',
      pic_employee_id: prog.pic_employee_id || '',
      description: prog.description || '',
      target: prog.target || '',
      indicator: prog.indicator || '',
      budget_estimate_reference: prog.budget_estimate_reference || '',
      progress_percent: prog.progress_percent || 0,
      status: prog.status || 'ongoing',
      start_date: prog.start_date ? prog.start_date.substring(0, 10) : '',
      end_date: prog.end_date ? prog.end_date.substring(0, 10) : '',
      school_unit_id: prog.school_unit_id || ''
    });
    setProgramModalOpen(true);
  };

  // Save Program
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...programFormData,
        school_work_plan_id: programFormData.school_work_plan_id ? Number(programFormData.school_work_plan_id) : null,
        strategic_goal_id: programFormData.strategic_goal_id ? Number(programFormData.strategic_goal_id) : null,
        pic_employee_id: programFormData.pic_employee_id ? Number(programFormData.pic_employee_id) : null,
        school_unit_id: programFormData.school_unit_id ? Number(programFormData.school_unit_id) : null,
        progress_percent: Number(programFormData.progress_percent) || 0
      };

      if (programEditMode) {
        await api.put(`/manajemen/work-plan-programs/${programFormData.id}`, payload);
        setFeedbackMsg('Program kerja tahunan berhasil diperbarui');
      } else {
        await api.post('/manajemen/work-plan-programs', payload);
        setFeedbackMsg('Program kerja tahunan berhasil ditambahkan');
      }

      setProgramModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan program kerja');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Program
  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Yakin ingin menghapus program kerja tahunan ini beserta seluruh kegiatan di dalamnya?')) return;
    try {
      await api.delete(`/manajemen/work-plan-programs/${id}`);
      setFeedbackMsg('Program kerja tahunan berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus program kerja');
    }
  };

  // Open Create Activity Modal (Renop)
  const handleOpenCreateActivity = (preselectedProgramId = null, parentActId = null) => {
    const progId = preselectedProgramId || programs[0]?.id || '';
    setActivityEditMode(false);
    const existingCount = activities.filter((a) => a.work_plan_program_id === Number(progId)).length;
    setActivityFormData({
      id: null,
      work_plan_program_id: progId,
      parent_activity_id: parentActId || '',
      code: parentActId ? `SUB-${String(existingCount + 1).padStart(2, '0')}` : `ACT-${String(existingCount + 1).padStart(2, '0')}`,
      name: '',
      description: '',
      output: '',
      target_output: '1',
      unit: 'Dokumen',
      start_date: '2026-09-10',
      end_date: '2026-09-12',
      pic_employee_id: references.employees[0]?.id || '',
      unit_name: 'Bidang Kurikulum & Akademik',
      budget_reference: 'Rp 15.000.000',
      budget_account_code: '5.2.1.01 (BOP)',
      progress_percent: 0,
      status: 'in_progress',
      document_url: '',
      school_unit_id: activeSchoolUnit?.id || ''
    });
    setActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (act) => {
    setActivityEditMode(true);
    setActivityFormData({
      id: act.id,
      work_plan_program_id: act.work_plan_program_id || '',
      parent_activity_id: act.parent_activity_id || '',
      code: act.code || '',
      name: act.name,
      description: act.description || '',
      output: act.output || '',
      target_output: act.target_output || '',
      unit: act.unit || 'Dokumen',
      start_date: act.start_date ? act.start_date.substring(0, 10) : '',
      end_date: act.end_date ? act.end_date.substring(0, 10) : '',
      pic_employee_id: act.pic_employee_id || '',
      unit_name: act.unit_name || 'Bidang Kurikulum & Akademik',
      budget_reference: act.budget_reference || '',
      budget_account_code: act.budget_account_code || '',
      progress_percent: act.progress_percent || 0,
      status: act.status || 'in_progress',
      document_url: act.document_url || '',
      school_unit_id: act.school_unit_id || ''
    });
    setActivityModalOpen(true);
  };

  // Save Activity
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...activityFormData,
        work_plan_program_id: Number(activityFormData.work_plan_program_id),
        parent_activity_id: activityFormData.parent_activity_id ? Number(activityFormData.parent_activity_id) : null,
        pic_employee_id: activityFormData.pic_employee_id ? Number(activityFormData.pic_employee_id) : null,
        school_unit_id: activityFormData.school_unit_id ? Number(activityFormData.school_unit_id) : null,
        progress_percent: Number(activityFormData.progress_percent) || 0
      };

      if (activityEditMode) {
        await api.put(`/manajemen/work-plan-activities/${activityFormData.id}`, payload);
        setFeedbackMsg('Kegiatan Renop berhasil diperbarui');
      } else {
        await api.post('/manajemen/work-plan-activities', payload);
        setFeedbackMsg('Kegiatan Renop baru berhasil ditambahkan');
      }

      setActivityModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan kegiatan Renop');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kegiatan Renop ini?')) return;
    try {
      await api.delete(`/manajemen/work-plan-activities/${id}`);
      setFeedbackMsg('Kegiatan Renop berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus kegiatan Renop');
    }
  };

  // Filtered Programs for selected RKT
  const activeRktPrograms = selectedRkt
    ? programs.filter((p) => p.school_work_plan_id === selectedRkt.id)
    : programs;

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 flex items-center justify-center text-white font-bold">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Perencanaan Tahunan & Rencana Operasional (Renop)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Penurunan hirarki operasional: RKT → Program Tahunan → Kegiatan Renop → Subkegiatan → Output Terukur & Anggaran.
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
            onClick={() => handleOpenCreateActivity()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tambah Kegiatan Renop</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateProgram}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tambah Program RKT</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateRkt}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/50 transition border border-indigo-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Dokumen RKT</span>
          </button>
        </div>
      </div>

      {/* RKT Selector & Stats Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
            RKT
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <select
                value={selectedRkt?.id || ''}
                onChange={(e) => {
                  const targetRkt = rktList.find((r) => r.id === Number(e.target.value));
                  setSelectedRkt(targetRkt || null);
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs font-bold text-white focus:outline-none"
              >
                {rktList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}: {r.title} ({r.period_start_year}–{r.period_end_year})
                  </option>
                ))}
              </select>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {selectedRkt?.status === 'approved' ? 'Disetujui' : selectedRkt?.status === 'submitted' ? 'Diajukan' : 'Aktif'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rujukan Induk: <strong className="text-indigo-300">{selectedRkt?.parent_plan_code ? `[RKJM] ${selectedRkt.parent_plan_code}` : 'RKJM Induk'}</strong> | Fokus: <span className="text-slate-300">{selectedRkt?.program_focus || '-'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Plafon Anggaran:</span>
            <span className="font-bold text-emerald-400 text-sm">{selectedRkt?.budget_ceiling_reference || 'Rp 0'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Total Program:</span>
            <span className="font-bold text-indigo-300 text-sm">{activeRktPrograms.length} Program</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Kegiatan Renop:</span>
            <span className="font-bold text-teal-300 text-sm">{activities.length} Kegiatan</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'rkt', label: 'Ringkasan RKT', icon: CalendarDays },
          { id: 'renop', label: `Rencana Operasional (Renop: ${activities.length})`, icon: FolderTree },
          { id: 'programs', label: `Program Tahunan (${activeRktPrograms.length})`, icon: Layers },
          { id: 'goals', label: `Sasaran Terkait (${strategicGoals.length})`, icon: Target },
          { id: 'activities', label: 'Daftar Kegiatan & Output', icon: CheckCircle2 },
          { id: 'budget', label: 'Anggaran Referensi', icon: DollarSign },
          { id: 'timeline', label: 'Timeline Pelaksanaan', icon: Clock },
          { id: 'documents', label: 'Dokumen Pendukung', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: RENOP (FITUR 4 — TREE & LIST VIEW) */}
      {activeTab === 'renop' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                <span>Struktur Rencana Operasional (Renop) Kegiatan & Subkegiatan</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hirarki: RKT → Program Kerja Tahunan → Kegiatan Renop → Subkegiatan → Output & Alokasi Anggaran
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setRenopViewMode('tree')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    renopViewMode === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tree Hirarki
                </button>
                <button
                  type="button"
                  onClick={() => setRenopViewMode('list')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    renopViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  List Tabel
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateActivity()}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kegiatan</span>
              </button>
            </div>
          </div>

          {/* RENOP TREE HIERARCHY VIEW */}
          {renopViewMode === 'tree' && (
            <div className="space-y-4 pt-2">
              {activeRktPrograms.map((prog) => {
                const progActivities = activities.filter((a) => a.work_plan_program_id === prog.id && !a.parent_activity_id);
                return (
                  <div key={prog.id} className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-4">
                    {/* Level 2: Program */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40">
                            {prog.code}
                          </span>
                          <h4 className="text-sm font-bold text-white">{prog.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400">
                          Unit: <strong className="text-slate-200">{prog.unit_name}</strong> | PIC: <strong className="text-slate-200">{prog.pic_name || 'Belum diatur'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-400 font-bold">{prog.budget_estimate_reference || 'Rp 0'}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateActivity(prog.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition"
                        >
                          + Sub-Kegiatan
                        </button>
                      </div>
                    </div>

                    {/* Level 3: Kegiatan Nodes */}
                    <div className="pl-4 border-l-2 border-indigo-500/40 space-y-3">
                      {progActivities.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 italic bg-slate-900/60 rounded-xl">
                          Belum ada kegiatan Renop yang ditambahkan di bawah program ini.
                        </div>
                      ) : (
                        progActivities.map((act) => {
                          const subActs = activities.filter((s) => s.parent_activity_id === act.id);
                          return (
                            <div key={act.id} className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2.5 shadow-md">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/40">
                                      {act.code}
                                    </span>
                                    <h5 className="text-xs font-bold text-white">{act.name}</h5>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Output: <strong className="text-slate-200">{act.output || '-'}</strong> ({act.target_output} {act.unit}) | PIC: <strong className="text-slate-200">{act.pic_name || 'Belum diatur'}</strong>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-mono font-bold text-emerald-400">{act.budget_reference || '-'}</span>
                                  <span className="font-bold text-indigo-400 text-xs">{act.progress_percent || 0}%</span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateActivity(prog.id, act.id)}
                                    title="Tambah Subkegiatan"
                                    className="p-1 rounded bg-slate-800 hover:bg-teal-600 text-slate-300 hover:text-white text-[10px]"
                                  >
                                    + Sub
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditActivity(act)}
                                    className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id)}
                                    className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Level 4: Subkegiatan Nodes */}
                              {subActs.length > 0 && (
                                <div className="pl-4 border-l border-teal-500/30 space-y-2 pt-1">
                                  {subActs.map((sub) => (
                                    <div key={sub.id} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-[9px] font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
                                            {sub.code}
                                          </span>
                                          <span className="font-semibold text-slate-100">{sub.name}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          Output: {sub.output || '-'} | PIC: {sub.pic_name || 'PIC Program'}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-400 text-[11px]">{sub.progress_percent || 0}%</span>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditActivity(sub)}
                                          className="p-1 rounded bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteActivity(sub.id)}
                                          className="p-1 rounded bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RENOP LIST TABLE VIEW */}
          {renopViewMode === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Kode</th>
                    <th className="p-3">Nama Kegiatan</th>
                    <th className="p-3">Program Induk</th>
                    <th className="p-3">Target & Output</th>
                    <th className="p-3">PIC Pegawai</th>
                    <th className="p-3">Anggaran</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-teal-400">{act.code}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{act.name}</div>
                        {act.parent_activity_name && (
                          <div className="text-[10px] text-slate-400">↳ Sub dari: {act.parent_activity_name}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{act.program_title || `Program #${act.work_plan_program_id}`}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{act.output || '-'}</div>
                        <div className="text-[10px] text-slate-400">{act.target_output} {act.unit}</div>
                      </td>
                      <td className="p-3 text-slate-300 font-medium">👤 {act.pic_name || 'Belum diatur'}</td>
                      <td className="p-3 font-bold text-emerald-400">{act.budget_reference || '-'}</td>
                      <td className="p-3 font-bold text-indigo-400">{act.progress_percent || 0}%</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditActivity(act)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: RINGKASAN RKT */}
      {activeTab === 'rkt' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Deskripsi & Arah Kebijakan Tahunan</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedRkt?.description || 'Rencana Kerja Tahunan (RKT) merangkum sasaran mutu prioritas, indikator ketercapaian, alokasi PIC tenaga pendidik, dan estimasi pembiayaan selama satu tahun ajaran.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px]">Tahun Periode:</span>
                <div className="font-bold text-indigo-300">{selectedRkt?.period_start_year} – {selectedRkt?.period_end_year}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <span className="text-slate-400 text-[10px]">Rencana Induk RJM:</span>
                <div className="font-bold text-white">{selectedRkt?.parent_plan_title || 'Induk Yayasan'}</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Rekapitulasi Unit Pelaksana</h3>
            <div className="space-y-2">
              {['Bidang Kurikulum & Akademik', 'Bidang Sarana & Prasarana', 'Bidang Kesiswaan & Asrama', 'Bidang Tahfidz & Keislaman'].map((u, i) => {
                const uProgs = activeRktPrograms.filter((p) => p.unit_name === u);
                return (
                  <div key={i} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{u}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold text-[11px]">
                      {uProgs.length} Program
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: SASARAN */}
      {activeTab === 'goals' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Sasaran Strategis yang Diturunkan ke RKT</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategicGoals.map((g) => (
              <div key={g.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-400">{g.code}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">{g.perspective}</span>
                </div>
                <h4 className="font-bold text-white">{g.name}</h4>
                <p className="text-emerald-400 font-semibold text-[11px]">Target: {g.target_description || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: PROGRAM TAHUNAN */}
      {activeTab === 'programs' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Daftar Program Kerja Tahunan</h3>
            <button
              type="button"
              onClick={handleOpenCreateProgram}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white"
            >
              + Tambah Program Kerja
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Kode</th>
                  <th className="p-3">Nama Program Kerja</th>
                  <th className="p-3">Unit Pelaksana</th>
                  <th className="p-3">PIC Pegawai</th>
                  <th className="p-3">Target & Indikator</th>
                  <th className="p-3">Anggaran</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activeRktPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-indigo-400">{p.code}</td>
                    <td className="p-3 font-bold text-white max-w-xs">{p.title}</td>
                    <td className="p-3 text-slate-400">{p.unit_name}</td>
                    <td className="p-3 text-slate-200 font-medium">👤 {p.pic_name || 'Belum diatur'}</td>
                    <td className="p-3">
                      <div className="font-semibold text-emerald-400">{p.target || '-'}</div>
                      <div className="text-[10px] text-slate-400">{p.indicator || '-'}</div>
                    </td>
                    <td className="p-3 font-bold text-emerald-400">{p.budget_estimate_reference || '-'}</td>
                    <td className="p-3 font-bold text-indigo-400">{p.progress_percent || 0}%</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProgram(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProgram(p.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ACTIVITIES & OUTPUT */}
      {activeTab === 'activities' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Rincian Kegiatan & Output Operasional</h3>
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded">{act.code}</span>
                    <h4 className="font-bold text-white text-sm mt-1">{act.name}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded">
                    PIC: {act.pic_name || 'Belum diatur'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-700/50">
                  <div>Output: <strong className="text-slate-200">{act.output || '-'} ({act.target_output} {act.unit})</strong></div>
                  <div>Akun COA: <strong className="text-slate-200">{act.budget_account_code || '-'}</strong></div>
                  <div>Anggaran: <strong className="text-emerald-400">{act.budget_reference || '-'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: BUDGET */}
      {activeTab === 'budget' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Distribusi Plafon Anggaran Program Kerja RKT</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRktPrograms.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-indigo-400 font-bold text-[10px]">{p.code}</span>
                  <h4 className="font-bold text-white mt-0.5">{p.title}</h4>
                  <span className="text-[10px] text-slate-400">{p.unit_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Estimasi Plafon:</span>
                  <span className="font-black text-emerald-400 text-sm">{p.budget_estimate_reference || 'Rp 0'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Timeline Pelaksanaan Program Tahun Berjalan</h3>
          <div className="space-y-3">
            {activeRktPrograms.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{p.code}: {p.title}</span>
                  <span className="text-indigo-400 font-semibold">
                    {p.start_date ? p.start_date.substring(0, 10) : 'TBD'} s.d {p.end_date ? p.end_date.substring(0, 10) : 'TBD'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(15, p.progress_percent || 0))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Naskah Dokumen RKT Terlampir</h3>
          {selectedRkt?.document_url ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Berkas Naskah RKT Resmi</span>
              <a
                href={selectedRkt.document_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold"
              >
                <span>Buka Berkas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Belum ada dokumen PDF yang ditautkan ke RKT ini.</p>
          )}
        </div>
      )}

      {/* MODAL: BUAT / UBAH RKT */}
      {rktModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {rktEditMode ? 'Ubah Dokumen RKT' : 'Buat Dokumen RKT Baru'}
              </h3>
              <button onClick={() => setRktModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRkt} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode RKT *</label>
                  <input
                    type="text"
                    required
                    value={rktFormData.code}
                    onChange={(e) => setRktFormData({ ...rktFormData, code: e.target.value })}
                    placeholder="RKT-2026/2027"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun Ajaran</label>
                  <select
                    value={rktFormData.academic_year_id}
                    onChange={(e) => setRktFormData({ ...rktFormData, academic_year_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {references.academic_years.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul Dokumen RKT *</label>
                <input
                  type="text"
                  required
                  value={rktFormData.title}
                  onChange={(e) => setRktFormData({ ...rktFormData, title: e.target.value })}
                  placeholder="Contoh: Rencana Kerja Tahunan TA 2026/2027"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rujukan Parent RKJM (4–5 Thn)</label>
                  <select
                    value={rktFormData.parent_plan_id}
                    onChange={(e) => setRktFormData({ ...rktFormData, parent_plan_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Tanpa Rujukan RKJM --</option>
                    {rkjmList.map((m) => (
                      <option key={m.id} value={m.id}>
                        [RKJM] {m.code}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Plafon Anggaran Total</label>
                  <input
                    type="text"
                    value={rktFormData.budget_ceiling_reference}
                    onChange={(e) => setRktFormData({ ...rktFormData, budget_ceiling_reference: e.target.value })}
                    placeholder="Rp 500.000.000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fokus Program Utama</label>
                <input
                  type="text"
                  value={rktFormData.program_focus}
                  onChange={(e) => setRktFormData({ ...rktFormData, program_focus: e.target.value })}
                  placeholder="Contoh: Penguatan Literasi Digital & Fasilitas CBT"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRktModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan RKT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT / UBAH PROGRAM KERJA */}
      {programModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {programEditMode ? 'Ubah Program Kerja RKT' : 'Tambah Program Kerja RKT Baru'}
              </h3>
              <button onClick={() => setProgramModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">RKT Induk *</label>
                  <select
                    required
                    value={programFormData.school_work_plan_id}
                    onChange={(e) => setProgramFormData({ ...programFormData, school_work_plan_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {rktList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code}: {r.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Program *</label>
                  <input
                    type="text"
                    required
                    value={programFormData.code}
                    onChange={(e) => setProgramFormData({ ...programFormData, code: e.target.value })}
                    placeholder="PRG-2026-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Program Kerja *</label>
                <input
                  type="text"
                  required
                  value={programFormData.title}
                  onChange={(e) => setProgramFormData({ ...programFormData, title: e.target.value })}
                  placeholder="Contoh: Workshop Modul Ajar Berdiferensiasi"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rujukan Sasaran RIPS Terkait (Opsional)</label>
                <select
                  value={programFormData.strategic_goal_id || ''}
                  onChange={(e) => setProgramFormData({ ...programFormData, strategic_goal_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="">-- Tanpa Rujukan Sasaran RIPS --</option>
                  {strategicGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      [{g.code}] {g.name} — Target RIPS: {g.ideal_condition || (g.target_value ? `${g.target_value}%` : '100%')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit / Bidang Kerja *</label>
                  <select
                    value={programFormData.unit_name}
                    onChange={(e) => setProgramFormData({ ...programFormData, unit_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Bidang Kurikulum & Akademik">Bidang Kurikulum & Akademik</option>
                    <option value="Bidang Sarana & Prasarana">Bidang Sarana & Prasarana</option>
                    <option value="Bidang Kesiswaan & Asrama">Bidang Kesiswaan & Asrama</option>
                    <option value="Bidang Tahfidz & Keislaman">Bidang Tahfidz & Keislaman</option>
                    <option value="Bidang SDM & Administrasi">Bidang SDM & Administrasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Penanggung Jawab (PIC Pegawai)</label>
                  <select
                    value={programFormData.pic_employee_id}
                    onChange={(e) => setProgramFormData({ ...programFormData, pic_employee_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih PIC Pegawai --</option>
                    {references.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.nip ? `(${emp.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sasaran Strategis Terkait</label>
                  <select
                    value={programFormData.strategic_goal_id}
                    onChange={(e) => setProgramFormData({ ...programFormData, strategic_goal_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih Sasaran Strategis --</option>
                    {strategicGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code}: {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estimasi Anggaran</label>
                  <input
                    type="text"
                    value={programFormData.budget_estimate_reference}
                    onChange={(e) => setProgramFormData({ ...programFormData, budget_estimate_reference: e.target.value })}
                    placeholder="Rp 25.000.000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Output</label>
                  <input
                    type="text"
                    value={programFormData.target}
                    onChange={(e) => setProgramFormData({ ...programFormData, target: e.target.value })}
                    placeholder="35 Modul Ajar Tervalidasi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Indikator Capaian</label>
                  <input
                    type="text"
                    value={programFormData.indicator}
                    onChange={(e) => setProgramFormData({ ...programFormData, indicator: e.target.value })}
                    placeholder="100% Guru Tuntas"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tgl Mulai</label>
                  <DatePickerField
                    value={programFormData.start_date}
                    onChange={(iso) => setProgramFormData({ ...programFormData, start_date: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tgl Selesai</label>
                  <DatePickerField
                    value={programFormData.end_date}
                    min={programFormData.start_date || undefined}
                    onChange={(iso) => setProgramFormData({ ...programFormData, end_date: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={programFormData.progress_percent}
                    onChange={(e) => setProgramFormData({ ...programFormData, progress_percent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProgramModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT / UBAH KEGIATAN RENOP */}
      {activityModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {activityEditMode ? 'Ubah Kegiatan Renop' : 'Tambah Kegiatan Renop Baru'}
              </h3>
              <button onClick={() => setActivityModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Program RKT Induk *</label>
                  <select
                    required
                    value={activityFormData.work_plan_program_id}
                    onChange={(e) => setActivityFormData({ ...activityFormData, work_plan_program_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code}: {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Kegiatan *</label>
                  <input
                    type="text"
                    required
                    value={activityFormData.code}
                    onChange={(e) => setActivityFormData({ ...activityFormData, code: e.target.value })}
                    placeholder="ACT-01"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Kegiatan Renop *</label>
                <input
                  type="text"
                  required
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  placeholder="Contoh: Workshop Modul Ajar Berdiferensiasi Guru"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kegiatan Induk (Jika Sub-Kegiatan)</label>
                  <select
                    value={activityFormData.parent_activity_id}
                    onChange={(e) => setActivityFormData({ ...activityFormData, parent_activity_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Kegiatan Utama (Level 1) --</option>
                    {activities
                      .filter((a) => !a.parent_activity_id && a.id !== activityFormData.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code}: {a.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Penanggung Jawab (PIC Pegawai)</label>
                  <select
                    value={activityFormData.pic_employee_id}
                    onChange={(e) => setActivityFormData({ ...activityFormData, pic_employee_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih PIC Pegawai --</option>
                    {references.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.nip ? `(${emp.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Target Output</label>
                  <input
                    type="text"
                    value={activityFormData.output}
                    onChange={(e) => setActivityFormData({ ...activityFormData, output: e.target.value })}
                    placeholder="35 Modul Ajar Tervalidasi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={activityFormData.unit}
                    onChange={(e) => setActivityFormData({ ...activityFormData, unit: e.target.value })}
                    placeholder="Dokumen / Unit"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Anggaran Referensi</label>
                  <input
                    type="text"
                    value={activityFormData.budget_reference}
                    onChange={(e) => setActivityFormData({ ...activityFormData, budget_reference: e.target.value })}
                    placeholder="Rp 15.000.000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Akun Anggaran (COA)</label>
                  <input
                    type="text"
                    value={activityFormData.budget_account_code}
                    onChange={(e) => setActivityFormData({ ...activityFormData, budget_account_code: e.target.value })}
                    placeholder="5.2.1.01 (BOP Kurikulum)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tgl Mulai</label>
                  <DatePickerField
                    value={activityFormData.start_date}
                    onChange={(iso) => setActivityFormData({ ...activityFormData, start_date: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tgl Selesai</label>
                  <DatePickerField
                    value={activityFormData.end_date}
                    min={activityFormData.start_date || undefined}
                    onChange={(iso) => setActivityFormData({ ...activityFormData, end_date: iso })}
                    inputClassName="!py-2 !px-3 !bg-slate-800 !border-slate-700 !rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={activityFormData.progress_percent}
                    onChange={(e) => setActivityFormData({ ...activityFormData, progress_percent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
