import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Sliders,
  Plus,
  Edit2,
  Search,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function LimitJajan() {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    limit_name: '',
    limit_amount: '',
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: '',
    note: ''
  });

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kantin/daily-spending-limits');
      setLimits(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching daily limits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const openCreateModal = () => {
    setEditingLimit(null);
    setFormData({
      limit_name: '',
      limit_amount: '',
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: '',
      note: ''
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (limit) => {
    setEditingLimit(limit);
    setFormData({
      limit_name: limit.limit_name || '',
      limit_amount: String(limit.limit_amount || ''),
      valid_from: limit.valid_from ? limit.valid_from.slice(0, 10) : '',
      valid_until: limit.valid_until ? limit.valid_until.slice(0, 10) : '',
      note: limit.note || ''
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
        limit_amount: parseFloat(formData.limit_amount),
        valid_until: formData.valid_until || null
      };

      if (editingLimit) {
        await api.put(`/kantin/daily-spending-limits/${editingLimit.id}`, payload);
      } else {
        await api.post('/kantin/daily-spending-limits', payload);
      }

      setShowModal(false);
      fetchLimits();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan limit jajan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/daily-spending-limits/${id}/status`, { status: nextStatus });
      fetchLimits();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal update status');
    }
  };

  const filteredLimits = limits.filter(l =>
    l.limit_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.note?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Aturan Limit Jajan Harian</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Batas maksimal nominal belanja harian per santri yang ditetapkan secara terpusat oleh Admin Kantin
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Limit Baru</span>
        </button>
      </div>

      {/* Control Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama limit..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredLimits.length}</span> Limit Aturan
        </div>
      </div>

      {/* Table of Limits */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data limit...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Aturan Limit</th>
                  <th className="px-4 py-3">Maksimal Belanja</th>
                  <th className="px-4 py-3">Berlaku Dari</th>
                  <th className="px-4 py-3">Berlaku Sampai</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLimits.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{l.limit_name}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700 text-sm">
                      Rp{parseFloat(l.limit_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.valid_from ? l.valid_from.slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{l.valid_until ? l.valid_until.slice(0, 10) : 'Tanpa Batas'}</td>
                    <td className="px-4 py-3 text-slate-500">{l.note || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(l.id, l.status)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition ${
                          l.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {l.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(l)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredLimits.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      Belum ada aturan limit jajan harian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Limit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingLimit ? 'Edit Aturan Limit' : 'Tambah Aturan Limit Baru'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Aturan Limit</label>
                <input
                  type="text"
                  required
                  value={formData.limit_name}
                  onChange={(e) => setFormData({ ...formData, limit_name: e.target.value })}
                  placeholder="Contoh: Limit Standar SD / SMA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maksimal Nominal Harian (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={formData.limit_amount}
                  onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                  placeholder="Contoh: 25000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Berlaku Dari</label>
                  <input
                    type="date"
                    required
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Berlaku Sampai (Opsional)</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Deskripsi</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Keterangan tambahan..."
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
                  {submitting ? 'Menyimpan...' : 'Simpan Aturan Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
