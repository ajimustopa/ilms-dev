import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import {
  TrendingUp,
  ShoppingBag,
  Wallet,
  Coins,
  Receipt,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Clock,
  Loader2,
  ShoppingCart
} from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resSummary, resChart] = await Promise.all([
        api.get('/kantin/dashboard/summary'),
        api.get('/kantin/dashboard/sales-chart?period=7days')
      ]);

      setSummary(resSummary.data?.data || null);
      setChartData(resChart.data?.data || []);
    } catch (err) {
      console.error('Error fetching kantin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat ringkasan data kantin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Operasional Kantin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring performa transaksi kasir, perputaran stok produk, dan saldo bagi hasil kantin
          </p>
        </div>
        <Link
          to="/kantin/pos"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-950/20 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Buka Kasir POS Sekarang</span>
        </Link>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Penjualan Bulan Ini */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Penjualan Bulan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 mt-2">
            {formatRupiah(summary?.current_month_sales)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-amber-700">{summary?.current_month_tx_count || 0}</span> transaksi tercatat
          </p>
        </div>

        {/* Saldo Dompet Santri */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Dompet Santri</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-emerald-700 mt-2">
            {formatRupiah(summary?.total_student_wallets)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Total dari <span className="font-semibold text-slate-700">{summary?.active_students_count || 0}</span> akun santri aktif
          </p>
        </div>

        {/* Piutang Hak Kantin */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Piutang Hak Kantin</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-blue-700 mt-2">
            {formatRupiah(summary?.canteen_receivable_balance)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Siap dicairkan dari kas dompet
          </p>
        </div>

        {/* Hak Vendor Belum Dibayar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hak Vendor Terutang</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-purple-700 mt-2">
            {formatRupiah(summary?.vendor_payable_balance)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Kewajiban bayar ke vendor titipan
          </p>
        </div>
      </div>

      {/* Grid: 7-Days Trend + Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Penjualan 7 Hari Terakhir */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Tren Omzet Penjualan (7 Hari Terakhir)</h2>
              <p className="text-[11px] text-slate-500">Pergerakan total nominal transaksi kasir harian</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-100">
              Live Chart
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {chartData.map((d, idx) => {
              const maxVal = Math.max(...chartData.map(c => c.total_sales), 10000);
              const percentage = Math.round((d.total_sales / maxVal) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{d.label}</span>
                    <span className="font-bold text-slate-800">{formatRupiah(d.total_sales)} ({d.total_transactions} tx)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Stok Menipis */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Peringatan Stok Menipis</h2>
                <p className="text-[11px] text-slate-500">Produk mendekati/di bawah batas minimal</p>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {summary?.low_stock_alerts?.length > 0 ? (
                summary.low_stock_alerts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.product_name}</p>
                      <p className="text-[10px] text-slate-500">Min. Stok: {item.min_stock} {item.unit}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-rose-600 text-white font-mono text-xs font-bold">
                      {item.current_stock} {item.unit}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Semua stok produk dalam kondisi aman
                </div>
              )}
            </div>
          </div>

          <Link
            to="/kantin/goods-receipts"
            className="mt-4 pt-3 border-t border-slate-100 text-center text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center justify-center gap-1"
          >
            <span>Input Penerimaan Barang Baru</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabel 5 Transaksi Terakhir */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">Transaksi Kasir Terkini</h2>
          </div>
          <Link to="/kantin/pos" className="text-xs font-semibold text-amber-600 hover:underline">
            Lihat Semua Transaksi &rarr;
          </Link>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">ID Transaksi</th>
                <th className="px-4 py-2.5">Tipe Pembeli</th>
                <th className="px-4 py-2.5">Nama Pembeli</th>
                <th className="px-4 py-2.5">Metode Bayar</th>
                <th className="px-4 py-2.5">Total Belanja</th>
                <th className="px-4 py-2.5">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.recent_transactions?.length > 0 ? (
                summary.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">#{tx.id}</td>
                    <td className="px-4 py-2.5 capitalize">{tx.buyer_type === 'student' ? 'Santri' : 'Umum/Guru'}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {tx.student_name || 'Pembeli Umum'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                      {formatRupiah(tx.total_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                      {tx.transaction_at ? new Date(tx.transaction_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 italic text-xs">
                    Belum ada transaksi kasir hari ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
