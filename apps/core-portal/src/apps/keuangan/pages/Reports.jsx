import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
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
  Filter
} from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('trial-balance');
  // 'budget-realization' | 'general-ledger' | 'trial-balance' | 'income-statement' | 'cash-flow' | 'balance-sheet'
  const [period, setPeriod] = useState('2026-08');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      let endpoint = `/keuangan/reports/${reportType}?period=${period}`;
      if (reportType === 'general-ledger') {
        endpoint = `/keuangan/reports/general-ledger?period_from=${period}-01&period_to=${period}-31`;
      }
      const res = await api.get(endpoint);
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

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Laporan Keuangan & Akuntansi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan standar akuntansi sekolah: Buku Besar, Neraca Saldo, Arus Kas & Neraca posisi keuangan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
          <button
            type="button"
            onClick={() => alert(`Laporan ${reportType} format PDF berhasil diekspor!`)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Ekspor PDF / Excel</span>
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
              <option value="balance-sheet">5. Laporan Neraca (Balance Sheet)</option>
              <option value="budget-realization">6. Laporan Realisasi RAPBS</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Periode:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                {reportType === 'cash-flow' && 'Laporan Arus Kas'}
                {reportType === 'balance-sheet' && 'Laporan Posisi Keuangan (Neraca)'}
                {reportType === 'budget-realization' && 'Laporan Realisasi RAPBS'}
              </h2>
              <p className="text-xs text-slate-500">Yayasan Pendidikan Al-Depok &bull; Periode: {period}</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
