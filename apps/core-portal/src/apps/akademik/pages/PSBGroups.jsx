import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

export default function PSBGroups() {
  const { activeSchoolUnit } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    psb_process_id: '',
    name: '',
    description: '',
    quota: 50,
    is_active: true
  });

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (selectedProcessId) {
      fetchGroups(selectedProcessId);
    } else {
      setGroups([]);
    }
  }, [selectedProcessId]);

  const fetchProcesses = async () => {
    try {
      const res = await api.get('/akademik/psb-processes');
      const list = res.data?.data || [];
      setProcesses(list);
      if (list.length > 0) {
        // pilih proses yang 'open' atau proses pertama
        const active = list.find((p) => p.status === 'open') || list[0];
        setSelectedProcessId(String(active.id));
      }
    } catch (err) {
      console.warn('Failed to load processes:', err);
    }
  };

  const fetchGroups = async (procId) => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-groups', {
        params: { psb_process_id: procId }
      });
      setGroups(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load PSB groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (grp = null) => {
    setErrorMsg('');
    if (grp) {
      setEditingId(grp.id);
      setFormData({
        psb_process_id: grp.psb_process_id || selectedProcessId,
        name: grp.name || '',
        description: grp.description || '',
        quota: grp.quota || 50,
        is_active: Boolean(grp.is_active)
      });
    } else {
      setEditingId(null);
      setFormData({
        psb_process_id: selectedProcessId,
        name: `Gelombang ${groups.length + 1}`,
        description: 'Jalur seleksi reguler berkas dan tes masuk.',
        quota: 50,
        is_active: true
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingId) {
        await api.put(`/akademik/psb-groups/${editingId}`, formData);
        setSuccessMsg('Kelompok/Gelombang PSB berhasil diperbarui!');
      } else {
        await api.post('/akademik/psb-groups', formData);
        setSuccessMsg('Kelompok/Gelombang PSB baru berhasil dibuat!');
      }
      setModalOpen(false);
      fetchGroups(selectedProcessId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan kelompok PSB');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kelompok/gelombang PSB ini?')) return;
    try {
      await api.delete(`/akademik/psb-groups/${id}`);
      setSuccessMsg('Kelompok PSB berhasil dihapus');
      fetchGroups(selectedProcessId);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kelompok PSB');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <span>Kelompok & Gelombang PSB</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur pengelompokan pendaftar (Gelombang 1, Gelombang 2, Jalur Prestasi, Tahfidz) beserta kuota maksimal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Proses PSB:</span>
            <select
              value={selectedProcessId}
              onChange={(e) => setSelectedProcessId(e.target.value)}
              className="text-xs font-bold text-teal-700 bg-transparent focus:outline-none"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.target_academic_year})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleOpenModal()}
            disabled={!selectedProcessId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md shadow-teal-900/20 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Gelombang</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Table List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nama Gelombang / Kelompok</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4">Kuota Maksimal</th>
                <th className="py-3.5 px-4">Terisi / Terdaftar</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Memuat data kelompok PSB...</span>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Belum ada kelompok/gelombang pada proses PSB ini.
                  </td>
                </tr>
              ) : (
                groups.map((g) => {
                  const filledCount = g.registrant_count || 0;
                  const maxQuota = g.quota || 50;
                  const percentage = Math.min(100, Math.round((filledCount / maxQuota) * 100));

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {g.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {g.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {maxQuota} Santri
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-teal-700">{filledCount} Santri</span>
                            <span className="text-slate-400">{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percentage >= 100 ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          g.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {g.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(g)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Edit Gelombang"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(g.id)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Hapus Gelombang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingId ? 'Edit Gelombang PSB' : 'Tambah Gelombang PSB Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-semibold">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Gelombang / Jalur *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Contoh: Gelombang 1 - Jalur Reguler"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kuota Maksimal (Santri) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quota}
                  onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Persyaratan Khusus</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_grp"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="is_active_grp" className="text-xs font-semibold text-slate-700">
                  Aktifkan gelombang ini untuk penerimaan pendaftar
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Gelombang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
