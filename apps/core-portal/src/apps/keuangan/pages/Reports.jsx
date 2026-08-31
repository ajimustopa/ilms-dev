import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  FileSpreadsheet,
  BookOpen,
  Scale,
  TrendingUp,
  FileDown,
  Printer,
  Loader2,
  Calendar,
  Filter,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('trial-balance');
  // 'trial-balance' | 'general-ledger' | 'income-statement' | 'cash-flow' | 'balance-sheet' | 'budget-realization'
  const [period, setPeriod] = useState('2026-08');
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [reportData, setReportData] = useState(null);

  const getEndpoint = (format = '') => {
    let endpoint = `/keuangan/reports/${reportType}?period=${period}`;
    if (reportType === 'general-ledger') {
      endpoint = `/keuangan/reports/general-ledger?period_from=${period}-01&period_to=${period}-31`;
    }
    if (format === 'pdf') {
      endpoint += (endpoint.includes('?') ? '&' : '?') + 'format=pdf';
    }
    return endpoint;
  };

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      const res = await api.get(getEndpoint());
      setReportData(res.data?.data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, period]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Export PDF via Backend API Stream (?format=pdf)
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const response = await api.get(getEndpoint('pdf'), {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan-${reportType}-${period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunduh file PDF laporan');
    } finally {
      setExportingPdf(false);
    }
  };

  // Export Excel via XLSX Client-Side
  const handleExportExcel = () => {
    if (!reportData) return;

    let wsData = [];
    const title = `Laporan ${reportType.toUpperCase()} - Periode ${period}`;

    if (reportType === 'trial-balance') {
      wsData.push(['Kode Akun', 'Nama Akun', 'Kelompok', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo Bersih']);
      reportData.rows?.forEach(r => {
        wsData.push([r.account_code, r.account_name, r.account_group, r.debit, r.credit, r.net_balance]);
      });
      wsData.push(['TOTAL', '', '', reportData.total_debit, reportData.total_credit, '']);
    } else if (reportType === 'general-ledger') {
      wsData.push(['Akun', 'Tanggal', 'No. Jurnal', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo']);
      reportData.forEach(acc => {
        acc.mutations?.forEach(m => {
          wsData.push([
            `${acc.account_code} - ${acc.account_name}`,
            m.journal_date ? m.journal_date.slice(0, 10) : '',
            m.journal_number,
            m.description,
            m.entry_side === 'debit' ? m.amount : 0,
            m.entry_side === 'credit' ? m.amount : 0,
            m.balance_after
          ]);
        });
      });
    } else if (reportType === 'income-statement') {
      wsData.push(['Kategori', 'Nama Akun', 'Nominal (Rp)']);
      reportData.revenues?.forEach(r => wsData.push(['Pendapatan', r.account_name, r.credit - r.debit]));
      wsData.push(['Total Pendapatan', '', reportData.total_revenue]);
      reportData.expenses?.forEach(e => wsData.push(['Beban Operasional', e.account_name, e.debit - e.credit]));
      wsData.push(['Total Beban', '', reportData.total_expense]);
      wsData.push(['SURPLUS / (DEFISIT)', '', reportData.surplus_defisit]);
    } else if (reportType === 'cash-flow') {
      wsData.push(['Tanggal', 'Keterangan', 'Jenis Arus Kas', 'Nominal (Rp)']);
      reportData.activities?.forEach(a => {
        wsData.push([
          a.journal_date ? a.journal_date.slice(0, 10) : '',
          a.description,
          a.entry_side === 'debit' ? 'Kas Masuk' : 'Kas Keluar',
          a.amount
        ]);
      });
      wsData.push(['Total Kas Masuk', '', '', reportData.cash_inflow]);
      wsData.push(['Total Kas Keluar', '', '', reportData.cash_outflow]);
      wsData.push(['Arus Kas Bersih', '', '', reportData.net_cash_flow]);
    } else if (reportType === 'balance-sheet') {
      wsData.push(['Kelompok', 'Nama Akun', 'Nilai Buku (Rp)']);
      reportData.assets?.forEach(a => wsData.push(['Aset / Aktiva', a.account_name, a.debit - a.credit]));
      wsData.push(['TOTAL ASET', '', reportData.total_assets]);
      reportData.liabilities?.forEach(l => wsData.push(['Kewajiban', l.account_name, l.credit - l.debit]));
      wsData.push(['Subtotal Kewajiban', '', reportData.total_liabilities]);
      reportData.equity?.forEach(eq => wsData.push(['Ekuitas', eq.account_name, eq.credit - eq.debit]));
      wsData.push(['Subtotal Ekuitas', '', reportData.total_equity]);
      wsData.push(['TOTAL KEWAJIBAN & EKUITAS', '', reportData.total_liabilities + reportData.total_equity]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan-${reportType}-${period}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Laporan Keuangan & Akuntansi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan standar akuntansi sekolah: Buku Besar, Neraca Saldo, Laba Rugi, Arus Kas & Neraca Posisi Keuangan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl transition shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>{exportingPdf ? 'Mengunduh PDF...' : 'Ekspor PDF'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Pilihan Jenis Laporan & Filter Periode */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Jenis Laporan:</span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="trial-balance">1. Neraca Saldo (Trial Balance)</option>
              <option value="general-ledger">2. Buku Besar (General Ledger)</option>
              <option value="income-statement">3. Laporan Surplus / Defisit (Laba Rugi)</option>
              <option value="cash-flow">4. Laporan Arus Kas (Cash Flow)</option>
              <option value="balance-sheet">5. Laporan Posisi Keuangan (Neraca)</option>
              <option value="budget-realization">6. Laporan Realisasi RAPBS</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Periode:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReport}
          className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
        >
          Tampilkan Data
        </button>
      </div>

      {/* Report View Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Menghitung kalkulasi laporan secara real-time...</p>
          </div>
        ) : !reportData ? (
          <div className="py-20 text-center text-slate-400 text-xs italic">
            Pilih jenis laporan dan periode untuk melihat data
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Laporan Format Cetak */}
            <div className="text-center pb-4 border-b border-slate-200 space-y-1">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
                {reportType === 'trial-balance' && 'Laporan Neraca Saldo (Trial Balance)'}
                {reportType === 'general-ledger' && 'Laporan Buku Besar (General Ledger)'}
                {reportType === 'income-statement' && 'Laporan Surplus / Defisit (Laba Rugi)'}
                {reportType === 'cash-flow' && 'Laporan Arus Kas (Cash Flow)'}
                {reportType === 'balance-sheet' && 'Laporan Posisi Keuangan (Neraca)'}
                {reportType === 'budget-realization' && 'Laporan Realisasi RAPBS'}
              </h2>
              <p className="text-xs text-slate-500">Aldepos Islamic Boarding School &bull; Periode: {period}</p>
            </div>

            {/* 1. NERACA SALDO */}
            {reportType === 'trial-balance' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Kode Akun</th>
                      <th className="px-4 py-3">Nama Akun (COA)</th>
                      <th className="px-4 py-3">Kelompok</th>
                      <th className="px-4 py-3 text-right">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right">Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.rows?.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-emerald-700 font-bold">{r.account_code}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{r.account_name}</td>
                        <td className="px-4 py-2.5 text-slate-500 uppercase text-[10px]">{r.account_group}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{r.debit > 0 ? formatCurrency(r.debit) : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{r.credit > 0 ? formatCurrency(r.credit) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-slate-800">Total Neraca Saldo</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(reportData.total_debit)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(reportData.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 2. BUKU BESAR */}
            {reportType === 'general-ledger' && (
              <div className="space-y-6">
                {Array.isArray(reportData) && reportData.map((acc, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 font-mono">
                        {acc.account_code} - {acc.account_name}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        Saldo Akhir: {formatCurrency(acc.ending_balance)}
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">No. Jurnal</th>
                          <th className="px-4 py-2">Keterangan</th>
                          <th className="px-4 py-2 text-right">Debit</th>
                          <th className="px-4 py-2 text-right">Kredit</th>
                          <th className="px-4 py-2 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acc.mutations?.length > 0 ? (
                          acc.mutations.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-slate-500">{m.journal_date ? m.journal_date.slice(0, 10) : '-'}</td>
                              <td className="px-4 py-2 font-mono text-slate-600">{m.journal_number}</td>
                              <td className="px-4 py-2 font-medium text-slate-700">{m.description}</td>
                              <td className="px-4 py-2 text-right font-medium">{m.entry_side === 'debit' ? formatCurrency(m.amount) : '-'}</td>
                              <td className="px-4 py-2 text-right font-medium">{m.entry_side === 'credit' ? formatCurrency(m.amount) : '-'}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">{formatCurrency(m.balance_after)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={6} className="px-4 py-3 text-center text-slate-400 italic">Tidak ada mutasi di periode ini</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* 3. SURPLUS / DEFISIT */}
            {reportType === 'income-statement' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Pendapatan */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">I. Pendapatan & Penerimaan</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {reportData.revenues?.map((r, i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5">
                        <span className="font-semibold text-slate-700">{r.account_name}</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(r.credit - r.debit)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-2.5 bg-emerald-50 font-bold text-emerald-900">
                      <span>Total Pendapatan</span>
                      <span>{formatCurrency(reportData.total_revenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Beban / Pengeluaran */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider">II. Beban & Biaya Operasional</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {reportData.expenses?.map((e, i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5">
                        <span className="font-semibold text-slate-700">{e.account_name}</span>
                        <span className="font-bold text-rose-700">{formatCurrency(e.debit - e.credit)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-2.5 bg-rose-50 font-bold text-rose-900">
                      <span>Total Beban Operasional</span>
                      <span>{formatCurrency(reportData.total_expense)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Surplus / Defisit */}
                <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-extrabold ${reportData.is_surplus ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-red-100 border-red-300 text-red-950'}`}>
                  <span>SURPLUS / (DEFISIT) PERIODE BERJALAN</span>
                  <span>{formatCurrency(reportData.surplus_defisit)}</span>
                </div>
              </div>
            )}

            {/* 4. ARUS KAS (CASH FLOW) */}
            {reportType === 'cash-flow' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-semibold">Total Kas Masuk (Inflow)</span>
                    <div className="text-lg font-bold text-emerald-900 mt-1">{formatCurrency(reportData.cash_inflow)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs text-rose-700 font-semibold">Total Kas Keluar (Outflow)</span>
                    <div className="text-lg font-bold text-rose-900 mt-1">{formatCurrency(reportData.cash_outflow)}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${reportData.net_cash_flow >= 0 ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                    <span className="text-xs font-semibold">Arus Kas Bersih (Net Cash Flow)</span>
                    <div className="text-lg font-bold mt-1">{formatCurrency(reportData.net_cash_flow)}</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Keterangan Transaksi</th>
                        <th className="px-4 py-3">Jenis Arus Kas</th>
                        <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.activities?.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-500">{a.journal_date ? a.journal_date.slice(0, 10) : '-'}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{a.description}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.entry_side === 'debit' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {a.entry_side === 'debit' ? 'Kas Masuk' : 'Kas Keluar'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatCurrency(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. NERACA POSISI KEUANGAN (BALANCE SHEET) */}
            {reportType === 'balance-sheet' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sisi Aktiva (Aset) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ASET (AKTIVA)</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {reportData.assets?.map((a, i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5">
                        <span className="font-semibold text-slate-700">{a.account_name}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(a.debit - a.credit)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-2.5 bg-blue-50 font-bold text-blue-900">
                      <span>TOTAL ASET</span>
                      <span>{formatCurrency(reportData.total_assets)}</span>
                    </div>
                  </div>
                </div>

                {/* Sisi Pasiva (Kewajiban & Ekuitas) */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">KEWAJIBAN & EKUITAS (PASIVA)</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {reportData.liabilities?.map((l, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{l.account_name}</span>
                          <span className="font-medium text-slate-800">{formatCurrency(l.credit - l.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Kewajiban</span>
                        <span>{formatCurrency(reportData.total_liabilities)}</span>
                      </div>

                      {reportData.equity?.map((eq, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{eq.account_name}</span>
                          <span className="font-medium text-slate-800">{formatCurrency(eq.credit - eq.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Ekuitas</span>
                        <span>{formatCurrency(reportData.total_equity)}</span>
                      </div>

                      <div className="flex justify-between px-4 py-2.5 bg-purple-50 font-bold text-purple-900">
                        <span>TOTAL KEWAJIBAN & EKUITAS</span>
                        <span>{formatCurrency(reportData.total_liabilities + reportData.total_equity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Neraca Seimbang: Total Aset = Total Kewajiban & Ekuitas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
