import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import FundBalances from './FundBalances';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import Modal from '../../../shared/components/Modal';
import {
  formatCurrency,
  formatNumber,
  formatPercentage
} from '../../../shared/utils/formatters';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  Wallet,
  Briefcase,
  PieChart,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
  X,
  Eye,
  CheckCircle2,
  Target,
  Receipt,
  Coins,
  Info,
  ExternalLink
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

  // Filter & Interactive States for Tab 3: Belanja Program
  const [searchProgramQuery, setSearchProgramQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedProgramIds, setExpandedProgramIds] = useState({});
  const [selectedProgramForDetails, setSelectedProgramForDetails] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [programExpensesDetail, setProgramExpensesDetail] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  // Toggle expand/collapse per program
  const toggleExpandProgram = (programId) => {
    setExpandedProgramIds(prev => ({
      ...prev,
      [programId]: !prev[programId]
    }));
  };

  const toggleExpandAll = (expandAll) => {
    if (!programData?.programs) return;
    const nextState = {};
    programData.programs.forEach(p => {
      nextState[p.budget_program_id] = expandAll;
    });
    setExpandedProgramIds(nextState);
  };

  // Open modal audit detail kas keluar per program
  const handleOpenProgramDetail = async (program) => {
    setSelectedProgramForDetails(program);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get('/keuangan/expenses', {
        params: {
          budget_program_id: program.budget_program_id,
          academic_year_id: selectedAcademicYearId,
          limit: 100
        }
      });
      const dataList = res.data?.data?.expenses || res.data?.data || [];
      setProgramExpensesDetail(Array.isArray(dataList) ? dataList : []);
    } catch (err) {
      console.error('Error fetching program expenses detail:', err);
      setProgramExpensesDetail([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filtered programs for Tab 3
  const filteredPrograms = useMemo(() => {
    if (!programData?.programs) return [];
    return programData.programs.filter(p => {
      // Search text
      if (searchProgramQuery.trim()) {
        const q = searchProgramQuery.toLowerCase();
        const matchName = p.program_name?.toLowerCase().includes(q);
        const matchItems = p.items?.some(it => it.item_name?.toLowerCase().includes(q));
        const matchSources = p.sources_breakdown?.some(sb => sb.fund?.toLowerCase().includes(q));
        if (!matchName && !matchItems && !matchSources) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'over_budget' && !p.is_over_budget && !p.is_unbudgeted) return false;
        if (filterStatus === 'safe' && p.status !== 'safe') return false;
        if (filterStatus === 'warning' && p.status !== 'warning') return false;
        if (filterStatus === 'critical' && p.status !== 'critical') return false;
        if (filterStatus === 'unbudgeted' && !p.is_unbudgeted) return false;
      }

      return true;
    });
  }, [programData, searchProgramQuery, filterStatus]);

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
      filteredPrograms.forEach(p => {
        exportRows.push({
          'Tipe Data': 'PROGRAM UTAMA',
          'Kode / Nama Program': p.program_name,
          'Pagu Rencana RAPBS (Rp)': p.budget_plan,
          'Realisasi Belanja (Rp)': p.realized,
          'Sisa Anggaran (Rp)': p.remaining_budget,
          'Tingkat Serapan (%)': `${p.percentage_absorbed}%`,
          'Status Anggaran': p.is_unbudgeted ? 'Luar Rencana RAPBS' : p.is_over_budget ? 'Over-Budget' : p.status.toUpperCase(),
          'Sumber Dana Penanggung': p.sources_breakdown.map(sb => `${sb.fund}: ${formatCurrency(sb.amount)}`).join(' | ')
        });

        if (p.items && p.items.length > 0) {
          p.items.forEach(it => {
            exportRows.push({
              'Tipe Data': '  └─ Pos Belanja Rencana',
              'Kode / Nama Program': `  └─ ${it.item_name} (${it.entry_mode || 'Itemized'})`,
              'Pagu Rencana RAPBS (Rp)': it.planned_amount,
              'Realisasi Belanja (Rp)': it.realized_amount,
              'Sisa Anggaran (Rp)': it.remaining_amount,
              'Tingkat Serapan (%)': `${it.percentage_absorbed}%`,
              'Status Anggaran': it.realized_amount > it.planned_amount ? 'Over Pagu Item' : 'Normal',
              'Sumber Dana Penanggung': it.fund_sources?.map(f => f.fund).join(', ') || '-'
            });
          });
        }
      });
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

  const currentAcademicYearObj = academicYears.find(a => String(a.id) === String(selectedAcademicYearId));

  const academicYearOptions = useMemo(() => {
    return (Array.isArray(academicYears) ? academicYears : []).map(ay => ({
      value: String(ay.id),
      label: `T.A. ${ay.name}`,
      sublabel: ay.is_active ? 'Tahun Ajaran Sedang Berjalan (Aktif)' : 'Arsip Pembukuan & Laporan',
      badge: ay.is_active ? 'Aktif' : 'Arsip',
      badgeClass: ay.is_active
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-2xs'
        : 'bg-slate-100 text-slate-600 border-slate-200'
    }));
  }, [academicYears]);

  return (
    <div className="space-y-4">
      {/* Header Halaman & Filter Global Bergaya Eksekutif */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Laporan Manajerial &amp; Eksekutif Sekolah
            </h1>
            <StatusPill variant="info">
              <Building2 className="w-3 h-3" />
              <span>{activeSchoolUnit?.name || 'Seluruh Satuan'}</span>
            </StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dasbor pimpinan: Kesehatan Kas, Proyeksi Akhir Tahun, Aliran Kas per Sumber Dana &amp; Sisa Anggaran Program RAPBS
          </p>
        </div>

        {/* Global Multi-Tenant Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Executive Year Selector */}
          <div className="w-56 sm:w-64">
            <SearchableSelect
              options={academicYearOptions}
              value={selectedAcademicYearId}
              onChange={(val) => setSelectedAcademicYearId(val)}
              placeholder="-- Pilih Tahun Ajaran --"
              searchPlaceholder="Cari Tahun Ajaran..."
              accentColor="emerald"
              allowClear={false}
              menuMinWidth="240px"
            />
          </div>

          <button
            type="button"
            onClick={fetchReportsData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60 cursor-pointer"
            title="Muat ulang laporan dari server"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* TOP TAB SWITCHER: LAPORAN EKSEKUTIF */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('executive-health')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'executive-health'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>1. Indikator Kesehatan &amp; Proyeksi Kas</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('monthly-flow')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'monthly-flow'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>2. Aliran Kas per Sumber Dana (Carry-Forward)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('program-expenses')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'program-expenses'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>3. Belanja Program &amp; Sisa Anggaran</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('fund-balances')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'fund-balances'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>4. Saldo &amp; Kantong Sumber Dana RAPBS</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INDIKATOR KESEHATAN KEUANGAN & PROYEKSI AKHIR TAHUN AJARAN          */}
      {/* ========================================================================= */}
      {activeTab === 'executive-health' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 bg-white rounded-lg border border-slate-200/80 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menganalisis indikator kesehatan keuangan...</span>
            </div>
          ) : !healthData ? (
            <div className="p-10 bg-white rounded-lg border border-slate-200/80 text-center text-slate-400 text-xs italic">
              Data indikator kesehatan belum tersedia untuk filter ini.
            </div>
          ) : (
            <>
              {/* 4 KPI Cards Indikator Kesehatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {healthData.indicators.map((ind) => {
                  const isHealthy = ind.status === 'healthy';
                  const isWarning = ind.status === 'warning';
                  const cardBg = isHealthy 
                    ? 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 border-emerald-200/90' 
                    : isWarning 
                    ? 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 border-amber-200/90' 
                    : 'bg-gradient-to-br from-rose-50/80 via-white to-red-50/30 border-rose-200/90';
                  const iconBg = isHealthy
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20'
                    : isWarning
                    ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-amber-500/20'
                    : 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/20';

                  return (
                    <div key={ind.id} className={`p-4 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${cardBg}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 line-clamp-1">
                          {ind.name}
                        </span>
                        <div className={`p-2 rounded-xl shrink-0 shadow-md ${iconBg}`}>
                          {isHealthy ? <ShieldCheck className="w-4 h-4" /> : isWarning ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                      </div>

                      <div className="my-2.5">
                        <div className="text-2xl font-black text-slate-900 tnum tracking-tight">
                          {ind.value} <span className="text-xs font-semibold text-slate-500">{ind.unit || ''}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <StatusPill variant={isHealthy ? 'success' : isWarning ? 'warning' : 'danger'}>
                            {ind.status_label}
                          </StatusPill>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-500 leading-relaxed line-clamp-2 border-t border-slate-100/80 pt-2 mt-1">
                        {ind.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Ringkasan Posisi Kas & Dana Bebas (3 Executive Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Card 1: Total Kas & Bank Tersedia */}
                <div className="p-4.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-teal-50/50 border border-emerald-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                      Total Kas &amp; Bank Tersedia
                    </span>
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-100">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight block">
                      {formatCurrency(healthData.summary.total_cash_available)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold pt-2 border-t border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Dapat dibelanjakan langsung untuk operasional</span>
                  </div>
                </div>

                {/* Card 2: Sisa Pagu Belanja RAPBS */}
                <div className="p-4.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-white to-blue-50/50 border border-indigo-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider">
                      Sisa Pagu Belanja (RAPBS)
                    </span>
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-100">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono tracking-tight block">
                      {formatCurrency(healthData.summary.remaining_budget)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold pt-2 border-t border-indigo-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Alokasi anggaran belum terpakai tahun ini</span>
                  </div>
                </div>

                {/* Card 3: Tunggakan SPP Belum Tertagih */}
                <div className="p-4.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-rose-50/50 border border-amber-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                      Tunggakan SPP Belum Tertagih
                    </span>
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-100">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-3">
                    <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight block">
                      {formatCurrency(healthData.summary.total_uncollected_bills)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold pt-2 border-t border-amber-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Potensi kas masuk tambahan bila ditagihkan</span>
                  </div>
                </div>
              </div>

              {/* Tabel Proyeksi Keuangan 12 Bulan Sampai Akhir Tahun Ajaran */}
              {projectionData && (
                <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Proyeksi Keuangan Sampai Akhir Tahun Ajaran (Juli – Juni)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Metode: {projectionData.projection_method}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Estimasi Sisa Kas Akhir Juni:</span>
                      <span className="font-bold text-slate-800 tnum">{formatCurrency(projectionData.projected_year_end_reserve)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto table-container">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Bulan</th>
                          <th className="px-3.5 py-2.5 text-center text-[11px] uppercase tracking-wide">Status Data</th>
                          <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Uang Masuk</th>
                          <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Uang Keluar</th>
                          <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Selisih Kas Bersih</th>
                          <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Proyeksi Saldo Kas Berjalan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectionData.monthly_trend.map((row, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50/60 transition ${row.is_actual ? '' : 'bg-slate-50/30'}`}>
                            <td className="px-3.5 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                              <span>{row.month}</span>
                              {row.month === projectionData.current_month && (
                                <StatusPill variant="success">Bulan Berjalan</StatusPill>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <StatusPill variant={row.is_actual ? 'info' : 'warning'}>
                                {row.is_actual ? 'Aktual (Riil)' : 'Proyeksi (Estimasi)'}
                              </StatusPill>
                            </td>
                            <td className="px-3.5 py-2.5 num-cell text-emerald-600 font-medium tnum">
                              +{formatCurrency(row.inflow)}
                            </td>
                            <td className="px-3.5 py-2.5 num-cell text-rose-600 font-medium tnum">
                              -{formatCurrency(row.outflow)}
                            </td>
                            <td className="px-3.5 py-2.5 num-cell font-bold">
                              <span className={`tnum ${row.net_cash >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {row.net_cash >= 0 ? `+${formatCurrency(row.net_cash)}` : `-${formatCurrency(Math.abs(row.net_cash))}`}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 num-cell font-bold text-slate-900 bg-slate-50/50 tnum">
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
      {/* TAB 3: BELANJA PER PROGRAM & SISA ANGGARAN (REALISASI RAPBS)              */}
      {/* ========================================================================= */}
      {activeTab === 'program-expenses' && (
        <div className="space-y-4">
          <FlatAlertBanner
            variant="info"
            title="Laporan Realisasi Belanja Program Kegiatan &amp; Pagu RAPBS"
            description={`Pemantauan serapan anggaran per program kegiatan Tahun Ajaran ${currentAcademicYearObj?.name || 'Terpilih'} (Pagu Rencana vs Kas Keluar Riil vs Sisa Anggaran Tersedia).`}
            action={programData && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sisa Pagu Institusi:</span>
                <span className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0 tnum">
                  {formatCurrency(programData.summary.total_remaining)}
                </span>
              </div>
            )}
          />

          {/* 4 Executive KPI Ribbon Cards */}
          {programData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: PAGU RENCANA RAPBS */}
              <div className="p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                      Pagu Rencana RAPBS
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Total Anggaran Ditetapkan</span>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono tracking-tight truncate">
                    {formatCurrency(programData.summary.total_planned)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-indigo-800/80 pt-2 border-t border-indigo-100/80 font-medium">
                  <span>Target Rencana:</span>
                  <strong className="font-bold text-indigo-950">{programData.summary.programs_count} Program Kerja</strong>
                </div>
              </div>

              {/* Card 2: REALISASI BELANJA RIIL */}
              <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">
                      Realisasi Belanja Riil
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Kas Keluar Sah &amp; Valid</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono tracking-tight truncate">
                    {formatCurrency(programData.summary.total_realized)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-rose-800/80 pt-2 border-t border-rose-100/80 font-medium">
                  <span>Bukti Kas Keluar:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                    ✓ Terverifikasi Sah
                  </span>
                </div>
              </div>

              {/* Card 3: SISA PAGU ANGGARAN */}
              <div className="p-4 rounded-2xl bg-white border border-teal-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block">
                      Sisa Pagu Anggaran
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Ketersediaan Anggaran</span>
                  </div>
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${
                    programData.summary.total_remaining < 0 ? 'text-rose-700' : 'text-teal-950'
                  }`}>
                    {formatCurrency(programData.summary.total_remaining)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-teal-800/80 pt-2 border-t border-teal-100/80 font-medium">
                  <span>Kondisi Pagu:</span>
                  <strong className={`font-bold ${programData.summary.total_remaining < 0 ? 'text-rose-700' : 'text-teal-900'}`}>
                    {programData.summary.total_remaining < 0 ? 'Over-Budget / Defisit' : 'Tersedia'}
                  </strong>
                </div>
              </div>

              {/* Card 4: SERAPAN ANGGARAN & STATUS KESEHATAN */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      Serapan Anggaran
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Persentase Realisasi</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 shrink-0">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tnum tracking-tight">
                      {programData.summary.percentage_absorbed}%
                    </span>
                    <StatusPill
                      variant={
                        programData.summary.percentage_absorbed > 100
                          ? 'danger'
                          : programData.summary.percentage_absorbed > 90
                          ? 'danger'
                          : programData.summary.percentage_absorbed > 75
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {programData.summary.percentage_absorbed > 100
                        ? 'Over-Budget'
                        : programData.summary.percentage_absorbed > 90
                        ? 'Kritis'
                        : programData.summary.percentage_absorbed > 75
                        ? 'Waspada'
                        : 'Aman'}
                    </StatusPill>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden p-0.5 border border-slate-200/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        programData.summary.percentage_absorbed > 100
                          ? 'bg-gradient-to-r from-rose-500 to-red-600'
                          : programData.summary.percentage_absorbed > 90
                          ? 'bg-gradient-to-r from-rose-500 to-red-500'
                          : programData.summary.percentage_absorbed > 75
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, programData.summary.percentage_absorbed)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Program Defisit:</span>
                  <span className={`font-bold ${programData.summary.over_budget_programs_count > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {programData.summary.over_budget_programs_count} Program
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar & Interactive Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchProgramQuery}
                  onChange={(e) => setSearchProgramQuery(e.target.value)}
                  placeholder="Cari nama program / pos belanja / sumber dana..."
                  className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {searchProgramQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchProgramQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">Semua Status Serapan</option>
                  <option value="safe">Status Aman (&lt;75%)</option>
                  <option value="warning">Status Waspada (75-90%)</option>
                  <option value="critical">Status Kritis (90-100%)</option>
                  <option value="over_budget">Over-Budget / Defisit</option>
                  <option value="unbudgeted">Luar Rencana RAPBS</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <span className="text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-800">{filteredPrograms.length}</strong> dari {programData?.programs?.length || 0} program
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleExpandAll(true)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                  title="Buka semua rincian pos belanja"
                >
                  Buka Semua
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpandAll(false)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition cursor-pointer"
                  title="Tutup semua rincian pos belanja"
                >
                  Tutup Semua
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menghitung serapan riil anggaran per program...</span>
            </div>
          ) : !programData || filteredPrograms.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600 text-sm">Tidak ada data belanja program yang sesuai filter.</p>
              <p className="mt-1 text-slate-400">Pastikan RAPBS telah dibuat atau periksa kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto table-container">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3 text-[11px] uppercase tracking-wider w-8"></th>
                      <th className="px-3 py-3 text-[11px] uppercase tracking-wider min-w-[220px]">
                        Program / Bidang Kegiatan &amp; Pos Belanja
                      </th>
                      <th className="px-3 py-3 text-[11px] uppercase tracking-wider min-w-[170px]">
                        Sumber Dana RAPBS
                      </th>
                      <th className="px-3 py-3 text-right num-cell text-[11px] uppercase tracking-wider min-w-[130px]">
                        Pagu Rencana
                      </th>
                      <th className="px-3 py-3 text-right num-cell text-[11px] uppercase tracking-wider min-w-[130px]">
                        Realisasi Belanja
                      </th>
                      <th className="px-3 py-3 text-right num-cell text-[11px] uppercase tracking-wider min-w-[130px]">
                        Sisa Anggaran
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] uppercase tracking-wider min-w-[140px]">
                        Tingkat Serapan
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] uppercase tracking-wider w-24">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPrograms.map((p) => {
                      const isExpanded = !!expandedProgramIds[p.budget_program_id];
                      const pillVariant = p.is_unbudgeted
                        ? 'danger'
                        : p.percentage_absorbed > 100
                        ? 'danger'
                        : p.percentage_absorbed >= 90
                        ? 'danger'
                        : p.percentage_absorbed >= 75
                        ? 'warning'
                        : 'success';

                      return (
                        <React.Fragment key={p.budget_program_id}>
                          {/* Parent Program Row */}
                          <tr className={`transition ${isExpanded ? 'bg-emerald-50/20 hover:bg-emerald-50/30' : 'hover:bg-slate-50/70'}`}>
                            <td className="px-2 py-3 text-center">
                              {p.items && p.items.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandProgram(p.budget_program_id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/60 transition cursor-pointer"
                                  title={isExpanded ? 'Sembunyikan rincian pos belanja' : 'Tampilkan rincian pos belanja'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-emerald-700" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {p.program_name}
                                  </span>
                                  {p.is_unbudgeted && (
                                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">
                                      Luar RAPBS
                                    </span>
                                  )}
                                  {p.items && p.items.length > 0 && (
                                    <span className="px-1.5 py-0.2 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                      {p.items.length} Pos
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {p.sources_breakdown && p.sources_breakdown.length > 0 ? (
                                  p.sources_breakdown.map((sb, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[10px] font-medium text-slate-700 border border-slate-200/60 tnum"
                                      title={`Alokasi: ${formatCurrency(sb.amount)}`}
                                    >
                                      {sb.fund}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Kas Umum</span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-3 num-cell text-slate-700 font-semibold tnum">
                              {formatCurrency(p.budget_plan)}
                            </td>

                            <td className="px-3 py-3 num-cell font-bold text-rose-600 tnum">
                              {formatCurrency(p.realized)}
                            </td>

                            <td className="px-3 py-3 num-cell font-bold tnum">
                              <span className={p.remaining_budget < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                                {formatCurrency(p.remaining_budget)}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <StatusPill variant={pillVariant}>
                                  {formatPercentage(p.percentage_absorbed)}
                                </StatusPill>
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      p.percentage_absorbed > 100
                                        ? 'bg-rose-600'
                                        : p.percentage_absorbed >= 90
                                        ? 'bg-rose-500'
                                        : p.percentage_absorbed >= 75
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-600'
                                    }`}
                                    style={{ width: `${Math.min(100, p.percentage_absorbed)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenProgramDetail(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition cursor-pointer"
                                title="Lihat transaksi pengeluaran kas riil"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>

                          {/* Sub-Items Pos Belanja Rencana (Expandable Rows) */}
                          {isExpanded && p.items && p.items.length > 0 && (
                            p.items.map((it, itemIdx) => {
                              const itemPillVariant = it.percentage_absorbed > 100
                                ? 'danger'
                                : it.percentage_absorbed >= 90
                                ? 'danger'
                                : it.percentage_absorbed >= 75
                                ? 'warning'
                                : 'success';

                              return (
                                <tr key={`item-${p.budget_program_id}-${itemIdx}`} className="bg-slate-50/70 hover:bg-slate-100/60 transition text-[11px]">
                                  <td className="px-2 py-2 text-center text-slate-300">
                                    <span className="font-mono text-slate-400">└─</span>
                                  </td>

                                  <td className="px-3 py-2 pl-4">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-800">
                                          {it.item_name}
                                        </span>
                                        {it.entry_mode === 'lump_sum' && (
                                          <span className="px-1 py-0.2 text-[9px] rounded bg-amber-50 text-amber-800 border border-amber-200">
                                            Lump Sum
                                          </span>
                                        )}
                                      </div>
                                      {it.quantity && it.unit_price && (
                                        <span className="text-[10px] text-slate-500 font-mono">
                                          {it.quantity} {it.unit || 'unit'} × {formatCurrency(it.unit_price)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1">
                                      {it.fund_sources && it.fund_sources.length > 0 ? (
                                        it.fund_sources.map((fs, fIdx) => (
                                          <span key={fIdx} className="text-[10px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 tnum">
                                            {fs.fund}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-3 py-2 num-cell text-slate-600 tnum">
                                    {formatCurrency(it.planned_amount)}
                                  </td>

                                  <td className="px-3 py-2 num-cell text-rose-600 font-medium tnum">
                                    {formatCurrency(it.realized_amount)}
                                  </td>

                                  <td className="px-3 py-2 num-cell font-medium tnum">
                                    <span className={it.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                                      {formatCurrency(it.remaining_amount)}
                                    </span>
                                  </td>

                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded ${
                                      it.percentage_absorbed > 100
                                        ? 'bg-rose-100 text-rose-800'
                                        : it.percentage_absorbed > 75
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {it.percentage_absorbed}%
                                    </span>
                                  </td>

                                  <td className="px-3 py-2 text-center text-[10px] text-slate-500">
                                    {it.expense_count > 0 ? `${it.expense_count} Transaksi` : 'Belum Ada'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Total Footer */}
                  <tfoot className="bg-slate-100 font-semibold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="px-2 py-3"></td>
                      <td className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider text-slate-900">
                        TOTAL KESELURUHAN PROGRAM RAPBS
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-[11px]">
                        Seluruh Sumber Dana
                      </td>
                      <td className="px-3 py-3 num-cell tnum font-bold text-slate-900">
                        {formatCurrency(programData.summary.total_planned)}
                      </td>
                      <td className="px-3 py-3 num-cell tnum font-bold text-rose-700">
                        {formatCurrency(programData.summary.total_realized)}
                      </td>
                      <td className="px-3 py-3 num-cell tnum font-bold text-emerald-800">
                        {formatCurrency(programData.summary.total_remaining)}
                      </td>
                      <td className="px-3 py-3 text-center tnum font-bold">
                        <StatusPill
                          variant={
                            programData.summary.percentage_absorbed > 100
                              ? 'danger'
                              : programData.summary.percentage_absorbed > 90
                              ? 'danger'
                              : programData.summary.percentage_absorbed > 75
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {formatPercentage(programData.summary.percentage_absorbed)}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Modal Detail Bukti & Transaksi Pengeluaran Kas per Program */}
          {detailModalOpen && selectedProgramForDetails && (
            <Modal
              isOpen={detailModalOpen}
              onClose={() => {
                setDetailModalOpen(false);
                setSelectedProgramForDetails(null);
                setProgramExpensesDetail([]);
              }}
              title={`Riwayat Kas Keluar: ${selectedProgramForDetails.program_name}`}
              size="3xl"
            >
              <div className="space-y-4">
                {/* Header Info Program */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pagu Rencana RAPBS</span>
                    <span className="font-bold text-slate-900 tnum text-sm">
                      {formatCurrency(selectedProgramForDetails.budget_plan)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Realisasi Belanja Riil</span>
                    <span className="font-bold text-rose-600 tnum text-sm">
                      {formatCurrency(selectedProgramForDetails.realized)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Sisa Pagu Anggaran</span>
                    <span className={`font-bold tnum text-sm ${selectedProgramForDetails.remaining_budget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(selectedProgramForDetails.remaining_budget)}
                    </span>
                  </div>
                </div>

                {/* Tabel Riwayat Pengeluaran */}
                {loadingDetail ? (
                  <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Memuat daftar bukti transaksi kas keluar...</span>
                  </div>
                ) : programExpensesDetail.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-slate-100">
                    Belum ada catatan transaksi kas keluar untuk program ini pada tahun ajaran terpilih.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2.5">Tanggal</th>
                            <th className="px-3 py-2.5">No. Bukti / Voucher</th>
                            <th className="px-3 py-2.5">Item / Uraian Belanja</th>
                            <th className="px-3 py-2.5">Penerima / Vendor</th>
                            <th className="px-3 py-2.5">Akun Kas Keluar</th>
                            <th className="px-3 py-2.5 text-right num-cell">Nominal (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {programExpensesDetail.map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                              <td className="px-3 py-2 font-mono text-slate-600">
                                {exp.expense_date ? String(exp.expense_date).slice(0, 10) : '-'}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium text-slate-800">
                                {exp.proof_number || `#EXP-${exp.id}`}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-900">
                                <div>{exp.item_name}</div>
                                {exp.budget_item_name && (
                                  <div className="text-[10px] text-slate-400">Pos: {exp.budget_item_name}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {exp.vendor || exp.staff_name || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {exp.cash_account_name || 'Kas Utama'}
                              </td>
                              <td className="px-3 py-2 num-cell font-bold text-rose-600 tnum">
                                {formatCurrency(exp.total_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="px-3 py-2.5 text-slate-800 uppercase text-[10px]">
                              TOTAL PENGELUARAN TERVERIFIKASI ({programExpensesDetail.length} TRANSAKSI)
                            </td>
                            <td className="px-3 py-2.5 num-cell text-rose-700 tnum">
                              {formatCurrency(programExpensesDetail.reduce((s, e) => s + parseFloat(e.total_amount || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setSelectedProgramForDetails(null);
                      setProgramExpensesDetail([]);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </Modal>
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
