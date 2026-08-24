import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  FileSpreadsheet,
  Plus,
  Send,
  Eye,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Calendar,
  X,
  History
} from 'lucide-react';

export default function BudgetPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [realizationData, setRealizationData] = useState(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [realizationModalOpen, setRealizationModalOpen] = useState(false);
  const [itemKind, setItemKind] = useState('income'); // 'income' | 'expense'

  // Form states
  const [title, setTitle] = useState('');
  const [academicYearId, setAcademicYearId] = useState(1);
  const [itemData, setItemData] = useState({ name: '', planned_amount: 0, budget_program_id: 1, account_code: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/keuangan/budget-plans');
      setPlans(res.data?.data || []);
      if (res.data?.data?.length > 0 && !selectedPlan) {
        setSelectedPlan(res.data.data[0]);
      }
    } catch (err) {
      console.error('Error fetching RAPBS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan) => {
    try {
      const res = await api.get(`/keuangan/budget-plans/${plan.id}`);
      setSelectedPlan(res.data?.data || plan);
    } catch (err) {
      setSelectedPlan(plan);
    }
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/keuangan/budget-plans', {
        academic_year_id: academicYearId,
        title: title || 'RAPBS Tahun Ajaran 2026/2027'
      });
      setCreateModalOpen(false);
      setTitle('');
      fetchPlans();
      if (res.data?.data) setSelectedPlan(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat draft RAPBS');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin mempublikasikan RAPBS ini? Setelah diterbitkan, versi ini akan menjadi acuan aktif.')) return;
    try {
      await api.patch(`/keuangan/budget-plans/${id}/publish`);
      fetchPlans();
      if (selectedPlan?.id === id) {
        setSelectedPlan({ ...selectedPlan, status: 'published' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mempublikasikan RAPBS');
    }
  };

  const handleViewRealization = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/keuangan/budget-plans/${id}/realization`);
      setRealizationData(res.data?.data);
      setRealizationModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghitung realisasi anggaran');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const endpoint = itemKind === 'income'
        ? `/keuangan/budget-plans/${selectedPlan.id}/income-items`
        : `/keuangan/budget-plans/${selectedPlan.id}/expense-items`;

      await api.post(endpoint, itemData);
      setItemModalOpen(false);
      setItemData({ name: '', planned_amount: 0, budget_program_id: 1, account_code: '' });
      handleSelectPlan(selectedPlan);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan item anggaran');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header RAPBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Rencana Anggaran Pendapatan & Belanja (RAPBS)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penyusunan anggaran rencana kerja sekolah, versi revisi, penetapan & pelacakan serapan real-time
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Draft RAPBS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Kolom Kiri: Daftar Versi RAPBS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Dokumen RAPBS</h2>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {plans.length} Versi
            </span>
          </div>

          <div className="space-y-2">
            {plans.map((p) => {
              const isSelected = selectedPlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPlan(p)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-2xs'
                      : 'border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.title || `RAPBS TA #${p.academic_year_id}`}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Versi {p.version}.0</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(p.total_expense || p.total_income || 0)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Rincian Anggaran & Item Program */}
        <div className="lg:col-span-3 space-y-6">
          {selectedPlan ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              {/* Detail Header & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800">{selectedPlan.title || 'Dokumen RAPBS'}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedPlan.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedPlan.status === 'published' ? 'Diterbitkan (Published)' : 'Draft Penyusunan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Versi Dokumen: {selectedPlan.version}.0 &bull; Satuan Pendidikan ID: #{selectedPlan.school_unit_id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewRealization(selectedPlan.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl transition"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Lihat Realisasi Real-Time</span>
                  </button>

                  {selectedPlan.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handlePublish(selectedPlan.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbitkan (Publish)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rencana Pendapatan */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Rencana Penerimaan & Pendapatan</h3>
                  {selectedPlan.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => { setItemKind('income'); setItemModalOpen(true); }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pos Pendapatan
                    </button>
                  )}
                </div>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Nama Sumber Pendapatan</th>
                        <th className="px-4 py-2.5">Kode Rekening</th>
                        <th className="px-4 py-2.5 text-right">Target Anggaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPlan.income_items && selectedPlan.income_items.length > 0 ? (
                        selectedPlan.income_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-semibold text-slate-700">{item.name}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-400">{item.account_code || '4-100'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(item.planned_amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">Belum ada item pendapatan</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rencana Pengeluaran Belanja Program */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Rencana Belanja & Kegiatan Program</h3>
                  {selectedPlan.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => { setItemKind('expense'); setItemModalOpen(true); }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pos Belanja
                    </button>
                  )}
                </div>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Nama Item Belanja / Kegiatan</th>
                        <th className="px-4 py-2.5">Program Kerja</th>
                        <th className="px-4 py-2.5 text-right">Plafon Anggaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPlan.expense_items && selectedPlan.expense_items.length > 0 ? (
                        selectedPlan.expense_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-semibold text-slate-700">{item.name}</td>
                            <td className="px-4 py-2.5 text-slate-500">{item.program_name || `Program #${item.budget_program_id || 1}`}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-rose-600">{formatCurrency(item.planned_amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">Belum ada item belanja program</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 italic">
              Pilih dokumen RAPBS dari daftar untuk melihat detail
            </div>
          )}
        </div>
      </div>

      {/* Modal Realisasi Anggaran Real-Time (Fitur #12) */}
      {realizationModalOpen && realizationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Realisasi Anggaran RAPBS (Real-Time)</h2>
                <p className="text-[11px] text-slate-400">Dihitung secara dinamis dari catatan pengeluaran kas aktual</p>
              </div>
              <button type="button" onClick={() => setRealizationModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Overall Summary Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Total Penyerapan Anggaran</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                    {realizationData.overall_absorption_percentage}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Realisasi / Anggaran</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    {formatCurrency(realizationData.total_realized_expense)} / {formatCurrency(realizationData.total_planned_expense)}
                  </div>
                </div>
              </div>

              {/* Rincian per Program */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700">Rincian Penyerapan per Program Kerja</h3>
                <div className="space-y-2">
                  {realizationData.programs?.map((prog, i) => (
                    <div key={i} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{prog.program_name}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${prog.is_over_budget ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {prog.absorption_percentage}% {prog.is_over_budget && '(Over-Budget)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Plafon: {formatCurrency(prog.planned_amount)}</span>
                        <span>Realisasi: <strong className="text-slate-800">{formatCurrency(prog.realized_amount)}</strong></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${prog.is_over_budget ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, prog.absorption_percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Draft Baru */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Buat Draft RAPBS Baru</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Dokumen RAPBS</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: RAPBS Tahun Ajaran 2026/2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Membuat...' : 'Buat Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Item Pos Pendapatan / Pengeluaran */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">
                Tambah Pos {itemKind === 'income' ? 'Pendapatan' : 'Belanja'} RAPBS
              </h2>
              <button type="button" onClick={() => setItemModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Item Pos Anggaran</label>
                <input
                  type="text"
                  required
                  value={itemData.name}
                  onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                  placeholder={itemKind === 'income' ? 'Penerimaan SPP Kelas 1-6' : 'Pengadaan Alat Praktikum IPA'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Target / Plafon (Rp)</label>
                <input
                  type="number"
                  required
                  value={itemData.planned_amount}
                  onChange={(e) => setItemData({ ...itemData, planned_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setItemModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Menyimpan...' : 'Simpan Pos Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
