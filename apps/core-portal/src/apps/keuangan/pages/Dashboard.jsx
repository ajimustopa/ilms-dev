import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
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
  TrendingDown,
  Building2,
  School,
  Clock,
  Send,
  Tags,
  Layers,
  FileText,
  PieChart,
  ArrowRightLeft
} from 'lucide-react';

export default function Dashboard() {
  const { activeSchoolUnit } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loansSummary, setLoansSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const [res, loansRes] = await Promise.all([
        api.get('/keuangan/dashboard'),
        api.get('/keuangan/fund-balances/inter-year-loans').catch(() => null)
      ]);
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
      if (loansRes?.data?.data?.summary) {
        setLoansSummary(loansRes.data.data.summary);
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
  }, [activeSchoolUnit]);

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading && !dashboardData) {
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
    bill_amount_summary = {},
    draft_bills_count = 0,
    draft_bills_amount = 0,
    monthly_income_chart = [],
    monthly_expense_chart = [],
    budget_realization_percentage = 0,
    over_budget_alerts = [],
    budget_realization_by_item = [],
    outstanding_by_fee_scheme = [],
    fund_balances_summary = {},
    top_fund_balances = []
  } = dashboardData || {};

  const totalCashBalance = cash_balances.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);
  const totalBillsCount = (bill_status_summary.unpaid || 0) +
                          (bill_status_summary.partially_paid || 0) +
                          (bill_status_summary.paid || 0);

  const totalOutstandingAll = outstanding_by_fee_scheme.reduce((sum, s) => sum + parseFloat(s.outstanding_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Dashboard & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Keuangan</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isYayasan
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {isYayasan ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
              <span>{isYayasan ? 'Konteks: Pusat Yayasan (Gabungan)' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isYayasan
              ? 'Ringkasan posisi kas gabungan yayasan, status tagihan, realisasi RAPBS konsolidasi & arus transaksi'
              : `Ringkasan posisi kas, status tagihan siswa, realisasi RAPBS, dan arus transaksi untuk ${activeSchoolUnit?.name || 'Satuan'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60"
            title="Muat ulang ringkasan data dari database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
          <Link
            to="/keuangan/bills"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Kelola Tagihan</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Banner Notifikasi Tagihan Draf & Pending Approval (Bagian 5) */}
      {(draft_bills_count > 0 || (dashboardData?.pending_approval_bills_count > 0)) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Terdapat {draft_bills_count} Draf Tagihan Siap Diterbitkan
                {dashboardData?.pending_approval_bills_count > 0 && ` (${dashboardData.pending_approval_bills_count} Menunggu Approval Diskon)`}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Total estimasi piutang draf: <span className="font-semibold text-amber-900">{formatCurrency(draft_bills_amount)}</span>. 
                Draf dapat ditinjau dan disahkan secara massal (one-click confirm) agar langsung memicu jurnal piutang & tampil ke orang tua.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              to="/keuangan/bills"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tinjau & Sahkan Massal</span>
            </Link>
          </div>
        </div>
      )}

      {/* 1. Stat Cards: Saldo Kas Total, Draft Tagihan, & Status Tagihan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Saldo Kas */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo Kas & Bank</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-slate-800">
              {formatCurrency(totalCashBalance)}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {cash_balances.length} Akun Kas Aktif
            </p>
          </div>
        </div>

        {/* Draft Tagihan Menunggu Diterbitkan */}
        <Link
          to="/keuangan/bills"
          className="bg-amber-50/50 hover:bg-amber-50 p-4.5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Draft Tagihan</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl group-hover:scale-110 transition">
              <Send className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-amber-950">
              {draft_bills_count} <span className="text-xs font-normal text-amber-700">Siswa</span>
            </div>
            <p className="text-[10px] text-amber-800 font-medium mt-1 flex items-center gap-1 font-mono font-bold">
              {formatCurrency(draft_bills_amount)}
            </p>
          </div>
        </Link>

        {/* Tagihan Belum Lunas (Unpaid) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Piutang Berjalan</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Receipt className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-slate-800">
              {bill_status_summary.unpaid || 0}
            </div>
            <p className="text-[10px] text-rose-600 font-medium mt-1">
              Menunggu pembayaran orang tua
            </p>
          </div>
        </div>

        {/* Tagihan Lunas */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tagihan Terbayar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-slate-800">
              {bill_status_summary.paid || 0}
            </div>
            <p className="text-[10px] text-blue-600 font-medium mt-1">
              Dari {totalBillsCount} tagihan terbit
            </p>
          </div>
        </div>

        {/* Realisasi RAPBS */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Serapan RAPBS</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold text-slate-800">
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

      {/* 3. Realisasi RAPBS per Item Belanja & Piutang Tertunggak per Skema Biaya */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realisasi RAPBS per Item */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                Realisasi RAPBS per Item Belanja
              </h2>
              <p className="text-[11px] text-slate-400">Pemantauan penyerapan belanja terhadap pagu item RAPBS</p>
            </div>
            <Link to="/keuangan/expenses" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
              Belanja &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
            {budget_realization_by_item.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">Belum ada item belanja RAPBS yang terdaftar</p>
            ) : (
              budget_realization_by_item.slice(0, 6).map((item) => (
                <div key={item.item_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[220px]">{item.item_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.is_over_budget
                        ? 'bg-red-100 text-red-700'
                        : item.absorption_percentage > 80
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.absorption_percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Realisasi: <strong className="text-slate-700">{formatCurrency(item.realized_amount)}</strong></span>
                    <span>Pagu: <strong className="text-slate-700">{formatCurrency(item.planned_amount)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.is_over_budget ? 'bg-red-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(100, item.absorption_percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Piutang Tertunggak per Skema Biaya */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tags className="w-4 h-4 text-emerald-600" />
                Piutang Tertunggak per Skema Biaya
              </h2>
              <p className="text-[11px] text-slate-400">Distribusi tagihan belum lunas berdasarkan skema pembiayaan santri</p>
            </div>
            <Link to="/keuangan/fee-schemes" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Skema &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
            {outstanding_by_fee_scheme.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">Tidak ada piutang tertunggak saat ini</p>
            ) : (
              outstanding_by_fee_scheme.map((sch, idx) => {
                const pct = totalOutstandingAll > 0 ? (sch.outstanding_amount / totalOutstandingAll) * 100 : 0;
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{sch.scheme_name}</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {formatCurrency(sch.outstanding_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{sch.students_count} Santri ({sch.bills_count} Pos Tagihan)</span>
                      <span className="font-medium text-slate-600">{Math.round(pct)}% dari total piutang</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-rose-500"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Posisi Saldo Kas Detail & Grafik Arus Kas Bulanan */}
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

      {/* 5. Posisi Saldo per Sumber Dana (Kantong Dana & Opening Pool) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Saldo per Sumber Dana (Fund Balances)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Pemisahan Kantong
              </span>
            </div>
            <p className="text-xs text-slate-400">Alokasi dana kas berdasarkan pos penerimaan & saldo awal yang belum teralokasi</p>
          </div>
          <Link to="/keuangan/fund-balances" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 self-start sm:self-center">
            Kelola & Rincian Lengkap &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Akumulasi Masuk</span>
            <div className="text-base font-extrabold text-emerald-700 mt-1">
              {formatCurrency(fund_balances_summary.total_fund_in)}
            </div>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Total Terpakai Belanja</span>
            <div className="text-base font-extrabold text-rose-600 mt-1">
              {formatCurrency(fund_balances_summary.total_fund_out)}
            </div>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Total Saldo Tersisa</span>
            <div className="text-base font-extrabold text-indigo-900 mt-1">
              {formatCurrency(fund_balances_summary.total_fund_balance)}
            </div>
          </div>
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70">
            <span className="text-[11px] font-bold text-amber-900">Opening Pool Belum Teralokasi</span>
            <div className="text-base font-extrabold text-amber-950 mt-1">
              {formatCurrency(fund_balances_summary.opening_pool_balance)}
            </div>
          </div>

          {/* Widget Pinjaman Antar Tahun Ajaran */}
          {loansSummary && (
            <Link
              to="/keuangan/fund-balances"
              className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between hover:bg-indigo-100/70 transition"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-indigo-900">Pinjaman Antar Tahun Ajaran</span>
                  {loansSummary.aged_loans_count > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white animate-pulse">
                      {loansSummary.aged_loans_count} &gt; 90 Hari
                    </span>
                  )}
                </div>
                <div className="text-sm font-extrabold text-indigo-950 mt-0.5 font-mono">
                  {formatCurrency(loansSummary.total_outstanding || 0)}
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5">
                  {loansSummary.active_loans_count || 0} pinjaman aktif direalokasikan
                </div>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-indigo-500 shrink-0" />
            </Link>
          )}
        </div>
      </div>

      {/* 6. Menu Pintas Cepat (Quick Action Shortcuts) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <Link
          to="/keuangan/bills"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Tagihan & Draft</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Generate & Terbitkan</span>
        </Link>

        <Link
          to="/keuangan/student-ledger"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Kartu Bayar Siswa</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Ledger & Rekap Kelas</span>
        </Link>

        <Link
          to="/keuangan/fund-balances"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Saldo Sumber Dana</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Kantong & Opening Pool</span>
        </Link>

        <Link
          to="/keuangan/payments"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Kasir & Kwitansi</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Pembayaran & Bukti Transfer</span>
        </Link>

        <Link
          to="/keuangan/expenses"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Belanja RAPBS</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Pagu & Kwitansi Belanja</span>
        </Link>

        <Link
          to="/keuangan/reports"
          className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Laporan Keuangan</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Neraca Nirlaba & Buku Besar</span>
        </Link>
      </div>
    </div>
  );
}
