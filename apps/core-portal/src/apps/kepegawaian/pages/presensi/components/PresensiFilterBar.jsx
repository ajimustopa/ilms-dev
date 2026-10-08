import React, { useState } from 'react';
import {
  Calendar,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Filter,
  Check
} from 'lucide-react';

export default function PresensiFilterBar({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onApplyPreset,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  unitFilter,
  setUnitFilter,
  isAnomalyOnly,
  setIsAnomalyOnly,
  onReset,
  onExportExcel,
  schoolUnits = [],
  activeTab
}) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3.5">
      {/* Row 1: Dates, Presets & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Date Pickers & Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Rentang:</span>
          </span>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent px-2 py-0.5 text-xs text-slate-800 font-mono focus:outline-none"
            />
            <span className="text-slate-400 text-[11px]">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent px-2 py-0.5 text-xs text-slate-800 font-mono focus:outline-none"
            />
          </div>

          {/* Quick Date Chips */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onApplyPreset('today')}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 shadow-2xs rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('yesterday')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('this_week')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              Minggu ini
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('this_month')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              Bulan ini
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pegawai atau NIP..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Row 2: Dropdown Filters, Toggle & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Select: Satuan Pendidikan */}
          {schoolUnits && schoolUnits.length > 0 && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
            >
              <option value="">Semua Satuan</option>
              {schoolUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Select: Status Kehadiran */}
          {activeTab !== 'absent' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="permitted">Izin</option>
              <option value="sick">Sakit</option>
              <option value="leave">Cuti</option>
              <option value="duty_travel">Dinas Luar</option>
              <option value="absent">Alpa</option>
            </select>
          )}

          {/* Select: Sumber Presensi */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white focus:outline-none"
          >
            <option value="">Semua Sumber</option>
            <option value="mobile">Mandiri (Selfie GPS)</option>
            <option value="fingerprint">Mesin Sidik Jari</option>
            <option value="manual">Manual HRD</option>
          </select>

          {/* Toggle: Hanya yang Bermasalah / Anomali */}
          <label className="inline-flex items-center gap-2 cursor-pointer ml-1 select-none text-slate-600">
            <input
              type="checkbox"
              checked={isAnomalyOnly}
              onChange={(e) => setIsAnomalyOnly(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-slate-600">
              Hanya Masalah (Terlambat/Alpa/Anomali)
            </span>
          </label>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>

          {/* Export Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={onExportExcel}
              className="h-8 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Ekspor Rekapitulasi Presensi Pegawai ke format Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
