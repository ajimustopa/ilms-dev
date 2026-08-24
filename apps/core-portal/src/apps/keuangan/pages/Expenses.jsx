import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    unit: 'pcs',
    unit_price: 0,
    quantity: 1,
    vendor: '',
    expense_date: new Date().toISOString().slice(0, 10),
    proof_number: '',
    budget_plan_expense_item_id: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/keuangan/expenses');
      setExpenses(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/keuangan/expenses', formData);
      alert('Pengeluaran berhasil dicatat & jurnal otomatis dibukukan!');
      setModalOpen(false);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    const reason = prompt('Masukkan alasan penghapusan / pembatalan pengeluaran:');
    if (!reason) return;

    try {
      await api.delete(`/keuangan/expenses/${id}`, { data: { deleted_reason: reason } });
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus pengeluaran');
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pengeluaran Kas & Belanja Operasional</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan realisasi belanja sekolah, nomor bukti kwitansi vendor & penyerapan pos RAPBS
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Belanja Baru</span>
        </button>
      </div>

      {/* Table Expenses */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data pengeluaran...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            Belum ada pengeluaran kas yang dicatat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Item Belanja</th>
                  <th className="px-5 py-3">Vendor / Toko</th>
                  <th className="px-5 py-3">Pos RAPBS Terkait</th>
                  <th className="px-5 py-3 text-right">Vol & Harga</th>
                  <th className="px-5 py-3 text-right">Total Nominal</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 text-slate-500">{ex.expense_date ? ex.expense_date.slice(0, 10) : '-'}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{ex.item_name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{ex.vendor || '-'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{ex.budget_item_name || 'Operasional Umum'}</td>
                    <td className="px-5 py-3.5 text-right text-slate-500">
                      {ex.quantity} {ex.unit} @ {formatCurrency(ex.unit_price)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">{formatCurrency(ex.total_amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(ex.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Hapus / Batalkan Pengeluaran"
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

      {/* Modal Catat Belanja */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Catat Pengeluaran / Belanja Kas</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Item Belanja</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="Contoh: Kertas HVS A4 5 Rim"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Rim / Unit"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Toko</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Nama Vendor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Bukti / Kwitansi</label>
                  <input
                    type="text"
                    value={formData.proof_number}
                    onChange={(e) => setFormData({ ...formData, proof_number: e.target.value })}
                    placeholder="KWT/INV/001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Menyimpan...' : 'Simpan Belanja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
