import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Receipt,
  Store,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  X,
  CreditCard
} from 'lucide-react';

export default function HakVendor() {
  const [vendorShares, setVendorShares] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'history'

  // Modal Pembayaran
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    vendor_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    amount: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resShares, resPay] = await Promise.all([
        api.get('/kantin/receivables/vendor-share'),
        api.get('/kantin/vendor-fee-payments')
      ]);

      setVendorShares(resShares.data?.data || []);
      setPayments(resPay.data?.data || []);

      if (resShares.data?.data?.length > 0) {
        setFormData(prev => ({
          ...prev,
          vendor_id: resShares.data.data[0].vendor_id,
          amount: String(resShares.data.data[0].vendor_payable || 0)
        }));
      }
    } catch (err) {
      console.error('Error fetching vendor shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPaymentModal = (vendor) => {
    setFormData({
      vendor_id: vendor.vendor_id,
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      amount: String(vendor.vendor_payable || 0)
    });
    setError(null);
    setShowModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/kantin/vendor-fee-payments', {
        ...formData,
        vendor_id: Number(formData.vendor_id),
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat pembayaran vendor');
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Kewajiban Pembayaran Hak Vendor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan akumulasi penjualan produk titipan konsinyasi dan pelunasan hak hasil penjualan ke vendor
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-3 border-b-2 transition ${
              activeTab === 'summary'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ringkasan Hak Vendor Terutang
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
            Riwayat Pembayaran ke Vendor
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data vendor share...</p>
          </div>
        ) : activeTab === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Vendor</th>
                  <th className="px-4 py-3">Item Terjual</th>
                  <th className="px-4 py-3">Total Omzet</th>
                  <th className="px-4 py-3">Bagi Hasil Kantin</th>
                  <th className="px-4 py-3">Hak Kotor Vendor</th>
                  <th className="px-4 py-3">Sudah Dibayar</th>
                  <th className="px-4 py-3 font-bold text-purple-800">Sisa Hak Vendor (Hutang)</th>
                  <th className="px-4 py-3 text-right">Aksi Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorShares.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      <span>{v.vendor_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{v.total_items_sold}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{formatRupiah(v.total_sales_amount)}</td>
                    <td className="px-4 py-3 font-mono text-amber-700">{formatRupiah(v.canteen_cut)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{formatRupiah(v.vendor_gross_share)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{formatRupiah(v.vendor_paid)}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-purple-700 text-sm">
                      {formatRupiah(v.vendor_payable)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openPaymentModal(v)}
                        disabled={v.vendor_payable <= 0}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-40 inline-flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Bayar Vendor</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {vendorShares.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                      Belum ada penjualan produk vendor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Pembayaran</th>
                  <th className="px-4 py-3">Nama Vendor</th>
                  <th className="px-4 py-3">Periode Tagihan</th>
                  <th className="px-4 py-3">Nominal Dibayarkan</th>
                  <th className="px-4 py-3">Waktu Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">#VFP-{p.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.vendor}</td>
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
                    <td colSpan="5" className="py-12 text-center text-slate-400 italic">
                      Belum ada catatan pembayaran hak vendor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pembayaran Hak Vendor */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Pelunasan Hak Vendor</h3>
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

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Vendor</label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => {
                    const vid = e.target.value;
                    const v = vendorShares.find(item => String(item.vendor_id) === String(vid));
                    setFormData({
                      ...formData,
                      vendor_id: vid,
                      amount: v ? String(v.vendor_payable || 0) : formData.amount
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {vendorShares.map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name} (Hutang: {formatRupiah(v.vendor_payable)})
                    </option>
                  ))}
                </select>
              </div>

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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
