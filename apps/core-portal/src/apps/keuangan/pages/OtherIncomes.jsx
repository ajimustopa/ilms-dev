import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  X,
  Tags
} from 'lucide-react';

export default function OtherIncomes() {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    transaction_category_id: '',
    cash_account_id: '',
    amount: '',
    received_at: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incRes, catRes, cashRes] = await Promise.all([
        api.get('/keuangan/other-incomes'),
        api.get('/keuangan/transaction-categories?category_type=income'),
        api.get('/keuangan/cash-accounts')
      ]);

      setIncomes(incRes.data?.data || []);
      setCategories(catRes.data?.data || []);
      setCashAccounts(cashRes.data?.data || []);

      if (catRes.data?.data?.[0]) setFormData((prev) => ({ ...prev, transaction_category_id: catRes.data.data[0].id }));
      if (cashRes.data?.data?.[0]) setFormData((prev) => ({ ...prev, cash_account_id: cashRes.data.data[0].id }));
    } catch (err) {
      console.error('Error fetching other incomes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateIncome = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/keuangan/other-incomes', formData);
      alert('Penerimaan Non-SPP berhasil dicatat & jurnal otomatis dibukukan!');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat penerimaan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Yakin ingin menghapus penerimaan ini?')) return;
    try {
      await api.delete(`/keuangan/other-incomes/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus penerimaan');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Penerimaan Kas Non-SPP</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pendapatan infaq, sewa kantin, penjualan seragam, formulir PPDB & donasi
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Penerimaan Baru</span>
        </button>
      </div>

      {/* Table Other Incomes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data penerimaan...</p>
          </div>
        ) : incomes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            Belum ada penerimaan non-SPP yang dicatat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Kategori Penerimaan</th>
                  <th className="px-5 py-3">Akun Kas / Bank Masuk</th>
                  <th className="px-5 py-3">Keterangan</th>
                  <th className="px-5 py-3 text-right">Nominal</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 text-slate-500">{inc.received_at ? inc.received_at.slice(0, 10) : '-'}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{inc.category_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{inc.cash_account_name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{inc.notes || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(inc.amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteIncome(inc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Hapus Penerimaan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Catat Penerimaan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Catat Penerimaan Kas Non-SPP</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Transaksi</label>
                <select
                  required
                  value={formData.transaction_category_id}
                  onChange={(e) => setFormData({ ...formData, transaction_category_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Kas / Bank Penerima</label>
                <select
                  required
                  value={formData.cash_account_id}
                  onChange={(e) => setFormData({ ...formData, cash_account_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Penerimaan (Rp)</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Penerimaan</label>
                <input
                  type="date"
                  required
                  value={formData.received_at}
                  onChange={(e) => setFormData({ ...formData, received_at: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Misal: Infaq Jumat / Sewa Kantin Bulan Agustus"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Menyimpan...' : 'Simpan Penerimaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
