import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Users,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  ChevronDown
} from 'lucide-react';
import api from '../../../../shared/services/api';
import LoadingSkeleton from '../../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../../shared/components/EmptyState';
import ErrorState from '../../../../shared/components/ErrorState';

export default function LeaveReportsTab({ activeSchoolUnit }) {
  // Filter States
  const [periodPreset, setPeriodPreset] = useState('month'); // 'month' | 'semester' | 'year' | 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // API Data States
  const [summaryData, setSummaryData] = useState(null);
  const [byTypeData, setByTypeData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [topData, setTopData] = useState([]);
  const [recapData, setRecapData] = useState([]);
  const [positions, setPositions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Build Query Params for API
  const buildFilterParams = () => {
    const params = {};
    if (activeSchoolUnit?.id) params.school_unit_id = activeSchoolUnit.id;

    if (periodPreset === 'month') {
      const today = new Date();
      params.month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    } else if (periodPreset === 'semester') {
      params.preset = 'semester';
    } else if (periodPreset === 'year') {
      const y = new Date().getFullYear();
      params.from = `${y}-01-01`;
      params.to = `${y}-12-31`;
    } else if (periodPreset === 'custom' && customFrom && customTo) {
      params.from = customFrom;
      params.to = customTo;
    }

    if (selectedPosition !== 'all') {
      params.position_id = selectedPosition;
    }

    return params;
  };

  // Fetch All Report Datasets in Parallel
  const fetchAllReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();

      const [sumRes, typeRes, trendRes, topRes, recapRes, posRes] = await Promise.all([
        api.get('/kepegawaian/leave-requests/reports/summary', { params }),
        api.get('/kepegawaian/leave-requests/reports/by-type', { params }),
        api.get('/kepegawaian/leave-requests/reports/trend', { params }),
        api.get('/kepegawaian/leave-requests/reports/top', { params: { ...params, limit: 5 } }),
        api.get('/kepegawaian/leave-requests/reports/recap', { params }),
        api.get('/kepegawaian/job-positions').catch(() => ({ data: { data: [] } }))
      ]);

      if (sumRes.data?.success) setSummaryData(sumRes.data.data);
      if (typeRes.data?.success) setByTypeData(typeRes.data.data);
      if (trendRes.data?.success) setTrendData(trendRes.data.data || []);
      if (topRes.data?.success) setTopData(topRes.data.data || []);
      if (recapRes.data?.success) setRecapData(recapRes.data.data || []);
      if (posRes.data?.success) setPositions(posRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch reports analytics:', err);
      setError(err.response?.data?.message || err.message || 'Terjadi kesalahan saat memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [activeSchoolUnit, periodPreset, selectedPosition]);

  // Direct Browser Download Handler for Excel / PDF
  const handleExport = async (format = 'xlsx') => {
    setExporting(true);
    try {
      const params = {
        ...buildFilterParams(),
        format
      };

      const response = await api.get('/kepegawaian/leave-requests/reports/export', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Rekapitulasi_Cuti_${params.month || 'Periode'}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export report failed:', err);
      alert('Gagal mengunduh laporan. Silakan coba kembali.');
    } finally {
      setExporting(false);
    }
  };

  // Filtered Recap Rows by Search Query
  const filteredRecap = useMemo(() => {
    if (!recapData || recapData.length === 0) return [];
    if (!searchQuery.trim()) return recapData;
    const q = searchQuery.toLowerCase();
    return recapData.filter(r =>
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      (r.nip && r.nip.toLowerCase().includes(q)) ||
      (r.position_name && r.position_name.toLowerCase().includes(q))
    );
  }, [recapData, searchQuery]);

  // Compute Donut Angles & Segments for Approval Composition
  const donutSegments = useMemo(() => {
    if (!summaryData || summaryData.total_requests === 0) {
      return { total: 0, approvedPct: 0, pendingPct: 0, rejectedPct: 0, revisionPct: 0, strokeDash: [] };
    }

    const total = summaryData.total_requests;
    const app = summaryData.approved_requests || 0;
    const pen = summaryData.pending_requests || 0;
    const rej = summaryData.rejected_requests || 0;
    const rev = summaryData.revision_requests || 0;

    const circumference = 2 * Math.PI * 38; // ~238.76

    const appLen = (app / total) * circumference;
    const penLen = (pen / total) * circumference;
    const rejLen = (rej / total) * circumference;
    const revLen = (rev / total) * circumference;

    return {
      total,
      circumference,
      app: { count: app, pct: ((app / total) * 100).toFixed(1), len: appLen, offset: 0 },
      pen: { count: pen, pct: ((pen / total) * 100).toFixed(1), len: penLen, offset: -appLen },
      rej: { count: rej, pct: ((rej / total) * 100).toFixed(1), len: rejLen, offset: -(appLen + penLen) },
      rev: { count: rev, pct: ((rev / total) * 100).toFixed(1), len: revLen, offset: -(appLen + penLen + rejLen) }
    };
  }, [summaryData]);

  // Dynamic max bar calculation for Vertical Bar Chart
  const byTypeMaxDays = useMemo(() => {
    if (!byTypeData?.items || byTypeData.items.length === 0) return 10;
    const maxVal = Math.max(...byTypeData.items.map(i => i.total_days || 0));
    return maxVal > 0 ? maxVal : 10;
  }, [byTypeData]);

  return (
    <div className="space-y-6">
      {/* 1. Global Filter & Export Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Periode Preset Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Periode:</span>
            <select
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="month">Bulan Ini</option>
              <option value="semester">Semester Ganjil 2026/2027</option>
              <option value="year">Tahun Berjalan 2026</option>
              <option value="custom">Kustom Rentang Tanggal...</option>
            </select>
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
              <button
                onClick={fetchAllReports}
                className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Terapkan
              </button>
            </div>
          )}

          {/* Position Selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Jabatan</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
          <button
            onClick={fetchAllReports}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            type="button"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Mengunduh...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            type="button"
          >
            <FileText className="w-4 h-4" />
            <span>{exporting ? 'Mencetak...' : 'Cetak PDF'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={6} />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-2xs">
          <ErrorState message={error} onRetry={fetchAllReports} />
        </div>
      ) : (
        <>
          {/* 2. Top Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Pegawai Aktif
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {summaryData?.total_active_employees || 0} Orang
              </h3>
              <p className="text-xs text-slate-500 mt-1">Data master satuan pendidikan</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Pengajuan Cuti / Izin
              </span>
              <h3 className="text-2xl font-extrabold text-emerald-800 tracking-tight">
                {summaryData?.total_requests || 0} Berkas
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="text-emerald-700 font-bold">{summaryData?.approved_requests || 0} Disetujui</span>
                <span>•</span>
                <span>{summaryData?.approval_rate_percent || 0}% Approval Rate</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Hari Ketidakhadiran
              </span>
              <h3 className="text-2xl font-extrabold text-indigo-700 tracking-tight">
                {summaryData?.total_leave_days_taken || 0} Hari Kerja
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rata-rata: {summaryData?.avg_monthly_days || 0} Hari / Bulan
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Jam Lembur Disetujui
              </span>
              <h3 className="text-2xl font-extrabold text-amber-700 tracking-tight">
                {summaryData?.overtime_total_hours || 0} Jam
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {summaryData?.overtime_approved_requests || 0} Sesi Lembur Selesai
              </p>
            </div>
          </div>

          {/* 3. 2x2 Visual Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: Pengajuan per Jenis Cuti (Native Vertical Bar Chart) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">Pengajuan per Jenis Cuti & Izin</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {byTypeData?.grand_total_requests || 0} Berkas
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Distribusi volume hari berdasarkan kategori permohonan</p>

                {/* Vertical Bar Chart */}
                {byTypeData?.items && byTypeData.items.length > 0 ? (
                  <div className="relative w-full h-52 flex flex-col justify-end pt-4">
                    {/* Background Guidelines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                      <div className="flex justify-between items-center"><span className="w-6 text-right">{byTypeMaxDays}h</span><div className="w-full h-[1px] bg-slate-100 ml-2" /></div>
                      <div className="flex justify-between items-center"><span className="w-6 text-right">{(byTypeMaxDays / 2).toFixed(0)}h</span><div className="w-full h-[1px] bg-slate-100 ml-2" /></div>
                      <div className="flex justify-between items-center"><span className="w-6 text-right">0</span><div className="w-full h-[1px] bg-slate-100 ml-2" /></div>
                    </div>

                    {/* Bars */}
                    <div className="relative z-10 grid grid-cols-6 gap-2 pl-8 pr-2 h-40 items-end">
                      {byTypeData.items.slice(0, 6).map((item, iIdx) => {
                        const heightPct = Math.min(100, Math.max(10, (item.total_days / byTypeMaxDays) * 100));
                        return (
                          <div key={iIdx} className="flex flex-col items-center group cursor-pointer">
                            <span className="text-[11px] font-bold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                              {item.total_days}h
                            </span>
                            <div
                              style={{ height: `${heightPct}%`, backgroundColor: item.color || '#006948' }}
                              className="w-full max-w-[32px] rounded-t-md transition-all group-hover:opacity-90 shadow-2xs"
                            />
                            <span className="text-[10px] text-slate-600 truncate mt-2 w-full text-center font-medium" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    Belum ada data permohonan cuti pada periode ini.
                  </div>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Total Hari Diambil: <strong>{byTypeData?.grand_total_days || 0} Hari Kerja</strong></span>
                <span>Kategori Terdaftar: <strong>{byTypeData?.items?.length || 0} Jenis</strong></span>
              </div>
            </div>

            {/* CARD 2: Tren Ketidakhadiran & Lembur per Bulan (Native SVG Area & Line Chart) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Tren Ketidakhadiran per Bulan</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />Cuti/Izin (HK)</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Lembur (Jam)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4">Fluktuasi hari tidak hadir dan akumulasi lembur</p>

                {/* Native SVG Chart */}
                {trendData.length > 0 ? (
                  <div className="relative w-full h-52">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 180">
                      <defs>
                        <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" x2="500" y1="30" y2="30" stroke="#f1f5f9" strokeDasharray="2 4" strokeWidth="1" />
                      <line x1="0" x2="500" y1="80" y2="80" stroke="#f1f5f9" strokeDasharray="2 4" strokeWidth="1" />
                      <line x1="0" x2="500" y1="130" y2="130" stroke="#f1f5f9" strokeDasharray="2 4" strokeWidth="1" />

                      {/* Dynamic Trend Line */}
                      {(() => {
                        const maxVal = Math.max(1, ...trendData.map(d => d.total_days || 0));
                        const stepX = 500 / Math.max(1, trendData.length - 1);
                        const points = trendData.map((d, idx) => {
                          const x = idx * stepX;
                          const y = 160 - ((d.total_days / maxVal) * 130);
                          return { x, y, val: d.total_days, label: d.label };
                        });

                        const pathD = points.reduce((acc, p, idx) => (
                          idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`
                        ), '');

                        const areaD = `${pathD} L ${points[points.length - 1].x},165 L 0,165 Z`;

                        return (
                          <>
                            <path d={areaD} fill="url(#trendGradient)" />
                            <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
                            {points.map((p, idx) => (
                              <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-[11px] font-medium text-slate-500 px-1 mt-2">
                      {trendData.map((t, idx) => (
                        <span key={idx}>{t.label} ({t.total_days}h)</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    Data tren belum tersedia.
                  </div>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Rentang Waktu: <strong>{trendData.length} Bulan Terdata</strong></span>
                <span>Status: <strong>Aktif Terkonsolidasi</strong></span>
              </div>
            </div>

            {/* CARD 3: Pegawai dengan Cuti/Izin Terbanyak (Top Ranking) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">Pegawai Paling Sering Mengambil Cuti/Izin</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">Top 5 Akumulasi</span>
                </div>
                <p className="text-xs text-slate-500 mb-5">Akumulasi hari ketidakhadiran disetujui periode berjalan</p>

                {topData.length > 0 ? (
                  <div className="space-y-3.5">
                    {topData.map((emp, idx) => {
                      const maxTop = topData[0]?.total_days || 1;
                      const widthPct = Math.min(100, Math.max(15, (emp.total_days / maxTop) * 100));

                      const initials = (emp.employee_name || 'Pegawai')
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('');

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-900 font-semibold truncate">
                                {emp.employee_name} <span className="text-slate-400 font-normal">({emp.position_name || 'Staff'})</span>
                              </span>
                              <span className="text-emerald-800 font-bold">{emp.total_days} Hari</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                              <div
                                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    Nihil data ketidakhadiran pegawai pada periode ini.
                  </div>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Maksimum jatah standar tahunan: 12 hari/tahun</span>
                <a href="#tabel-rekap" className="text-emerald-800 hover:underline font-bold">
                  Lihat Seluruh Pegawai ↓
                </a>
              </div>
            </div>

            {/* CARD 4: Komposisi Status Persetujuan (Native SVG Donut Chart) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">Komposisi Status Persetujuan</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {donutSegments.total} Berkas
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Status alur persetujuan berjenjang HR & Kepala Sekolah</p>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  {/* Donut SVG */}
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="13" />
                      {donutSegments.total > 0 && (
                        <>
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#006948"
                            strokeWidth="13"
                            strokeDasharray={`${donutSegments.app.len} ${donutSegments.circumference}`}
                            strokeDashoffset={donutSegments.app.offset}
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#4f46e5"
                            strokeWidth="13"
                            strokeDasharray={`${donutSegments.pen.len} ${donutSegments.circumference}`}
                            strokeDashoffset={donutSegments.pen.offset}
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#ba1a1a"
                            strokeWidth="13"
                            strokeDasharray={`${donutSegments.rej.len} ${donutSegments.circumference}`}
                            strokeDashoffset={donutSegments.rej.offset}
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#64748b"
                            strokeWidth="13"
                            strokeDasharray={`${donutSegments.rev.len} ${donutSegments.circumference}`}
                            strokeDashoffset={donutSegments.rev.offset}
                          />
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold text-slate-900 leading-none">
                        {donutSegments.total}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">Berkas</span>
                    </div>
                  </div>

                  {/* Legend Column */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <span className="font-semibold text-slate-800">Disetujui</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold">
                        <span>{donutSegments.app?.count || 0}</span>
                        <span className="text-emerald-700 text-[11px]">({donutSegments.app?.pct || 0}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <span className="font-semibold text-slate-800">Menunggu</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold">
                        <span>{donutSegments.pen?.count || 0}</span>
                        <span className="text-indigo-700 text-[11px]">({donutSegments.pen?.pct || 0}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                        <span className="font-semibold text-slate-800">Ditolak / Batal</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold">
                        <span>{donutSegments.rej?.count || 0}</span>
                        <span className="text-rose-700 text-[11px]">({donutSegments.rej?.pct || 0}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="font-semibold text-slate-800">Perlu Revisi</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold">
                        <span>{donutSegments.rev?.count || 0}</span>
                        <span className="text-slate-600 text-[11px]">({donutSegments.rev?.pct || 0}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Tingkat Persetujuan: <strong>{summaryData?.approval_rate_percent || 0}%</strong></span>
                <span>Kinerja SLA: <strong>Optimal (&lt; 24 Jam)</strong></span>
              </div>
            </div>
          </div>

          {/* 4. Comprehensive Data Table: Rekapitulasi per Pegawai */}
          <div id="tabel-rekap" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Table Header & Search Filter */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rekapitulasi Ketidakhadiran & Lembur per Pegawai</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian akumulasi hari cuti, izin, sakit, dinas luar, lembur payable, dan sisa kuota saldo
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau NIP..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama Pegawai & NIP</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-3 text-center">Tahunan</th>
                    <th className="py-3 px-3 text-center">Khusus</th>
                    <th className="py-3 px-3 text-center">Sakit</th>
                    <th className="py-3 px-3 text-center">Izin</th>
                    <th className="py-3 px-3 text-center">Dinas</th>
                    <th className="py-3 px-3 text-center font-extrabold text-slate-900 bg-slate-100/60">Total Absen</th>
                    <th className="py-3 px-3 text-center font-bold text-indigo-700">Lembur (j)</th>
                    <th className="py-3 px-4 text-center font-bold text-emerald-800">Sisa Jatah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecap.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-slate-400 italic">
                        Tidak ada data pegawai yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRecap.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{row.employee_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{row.nip || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.position_name || '-'}</td>
                        <td className="py-3 px-3 text-center font-medium text-slate-700">
                          {row.annual_leave_days > 0 ? `${row.annual_leave_days}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-700">
                          {row.special_leave_days > 0 ? `${row.special_leave_days}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-rose-700">
                          {row.sick_days > 0 ? `${row.sick_days}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-amber-700">
                          {row.permit_days > 0 ? `${row.permit_days}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-sky-700">
                          {row.official_days > 0 ? `${row.official_days}h` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 bg-slate-50/60">
                          {row.total_absent_days > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-900 text-[11px]">
                              {row.total_absent_days} Hari
                            </span>
                          ) : '0 Hari'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">
                          {row.overtime_payable_hours > 0 ? `${row.overtime_payable_hours}j` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {row.remaining_annual_balance != null ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px]">
                              {row.remaining_annual_balance} Hari
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <span>Menampilkan <strong>{filteredRecap.length}</strong> pegawai terdaftar</span>
              <div className="flex items-center gap-3 font-semibold text-slate-700">
                <span>Total Tidak Hadir: <strong>{filteredRecap.reduce((sum, r) => sum + (r.total_absent_days || 0), 0)} Hari</strong></span>
                <span>•</span>
                <span>Total Lembur: <strong>{filteredRecap.reduce((sum, r) => sum + (r.overtime_payable_hours || 0), 0)} Jam</strong></span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
