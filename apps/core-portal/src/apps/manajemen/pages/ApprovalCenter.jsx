import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Check,
  RotateCcw,
  GitBranch,
  Plus,
  Filter,
  Search,
  RefreshCw,
  X,
  Send,
  Building,
  Layers,
  FileText,
  Trash2,
  Sparkles
} from 'lucide-react';

export default function ApprovalCenter() {
  const { user, activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'history' | 'workflows'

  // Data states
  const [requests, setRequests] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [references, setReferences] = useState({ employees: [], programs: [] });
  const [availableDocs, setAvailableDocs] = useState({
    institution_plans: [],
    work_plans: [],
    programs: [],
    quality_goals: [],
    follow_ups: []
  });

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals & Drawers
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [auditActions, setAuditActions] = useState([]);

  // Action Modal (Approve / Return / Reject)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState('approved'); // 'approved' | 'returned' | 'rejected'
  const [actionNotes, setActionNotes] = useState('');
  const [targetRequestId, setTargetRequestId] = useState(null);

  // Submit New Request Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitFormData, setSubmitFormData] = useState({
    reference_type: 'school_work_plan',
    reference_id: '',
    approval_workflow_id: '',
    notes: ''
  });

  // Create Workflow Modal
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowFormData, setWorkflowFormData] = useState({
    name: '',
    applies_to: 'school_work_plan',
    description: '',
    steps: [
      { step_order: 1, approver_employee_id: '' },
      { step_order: 2, approver_employee_id: '' }
    ]
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch All Approval Data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [reqRes, wfRes, refRes, plansRes, rktRes, progRes, goalsRes, rtlRes] = await Promise.all([
        api.get('/manajemen/approval-requests'),
        api.get('/manajemen/approval-workflows'),
        api.get('/manajemen/planning-references'),
        api.get('/manajemen/institution-development-plans').catch(() => ({ data: { data: [] } })),
        api.get('/manajemen/school-work-plans').catch(() => ({ data: { data: [] } })),
        api.get('/manajemen/priority-programs').catch(() => ({ data: { data: [] } })),
        api.get('/manajemen/evaluation/goals').catch(() => ({ data: { data: [] } })),
        api.get('/manajemen/evaluation/follow-ups').catch(() => ({ data: { data: [] } }))
      ]);

      setRequests(reqRes.data?.data || []);
      setWorkflows(wfRes.data?.data || []);
      setReferences(refRes.data?.data || { employees: [], programs: [] });
      setAvailableDocs({
        institution_plans: plansRes.data?.data || [],
        work_plans: rktRes.data?.data || [],
        programs: progRes.data?.data || [],
        quality_goals: goalsRes.data?.data || [],
        follow_ups: rtlRes.data?.data || []
      });
    } catch (err) {
      console.error('Error fetching approval data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data persetujuan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  // Open Detail Drawer
  const handleOpenDetail = async (reqItem) => {
    setSelectedRequest(reqItem);
    setDetailDrawerOpen(true);
    try {
      const [detailRes, actRes] = await Promise.all([
        api.get(`/manajemen/approval-requests/${reqItem.id}`),
        api.get(`/manajemen/approval-requests/${reqItem.id}/actions`)
      ]);
      setSelectedRequest(detailRes.data?.data || reqItem);
      setAuditActions(actRes.data?.data || []);
    } catch (err) {
      console.error('Error loading request detail:', err);
    }
  };

  // Open Action Modal
  const handleOpenActionModal = (requestId, type) => {
    setTargetRequestId(requestId);
    setActionType(type);
    setActionNotes(type === 'approved' ? 'Disetujui dan dilanjutkan ke tahap berikutnya.' : '');
    setActionModalOpen(true);
  };

  // Confirm Approval Action
  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!targetRequestId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.patch(`/manajemen/approval-requests/${targetRequestId}/action`, {
        action: actionType,
        notes: actionNotes
      });
      setFeedbackMsg(`Permohonan persetujuan berhasil di-${actionType === 'approved' ? 'setujui' : actionType === 'returned' ? 'kembalikan' : 'tolak'}`);
      setActionModalOpen(false);
      if (detailDrawerOpen && selectedRequest?.id === targetRequestId) {
        handleOpenDetail({ id: targetRequestId });
      }
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses tindakan persetujuan');
    } finally {
      setSubmitting(false);
    }
  };

  // Resubmit Request
  const handleResubmit = async (requestId) => {
    const notes = window.prompt('Masukkan catatan revisi / perbaikan berkas:');
    if (notes === null) return;
    try {
      await api.post(`/manajemen/approval-requests/${requestId}/resubmit`, { notes });
      setFeedbackMsg('Permohonan berhasil diajukan ulang (Resubmitted)');
      if (detailDrawerOpen && selectedRequest?.id === requestId) {
        handleOpenDetail({ id: requestId });
      }
      fetchData();
    } catch (err) {
      setErrorMsg('Gagal mengajukan ulang permohonan');
    }
  };

  // Submit New Approval Request
  const handleOpenSubmitModal = () => {
    const defaultWf = workflows[0]?.id || '';
    setSubmitFormData({
      reference_type: 'school_work_plan',
      reference_id: availableDocs.work_plans[0]?.id || '',
      approval_workflow_id: defaultWf,
      notes: ''
    });
    setSubmitModalOpen(true);
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/manajemen/approval-requests', {
        ...submitFormData,
        reference_id: Number(submitFormData.reference_id),
        approval_workflow_id: Number(submitFormData.approval_workflow_id)
      });
      setFeedbackMsg('Dokumen berhasil diajukan untuk persetujuan berjenjang');
      setSubmitModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengajukan persetujuan');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Workflow Template
  const handleOpenWorkflowModal = () => {
    const defaultEmp = references.employees[0]?.id || '';
    setWorkflowFormData({
      name: '',
      applies_to: 'school_work_plan',
      description: '',
      steps: [
        { step_order: 1, approver_employee_id: defaultEmp },
        { step_order: 2, approver_employee_id: defaultEmp }
      ]
    });
    setWorkflowModalOpen(true);
  };

  const handleAddStepToForm = () => {
    const defaultEmp = references.employees[0]?.id || '';
    setWorkflowFormData({
      ...workflowFormData,
      steps: [
        ...workflowFormData.steps,
        { step_order: workflowFormData.steps.length + 1, approver_employee_id: defaultEmp }
      ]
    });
  };

  const handleRemoveStepFromForm = (idx) => {
    if (workflowFormData.steps.length <= 1) return;
    const newSteps = workflowFormData.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 }));
    setWorkflowFormData({ ...workflowFormData, steps: newSteps });
  };

  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/manajemen/approval-workflows', {
        ...workflowFormData,
        steps: workflowFormData.steps.map(s => ({
          step_order: s.step_order,
          approver_employee_id: Number(s.approver_employee_id)
        }))
      });
      setFeedbackMsg('Alur kerja persetujuan baru berhasil dibuat');
      setWorkflowModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuat alur kerja');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm('Yakin ingin menghapus template workflow ini?')) return;
    try {
      await api.delete(`/manajemen/approval-workflows/${id}`);
      setFeedbackMsg('Workflow berhasil dihapus');
      fetchData();
    } catch (err) {
      setErrorMsg('Gagal menghapus workflow');
    }
  };

  // Filter Requests
  const pendingList = requests.filter(r => r.status === 'pending');
  const historyList = requests.filter(r => ['approved', 'rejected'].includes(r.status));

  const filteredPending = pendingList.filter(r => {
    if (typeFilter !== 'all' && r.reference_type !== typeFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const title = (r.document_title || '').toLowerCase();
      const code = (r.document_code || '').toLowerCase();
      const req = (r.requester_name || '').toLowerCase();
      if (!title.includes(s) && !code.includes(s) && !req.includes(s)) return false;
    }
    return true;
  });

  const filteredHistory = historyList.filter(r => {
    if (typeFilter !== 'all' && r.reference_type !== typeFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const title = (r.document_title || '').toLowerCase();
      const code = (r.document_code || '').toLowerCase();
      const req = (r.requester_name || '').toLowerCase();
      if (!title.includes(s) && !code.includes(s) && !req.includes(s)) return false;
    }
    return true;
  });

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mj-badge-done">Disahkan (Approved)</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mj-badge-risk">Ditolak (Rejected)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase mj-badge-progress">Menunggu Otorisasi</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Feedback Messages */}
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Pusat Persetujuan & Alur Kerja (Approval Center)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Pengelolaan pengesahan berjenjang dokumen Renstra, RPS, RKT, Program Prioritas, Renop, dan Rencana Tindak Lanjut (RTL).
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
            onClick={handleOpenSubmitModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/50 transition border border-indigo-400/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ajukan Persetujuan Baru</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'inbox', label: `Menunggu Persetujuan (${pendingList.length})`, icon: Clock },
            { id: 'history', label: `Riwayat Disahkan (${historyList.length})`, icon: CheckCircle2 },
            { id: 'workflows', label: `Struktur Alur Kerja (${workflows.length})`, icon: GitBranch }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'workflows' && (
          <div className="flex items-center gap-2">
            <SearchableSelect
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              className="w-56"
              options={[
                { value: 'all', label: 'Semua Tipe Dokumen' },
                { value: 'institution_development_plan', label: 'Renstra / RPS / RJJP' },
                { value: 'school_work_plan', label: 'Rencana Kerja Tahunan (RKT)' },
                { value: 'work_plan_program', label: 'Program Kerja' },
                { value: 'quality_goal', label: 'Sasaran Mutu' },
                { value: 'evaluation_follow_up', label: 'Rencana Tindak Lanjut (RTL)' },
              ]}
            />

            <div className="relative min-w-[180px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berkas / pemohon..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: MENUNGGU PERSETUJUAN (INBOX) */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {filteredPending.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs italic">
              Tidak ada berkas yang sedang menunggu persetujuan Anda saat ini.
            </div>
          ) : (
            filteredPending.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 text-xs max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded">
                      [{item.document_code || 'DOC'}] {item.document_type_label}
                    </span>
                    {renderStatusBadge(item.status)}
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                      Step {item.current_step_order} dari {item.total_steps}
                    </span>
                  </div>

                  <h3
                    onClick={() => handleOpenDetail(item)}
                    className="text-sm font-bold text-white hover:text-indigo-300 transition cursor-pointer leading-snug"
                  >
                    {item.document_title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px] pt-1">
                    <span>Pemohon: <strong className="text-slate-200">{item.requester_name}</strong></span>
                    <span>Alur: <strong className="text-indigo-300">{item.workflow_name}</strong></span>
                    <span>Tanggal: <strong className="text-slate-300">{item.created_at?.slice(0, 10)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(item)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tinjau</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(item.id, 'returned')}
                    className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-xs font-semibold text-amber-400 border border-amber-500/30 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(item.id, 'rejected')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-xs font-semibold text-rose-400 border border-rose-500/30 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(item.id, 'approved')}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: RIWAYAT PERSETUJUAN (HISTORY) */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Dokumen</th>
                  <th className="p-3">Jenis Berkas</th>
                  <th className="p-3">Pemohon</th>
                  <th className="p-3">Template Alur Kerja</th>
                  <th className="p-3 text-center">Status Final</th>
                  <th className="p-3 text-center">Tanggal Selesai</th>
                  <th className="p-3 text-center rounded-r-xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 max-w-xs">
                      <div
                        onClick={() => handleOpenDetail(h)}
                        className="font-bold text-white hover:text-indigo-400 transition cursor-pointer"
                      >
                        {h.document_title}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">Kode: {h.document_code}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-300">{h.document_type_label}</td>
                    <td className="p-3 font-semibold text-slate-200">👤 {h.requester_name}</td>
                    <td className="p-3 text-indigo-300">{h.workflow_name}</td>
                    <td className="p-3 text-center">{renderStatusBadge(h.status)}</td>
                    <td className="p-3 text-center font-mono text-slate-400">{h.updated_at?.slice(0, 10)}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(h)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] border border-slate-700"
                      >
                        Riwayat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STRUKTUR ALUR KERJA (WORKFLOWS) */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span>Hierarki Alur Persetujuan Perencanaan Standar Yayasan & Lembaga</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Definisi urutan bertingkat otorisasi dokumen dari perumusan sampai pengesahan dewan pengurus
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenWorkflowModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Alur Kerja Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase bg-indigo-950 px-2 py-0.5 rounded">
                      {wf.applies_to}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{wf.name}</h4>
                    {wf.description && <p className="text-xs text-slate-400 mt-0.5">{wf.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkflow(wf.id)}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jenjang Otorisasi Berurutan:</span>
                  {wf.steps?.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                        {step.step_order}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-200 block">Step {step.step_order}: {step.approver_name}</span>
                        <span className="text-[10px] text-slate-400">Tingkat Pemeriksaan & Otorisasi Berkas</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRAWER: DETAIL PENGAJUAN & AUDIT TRAIL */}
      {detailDrawerOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full h-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded">
                    [{selectedRequest.document_code}] {selectedRequest.document_type_label}
                  </span>
                  {renderStatusBadge(selectedRequest.status)}
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedRequest.document_title}</h3>
              </div>
              <button onClick={() => setDetailDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] block">Pemohon:</span>
                  <span className="font-bold text-white">👤 {selectedRequest.requester_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Alur Persetujuan:</span>
                  <span className="font-bold text-indigo-400">{selectedRequest.workflow_name}</span>
                </div>
              </div>

              {/* Progress Step Indicator */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-300 block">Status Tahapan Alur Persetujuan:</span>
                <div className="flex items-center gap-2">
                  {selectedRequest.steps?.map((step) => {
                    const isDone = selectedRequest.status === 'approved' || step.step_order < selectedRequest.current_step;
                    const isCurrent = selectedRequest.status === 'pending' && step.step_order === selectedRequest.current_step;

                    return (
                      <div key={step.id} className="flex-1 space-y-1 text-center">
                        <div
                          className={`h-2 rounded-full transition ${
                            isDone ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500 animate-pulse' : 'bg-slate-800'
                          }`}
                        ></div>
                        <span className={`text-[10px] font-bold block truncate ${
                          isDone ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          Step {step.step_order}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons for current request */}
              {selectedRequest.status === 'pending' && (
                <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">Tindakan Otorisasi Anda:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(selectedRequest.id, 'approved')}
                      className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                    >
                      Setujui (Approve)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(selectedRequest.id, 'returned')}
                      className="py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs"
                    >
                      Kembalikan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(selectedRequest.id, 'rejected')}
                      className="py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              )}

              {/* Resubmit button if rejected / returned */}
              {(selectedRequest.status === 'rejected' || (selectedRequest.status === 'pending' && selectedRequest.current_step === 1)) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleResubmit(selectedRequest.id)}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
                  >
                    Ajukan Ulang / Resubmit Dokumen yang Telah Diperbaiki
                  </button>
                </div>
              )}

              {/* Audit Trail History */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Riwayat Tindakan & Jejak Audit (Append-Only Log)</span>
                </h4>

                <div className="space-y-2">
                  {auditActions.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic">Belum ada riwayat tindakan.</div>
                  ) : (
                    auditActions.map((act) => (
                      <div key={act.id} className="p-3 rounded-xl bg-slate-800 border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-black uppercase px-2 py-0.5 rounded ${
                            act.action === 'approved' ? 'bg-emerald-950 text-emerald-400' :
                            act.action === 'rejected' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {act.action} (Step {act.step_order || 1})
                          </span>
                          <span className="text-slate-400">{act.acted_at?.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <div className="font-bold text-slate-200">👤 {act.approver_name}</div>
                        {act.notes && <p className="text-slate-300 text-[11px] leading-relaxed pt-0.5">"{act.notes}"</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AKSI PERSETUJUAN (APPROVE / RETURN / REJECT) */}
      {actionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {actionType === 'approved' ? 'Setujui Pengajuan' : actionType === 'returned' ? 'Kembalikan Berkas untuk Perbaikan' : 'Tolak Pengajuan'}
              </h3>
              <button onClick={() => setActionModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan / Komentar Otorisasi *</label>
                <textarea
                  rows={3}
                  required
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Instruksi, pertimbangan, atau catatan perbaikan..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white font-bold disabled:opacity-50 ${
                    actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    actionType === 'returned' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting ? 'Memproses...' : 'Kirim Keputusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUKAN PERSETUJUAN BARU */}
      {submitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Ajukan Dokumen untuk Persetujuan Berjenjang</h3>
              <button onClick={() => setSubmitModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Jenis Dokumen yang Diajukan</label>
                <SearchableSelect
                  value={submitFormData.reference_type}
                  onChange={(val) => {
                    const type = val;
                    let firstId = '';
                    if (type === 'school_work_plan') firstId = availableDocs.work_plans[0]?.id || '';
                    else if (type === 'institution_development_plan') firstId = availableDocs.institution_plans[0]?.id || '';
                    else if (type === 'work_plan_program') firstId = availableDocs.programs[0]?.id || '';
                    else if (type === 'quality_goal') firstId = availableDocs.quality_goals[0]?.id || '';
                    else if (type === 'evaluation_follow_up') firstId = availableDocs.follow_ups[0]?.id || '';

                    setSubmitFormData({ ...submitFormData, reference_type: type, reference_id: firstId });
                  }}
                  options={[
                    { value: 'school_work_plan', label: 'Rencana Kerja Tahunan (RKT)' },
                    { value: 'institution_development_plan', label: 'Renstra / RPS / RJJP' },
                    { value: 'work_plan_program', label: 'Program Kerja' },
                    { value: 'quality_goal', label: 'Sasaran Mutu' },
                    { value: 'evaluation_follow_up', label: 'Rencana Tindak Lanjut (RTL)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pilih Berkas Dokumen *</label>
                <SearchableSelect
                  value={submitFormData.reference_id}
                  placeholder="-- Pilih Berkas Dokumen --"
                  onChange={(val) => setSubmitFormData({ ...submitFormData, reference_id: val })}
                  options={[
                    { value: '', label: '-- Pilih Berkas Dokumen --' },
                    ...(submitFormData.reference_type === 'school_work_plan'
                      ? availableDocs.work_plans.map(p => ({ value: p.id, label: `[RKT] ${p.title}` }))
                      : submitFormData.reference_type === 'institution_development_plan'
                      ? availableDocs.institution_plans.map(p => ({ value: p.id, label: `[${p.plan_type || 'PLAN'}] ${p.title || p.name}` }))
                      : submitFormData.reference_type === 'work_plan_program'
                      ? availableDocs.programs.map(p => ({ value: p.id, label: `[PRG] ${p.title}` }))
                      : submitFormData.reference_type === 'quality_goal'
                      ? availableDocs.quality_goals.map(p => ({ value: p.id, label: `[MUTU] ${p.name}` }))
                      : submitFormData.reference_type === 'evaluation_follow_up'
                      ? availableDocs.follow_ups.map(p => ({ value: p.id, label: `[RTL] ${p.action_plan}` }))
                      : []),
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Template Alur Kerja Persetujuan *</label>
                <SearchableSelect
                  value={submitFormData.approval_workflow_id}
                  placeholder="-- Pilih Template Workflow --"
                  onChange={(val) => setSubmitFormData({ ...submitFormData, approval_workflow_id: val })}
                  options={[
                    { value: '', label: '-- Pilih Template Workflow --' },
                    ...workflows.map(wf => ({
                      value: wf.id,
                      label: `${wf.name} (${wf.steps?.length || 0} Step)`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Pengantar</label>
                <textarea
                  rows={2}
                  value={submitFormData.notes}
                  onChange={(e) => setSubmitFormData({ ...submitFormData, notes: e.target.value })}
                  placeholder="Keterangan urgensi atau pengantar berkas..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT ALUR KERJA BARU */}
      {workflowModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Buat Definisi Alur Kerja Persetujuan Baru</h3>
              <button onClick={() => setWorkflowModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkflow} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Alur Kerja *</label>
                <input
                  type="text"
                  required
                  value={workflowFormData.name}
                  onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                  placeholder="Contoh: Alur Pengesahan Kurikulum & Rombel"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Berlaku untuk Dokumen</label>
                <SearchableSelect
                  value={workflowFormData.applies_to}
                  onChange={(val) => setWorkflowFormData({ ...workflowFormData, applies_to: val })}
                  options={[
                    { value: 'school_work_plan', label: 'Rencana Kerja Tahunan (RKT)' },
                    { value: 'institution_development_plan', label: 'Renstra / RPS / RJJP' },
                    { value: 'work_plan_program', label: 'Program Kerja & Anggaran' },
                    { value: 'evaluation_follow_up', label: 'Rencana Tindak Lanjut (RTL)' },
                    { value: 'general', label: 'Dokumen Umum Lainnya' },
                  ]}
                />
              </div>

              {/* Steps Configurator */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Urutan Jenjang Approver:</span>
                  <button
                    type="button"
                    onClick={handleAddStepToForm}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px]"
                  >
                    + Tambah Step
                  </button>
                </div>

                <div className="space-y-2">
                  {workflowFormData.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        {step.step_order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <SearchableSelect
                          value={step.approver_employee_id}
                          placeholder="-- Pilih Approver --"
                          onChange={(val) => {
                            const newSteps = [...workflowFormData.steps];
                            newSteps[idx].approver_employee_id = val;
                            setWorkflowFormData({ ...workflowFormData, steps: newSteps });
                          }}
                          options={[
                            { value: '', label: '-- Pilih Approver --' },
                            ...references.employees.map(emp => ({
                              value: emp.id,
                              label: emp.full_name,
                            })),
                          ]}
                        />
                      </div>
                      {workflowFormData.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStepFromForm(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWorkflowModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Alur Kerja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
