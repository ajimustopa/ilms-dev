import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  BarChart3,
  Package,
  Store,
  Wallet,
  Calendar,
  Users,
  Printer,
  Loader2,
  Search,
  ArrowDownToLine
} from 'lucide-react';

export default function LaporanKantin() {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [cashReport, setCashReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const res = await api.get('/kantin/reports/products');
        setReportData(res.data?.data || []);
      } else if (activeTab === 'vendors') {
        const res = await api.get('/kantin/reports/vendors');
        setReportData(res.data?.data || []);
      } else if (activeTab === 'cash') {
        const res = await api.get('/kantin/reports/cash');
        setCashReport(res.data?.data || null);
      } else if (activeTab === 'monthly') {
        const res = await api.get(`/kantin/reports/monthly?month=${month}`);
        setMonthlyReport(res.data?.data || null);
      } else if (activeTab === 'spending') {
        const res = await api.get(`/kantin/reports/monthly-spending?month=${month}`);
        setReportData(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, month]);

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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Laporan & Rekapitulasi Kantin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan komprehensif performa barang, vendor titipan, arus kas, laba rugi, dan jajan santri
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['monthly', 'spending'].includes(activeTab) && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
            />
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-5 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === 'products'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Laporan Perputaran Produk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`px-5 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === 'vendors'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Laporan Kinerja Vendor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash')}
            className={`px-5 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === 'cash'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Laporan Arus Kas Kantin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-5 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === 'monthly'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Rekap Bulanan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spending')}
            className={`px-5 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === 'spending'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Belanja Jajan Santri
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Menyusun laporan...</p>
          </div>
        ) : activeTab === 'products' ? (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Masuk</th>
                  <th className="px-4 py-3">Terjual</th>
                  <th className="px-4 py-3">Retur</th>
                  <th className="px-4 py-3">Sisa Stok</th>
                  <th className="px-4 py-3">Total Modal</th>
                  <th className="px-4 py-3">Omzet</th>
                  <th className="px-4 py-3 font-bold text-amber-800">Laba Kantin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{p.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.vendor || '-'}</td>
                    <td className="px-4 py-3 font-mono">{p.total_received}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{p.total_sold}</td>
                    <td className="px-4 py-3 font-mono text-rose-600">{p.total_returned}</td>
                    <td className="px-4 py-3 font-mono font-bold">{p.current_stock}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{formatRupiah(p.total_cost)}</td>
                    <td className="px-4 py-3 font-mono text-slate-800">{formatRupiah(p.total_revenue)}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(p.canteen_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'vendors' ? (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Vendor</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Total Produk</th>
                  <th className="px-4 py-3">Total Omzet</th>
                  <th className="px-4 py-3">Hak Kotor Vendor</th>
                  <th className="px-4 py-3">Sudah Dibayar</th>
                  <th className="px-4 py-3 font-bold text-purple-800">Sisa Terutang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{v.vendor_name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{v.contact || '-'}</td>
                    <td className="px-4 py-3 font-mono">{v.total_products}</td>
                    <td className="px-4 py-3 font-mono">{formatRupiah(v.total_sales)}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(v.vendor_gross_share)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{formatRupiah(v.vendor_paid)}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-purple-700">
                      {formatRupiah(v.vendor_payable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'cash' ? (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-slate-800">Ringkasan Arus Kas Masuk & Keluar</h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">(+) Total Setoran Top-Up:</span>
                <span className="font-mono font-bold text-emerald-700">+{formatRupiah(cashReport?.total_top_up)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(+) Total Penjualan Tunai:</span>
                <span className="font-mono font-bold text-emerald-700">+{formatRupiah(cashReport?.total_cash_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(-) Total Tarik Tunai Dompet:</span>
                <span className="font-mono font-bold text-rose-700">-{formatRupiah(cashReport?.total_withdrawal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(-) Biaya Operasional:</span>
                <span className="font-mono font-bold text-rose-700">-{formatRupiah(cashReport?.total_operational_expenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">(-) Pembayaran Hak Vendor:</span>
                <span className="font-mono font-bold text-rose-700">-{formatRupiah(cashReport?.total_vendor_fee_paid)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                <span>NET ARUS KAS:</span>
                <span className="font-mono text-amber-700">{formatRupiah(cashReport?.net_cash_flow)}</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'monthly' ? (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-slate-800">Rekapitulasi Kinerja Bulan {monthlyReport?.month}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="text-slate-500 font-semibold">Total Omzet Penjualan</p>
                <h4 className="text-lg font-extrabold text-slate-800 mt-1 font-mono">{formatRupiah(monthlyReport?.total_revenue)}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{monthlyReport?.total_transactions} transaksi</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="text-slate-500 font-semibold">Total Biaya Operasional</p>
                <h4 className="text-lg font-extrabold text-rose-700 mt-1 font-mono">{formatRupiah(monthlyReport?.total_expenses)}</h4>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900">LABA BERSIH BULANAN:</span>
              <span className="text-base font-black text-emerald-800 font-mono">{formatRupiah(monthlyReport?.net_income)}</span>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Santri</th>
                  <th className="px-4 py-3">Rombel / Kelas</th>
                  <th className="px-4 py-3">Frekuensi Jajan</th>
                  <th className="px-4 py-3 font-bold text-amber-800">Total Pengeluaran Jajan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{s.student_name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.class_group_name || '-'}</td>
                    <td className="px-4 py-3 font-mono">{s.total_tx} kali</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(s.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
