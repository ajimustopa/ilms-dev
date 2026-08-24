import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Briefcase,
  CheckSquare,
  Plus,
  Layers,
  FileCheck2,
  Loader2,
  AlertCircle,
  Clock,
  MessageSquare
} from 'lucide-react';

export default function Projects() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'projects' | 'approvals'
  const [loading, setLoading] = useState(false);
  const [tasksList, setTasksList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [workflowsList, setWorkflowsList] = useState([]);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tasks') {
        const res = await api.get('/api/v1/manajemen/tasks');
        setTasksList(res.data.data || []);
      } else if (activeTab === 'projects') {
        const res = await api.get('/api/v1/manajemen/projects');
        setProjectsList(res.data.data || []);
      } else if (activeTab === 'approvals') {
        const [reqRes, wfRes] = await Promise.all([
          api.get('/api/v1/manajemen/approval-requests'),
          api.get('/api/v1/manajemen/approval-workflows'),
        ]);
        setApprovalRequests(reqRes.data.data || []);
        setWorkflowsList(wfRes.data.data || []);
      }
    } catch (err) {
      console.error('Error loading projects data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenCreate = () => {
    setError(null);
    if (activeTab === 'tasks') {
      setFormData({
        title: '',
        description: '',
        assignee_employee_id: 1,
        priority: 'medium',
        due_date: new Date().toISOString().slice(0, 10),
      });
    } else if (activeTab === 'projects') {
      setFormData({
        name: '',
        description: '',
        pic_employee_id: 1,
        budget_reference: '',
        start_date: new Date().toISOString().slice(0, 10),
      });
    } else {
      setFormData({
        approval_workflow_id: workflowsList[0]?.id || 1,
        reference_type: 'work_plan_program',
        reference_id: 1,
      });
    }
    setCreateModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'tasks') {
        await api.post('/api/v1/manajemen/tasks', formData);
      } else if (activeTab === 'projects') {
        await api.post('/api/v1/manajemen/projects', formData);
      } else {
        await api.post('/api/v1/manajemen/approval-requests', formData);
      }
      setCreateModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskStatus = async (id, status) => {
    await api.patch(`/api/v1/manajemen/tasks/${id}/status`, { status });
    fetchData();
  };

  const handleApprovalAction = async (id, action) => {
    const notes = prompt(`Masukkan catatan ${action}:`) || '';
    await api.patch(`/api/v1/manajemen/approval-requests/${id}/action`, { action, notes });
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>Manajemen Proyek, Tasks & Alur Persetujuan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan tugas tim, pengelolaan proyek sekolah, dan workflow approval berjenjang.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-950/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'tasks' && 'Buat Task Baru'}
            {activeTab === 'projects' && 'Buat Proyek Baru'}
            {activeTab === 'approvals' && 'Ajukan Approval'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 transition relative ${
            activeTab === 'tasks'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          1. Pelacakan Tugas (Tasks)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`pb-3 transition relative ${
            activeTab === 'projects'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          2. Proyek & Tim Kerja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 transition relative ${
            activeTab === 'approvals'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          3. Alur Persetujuan (Approval)
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: TASKS */}
          {activeTab === 'tasks' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Judul Tugas</th>
                    <th className="py-3 px-4">Proyek Terkait</th>
                    <th className="py-3 px-4">PIC / Penerima Tugas</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Jatuh Tempo</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ubah Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasksList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-400">
                        Belum ada tugas
                      </td>
                    </tr>
                  ) : (
                    tasksList.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{task.title}</td>
                        <td className="py-3.5 px-4 text-slate-600">{task.project_name || 'Umum'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{task.assignee_name}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              task.priority === 'high'
                                ? 'bg-rose-100 text-rose-700'
                                : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{task.due_date || '-'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              task.status === 'done'
                                ? 'bg-emerald-100 text-emerald-700'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {task.status !== 'done' && (
                            <button
                              type="button"
                              onClick={() => handleTaskStatus(task.id, 'done')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                            >
                              Selesai
                            </button>
                          )}
                          {task.status === 'todo' && (
                            <button
                              type="button"
                              onClick={() => handleTaskStatus(task.id, 'in_progress')}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold"
                            >
                              Proses
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectsList.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                      {p.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {p.start_date} s/d {p.end_date || 'Ongoing'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{p.description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">PIC: {p.pic_name}</span>
                    <span className="text-slate-500 font-semibold">{p.budget_reference || 'Non-Anggaran'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Alur Workflow</th>
                    <th className="py-3 px-4">Referensi Dokumen</th>
                    <th className="py-3 px-4">Pemohon</th>
                    <th className="py-3 px-4">Tahap Aktif</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvalRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400">
                        Belum ada antrean pengajuan approval
                      </td>
                    </tr>
                  ) : (
                    approvalRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{req.workflow_name}</td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {req.reference_type} #{req.reference_id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{req.requester_name}</td>
                        <td className="py-3.5 px-4 font-bold text-indigo-600">Step {req.current_step}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprovalAction(req.id, 'approved')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-[11px]"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprovalAction(req.id, 'rejected')}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold text-[11px]"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal Form */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'tasks' && 'Buat Task Baru'}
              {activeTab === 'projects' && 'Buat Proyek Baru'}
              {activeTab === 'approvals' && 'Ajukan Approval'}
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              {activeTab === 'tasks' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Judul Tugas</label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
                    <textarea
                      rows="2"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Prioritas</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="low">Rendah (Low)</option>
                        <option value="medium">Sedang (Medium)</option>
                        <option value="high">Tinggi (High)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo</label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'projects' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Proyek</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deskripsi Proyek</label>
                    <textarea
                      rows="2"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'approvals' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Alur Workflow</label>
                    <select
                      value={formData.approval_workflow_id}
                      onChange={(e) => setFormData({ ...formData, approval_workflow_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {workflowsList.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.applies_to})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ID Referensi Transaksi</label>
                    <input
                      type="number"
                      required
                      value={formData.reference_id}
                      onChange={(e) => setFormData({ ...formData, reference_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
