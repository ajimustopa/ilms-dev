import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Copy,
  RefreshCw,
  Edit2,
  Trash2,
  Table as TableIcon,
  Grid,
  Filter,
  Layers,
  Sparkles,
  Building,
  Check,
  Download,
  Info
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { useAuth } from '../../../../shared/store/AuthContext';
import HolidayFormModal from './HolidayFormModal';
import HolidayImportModal from './HolidayImportModal';
import HolidayCopyYearModal from './HolidayCopyYearModal';
import HolidayCalendarView from './HolidayCalendarView';
import { useToast } from '../../../../shared/components/Toast';

export default function HolidaysTab({ activeSchoolUnit }) {
  const { user } = useAuth();
  const toast = useToast();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedUnitId, setSelectedUnitId] = useState(activeSchoolUnit?.id ? String(activeSchoolUnit.id) : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, national, joint_leave, school_semester, foundation, unit_special, draft
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedHolidayForEdit, setSelectedHolidayForEdit] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCopyYearModalOpen, setIsCopyYearModalOpen] = useState(false);
  const [isSyncingAcademic, setIsSyncingAcademic] = useState(false);

  // Local notification fallback
  const [localAlert, setLocalAlert] = useState(null);

  const canManage = user?.permissions?.includes('kepegawaian.holidays.manage') ||
                    user?.role === 'super_admin' ||
                    user?.role === 'hrd' ||
                    user?.role === 'admin_satuan_pendidikan';

  const showToast = (message, type = 'success') => {
    if (toast?.showToast) {
      toast.showToast(message, type);
    }
    setLocalAlert({ message, type });
    setTimeout(() => setLocalAlert(null), 4000);
  };

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      let q = `?year=${selectedYear}`;
      if (selectedUnitId) q += `&school_unit_id=${selectedUnitId}`;
      const res = await api.get(`/kepegawaian/holidays${q}`);
      if (res.data?.success) {
        setHolidays(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
      showToast(err.response?.data?.message || 'Gagal memuat daftar hari libur', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear, selectedUnitId, activeSchoolUnit]);

  // Quick Action: Confirm single draft
  const handleConfirmHoliday = async (id) => {
    try {
      await api.put(`/kepegawaian/holidays/${id}`, { review_status: 'confirmed' });
      showToast('Hari libur berhasil dikonfirmasi dan efektif aktif');
      fetchHolidays();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengonfirmasi hari libur', 'error');
    }
  };

  // Quick Action: Confirm all drafts in the current year
  const handleConfirmAllDrafts = async () => {
    const draftItems = holidays.filter(h => h.review_status === 'draft_needs_review');
    if (draftItems.length === 0) return;

    if (!confirm(`Konfirmasi seluruh ${draftItems.length} hari libur berstatus draft menjadi aktif?`)) return;

    try {
      for (const item of draftItems) {
        await api.put(`/kepegawaian/holidays/${item.id}`, { review_status: 'confirmed' });
      }
      showToast(`Berhasil mengonfirmasi ${draftItems.length} hari libur`);
      fetchHolidays();
    } catch (err) {
      showToast('Sebagian atau seluruh konfirmasi draft gagal', 'error');
      fetchHolidays();
    }
  };

  // Action: Delete holiday
  const handleDeleteHoliday = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hari libur ini?')) return;
    try {
      await api.delete(`/kepegawaian/holidays/${id}`);
      showToast('Hari libur berhasil dihapus');
      fetchHolidays();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus hari libur', 'error');
    }
  };

  // Action: Sync Academic Calendar (P3)
  const handleSyncAcademic = async () => {
    setIsSyncingAcademic(true);
    try {
      const res = await api.post('/kepegawaian/holidays/sync-academic', {
        school_unit_id: selectedUnitId ? Number(selectedUnitId) : null
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Sinkronisasi kalender akademik selesai');
        fetchHolidays();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyinkronkan kalender akademik', 'error');
    } finally {
      setIsSyncingAcademic(false);
    }
  };

  // Metric Calculation
  const totalOffDays = holidays.filter(h => h.is_off_day && h.review_status === 'confirmed').length;
  const nationalCount = holidays.filter(h => h.holiday_type === 'national' && h.review_status === 'confirmed').length;
  const jointLeaveCount = holidays.filter(h => h.holiday_type === 'joint_leave' && h.review_status === 'confirmed').length;
  const schoolCalendarCount = holidays.filter(h => ['school_semester', 'school_ramadan', 'school_exam'].includes(h.holiday_type) && h.review_status === 'confirmed').length;
  const draftCount = holidays.filter(h => h.review_status === 'draft_needs_review').length;

  // Filtered List
  const filteredHolidays = holidays.filter(h => {
    const matchesSearch = (h.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (h.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (h.start_date || '').includes(searchQuery);
    if (!matchesSearch) return false;

    if (filterType === 'draft') return h.review_status === 'draft_needs_review';
    if (filterType === 'national') return h.holiday_type === 'national';
    if (filterType === 'joint_leave') return h.holiday_type === 'joint_leave';
    if (filterType === 'school_semester') return ['school_semester', 'school_ramadan', 'school_exam'].includes(h.holiday_type);
    if (filterType === 'foundation') return h.holiday_type === 'foundation';
    if (filterType === 'unit_special') return h.holiday_type === 'unit_special';

    return true;
  });

  const getHolidayTypeLabel = (type) => {
    switch (type) {
      case 'national': return 'Libur Nasional';
      case 'joint_leave': return 'Cuti Bersama';
      case 'school_semester': return 'Libur Semester';
      case 'school_ramadan': return 'Libur Ramadan';
      case 'school_exam': return 'Libur Ujian';
      case 'foundation': return 'Agenda Yayasan';
      case 'unit_special': return 'Khusus Satuan';
      default: return type;
    }
  };

  const getHolidayTypeBadge = (h) => {
    if (h.review_status === 'draft_needs_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-dashed border-amber-300">
          <AlertTriangle className="w-3 h-3" />
          Draft Perlu Tinjauan
        </span>
      );
    }
    switch (h.holiday_type) {
      case 'national':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Libur Nasional</span>;
      case 'joint_leave':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800">Cuti Bersama (SKB)</span>;
      case 'school_semester':
      case 'school_ramadan':
      case 'school_exam':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">{getHolidayTypeLabel(h.holiday_type)}</span>;
      case 'foundation':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">Agenda Yayasan</span>;
      case 'unit_special':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Khusus Satuan</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">{h.holiday_type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Local Notification Alert */}
      {localAlert && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-all ${
          localAlert.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {localAlert.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{localAlert.message}</span>
          </div>
          <button type="button" onClick={() => setLocalAlert(null)} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Left: Filters (Year & School Unit) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div className="relative inline-flex items-center">
            <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
            >
              <option value="2024">Tahun 2024</option>
              <option value="2025">Tahun 2025</option>
              <option value="2026">Tahun 2026</option>
              <option value="2027">Tahun 2027</option>
              <option value="2028">Tahun 2028</option>
            </select>
          </div>

          {/* School Unit Filter */}
          <div className="relative inline-flex items-center">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
            >
              <option value="">Semua Satuan (SMP, SMA, Yayasan)</option>
              <option value="1">SMP IT Aldepos Islamic Boarding School</option>
              <option value="2">SMA IT Aldepos Islamic Boarding School</option>
            </select>
          </div>

          {/* View Switcher Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Daftar Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Kalender Bulanan</span>
            </button>
          </div>
        </div>

        {/* Right: Actions (Add, Import, Copy Year, Sync Academic) */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAcademic}
              disabled={isSyncingAcademic}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
              title="Sinkronisasi otomatis dengan kalender akademik sekolah"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAcademic ? 'animate-spin' : ''}`} />
              <span>Sinkron Kalender Akademik</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCopyYearModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-sm"
              title="Salin daftar libur dari tahun sebelumnya"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Salin dari Tahun Lalu</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors shadow-sm"
              title="Impor massal dari berkas CSV atau JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor Berkas (CSV/JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedHolidayForEdit(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Hari Libur</span>
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards (Dynamic Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Libur Resmi</span>
            <span className="text-xl font-bold text-slate-800 mt-0.5 block">{totalOffDays} Hari</span>
            <span className="text-[11px] text-slate-500">Tahun {selectedYear}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Libur Nasional</span>
            <span className="text-xl font-bold text-red-600 mt-0.5 block">{nationalCount} Hari</span>
            <span className="text-[11px] text-slate-500">Resmi SKB 3 Menteri</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cuti Bersama</span>
            <span className="text-xl font-bold text-orange-600 mt-0.5 block">{jointLeaveCount} Hari</span>
            <span className="text-[11px] text-slate-500">Pemerintah &amp; Yayasan</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kalender Sekolah</span>
            <span className="text-xl font-bold text-indigo-600 mt-0.5 block">{schoolCalendarCount} Hari</span>
            <span className="text-[11px] text-slate-500">Semester &amp; Jeda Ujian</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Draft Needs Review Banner (if any) */}
      {draftCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block text-amber-950">
                Terdapat {draftCount} Hari Libur Perlu Tinjauan (Draft)
              </span>
              <span className="text-amber-800 text-xs">
                Hari libur berstatus draft <b>tidak berlaku</b> pada modul presensi dan perhitungan cuti sebelum dikonfirmasi oleh HRD.
              </span>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={handleConfirmAllDrafts}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Konfirmasi Semua Draft</span>
            </button>
          )}
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters & Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama hari libur, catatan, atau tanggal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `Semua (${holidays.length})` },
              { id: 'national', label: `Libur Nasional (${nationalCount})` },
              { id: 'joint_leave', label: `Cuti Bersama (${jointLeaveCount})` },
              { id: 'school_semester', label: `Libur Sekolah (${schoolCalendarCount})` },
              { id: 'draft', label: `Draft / Perlu Tinjauan (${draftCount})`, isAlert: draftCount > 0 }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterType === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : tab.isAlert
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Router */}
        {viewMode === 'calendar' ? (
          <div className="p-4">
            <HolidayCalendarView
              holidays={filteredHolidays}
              selectedYear={selectedYear}
              canManage={canManage}
              onConfirmHoliday={handleConfirmHoliday}
              onEditHoliday={(h) => {
                setSelectedHolidayForEdit(h);
                setIsFormModalOpen(true);
              }}
              onDeleteHoliday={handleDeleteHoliday}
            />
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                  <th className="py-3 px-4 min-w-[220px]">Nama Hari Libur</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kategori</th>
                  <th className="py-3 px-4 whitespace-nowrap">Potong Cuti</th>
                  <th className="py-3 px-4 whitespace-nowrap">Berlaku Untuk</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status &amp; Sumber</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                        <span className="font-medium text-xs">Memuat data hari libur...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CalendarIcon className="w-8 h-8 text-slate-300" />
                        <span className="font-bold text-slate-600 text-sm">Tidak Ada Data Hari Libur</span>
                        <span className="text-xs text-slate-400">
                          {searchQuery
                            ? 'Tidak ada hasil yang cocok dengan kata kunci pencarian Anda'
                            : `Belum ada data hari libur yang terdaftar pada tahun ${selectedYear}`}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Tanggal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">
                            {h.start_date === h.end_date || !h.end_date ? h.start_date : `${h.start_date} s/d ${h.end_date}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          {h.date_rule === 'fixed_date' ? 'Fixed (Tetap)' : 'Floating (Bergeser)'}
                        </span>
                      </td>

                      {/* Nama & Catatan */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{h.name}</span>
                        {h.notes && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-sm">
                            {h.notes}
                          </span>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getHolidayTypeBadge(h)}
                      </td>

                      {/* Potong Cuti */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {h.deducts_annual_leave ? (
                          <span className="inline-flex items-center gap-1 text-orange-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                            Memotong Kuota
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Bebas Potong
                          </span>
                        )}
                      </td>

                      {/* Berlaku Untuk */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {h.applies_to === 'schedules' ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-[10px]">
                            {h.target_schedule_ids?.length || 0} Jadwal Target
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {h.school_unit_id ? `Unit ${h.school_unit_id}` : 'Semua Pegawai (Global)'}
                          </span>
                        )}
                      </td>

                      {/* Status & Sumber */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[11px] text-slate-700 capitalize">
                            {h.source === 'academic_calendar' ? 'Kalender Akademik' : h.source === 'copied' ? 'Salin Tahun Lalu' : h.source === 'imported_file' ? 'Impor Berkas' : 'Input Manual'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {h.review_status === 'confirmed' ? 'Dikonfirmasi' : 'Perlu Tinjauan'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canManage && (
                          <div className="inline-flex items-center gap-1">
                            {h.review_status === 'draft_needs_review' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmHoliday(h.id)}
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                                title="Konfirmasi libur ini agar aktif"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHolidayForEdit(h);
                                setIsFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Ubah Data Libur"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Hapus Hari Libur"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <HolidayFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        holiday={selectedHolidayForEdit}
        activeSchoolUnit={activeSchoolUnit}
        onSuccess={(msg) => {
          showToast(msg);
          fetchHolidays();
        }}
      />

      <HolidayImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeSchoolUnit={activeSchoolUnit}
        onSuccess={(msg) => {
          showToast(msg);
          fetchHolidays();
        }}
      />

      <HolidayCopyYearModal
        isOpen={isCopyYearModalOpen}
        onClose={() => setIsCopyYearModalOpen(false)}
        selectedYear={selectedYear}
        activeSchoolUnit={activeSchoolUnit}
        onSuccess={(msg) => {
          showToast(msg);
          fetchHolidays();
        }}
      />
    </div>
  );
}
