import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  BadgeDollarSign,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  X,
  Calendar
} from 'lucide-react';

export default function PengeluaranOperasional() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    expense_name: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    note: ''
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kantin/operational-expenses');
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching operational expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const openCreateModal = () => {
    setFormData({
      expense_name: '',
      amount: '',
      expense_date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/kantin/operational-expenses', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat pengeluaran operasional');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const totalExpense = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  const filtered = expenses.filter(e =>
    e.expense_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.note?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pengeluaran Operasional Kantin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan biaya non-barang seperti plastik/kemasan, es batu, token listrik, dan kebersihan
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Biaya Operasional</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Biaya Operasional</span>
          <h3 className="text-xl font-extrabold text-rose-700 mt-1 font-mono">
            {formatRupiah(totalExpense)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{expenses.length} transaksi pengeluaran</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis pengeluaran..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data pengeluaran...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Pengeluaran</th>
                  <th className="px-4 py-3">Nominal Biaya</th>
                  <th className="px-4 py-3">Tanggal Biaya</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Waktu Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                      <BadgeDollarSign className="w-3.5 h-3.5 text-rose-600" />
                      <span>{exp.expense_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-rose-700 text-sm">
                      {formatRupiah(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {exp.expense_date ? exp.expense_date.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{exp.note || '-'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {exp.created_at ? new Date(exp.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400 italic">
                      Belum ada catatan pengeluaran operasional
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Catat Pengeluaran Operasional</h3>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pengeluaran</label>
                <input
                  type="text"
                  required
                  value={formData.expense_name}
                  onChange={(e) => setFormData({ ...formData, expense_name: e.target.value })}
                  placeholder="Contoh: Beli Plastik & Sedotan, Es Batu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Biaya (Rp)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Contoh: 35000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Catatan belanja..."
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
                  {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
