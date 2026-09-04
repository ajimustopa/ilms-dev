import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import FundBalances from './FundBalances';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  PieChart,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  FileDown,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Users
} from 'lucide-react';

export default function Reports() {
  const { activeSchoolUnit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  // Main executive tabs: 'executive-health' | 'monthly-flow' | 'program-expenses' | 'fund-balances'
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'fund-balances') ? 'fund-balances' : 'executive-health';
  const [activeTab, setActiveTab] = useState(initialTab);

  // States
  const [healthData, setHealthData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [programData, setProgramData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Academic Years
  useEffect(() => {
    const fetchAY = async () => {
      try {
        const res = await api.get('/akademik/academic-years');
        const list = res.data?.data || [];
        setAcademicYears(list);
        const active = list.find(a => a.is_active);
        if (active) setSelectedAcademicYearId(String(active.id));
        else if (list.length > 0) setSelectedAcademicYearId(String(list[0].id));
      } catch (err) {
        console.error('Error fetching academic years:', err);
      }
    };
    fetchAY();
  }, []);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'fund-balances') {
      setSearchParams({ tab: 'fund-balances' });
    } else {
      setSearchParams({});
    }
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const params = {
        academic_year_id: selectedAcademicYearId
      };

      if (activeTab === 'executive-health') {
        const [hRes, pRes] = await Promise.all([
          api.get('/keuangan/reports/executive-health', { params }),
          api.get('/keuangan/reports/financial-projection', { params })
        ]);
        setHealthData(hRes.data?.data || null);
        setProjectionData(pRes.data?.data || null);
      } else if (activeTab === 'monthly-flow') {
        const res = await api.get('/keuangan/reports/fund-source-monthly-flow', { params });
        setFlowData(res.data?.data || null);
      } else if (activeTab === 'program-expenses') {
        const res = await api.get('/keuangan/reports/program-expenses-matrix', { params });
        setProgramData(res.data?.data || null);
      }
    } catch (err) {
      console.error('Error fetching executive reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'fund-balances') {
      fetchReportsData();
    }
  }, [activeTab, selectedAcademicYearId, activeSchoolUnit]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const handleExportExcel = () => {
    let exportRows = [];
    let filename = `laporan-eksekutif-${activeTab}.xlsx`;

    if (activeTab === 'executive-health' && projectionData) {
      exportRows = projectionData.monthly_trend.map(m => ({
        'Bulan': m.month,
        'Status Data': m.is_actual ? 'Aktual (Riil)' : 'Proyeksi (Estimasi)',
        'Uang Masuk (Rp)': m.inflow,
        'Uang Keluar (Rp)': m.outflow,
        'Selisih Kas Bersih (Rp)': m.net_cash,
        'Saldo Kas Kumulatif (Rp)': m.cumulative_balance
      }));
    } else if (activeTab === 'monthly-flow' && flowData) {
      exportRows = flowData.sources.map(s => ({
        'Nama Sumber Dana': s.fund_name,
        'Kategori': s.category,
        'Saldo Awal Bulan (Rp)': s.opening_balance,
        'Tambahan Uang Masuk (Rp)': s.total_inflow,
        'Realisasi Belanja (Rp)': s.total_outflow,
        'Saldo Akhir Bulan (Rp)': s.ending_balance,
        'Pertumbuhan Kas (Rp)': s.net_change
      }));
    } else if (activeTab === 'program-expenses' && programData) {
      exportRows = programData.programs.map(p => ({
        'Nama Program Kegiatan': p.program_name,
        'Pagu Rencana (Rp)': p.budget_plan,
        'Realisasi Belanja (Rp)': p.realized,
        'Sisa Anggaran (Rp)': p.remaining_budget,
        'Serapan (%)': `${p.percentage_absorbed}%`
      }));
    }

    if (exportRows.length === 0) {
      alert('Tidak ada data tabel untuk diekspor pada tab ini.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Eksekutif');
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman & Filter Global */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Laporan Manajerial & Eksekutif Sekolah
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dasbor pimpinan sekolah & yayasan: Kesehatan Kas, Proyeksi Akhir Tahun, Aliran Kas per Sumber Dana & Sisa Anggaran Program
          </p>
        </div>

        {/* Global Multi-Tenant Info */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            {activeSchoolUnit?.name || 'Seluruh Satuan'}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tahun Ajaran:</span>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="bg-transparent font-bold text-emerald-900 border-none p-0 focus:ring-0 cursor-pointer"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={fetchReportsData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition shadow-2xs"
            title="Muat ulang laporan dari server"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* TOP TAB SWITCHER: LAPORAN EKSEKUTIF */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('executive-health')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'executive-health'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>1. Indikator Kesehatan & Proyeksi Kas</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('monthly-flow')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'monthly-flow'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>2. Aliran Kas per Sumber Dana (Carry-Forward)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('program-expenses')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'program-expenses'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>3. Belanja Program & Sisa Anggaran</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('fund-balances')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'fund-balances'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>4. Saldo & Kantong Sumber Dana RAPBS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INDIKATOR KESEHATAN KEUANGAN & PROYEKSI AKHIR TAHUN AJARAN          */}
      {/* ========================================================================= */}
      {activeTab === 'executive-health' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              <span className="text-xs">Menganalisis indikator kesehatan keuangan...</span>
            </div>
          ) : !healthData ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Data indikator kesehatan belum tersedia untuk filter ini.
            </div>
          ) : (
            <>
              {/* 4 KPI Cards Indikator Kesehatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {healthData.indicators.map((ind) => {
                  const isHealthy = ind.status === 'healthy';
                  const isWarning = ind.status === 'warning';
                  return (
                    <div
                      key={ind.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ind.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {ind.status_label}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                            {ind.value}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{ind.unit}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                        {ind.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Ringkasan Posisi Kas & Dana Bebas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950">
                  <span className="text-xs font-semibold text-emerald-800">Total Kas & Bank Tersedia</span>
                  <p className="text-xl font-black mt-1 font-mono">{formatCurrency(healthData.summary.total_cash_available)}</p>
                  <p className="text-[11px] text-emerald-700 mt-1">Dapat dibelanjakan langsung</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950">
                  <span className="text-xs font-semibold text-blue-800">Sisa Pagu Belanja yang Belum Dipakai</span>
                  <p className="text-xl font-black mt-1 font-mono">{formatCurrency(healthData.summary.remaining_budget)}</p>
                  <p className="text-[11px] text-blue-700 mt-1">Dari total pagu rencana anggaran</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950">
                  <span className="text-xs font-semibold text-amber-800">Tunggakan SPP Belum Tertagih</span>
                  <p className="text-xl font-black mt-1 font-mono">{formatCurrency(healthData.summary.total_uncollected_bills)}</p>
                  <p className="text-[11px] text-amber-700 mt-1">Potensi kas masuk tambahan</p>
                </div>
              </div>

              {/* Tabel Proyeksi Keuangan 12 Bulan Sampai Akhir Tahun Ajaran */}
              {projectionData && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Proyeksi Keuangan Sampai Akhir Tahun Ajaran (Juli – Juni)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Metode: {projectionData.projection_method}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 rounded-xl text-emerald-900 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                      <span>Estimasi Sisa Kas Akhir Juni:</span>
                      <span className="font-mono text-sm">{formatCurrency(projectionData.projected_year_end_reserve)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Bulan</th>
                          <th className="px-4 py-3 text-center">Status Data</th>
                          <th className="px-4 py-3 text-right">Uang Masuk</th>
                          <th className="px-4 py-3 text-right">Uang Keluar</th>
                          <th className="px-4 py-3 text-right">Selisih Kas Bersih</th>
                          <th className="px-4 py-3 text-right">Proyeksi Saldo Kas Berjalan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectionData.monthly_trend.map((row, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50/70 transition ${row.is_actual ? '' : 'bg-slate-50/30'}`}>
                            <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                              <span>{row.month}</span>
                              {row.month === projectionData.current_month && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                                  Bulan Berjalan
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.is_actual ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {row.is_actual ? 'Aktual (Riil)' : 'Proyeksi (Estimasi)'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-medium">
                              +{formatCurrency(row.inflow)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-700 font-medium">
                              -{formatCurrency(row.outflow)}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono font-bold ${
                              row.net_cash >= 0 ? 'text-emerald-800' : 'text-rose-800'
                            }`}>
                              {row.net_cash >= 0 ? `+${formatCurrency(row.net_cash)}` : `-${formatCurrency(Math.abs(row.net_cash))}`}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-extrabold text-slate-900 bg-slate-50/50">
                              {formatCurrency(row.cumulative_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALIRAN KAS PER SUMBER DANA (CARRY-FORWARD BULANAN)                 */}
      {/* ========================================================================= */}
      {activeTab === 'monthly-flow' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Aliran Saldo Kas Kumulatif per Sumber Dana (Carry-Forward)</h3>
              <p className="text-slate-600 mt-0.5">
                Saldo akhir bulan sebelumnya dibawa menjadi saldo awal bulan berikutnya: Saldo Awal + Kas Masuk - Kas Keluar = Saldo Akhir.
              </p>
            </div>
            {flowData && (
              <div className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl shrink-0">
                Total Saldo Kas Terhimpun: {formatCurrency(flowData.summary.total_ending)}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-xs">Menyusun matriks carry-forward sumber dana...</span>
            </div>
          ) : !flowData ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Data aliran kas per sumber dana belum tersedia.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Sumber Dana</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3 text-right">Saldo Awal Bulan</th>
                      <th className="px-4 py-3 text-right">Uang Masuk</th>
                      <th className="px-4 py-3 text-right">Uang Keluar</th>
                      <th className="px-4 py-3 text-right">Pertumbuhan Bersih</th>
                      <th className="px-4 py-3 text-right bg-emerald-50/50">Saldo Akhir Bulan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {flowData.sources.map((s) => (
                      <tr key={s.fund_source_id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">{s.fund_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {s.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatCurrency(s.opening_balance)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                          +{formatCurrency(s.total_inflow)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">
                          -{formatCurrency(s.total_outflow)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          s.net_change >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {s.net_change >= 0 ? `+${formatCurrency(s.net_change)}` : `-${formatCurrency(Math.abs(s.net_change))}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900 bg-emerald-50/30">
                          {formatCurrency(s.ending_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-sans">TOTAL KESELURUHAN DANA</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(flowData.summary.total_opening)}</td>
                      <td className="px-4 py-3 text-right text-emerald-800">+{formatCurrency(flowData.summary.total_inflow)}</td>
                      <td className="px-4 py-3 text-right text-rose-800">-{formatCurrency(flowData.summary.total_outflow)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(flowData.summary.total_inflow - flowData.summary.total_outflow)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-950 bg-emerald-100 font-black">
                        {formatCurrency(flowData.summary.total_ending)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BELANJA PER PROGRAM & SISA ANGGARAN                                */}
      {/* ========================================================================= */}
      {activeTab === 'program-expenses' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pemantauan Belanja per Program Kegiatan & Sisa Pagu Anggaran</h3>
              <p className="text-slate-600 mt-0.5">
                Melihat alokasi dana per bidang kegiatan serta sumber dana yang menanggungnya (Pagu Rencana vs Terpakai vs Sisa Dana Boleh Belanja).
              </p>
            </div>
            {programData && (
              <div className="px-3 py-1.5 bg-purple-600 text-white font-bold rounded-xl shrink-0">
                Sisa Anggaran Belanja Bebas: {formatCurrency(programData.summary.total_remaining)}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
              <span className="text-xs">Menghitung serapan anggaran per program...</span>
            </div>
          ) : !programData ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Data belanja program belum tersedia.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Program / Bidang Kegiatan</th>
                      <th className="px-4 py-3 text-right">Pagu Rencana</th>
                      <th className="px-4 py-3 text-right">Realisasi Belanja</th>
                      <th className="px-4 py-3 text-right">Sisa Anggaran</th>
                      <th className="px-4 py-3 text-center">Serapan</th>
                      <th className="px-4 py-3">Ditanggung Oleh Sumber Dana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {programData.programs.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">{p.program_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatCurrency(p.budget_plan)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 font-medium">
                          {formatCurrency(p.realized)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                          {formatCurrency(p.remaining_budget)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.percentage_absorbed >= 90 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {p.percentage_absorbed}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.sources_breakdown.map((sb, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700">
                                {sb.fund}: {formatCurrency(sb.amount)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="px-4 py-3 font-sans">TOTAL PROGRAM ANGGARAN</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(programData.summary.total_planned)}</td>
                      <td className="px-4 py-3 text-right text-rose-800">{formatCurrency(programData.summary.total_realized)}</td>
                      <td className="px-4 py-3 text-right text-emerald-800 font-black">{formatCurrency(programData.summary.total_remaining)}</td>
                      <td className="px-4 py-3 text-center font-sans">
                        {Math.round((programData.summary.total_realized / programData.summary.total_planned) * 10000) / 100}%
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-500 text-[11px]">Seluruh Program Terkover</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALDO & KANTONG SUMBER DANA RAPBS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'fund-balances' && (
        <FundBalances isEmbedded={true} />
      )}
    </div>
  );
}
