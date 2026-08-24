import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Compass,
  Plus,
  Edit,
  CheckCircle,
  Archive,
  Trash2,
  Loader2,
  Calendar,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function Planning() {
  const [activeTab, setActiveTab] = useState('rips'); // 'rips' | 'rks' | 'programs'
  const [loading, setLoading] = useState(false);
  const [ripsList, setRipsList] = useState([]);
  const [rksList, setRksList] = useState([]);
  const [programsList, setProgramsList] = useState([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create_rips'); // 'create_rips' | 'create_rks' | 'create_program'
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rips') {
        const res = await api.get('/api/v1/manajemen/institution-development-plans');
        setRipsList(res.data.data || []);
      } else if (activeTab === 'rks') {
        const res = await api.get('/api/v1/manajemen/school-work-plans');
        setRksList(res.data.data || []);
      } else if (activeTab === 'programs') {
        const res = await api.get('/api/v1/manajemen/work-plan-programs');
        setProgramsList(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenCreate = () => {
    setError(null);
    if (activeTab === 'rips') {
      setModalType('create_rips');
      setFormData({
        title: '',
        period_start_year: 2026,
        period_end_year: 2030,
        vision: '',
        mission: '',
      });
    } else if (activeTab === 'rks') {
      setModalType('create_rks');
      setFormData({
        title: '',
        program_focus: '',
        budget_ceiling_reference: '',
        institution_development_plan_id: ripsList[0]?.id || '',
      });
    } else {
      setModalType('create_program');
      setFormData({
        unit_name: 'Kurikulum',
        pic_employee_id: 1,
        title: '',
        description: '',
        target: '',
        status: 'planned',
        school_work_plan_id: rksList[0]?.id || '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (modalType === 'create_rips') {
        await api.post('/api/v1/manajemen/institution-development-plans', formData);
      } else if (modalType === 'create_rks') {
        await api.post('/api/v1/manajemen/school-work-plans', formData);
      } else if (modalType === 'create_program') {
        await api.post('/api/v1/manajemen/work-plan-programs', formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRips = async (id) => {
    if (window.confirm('Setujui dan aktifkan RIPS ini?')) {
      await api.patch(`/api/v1/manajemen/institution-development-plans/${id}/approve`);
      fetchData();
    }
  };

  const handleApproveRks = async (id) => {
    if (window.confirm('Setujui RKS tahunan ini?')) {
      await api.patch(`/api/v1/manajemen/school-work-plans/${id}/approve`);
      fetchData();
    }
  };

  const handleDeleteProgram = async (id) => {
    if (window.confirm('Hapus program kerja ini?')) {
      await api.delete(`/api/v1/manajemen/work-plan-programs/${id}`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <span>Perencanaan Strategis & Rencana Kerja</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola Rencana Induk Pengembangan Sekolah (RIPS), Rencana Kerja Tahunan (RKS), dan Program Kerja Unit.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-950/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'rips' && 'Buat RIPS Baru'}
            {activeTab === 'rks' && 'Buat RKS Baru'}
            {activeTab === 'programs' && 'Tambah Program Kerja'}
          </span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('rips')}
          className={`pb-3 transition relative ${
            activeTab === 'rips'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          1. RIPS (Rencana Induk Jangka Menengah)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rks')}
          className={`pb-3 transition relative ${
            activeTab === 'rks'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          2. RKS (Rencana Kerja Tahunan)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('programs')}
          className={`pb-3 transition relative ${
            activeTab === 'programs'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          3. Program Kerja Unit / Bidang
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: RIPS */}
          {activeTab === 'rips' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Judul Dokumen RIPS</th>
                      <th className="py-3 px-4">Periode</th>
                      <th className="py-3 px-4">Visi & Fokus</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ripsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">
                          Belum ada dokumen RIPS
                        </td>
                      </tr>
                    ) : (
                      ripsList.map((rips) => (
                        <tr key={rips.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{rips.title}</td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {rips.period_start_year} - {rips.period_end_year}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {rips.vision || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rips.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : rips.status === 'archived'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {rips.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {rips.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleApproveRips(rips.id)}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px]"
                              >
                                Setujui
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RKS */}
          {activeTab === 'rks' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Judul RKS</th>
                      <th className="py-3 px-4">Fokus Program</th>
                      <th className="py-3 px-4">Referensi Plafon Anggaran</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rksList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">
                          Belum ada RKS tahunan
                        </td>
                      </tr>
                    ) : (
                      rksList.map((rks) => (
                        <tr key={rks.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{rks.title}</td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {rks.program_focus || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {rks.budget_ceiling_reference || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rks.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : rks.status === 'submitted'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {rks.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {rks.status === 'submitted' && (
                              <button
                                type="button"
                                onClick={() => handleApproveRks(rks.id)}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px]"
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRAM KERJA */}
          {activeTab === 'programs' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Program Kerja</th>
                      <th className="py-3 px-4">Unit / Bidang</th>
                      <th className="py-3 px-4">PIC</th>
                      <th className="py-3 px-4">Periode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programsList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-slate-400">
                          Belum ada program kerja
                        </td>
                      </tr>
                    ) : (
                      programsList.map((prog) => (
                        <tr key={prog.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-800">{prog.title}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{prog.description}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{prog.unit_name}</td>
                          <td className="py-3.5 px-4 text-slate-600">{prog.pic_name}</td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {prog.start_date ? `${prog.start_date} s/d ${prog.end_date}` : '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                prog.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : prog.status === 'ongoing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {prog.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {prog.status === 'planned' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProgram(prog.id)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              {modalType === 'create_rips' && 'Buat Dokumen RIPS Baru'}
              {modalType === 'create_rks' && 'Buat RKS Tahunan Baru'}
              {modalType === 'create_program' && 'Tambah Program Kerja Unit'}
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Dokumen / Program</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Mis. RIPS 2026-2030 atau Program Kerja Kurikulum"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {modalType === 'create_rips' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tahun Awal</label>
                    <input
                      type="number"
                      required
                      value={formData.period_start_year || 2026}
                      onChange={(e) => setFormData({ ...formData, period_start_year: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tahun Akhir</label>
                    <input
                      type="number"
                      required
                      value={formData.period_end_year || 2030}
                      onChange={(e) => setFormData({ ...formData, period_end_year: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {modalType === 'create_rks' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fokus Program</label>
                  <textarea
                    rows="2"
                    value={formData.program_focus || ''}
                    onChange={(e) => setFormData({ ...formData, program_focus: e.target.value })}
                    placeholder="Peningkatan mutu guru, sarana dsb."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {modalType === 'create_program' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Unit / Bidang</label>
                    <input
                      type="text"
                      required
                      value={formData.unit_name || ''}
                      onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                      placeholder="Mis. Kurikulum, Kesiswaan, Sarpras"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Capaian</label>
                    <input
                      type="text"
                      value={formData.target || ''}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      placeholder="Mis. 100% guru menyelesaikan modul ajar"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
