import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Coins,
  Receipt,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowDownToLine,
  X,
  Calendar
} from 'lucide-react';

export default function PiutangHakKantin() {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'history'

  // Modal Pencairan
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    amount: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSum, resDet, resPay] = await Promise.all([
        api.get('/kantin/receivables/canteen-share'),
        api.get('/kantin/receivables/canteen-share/detail'),
        api.get('/kantin/canteen-fee-payments')
      ]);

      setSummary(resSum.data?.data || null);
      setDetails(resDet.data?.data || []);
      setPayments(resPay.data?.data || []);

      if (resSum.data?.data?.canteen_receivable > 0) {
        setFormData(prev => ({ ...prev, amount: String(resSum.data.data.canteen_receivable) }));
      }
    } catch (err) {
      console.error('Error fetching canteen share data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisbursementSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/kantin/canteen-fee-payments', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat pencairan hak kantin');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Piutang & Bagi Hasil Hak Kantin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan selisih harga jual dan harga modal (profit margin) serta pencairan dana dari kas dompet santri
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Cairkan Hak Kantin</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Omzet Penjualan</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">
            {formatRupiah(summary?.total_sales)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Bruto seluruh penjualan barang</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sudah Dicairkan</span>
          <h3 className="text-xl font-extrabold text-slate-600 mt-1">
            {formatRupiah(summary?.canteen_paid)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Pencairan ke kas utama kantin</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Sisa Piutang Hak Kantin</span>
          <h3 className="text-xl font-extrabold text-blue-700 mt-1 font-mono">
            {formatRupiah(summary?.canteen_receivable)}
          </h3>
          <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Dana siap dicairkan</p>
        </div>
      </div>

      {/* Tabs Detail Produk vs Riwayat Pencairan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`px-5 py-3 border-b-2 transition ${
              activeTab === 'detail'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Rincian Keuntungan Per Produk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 border-b-2 transition ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Riwayat Pencairan Hak Kantin
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data bagi hasil kantin...</p>
          </div>
        ) : activeTab === 'detail' ? (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Terjual</th>
                  <th className="px-4 py-3">Harga Beli</th>
                  <th className="px-4 py-3">Harga Jual</th>
                  <th className="px-4 py-3">Total Modal</th>
                  <th className="px-4 py-3">Total Omzet</th>
                  <th className="px-4 py-3 font-bold text-amber-800">Hak Kantin (Margin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{item.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.vendor || 'Mandiri'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.total_qty_sold}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatRupiah(item.avg_cost_price)}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatRupiah(item.avg_sale_price)}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatRupiah(item.total_cost)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{formatRupiah(item.total_sales)}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(item.canteen_profit)}
                    </td>
                  </tr>
                ))}

                {details.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                      Belum ada penjualan barang tercatat
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Pencairan</th>
                  <th className="px-4 py-3">Periode Transaksi</th>
                  <th className="px-4 py-3">Nominal Pencairan</th>
                  <th className="px-4 py-3">Waktu Pencairan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">#CFP-{p.id}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono">
                      {p.period_start?.slice(0, 10)} s/d {p.period_end?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}

                {payments.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 italic">
                      Belum ada riwayat pencairan hak kantin
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pencairan Hak Kantin */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Form Pencairan Hak Kantin</h3>
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

            <form onSubmit={handleDisbursementSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Periode Dari</label>
                  <input
                    type="date"
                    required
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Periode Sampai</label>
                  <input
                    type="date"
                    required
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pencairan (Rp)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Contoh: 100000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
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
                  {submitting ? 'Memproses...' : 'Konfirmasi Pencairan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
