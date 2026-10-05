import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  formatCurrency,
  formatNumber,
  formatPercentage
} from '../../../shared/utils/formatters';
import {
  Wallet,
  Landmark,
  Receipt,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  CreditCard,
  BarChart3,
  Loader2,
  RefreshCw,
  TrendingUp,
  Building2,
  School,
  Send,
  Tags,
  Layers,
  FileText,
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
    draft_bills_count = 0,
    draft_bills_amount = 0,
    monthly_income_chart = [],
    monthly_expense_chart = [],
    budget_realization_percentage = 0,
    over_budget_alerts = [],
    budget_realization_by_item = [],
    outstanding_by_fee_scheme = [],
    fund_balances_summary = {}
  } = dashboardData || {};

  const totalCashBalance = cash_balances.reduce((sum, c) => sum + parseFloat(c.balance || 0), 0);
  const totalBillsCount = (bill_status_summary.unpaid || 0) +
                          (bill_status_summary.partially_paid || 0) +
                          (bill_status_summary.paid || 0);

  const totalOutstandingAll = outstanding_by_fee_scheme.reduce((sum, s) => sum + parseFloat(s.outstanding_amount || 0), 0);

  // Status dinamis untuk serapan RAPBS
  const budgetStatus = budget_realization_percentage > 100
    ? 'danger'
    : budget_realization_percentage > 80
    ? 'warning'
    : 'success';

  return (
    <div className="space-y-4">
      {/* Header Dashboard & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Dashboard Keuangan</h1>
            <StatusPill variant={isYayasan ? 'success' : 'info'}>
              {isYayasan ? <Building2 className="w-3 h-3" /> : <School className="w-3 h-3" />}
              <span>{isYayasan ? 'Pusat Yayasan (Gabungan)' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
            </StatusPill>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-60"
            title="Muat ulang ringkasan data dari database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
          <Link
            to="/keuangan/bills"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Kelola Tagihan</span>
          </Link>
        </div>
      </div>

      {error && (
        <FlatAlertBanner
          variant="danger"
          title="Gagal Memuat Data"
          description={error}
        />
      )}

      {/* Banner Notifikasi Tagihan Draf & Pending Approval */}
      {(draft_bills_count > 0 || (dashboardData?.pending_approval_bills_count > 0)) && (
        <FlatAlertBanner
          variant="warning"
          title={`Terdapat ${formatNumber(draft_bills_count)} Draf Tagihan Siap Diterbitkan${dashboardData?.pending_approval_bills_count > 0 ? ` (${formatNumber(dashboardData.pending_approval_bills_count)} Menunggu Approval Diskon)` : ''}`}
          description={
            <>
              Total estimasi piutang draf: <span className="font-semibold text-amber-950 tnum">{formatCurrency(draft_bills_amount)}</span>. Draf dapat ditinjau dan disahkan secara massal (one-click confirm) agar langsung memicu jurnal piutang &amp; tampil ke orang tua.
            </>
          }
          action={
            <Link
              to="/keuangan/bills"
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tinjau &amp; Sahkan Massal</span>
            </Link>
          }
        />
      )}

      {/* 1. KPI Ribbon (5 Kartu StatRibbonCard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Saldo Kas */}
        <StatRibbonCard
          status="success"
          label="Saldo Kas & Bank"
          value={formatCurrency(totalCashBalance)}
          icon={Wallet}
          context={
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" /> {formatNumber(cash_balances.length)} Akun Kas Aktif
            </span>
          }
        />

        {/* Draft Tagihan Menunggu Diterbitkan */}
        <StatRibbonCard
          status="warning"
          label="Draft Tagihan"
          value={`${formatNumber(draft_bills_count)} Siswa`}
          icon={Send}
          context={formatCurrency(draft_bills_amount)}
          to="/keuangan/bills"
        />

        {/* Tagihan Belum Lunas (Unpaid) */}
        <StatRibbonCard
          status="danger"
          label="Piutang Berjalan"
          value={formatNumber(bill_status_summary.unpaid || 0)}
          icon={Receipt}
          context="Menunggu pembayaran orang tua"
        />

        {/* Tagihan Lunas */}
        <StatRibbonCard
          status="info"
          label="Tagihan Terbayar"
          value={formatNumber(bill_status_summary.paid || 0)}
          icon={CreditCard}
          context={`Dari ${formatNumber(totalBillsCount)} tagihan terbit`}
        />

        {/* Realisasi RAPBS */}
        <StatRibbonCard
          status={budgetStatus}
          label="Serapan RAPBS"
          value={formatPercentage(budget_realization_percentage)}
          icon={FileSpreadsheet}
          context={
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  budget_realization_percentage > 100
                    ? 'bg-rose-500'
                    : budget_realization_percentage > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budget_realization_percentage)}%` }}
              />
            </div>
          }
        />
      </div>

      {/* 2. Over Budget Alerts (Jika ada serapan > 100%) */}
      {over_budget_alerts.length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 border-l-4 border-l-rose-500 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Peringatan Anggaran: Terdapat Program RAPBS Melebihi Batas (Over-Budget)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {over_budget_alerts.map((alert, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-rose-200/80 border-l-4 border-l-rose-500 shadow-2xs space-y-1.5">
                <div className="text-xs font-bold text-slate-800 truncate">{alert.program_name}</div>
                <div className="text-[11px] text-slate-500">
                  Rencana: <span className="font-semibold text-slate-700 tnum">{formatCurrency(alert.planned_amount)}</span> &bull; Realisasi: <span className="font-semibold text-rose-600 tnum">{formatCurrency(alert.realized_amount)}</span>
                </div>
                <div className="pt-1 flex justify-end">
                  <StatusPill variant="danger">
                    Serapan {formatPercentage(alert.absorption_percentage)}
                  </StatusPill>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Klaster Bento 3 Kolom: Kas & Bank, Realisasi RAPBS, Piutang per Skema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom 1: Rincian Akun Kas & Bank */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                Rincian Kas &amp; Bank
              </h2>
              <Link to="/keuangan/master-data" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Kelola &rarr;
              </Link>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-0.5">
              {cash_balances.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada akun kas terdaftar</p>
              ) : (
                cash_balances.map((acc) => (
                  <div key={acc.cash_account_id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                        <Landmark className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{acc.name}</div>
                        <div className="text-[10px] text-slate-400">ID Akun: #{acc.cash_account_id}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-800 tnum shrink-0 ml-2">
                      {formatCurrency(acc.balance)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Total Likuiditas Kas</span>
            <span className="text-emerald-600 tnum">{formatCurrency(totalCashBalance)}</span>
          </div>
        </div>

        {/* Kolom 2: Realisasi RAPBS per Item Belanja */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  Realisasi Item RAPBS
                </h2>
              </div>
              <Link to="/keuangan/expenses" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Belanja &rarr;
              </Link>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-0.5">
              {budget_realization_by_item.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada item belanja RAPBS yang terdaftar</p>
              ) : (
                budget_realization_by_item.slice(0, 6).map((item) => {
                  const itemStatus = item.is_over_budget
                    ? 'danger'
                    : item.absorption_percentage > 80
                    ? 'warning'
                    : 'success';

                  return (
                    <div key={item.item_id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[190px]">{item.item_name}</span>
                        <StatusPill variant={itemStatus}>
                          {formatPercentage(item.absorption_percentage)}
                        </StatusPill>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Realisasi: <strong className="text-slate-700 tnum">{formatCurrency(item.realized_amount)}</strong></span>
                        <span>Pagu: <strong className="text-slate-700 tnum">{formatCurrency(item.planned_amount)}</strong></span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            item.is_over_budget ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, item.absorption_percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Menampilkan 6 item belanja terbesar</span>
            <span className="font-bold text-slate-700">{budget_realization_by_item.length} Item Total</span>
          </div>
        </div>

        {/* Kolom 3: Piutang Tertunggak per Skema Biaya */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                  <Tags className="w-3.5 h-3.5 text-emerald-600" />
                  Piutang per Skema Biaya
                </h2>
              </div>
              <Link to="/keuangan/fee-schemes" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Skema &rarr;
              </Link>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-0.5">
              {outstanding_by_fee_scheme.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">Tidak ada piutang tertunggak saat ini</p>
              ) : (
                outstanding_by_fee_scheme.map((sch, idx) => {
                  const pct = totalOutstandingAll > 0 ? (sch.outstanding_amount / totalOutstandingAll) * 100 : 0;
                  return (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{sch.scheme_name}</span>
                        <span className="font-bold text-rose-600 tnum">
                          {formatCurrency(sch.outstanding_amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{formatNumber(sch.students_count)} Santri ({formatNumber(sch.bills_count)} Pos)</span>
                        <span className="font-medium text-slate-600">{Math.round(pct)}% dari total</span>
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

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Total Piutang Berjalan</span>
            <span className="text-rose-600 tnum">{formatCurrency(totalOutstandingAll)}</span>
          </div>
        </div>
      </div>

      {/* 4. Tabel Arus Kas Bulanan (Full-Width) */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              Aktivitas Keuangan Bulanan
            </h2>
            <p className="text-[11px] text-slate-400">Pemasukan (SPP &amp; Non-SPP) vs Pengeluaran (Belanja &amp; Gaji)</p>
          </div>
          <Link to="/keuangan/reports" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            Laporan Lengkap &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto table-container">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5 rounded-l-lg text-[11px] uppercase tracking-wide">Periode Bulan</th>
                <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Pemasukan</th>
                <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Pengeluaran</th>
                <th className="px-3.5 py-2.5 text-right num-cell rounded-r-lg text-[11px] uppercase tracking-wide">Net Kas</th>
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
                      <td className="px-3.5 py-2.5 font-semibold text-slate-700">{month}</td>
                      <td className="px-3.5 py-2.5 num-cell font-semibold text-emerald-600 tnum">
                        {formatCurrency(inc)}
                      </td>
                      <td className="px-3.5 py-2.5 num-cell font-semibold text-rose-600 tnum">
                        {formatCurrency(exp)}
                      </td>
                      <td className="px-3.5 py-2.5 num-cell font-bold">
                        <span className={`tnum ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
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

      {/* 5. Saldo per Sumber Dana (Fund Balances) */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                Saldo Pos Alokasi Dana (Fund Balances)
              </h2>
              <StatusPill variant="info">Pemisahan Kantong</StatusPill>
            </div>
            <p className="text-[11px] text-slate-400">Alokasi dana kas berdasarkan pos penerimaan &amp; saldo awal yang belum teralokasi</p>
          </div>
          <Link to="/keuangan/fund-balances" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 self-start sm:self-center">
            Kelola &amp; Rincian Lengkap &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatRibbonCard
            status="success"
            label="Akumulasi Masuk"
            value={formatCurrency(fund_balances_summary.total_fund_in)}
            icon={Coins}
          />
          <StatRibbonCard
            status="danger"
            label="Total Terpakai Belanja"
            value={formatCurrency(fund_balances_summary.total_fund_out)}
            icon={Wallet}
          />
          <StatRibbonCard
            status="info"
            label="Total Saldo Tersisa"
            value={formatCurrency(fund_balances_summary.total_fund_balance)}
            icon={Layers}
          />
          <StatRibbonCard
            status="warning"
            label="Opening Pool Belum Teralokasi"
            value={formatCurrency(fund_balances_summary.opening_pool_balance)}
            icon={Landmark}
          />
        </div>

        {/* Widget Pinjaman Antar Tahun Ajaran */}
        {loansSummary && (
          <Link
            to="/keuangan/fund-balances"
            className="p-3 bg-indigo-50/70 border border-indigo-200 border-l-4 border-l-indigo-500 rounded-lg flex items-center justify-between hover:bg-indigo-100/70 transition"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-indigo-900">Pinjaman Antar Tahun Ajaran</span>
                {loansSummary.aged_loans_count > 0 && (
                  <StatusPill variant="danger" className="animate-pulse">
                    {formatNumber(loansSummary.aged_loans_count)} &gt; 90 Hari
                  </StatusPill>
                )}
              </div>
              <div className="text-sm font-extrabold text-indigo-950 mt-0.5 tnum">
                {formatCurrency(loansSummary.total_outstanding || 0)}
              </div>
              <div className="text-[10px] text-indigo-700 mt-0.5">
                {formatNumber(loansSummary.active_loans_count || 0)} pinjaman aktif direalokasikan
              </div>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-indigo-500 shrink-0" />
          </Link>
        )}
      </div>

      {/* 6. Menu Pintas Cepat (Quick Action Shortcuts) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Link
          to="/keuangan/bills"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Tagihan &amp; Draft</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Generate &amp; Terbitkan</span>
        </Link>

        <Link
          to="/keuangan/student-ledger"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Kartu Bayar Siswa</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Ledger &amp; Rekap</span>
        </Link>

        <Link
          to="/keuangan/fund-balances"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-indigo-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Saldo Sumber Dana</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Kantong &amp; Pool</span>
        </Link>

        <Link
          to="/keuangan/payments"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Kasir &amp; Kwitansi</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Bayar &amp; Mutasi</span>
        </Link>

        <Link
          to="/keuangan/expenses"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Belanja RAPBS</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Pagu &amp; Kwitansi</span>
        </Link>

        <Link
          to="/keuangan/reports"
          className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-2xs transition flex flex-col items-center text-center group"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">Laporan Keuangan</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Neraca &amp; Buku Besar</span>
        </Link>
      </div>
    </div>
  );
}
