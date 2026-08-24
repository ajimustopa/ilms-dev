import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export default function TargetHafalan() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    class_ref_id: '1',
    period_label: 'Semester Ganjil 2026/2027',
    target_type: 'juz',
    target_value: 2,
    notes: ''
  });

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alquran/targets');
      setTargets(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const openCreateModal = () => {
    setEditingTarget(null);
    setFormData({
      class_ref_id: '1',
      period_label: 'Semester Ganjil 2026/2027',
      target_type: 'juz',
      target_value: 2,
      notes: ''
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (target) => {
    setEditingTarget(target);
    setFormData({
      class_ref_id: target.class_ref_id || '1',
      period_label: target.period_label || '',
      target_type: target.target_type || 'juz',
      target_value: target.target_value || 1,
      notes: target.notes || ''
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        class_ref_id: Number(formData.class_ref_id),
        target_value: Number(formData.target_value)
      };

      if (editingTarget) {
        await api.put(`/alquran/targets/${editingTarget.id}`, payload);
      } else {
        await api.post('/alquran/targets', payload);
      }

      setShowModal(false);
      fetchTargets();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan target hafalan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus target hafalan kelas ini?')) return;
    try {
      await api.delete(`/alquran/targets/${id}`);
      fetchTargets();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus target');
    }
  };

  const filteredTargets = targets.filter(t =>
    t.period_label?.toLowerCase().includes(search.toLowerCase()) ||
    String(t.class_ref_id).includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Target & Roadmap Hafalan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penetapan target capaian hafalan Al-Quran (Juz / Halaman) per rombel kelas dan periode akademik
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Target Baru</span>
        </button>
      </div>

      {/* Control Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari periode atau ID kelas..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredTargets.length}</span> target
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat target hafalan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Kelas / Rombel</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Tipe Target</th>
                  <th className="px-4 py-3">Nilai Target</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTargets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-slate-400">#{t.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">Kelas Ref #{t.class_ref_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{t.period_label || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t.target_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-800 text-sm">
                      {t.target_value} <span className="text-xs font-normal text-slate-500">{t.target_type}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{t.notes || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Edit Target"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTargets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                      Belum ada data target hafalan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit Target */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingTarget ? 'Edit Target Hafalan' : 'Tambah Target Hafalan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ID Kelas / Rombel</label>
                <input
                  type="number"
                  required
                  value={formData.class_ref_id}
                  onChange={(e) => setFormData({ ...formData, class_ref_id: e.target.value })}
                  placeholder="Contoh: 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Label Periode</label>
                <input
                  type="text"
                  required
                  value={formData.period_label}
                  onChange={(e) => setFormData({ ...formData, period_label: e.target.value })}
                  placeholder="Contoh: Semester Ganjil 2026/2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Target</label>
                  <select
                    value={formData.target_type}
                    onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="juz">Juz</option>
                    <option value="halaman">Halaman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Target</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan roadmap hafalan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
