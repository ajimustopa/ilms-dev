import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  TimerOff,
  Award,
  UserX,
  TableProperties,
  Grid,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Maximize2,
  Minimize2,
  Clock,
  Building2,
  Filter,
  Eye,
  Loader2
} from 'lucide-react';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function TabRekapBulanan({
  monthlySummary = { kpi_totals: {}, items: [] },
  monthlyMatrix = { total_days: 30, days_header: [], matrix: [] },
  monthlyTrends = { summary: {}, items: [] },
  loading = false,
  month = '10',
  setMonth,
  year = '2026',
  setYear,
  searchQuery = '',
  setSearchQuery,
  unitFilter = '',
  setUnitFilter,
  positionFilter = '',
  setPositionFilter,
  schoolUnits = [],
  onExportExcel,
  onExportPdf,
  onOpenDetailDrawer
}) {
  const [viewMode, setViewMode] = useState('rekap'); // 'rekap' | 'matriks'
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  const monthNum = parseInt(month, 10) || (new Date().getMonth() + 1);
  const yearNum = parseInt(year, 10) || new Date().getFullYear();
  const currentMonthName = MONTH_NAMES_ID[monthNum - 1] || 'Bulan Ini';

  // Normalize summary items & KPI totals
  const summaryItems = Array.isArray(monthlySummary) ? monthlySummary : (monthlySummary?.items || []);
  const kpiTotals = monthlySummary?.kpi_totals || {};
  const matrixItems = monthlyMatrix?.matrix || [];
  const daysHeader = monthlyMatrix?.days_header || [];
  const totalDays = monthlyMatrix?.total_days || 30;

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (monthNum === 1) {
      setMonth('12');
      setYear(String(yearNum - 1));
    } else {
      setMonth(String(monthNum - 1));
    }
  };

  const handleNextMonth = () => {
    if (monthNum === 12) {
      setMonth('1');
      setYear(String(yearNum + 1));
    } else {
      setMonth(String(monthNum + 1));
    }
  };

  // Filtered summary items based on search and position
  const filteredSummary = useMemo(() => {
    return summaryItems.filter((item) => {
      const matchSearch = searchQuery
        ? (item.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.employee_number || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchPos = positionFilter
        ? (item.position_title || '').toLowerCase().includes(positionFilter.toLowerCase())
        : true;
      return matchSearch && matchPos;
    });
  }, [summaryItems, searchQuery, positionFilter]);

  // Filtered matrix items
  const filteredMatrix = useMemo(() => {
    return matrixItems.filter((item) => {
      const matchSearch = searchQuery
        ? (item.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.employee_number || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchPos = positionFilter
        ? (item.position_title || '').toLowerCase().includes(positionFilter.toLowerCase())
        : true;
      return matchSearch && matchPos;
    });
  }, [matrixItems, searchQuery, positionFilter]);

  // Select all checkbox handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(filteredSummary.map((it) => it.employee_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectRow = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  // Helper avatar generator
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ').filter(p => !p.startsWith('Ust.') && !p.startsWith('Dra.') && !p.startsWith('Hj.') && !p.startsWith('Dr.'));
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Generate dynamic SVG sparkline points from monthlyTrends
  const trendPoints = useMemo(() => {
    const items = monthlyTrends?.items || [];
    if (!items || items.length === 0) {
      // Default placeholder curve
      return {
        polygon: '0,65 45,60 90,68 135,50 180,48 225,52 270,30 315,22 360,18 405,12 450,25 495,20 540,24 585,30 630,16 675,20 720,28 765,22 810,14 855,18 900,22 945,26 1000,20 1000,80 0,80',
        polyline: '0,65 45,60 90,68 135,50 180,48 225,52 270,30 315,22 360,18 405,12 450,25 495,20 540,24 585,30 630,16 675,20 720,28 765,22 810,14 855,18 900,22 945,26 1000,20',
        peakX: 405,
        peakY: 12,
        lowestX: 90,
        lowestY: 68
      };
    }

    const total = items.length;
    let peakIndex = 0;
    let peakVal = 0;
    let lowestIndex = 0;
    let lowestVal = 100;

    const coords = items.map((it, idx) => {
      const x = Math.round((idx / (total - 1 || 1)) * 1000);
      const val = it.attendance_percentage !== null ? it.attendance_percentage : 95.0;
      if (val >= peakVal && it.attendance_percentage !== null) {
        peakVal = val;
        peakIndex = idx;
      }
      if (val <= lowestVal && it.attendance_percentage !== null && val > 0) {
        lowestVal = val;
        lowestIndex = idx;
      }
      // Map percentage (70% - 100%) to Y coordinate (75 to 10)
      const clamped = Math.max(70, Math.min(100, val));
      const y = Math.round(75 - ((clamped - 70) / 30) * 65);
      return { x, y, val };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const polygon = `0,80 ${coords.map((c) => `${c.x},${c.y}`).join(' ')} 1000,80 0,80`;
    const peakCoord = coords[peakIndex] || { x: 500, y: 15 };
    const lowestCoord = coords[lowestIndex] || { x: 100, y: 65 };

    return {
      polygon,
      polyline,
      peakX: peakCoord.x,
      peakY: peakCoord.y,
      lowestX: lowestCoord.x,
      lowestY: lowestCoord.y
    };
  }, [monthlyTrends]);

  // Matrix cell badge helper
  const getMatrixCellClass = (code) => {
    switch (code) {
      case 'H':
        return 'bg-emerald-600 text-white font-bold';
      case 'T':
        return 'bg-amber-500 text-white font-bold';
      case 'I':
        return 'bg-sky-500 text-white font-bold';
      case 'S':
        return 'bg-orange-500 text-white font-bold';
      case 'C':
        return 'bg-purple-600 text-white font-bold';
      case 'DL':
        return 'bg-indigo-600 text-white font-bold';
      case 'A':
        return 'bg-red-600 text-white font-bold';
      case 'L':
        return 'bg-slate-100 text-slate-400 font-medium';
      default:
        return 'bg-slate-50 text-slate-300';
    }
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F8F9FB] p-6 overflow-y-auto' : ''}`}>
      {/* 1. 6 KPI Metric Cards Bulanan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Hari Efektif */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Hari Efektif
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpiTotals.effective_days || 22}
            </span>
            <span className="text-xs text-slate-500 font-medium">Hari Kerja</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold">
              {kpiTotals.holidays_count || 9} Hari Libur
            </span>
            <span>(Akhir Pekan/SK)</span>
          </div>
        </div>

        {/* KPI 2: Rata-rata Hadir */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Rata-rata Hadir
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {kpiTotals.average_attendance_percentage !== undefined ? `${kpiTotals.average_attendance_percentage}%` : '96.4%'}
            </span>
            <span className="text-emerald-700 text-xs font-semibold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />+0.8%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Target Yayasan: <span className="font-semibold text-slate-800">≥95.0%</span>
          </div>
        </div>

        {/* KPI 3: Keterlambatan */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Keterlambatan
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <TimerOff className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900">
              {kpiTotals.total_late_minutes || 0}
            </span>
            <span className="text-xs text-slate-500">Menit</span>
            <span className="text-xs text-slate-400 font-mono">
              / {kpiTotals.total_late_count || 0}x
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold">Terkontrol</span>
            <span>di toleransi 5 mnt</span>
          </div>
        </div>

        {/* KPI 4: Lembur Valid */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Lembur Valid
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">
              {kpiTotals.total_overtime_hours || 0}
            </span>
            <span className="text-xs text-slate-500">Jam</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 truncate">
            <span className="text-slate-900 font-semibold">{kpiTotals.overtime_employees_count || 0} Pegawai</span> diajukan SPL
          </div>
        </div>

        {/* KPI 5: Hadir 100% */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Hadir 100%
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700">
              {kpiTotals.perfect_attendance_count || 0}
            </span>
            <span className="text-xs text-slate-500">/ {summaryItems.length} Staf</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-700">
              {summaryItems.length > 0 ? ((kpiTotals.perfect_attendance_count / summaryItems.length) * 100).toFixed(1) : 0}%
            </span> Memenuhi TPP Penuh
          </div>
        </div>

        {/* KPI 6: Total Alpa */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-col justify-between hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
              Total Alpa (A)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">
              {kpiTotals.total_absent_cases || 0}
            </span>
            <span className="text-xs text-slate-500">Hari-Kasus</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="text-rose-700 font-semibold">{kpiTotals.absent_employees_count || 0} Pegawai</span> SP1 Terpicu
          </div>
        </div>
      </div>

      {/* 2. Trendline Visual Card: Fluktuasi Kehadiran Harian */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tren Persentase Kehadiran Harian ({currentMonthName} {year})
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring kepatuhan masuk tepat waktu harian di seluruh satuan pendidikan binaan ALDEPOS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
              <span className="text-slate-700 font-medium">
                Hadir Tepat (Rata-rata {monthlyTrends.summary?.average_rate || '96.4'}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700 font-medium">
                Puncak: Tgl {monthlyTrends.summary?.peak?.day || 12} ({monthlyTrends.summary?.peak?.percentage || '98.8'}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-slate-700 font-medium">
                Titik Terendah: Tgl {monthlyTrends.summary?.lowest?.day || 3} ({monthlyTrends.summary?.lowest?.percentage || '94.2'}%)
              </span>
            </div>
          </div>
        </div>

        {/* SVG Sparkline Graph */}
        <div className="relative w-full overflow-hidden pt-2">
          <svg className="w-full h-24 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 80">
            <defs>
              <linearGradient id="gradient-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#006948" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#006948" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guides */}
            <line stroke="#eceef0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="15" y2="15" />
            <line stroke="#eceef0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="45" y2="45" />
            <line stroke="#eceef0" strokeWidth="1" x1="0" x2="1000" y1="75" y2="75" />

            {/* Area */}
            <polygon fill="url(#gradient-area)" points={trendPoints.polygon} />

            {/* Trendline path */}
            <polyline
              fill="none"
              points={trendPoints.polyline}
              stroke="#006948"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />

            {/* Peak dot */}
            <circle cx={trendPoints.peakX} cy={trendPoints.peakY} fill="#006948" r="4.5" />
            <circle cx={trendPoints.peakX} cy={trendPoints.peakY} fill="#006948" fillOpacity="0.25" r="8" />

            {/* Lowest dot */}
            <circle cx={trendPoints.lowestX} cy={trendPoints.lowestY} fill="#555c6d" r="4.5" />
          </svg>

          {/* Date markers bottom axis */}
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-mono mt-1 pt-1">
            <span>01 {currentMonthName.slice(0, 3)}</span>
            <span>04 {currentMonthName.slice(0, 3)}</span>
            <span>08 {currentMonthName.slice(0, 3)}</span>
            <span className="text-emerald-700 font-bold">
              {monthlyTrends.summary?.peak?.day || 12} {currentMonthName.slice(0, 3)} (Puncak)
            </span>
            <span>16 {currentMonthName.slice(0, 3)}</span>
            <span>20 {currentMonthName.slice(0, 3)}</span>
            <span>24 {currentMonthName.slice(0, 3)}</span>
            <span>28 {currentMonthName.slice(0, 3)}</span>
            <span>{totalDays} {currentMonthName.slice(0, 3)}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Toolbar Controls Khusus Rekap Bulanan */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sisi Kiri: Navigasi Periode & Satuan */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">
                {currentMonthName} {year}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
              title="Bulan Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Satuan Pendidikan */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Satuan:</span>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter && setUnitFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Semua Satuan (Gabungan)</option>
              {schoolUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai, NIP..."
              className="h-8 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none w-52 transition-all"
            />
          </div>
        </div>

        {/* Sisi Kanan: View Switcher (Rekap vs Matriks) & Ekspor Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* View Toggle Segmented Control */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('rekap')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'rekap'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Rekap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matriks')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'matriks'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matriks (1-31)</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>

          {/* Tombol Ekspor PDF */}
          <button
            type="button"
            onClick={onExportPdf}
            className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-700" />
            <span>Ekspor PDF</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4. SECTION 1: VIEW "REKAP" (Tabel Komprehensif Akumulasi Bulanan) */}
      {viewMode === 'rekap' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-900">
                Ringkasan Akumulasi Presensi Periode {currentMonthName} {year}
              </span>
              <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                {filteredSummary.length} Pegawai Terdaftar
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Keterangan:</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>&gt;95% (Sangat Baik)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>90-95% (Cukup)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>&lt;90% (Kurang)</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        filteredSummary.length > 0 &&
                        selectedEmployees.length === filteredSummary.length
                      }
                      className="rounded accent-emerald-700 w-3.5 h-3.5"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[220px]">Pegawai</th>
                  <th className="py-3 px-2.5 text-center">Efektif</th>
                  <th className="py-3 px-2.5 text-center font-bold text-emerald-700">Hadir</th>
                  <th className="py-3 px-2.5 text-center font-bold text-amber-700">Terlambat</th>
                  <th className="py-3 px-2.5 text-center">Total Telat</th>
                  <th className="py-3 px-2 text-center font-bold text-sky-700" title="Izin">I</th>
                  <th className="py-3 px-2 text-center font-bold text-orange-700" title="Sakit">S</th>
                  <th className="py-3 px-2 text-center font-bold text-purple-700" title="Cuti">C</th>
                  <th className="py-3 px-2 text-center font-bold text-indigo-700" title="Dinas Luar">DL</th>
                  <th className="py-3 px-2 text-center font-bold text-rose-700" title="Alpa / Tanpa Keterangan">A</th>
                  <th className="py-3 px-3 text-right font-medium">Jam Kerja</th>
                  <th className="py-3 px-3 text-right font-semibold text-blue-700">Lembur</th>
                  <th className="py-3 px-4 min-w-[130px] text-center">% Kehadiran</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-800 font-normal">
                {loading ? (
                  <tr>
                    <td colSpan="15" className="p-12 text-center text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
                      <span className="text-xs font-medium">Menghitung rekapitulasi presensi bulanan...</span>
                    </td>
                  </tr>
                ) : filteredSummary.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="p-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <TableProperties className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-700 mb-1">
                        Belum Ada Data Presensi
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Tidak ditemukan catatan presensi pegawai untuk bulan {currentMonthName} {year}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSummary.map((item, idx) => {
                    const isSelected = selectedEmployees.includes(item.employee_id);
                    const pct = item.attendance_percentage || 0;
                    const isPerfect = pct >= 95;
                    const isWarning = pct >= 90 && pct < 95;
                    const isDanger = pct < 90;

                    return (
                      <tr
                        key={item.employee_id || idx}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.absent_count > 0 ? 'bg-rose-50/15' : isSelected ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.employee_id)}
                            className="rounded accent-emerald-700 w-3.5 h-3.5"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {getInitials(item.full_name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 truncate">
                                {item.full_name}
                              </span>
                              <span className="text-slate-400 text-[10px] font-mono">
                                {item.employee_number || 'NIP -'} • {item.position_title || 'Staf'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-2.5 text-center font-medium font-mono text-slate-600">
                          {item.effective_days || 22}
                        </td>

                        <td className="py-3.5 px-2.5 text-center font-bold font-mono text-emerald-700 bg-emerald-50/20">
                          {item.present_count || 0}
                        </td>

                        <td className="py-3.5 px-2.5 text-center font-mono">
                          {item.late_count > 0 ? (
                            <span className="font-bold text-amber-700">{item.late_count}x</span>
                          ) : (
                            <span className="text-slate-400">0x</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2.5 text-center font-mono">
                          {item.total_late_minutes > 0 ? (
                            <span className="font-semibold text-amber-700">{item.total_late_minutes} mnt</span>
                          ) : (
                            <span className="text-slate-400">0 mnt</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.permission_count > 0 ? (
                            <span className="font-bold text-sky-700">{item.permission_count}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.sick_count > 0 ? (
                            <span className="font-bold text-orange-600">{item.sick_count}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.leave_count > 0 ? (
                            <span className="font-bold text-purple-700">{item.leave_count}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.duty_travel_count > 0 ? (
                            <span className="font-bold text-indigo-700">{item.duty_travel_count}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-2 text-center font-mono">
                          {item.absent_count > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded">
                              {item.absent_count}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-medium font-mono">
                          {item.total_work_hours}j
                        </td>

                        <td className="py-3.5 px-3 text-right font-semibold font-mono text-blue-700">
                          {item.overtime_hours > 0 ? `${item.overtime_hours}j` : '-'}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-center">
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`font-bold text-[11px] font-mono ${
                                  isPerfect
                                    ? 'text-emerald-700'
                                    : isWarning
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {pct}%
                              </span>
                              <span
                                className={`text-[10px] font-semibold ${
                                  isPerfect
                                    ? 'text-emerald-700'
                                    : isWarning
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {isPerfect ? 'Sangat Baik' : isWarning ? 'Cukup' : 'Kurang'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isPerfect
                                    ? 'bg-emerald-600'
                                    : isWarning
                                    ? 'bg-amber-500'
                                    : 'bg-rose-600'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenDetailDrawer && onOpenDetailDrawer(item)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Info / Pagination */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Menampilkan <span className="font-bold text-slate-900">{filteredSummary.length}</span> dari{' '}
              <span className="font-bold text-slate-900">{summaryItems.length}</span> pegawai terdaftar
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                Pembaruan: {new Date().toLocaleDateString('id-ID')} WIB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECTION 2: VIEW "MATRIKS" (Tanggal 1 s/d 31) */}
      {viewMode === 'matriks' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* Header Matriks & Legenda Kode Kehadiran */}
          <div className="p-5 flex flex-col gap-3 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tampilan Matriks Kalender Harian (1 - {totalDays} {currentMonthName} {year})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pratinjau sebaran status harian per staf sekolah. Akhir pekan (Sabtu &amp; Minggu) diarsir abu-abu.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-medium">
                  Format Waktu: WIB (UTC+7)
                </span>
              </div>
            </div>

            {/* Legenda Lengkap */}
            <div className="p-3 bg-slate-50 rounded-lg flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Legenda Kode:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                  H
                </span>
                <span className="text-slate-600 font-medium">Hadir Tepat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                  T
                </span>
                <span className="text-slate-600 font-medium">Terlambat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-sky-500 text-white font-bold flex items-center justify-center text-[10px]">
                  I
                </span>
                <span className="text-slate-600 font-medium">Izin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-orange-500 text-white font-bold flex items-center justify-center text-[10px]">
                  S
                </span>
                <span className="text-slate-600 font-medium">Sakit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                  C
                </span>
                <span className="text-slate-600 font-medium">Cuti</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  DL
                </span>
                <span className="text-slate-600 font-medium">Dinas Luar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                  A
                </span>
                <span className="text-slate-600 font-medium">Alpa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                  L
                </span>
                <span className="text-slate-600 font-medium">Libur Akhir Pekan</span>
              </div>
            </div>
          </div>

          {/* Matrix Table Scrollable 31 Days */}
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                {/* Row 1: Label Hari (Sen, Sel, Rab, dll) */}
                <tr className="bg-slate-100 text-[10px] font-semibold text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 px-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[200px] border-r border-slate-200">
                    Hari
                  </th>
                  {daysHeader.map((d) => (
                    <th
                      key={d.day}
                      className={`py-1.5 px-1 min-w-[30px] border-r border-slate-100 ${
                        d.is_weekend ? 'bg-slate-200/80 text-slate-500 font-bold' : ''
                      }`}
                    >
                      {d.day_name}
                    </th>
                  ))}
                  <th className="py-1.5 px-2 text-center bg-slate-200 text-slate-800 font-bold" colSpan={5}>
                    Total Bulanan
                  </th>
                </tr>

                {/* Row 2: Angka Tanggal 01 - 31 */}
                <tr className="bg-white text-[11px] font-bold text-slate-900 border-b border-slate-200">
                  <th className="py-2.5 px-3 text-left sticky left-0 bg-white z-20 border-r border-slate-200">
                    Pegawai
                  </th>
                  {daysHeader.map((d) => (
                    <th
                      key={d.day}
                      className={`py-2 px-1 min-w-[30px] font-mono border-r border-slate-100 ${
                        d.is_weekend ? 'bg-slate-100 text-slate-400' : ''
                      }`}
                    >
                      {String(d.day).padStart(2, '0')}
                    </th>
                  ))}
                  {/* Sub-headers for summary */}
                  <th className="py-2 px-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-mono">H</th>
                  <th className="py-2 px-1.5 bg-amber-50 text-amber-800 text-[11px] font-mono">T</th>
                  <th className="py-2 px-1.5 bg-sky-50 text-sky-800 text-[11px] font-mono">I</th>
                  <th className="py-2 px-1.5 bg-orange-50 text-orange-800 text-[11px] font-mono">S</th>
                  <th className="py-2 px-1.5 bg-rose-50 text-rose-800 text-[11px] font-mono">A</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-[10px]">
                {loading ? (
                  <tr>
                    <td colSpan={totalDays + 6} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
                      <span className="text-xs font-medium">Memuat matriks kalender...</span>
                    </td>
                  </tr>
                ) : filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={totalDays + 6} className="p-12 text-center text-slate-400">
                      Belum ada data kehadiran untuk bulan {currentMonthName} {year}
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-left sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(emp.full_name)}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                            {emp.full_name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {emp.employee_number || '-'}
                          </span>
                        </div>
                      </td>

                      {emp.days?.map((d) => (
                        <td
                          key={d.day}
                          className="py-1 px-1 border-r border-slate-100 relative"
                          onMouseEnter={() => setHoveredCell({ empId: emp.employee_id, day: d.day, detail: d.detail, code: d.code, date: d.date })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {d.code === 'L' ? (
                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 font-bold flex items-center justify-center mx-auto text-[10px]">
                              L
                            </span>
                          ) : d.code !== '-' ? (
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center mx-auto text-[10px] transition-transform hover:scale-110 cursor-pointer ${getMatrixCellClass(
                                d.code
                              )}`}
                              title={`Tgl ${d.day} (${d.code}): ${
                                d.detail?.check_in
                                  ? `Masuk ${d.detail.check_in.slice(0, 5)} - Pulang ${d.detail?.check_out ? d.detail.check_out.slice(0, 5) : 'Belum'}`
                                  : d.code
                              }`}
                            >
                              {d.code}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>
                      ))}

                      {/* Summary Columns */}
                      <td className="py-2 px-1.5 font-bold font-mono text-emerald-800 bg-emerald-50/60">
                        {emp.summary?.H || 0}
                      </td>
                      <td className="py-2 px-1.5 font-bold font-mono text-amber-700 bg-amber-50/40">
                        {emp.summary?.T || 0}
                      </td>
                      <td className="py-2 px-1.5 font-bold font-mono text-sky-700 bg-sky-50/40">
                        {emp.summary?.I || 0}
                      </td>
                      <td className="py-2 px-1.5 font-bold font-mono text-orange-600 bg-orange-50/40">
                        {emp.summary?.S || 0}
                      </td>
                      <td className="py-2 px-1.5 font-bold font-mono text-rose-700 bg-rose-100/80">
                        {emp.summary?.A || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Info */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Arahkan kursor ke kode matriks untuk melihat detail waktu ketukan mesin presensi atau nomor surat izin.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isFullscreen ? 'Tutup Layar Penuh' : 'Buka Mode Layar Penuh'}</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
