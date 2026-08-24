import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Wallet,
  Landmark,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  CreditCard,
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/keuangan/dashboard');
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.message || 'Gagal memuat data dashboard keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Memuat data ringkasan keuangan...</p>
      </div>
    );
  }

  const {
    cash_balances = [],
    bill_status_summary = {},
    monthly_income_chart = [],
    monthly_expense_chart = [],
    budget_realization_percentage = 0,
    over_budget_alerts = []
  } = dashboardData || {};

  const totalCashBalance = cash_balances.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);
  const totalBillsCount = (bill_status_summary.unpaid || 0) +
                          (bill_status_summary.partially_paid || 0) +
                          (bill_status_summary.paid || 0);

  return (
    <div className="space-y-6">
      {/* Header Dashboard & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Keuangan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan posisi kas, status tagihan siswa, realisasi RAPBS, dan arus transaksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
          <Link
            to="/keuangan/bills"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Buat Tagihan</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Stat Cards: Saldo Kas Total & Status Tagihan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Saldo Kas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Saldo Kas & Bank</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">
              {formatCurrency(totalCashBalance)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {cash_balances.length} Akun Kas Aktif
            </p>
          </div>
        </div>

        {/* Tagihan Belum Lunas (Unpaid) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tagihan Belum Lunas</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">
              {bill_status_summary.unpaid || 0}
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Menunggu pembayaran dari orang tua
            </p>
          </div>
        </div>

        {/* Tagihan Lunas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tagihan Terbayar Lunas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">
              {bill_status_summary.paid || 0}
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-1">
              Dari total {totalBillsCount} tagihan siswa
            </p>
          </div>
        </div>

        {/* Realisasi RAPBS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Serapan RAPBS Aktif</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-800">
              {budget_realization_percentage}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  budget_realization_percentage > 100
                    ? 'bg-red-500'
                    : budget_realization_percentage > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budget_realization_percentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Over Budget Alerts (Jika ada serapan > 100%) */}
      {over_budget_alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Peringatan Anggaran: Terdapat Program RAPBS Melebihi Batas (Over-Budget)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {over_budget_alerts.map((alert, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-red-100 shadow-2xs">
                <div className="text-xs font-bold text-slate-800">{alert.program_name}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Rencana: <span className="font-semibold">{formatCurrency(alert.planned_amount)}</span> &bull; Realisasi: <span className="font-semibold text-red-600">{formatCurrency(alert.realized_amount)}</span>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                    Serapan {alert.absorption_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Posisi Saldo Kas Detail & Grafik Arus Kas Bulanan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rincian Kas & Bank */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Rincian Akun Kas & Bank</h2>
            <Link to="/keuangan/master-data" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Kelola &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {cash_balances.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada akun kas terdaftar</p>
            ) : (
              cash_balances.map((acc) => (
                <div key={acc.cash_account_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">ID Akun: #{acc.cash_account_id}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {formatCurrency(acc.balance)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Total Likuiditas Kas</span>
            <span className="text-emerald-600">{formatCurrency(totalCashBalance)}</span>
          </div>
        </div>

        {/* Ringkasan Arus Bulanan (Penerimaan vs Pengeluaran) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Aktivitas Keuangan Bulanan</h2>
              <p className="text-xs text-slate-400">Pemasukan (SPP & Non-SPP) vs Pengeluaran (Belanja & Gaji)</p>
            </div>
            <Link to="/keuangan/reports" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Laporan Lengkap &rarr;
            </Link>
          </div>

          {/* Simple Clean Table Summary for Months */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Periode Bulan</th>
                  <th className="px-4 py-3 text-right">Pemasukan</th>
                  <th className="px-4 py-3 text-right">Pengeluaran</th>
                  <th className="px-4 py-3 text-right rounded-r-xl">Net Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthly_income_chart.length === 0 && monthly_expense_chart.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                      Belum ada catatan mutasi transaksi bulanan
                    </td>
                  </tr>
                ) : (
                  // Gabungkan bulan unik
                  Array.from(new Set([
                    ...monthly_income_chart.map(m => m.month),
                    ...monthly_expense_chart.map(m => m.month)
                  ])).sort().reverse().slice(0, 6).map((month) => {
                    const inc = monthly_income_chart.find(m => m.month === month)?.amount || 0;
                    const exp = monthly_expense_chart.find(m => m.month === month)?.amount || 0;
                    const net = inc - exp;

                    return (
                      <tr key={month} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-700">{month}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {formatCurrency(inc)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">
                          {formatCurrency(exp)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={net >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {formatCurrency(net)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Menu Pintas Cepat (Quick Action Shortcuts) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/keuangan/bills"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Generate Tagihan</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Massal per Kelas / Angkatan</span>
        </Link>

        <Link
          to="/keuangan/payments"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Catat Pembayaran</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Kwitansi & Histori</span>
        </Link>

        <Link
          to="/keuangan/budget"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Susun RAPBS</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Draft & Realisasi Anggaran</span>
        </Link>

        <Link
          to="/keuangan/reports"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Laporan Akuntansi</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Buku Besar, Neraca & Kas</span>
        </Link>
      </div>
    </div>
  );
}
