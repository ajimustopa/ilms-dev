import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Search,
  Plus,
  Check,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Briefcase,
  Download,
  RotateCcw,
  Calendar,
  Layers,
  Filter,
  DollarSign,
  TrendingUp,
  User,
  MoreVertical,
  Loader2,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import api from '../../../../shared/services/api';
import StatusBadge from '../../../../shared/components/StatusBadge';
import LoadingSkeleton from '../../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../../shared/components/EmptyState';
import ErrorState from '../../../../shared/components/ErrorState';
import OvertimeReconcileModal from './OvertimeReconcileModal';

export default function OvertimeTab({
  currentUser,
  activeSchoolUnit,
  employees = [],
  onRefresh,
  onOpenCreateModal
}) {
  // Data State
  const [overtimes, setOvertimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDayType, setSelectedDayType] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Reconcile Modal State
  const [selectedOtForReconcile, setSelectedOtForReconcile] = useState(null);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);

  // Toast Alert
  const [toastMessage, setToastMessage] = useState(null);

  const isHr = currentUser?.permissions?.includes('kepegawaian.overtimes.manage') ||
               currentUser?.permissions?.includes('kepegawaian.leave_requests.manage') ||
               currentUser?.permissions?.includes('kepegawaian.leave_requests.override') ||
               currentUser?.role === 'super_admin' ||
               currentUser?.role === 'hrd';

  // Fetch Overtimes from Backend
  const fetchOvertimes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeSchoolUnit?.id) params.append('school_unit_id', activeSchoolUnit.id);
      if (monthFilter) params.append('month', monthFilter);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedDayType && selectedDayType !== 'ALL') params.append('day_type', selectedDayType);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      params.append('per_page', '200');

      const res = await api.get(`/kepegawaian/overtimes?${params.toString()}`);
      if (res.data?.success) {
        setOvertimes(res.data.data?.items || res.data.data || []);
      } else {
        setError(res.data?.message || 'Gagal memuat daftar lembur');
      }
    } catch (err) {
      console.error('Failed to fetch overtimes:', err);
      setError(err.response?.data?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvertimes();
  }, [activeSchoolUnit, monthFilter, selectedStatus, selectedDayType]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOvertimes();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered in-memory list (if needed for client-side instant refinement)
  const filteredOvertimes = useMemo(() => {
    return overtimes.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.employee_name || '').toLowerCase().includes(q);
        const matchNip = (item.nip || '').toLowerCase().includes(q);
        const matchSpk = (item.spk_number || '').toLowerCase().includes(q);
        const matchTask = (item.task_description || '').toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchSpk && !matchTask) return false;
      }
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
      if (selectedDayType !== 'ALL' && item.day_type !== selectedDayType) return false;
      return true;
    });
  }, [overtimes, searchQuery, selectedStatus, selectedDayType]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const pending = overtimes.filter(o => o.status === 'pending').length;
    const approved = overtimes.filter(o => o.status === 'approved');

    const totalHours = approved.reduce((acc, curr) => {
      const h = parseFloat(curr.payable_hours != null ? curr.payable_hours : curr.hours) || 0;
      return acc + h;
    }, 0);

    const hasAnyWage = overtimes.some(o => o.estimated_wage != null);
    const totalWage = overtimes.reduce((acc, curr) => {
      const w = parseFloat(curr.estimated_wage) || 0;
      return acc + w;
    }, 0);

    // Calculate employees approaching monthly SOP limit (e.g. >= 20 hours in month)
    const empHoursMap = {};
    overtimes.forEach(o => {
      if (o.status !== 'cancelled' && o.status !== 'rejected') {
        const empId = o.employee_id;
        const h = parseFloat(o.payable_hours != null ? o.payable_hours : o.hours) || 0;
        empHoursMap[empId] = (empHoursMap[empId] || 0) + h;
      }
    });

    const approachingLimitCount = Object.values(empHoursMap).filter(h => h >= 20).length;

    return {
      pending,
      approvedCount: approved.length,
      totalHours: parseFloat(totalHours.toFixed(1)),
      hasAnyWage,
      totalWage,
      avgHourlyWage: totalHours > 0 && totalWage > 0 ? Math.round(totalWage / totalHours) : null,
      approachingLimitCount
    };
  }, [overtimes]);

  // Checkbox selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredOvertimes.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Action Handlers
  const handleApprove = async (id) => {
    try {
      const res = await api.patch(`/kepegawaian/overtimes/${id}/approve`);
      if (res.data?.success) {
        showToast('Penugasan lembur berhasil disetujui');
        fetchOvertimes();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui lembur');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Masukkan alasan penolakan penugasan lembur:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await api.patch(`/kepegawaian/overtimes/${id}/reject`, {
        rejection_reason: reason.trim()
      });
      if (res.data?.success) {
        showToast('Penugasan lembur berhasil ditolak');
        fetchOvertimes();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak lembur');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan penugasan lembur ini?')) return;
    try {
      const res = await api.patch(`/kepegawaian/overtimes/${id}/cancel`, {
        reason: 'Dibatalkan oleh HRD/Pengguna'
      });
      if (res.data?.success) {
        showToast('Penugasan lembur berhasil dibatalkan');
        fetchOvertimes();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan lembur');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      const res = await api.post('/kepegawaian/overtimes/bulk-approve', {
        ids: selectedIds
      });
      if (res.data?.success) {
        showToast(`${selectedIds.length} penugasan lembur berhasil disetujui secara massal`);
        setSelectedIds([]);
        fetchOvertimes();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui lembur massal');
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleOpenReconcile = (ot) => {
    setSelectedOtForReconcile(ot);
    setIsReconcileModalOpen(true);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedDayType('ALL');
    const d = new Date();
    setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleExportCsv = () => {
    if (filteredOvertimes.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const headers = [
      'ID',
      'No SPK',
      'Pegawai',
      'NIP',
      'Tanggal',
      'Jenis Hari',
      'Jam Mulai',
      'Jam Selesai',
      'Durasi Rencana (Jam)',
      'Jam Payable (Jam)',
      'Status Realisasi',
      'Status',
      'Uraian Tugas',
      'Estimasi Upah (Rp)'
    ];

    const rows = filteredOvertimes.map(o => [
      o.id,
      `"${o.spk_number || ''}"`,
      `"${o.employee_name || ''}"`,
      `"${o.nip || ''}"`,
      o.overtime_date,
      o.day_type || 'workday',
      o.start_time || '',
      o.end_time || '',
      o.hours || 0,
      o.payable_hours != null ? o.payable_hours : '',
      o.realization_status || 'pending',
      o.status,
      `"${(o.task_description || '').replace(/"/g, '""')}"`,
      o.estimated_wage != null ? o.estimated_wage : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_lembur_${monthFilter || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDayTypeBadge = (dayType) => {
    if (dayType === 'holiday') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Libur Nasional
        </span>
      );
    }
    if (dayType === 'weekend') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Akhir Pekan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        Hari Kerja
      </span>
    );
  };

  const getRealizationBadge = (item) => {
    const status = item.realization_status;
    if (status === 'matched') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Sesuai presensi
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Sebagian
        </span>
      );
    }
    if (status === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          Manual HRD
        </span>
      );
    }
    if (status === 'no_attendance') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Tanpa Presensi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Belum diverifikasi
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Menunggu Persetujuan */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Menunggu Persetujuan
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-on-surface">{metrics.pending}</span>
                <span className="text-xs text-on-surface-variant">berkas</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
              Perlu verifikasi
            </span>
            <span className="text-xs text-on-surface-variant truncate">Butuh tindakan approver</span>
          </div>
        </div>

        {/* Card 2: Total Jam Lembur */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Total Jam Lembur
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-secondary">{metrics.totalHours}</span>
                <span className="text-xs text-on-surface-variant">jam</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-1.5 text-primary text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{metrics.approvedCount} penugasan disetujui</span>
          </div>
        </div>

        {/* Card 3: Estimasi Biaya Lembur */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Estimasi Biaya Lembur
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-on-surface">
                  {metrics.hasAnyWage && metrics.totalWage > 0
                    ? `Rp ${metrics.totalWage.toLocaleString('id-ID')}`
                    : '—'}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-1.5 text-xs text-on-surface-variant">
            {metrics.avgHourlyWage ? (
              <>
                <span>Rata-rata: </span>
                <strong className="text-on-surface">Rp {metrics.avgHourlyWage.toLocaleString('id-ID')} / jam</strong>
              </>
            ) : (
              <span>Tarif lembur belum diisi</span>
            )}
          </div>
        </div>

        {/* Card 4: Mendekati Batas Jam */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Mendekati Batas Jam
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-amber-700">{metrics.approachingLimitCount}</span>
                <span className="text-xs text-on-surface-variant">pegawai</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
              Maks SOP Yayasan
            </span>
            <span className="text-xs text-on-surface-variant truncate">Batas 18j/mgg &amp; 72j/bln</span>
          </div>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/35 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, SPK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface placeholder:text-outline focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-all"
            />
          </div>

          {/* Month Selector */}
          <div className="relative">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-colors"
            />
          </div>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-colors"
          >
            <option value="ALL">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="rejected">Ditolak (Rejected)</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          {/* Day Type Selector */}
          <select
            value={selectedDayType}
            onChange={(e) => setSelectedDayType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface focus:border-secondary focus:ring-1 focus:ring-secondary/20 outline-none transition-colors"
          >
            <option value="ALL">Semua Jenis Hari</option>
            <option value="workday">Hari Kerja</option>
            <option value="weekend">Akhir Pekan</option>
            <option value="holiday">Libur Nasional</option>
          </select>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-9 px-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-xs font-semibold transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tugaskan Lembur</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-secondary/20 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-all animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-on-secondary text-xs">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-on-surface">
              <strong className="font-bold text-secondary">{selectedIds.length} penugasan lembur</strong> dipilih dari tabel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {isBulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Setujui Terpilih</span>
            </button>
            <div className="h-4 w-[1px] bg-outline-variant/40" />
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface text-xs transition-colors font-medium"
            >
              Batalkan Seleksi
            </button>
          </div>
        </div>
      )}

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/35 shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8">
            <LoadingSkeleton count={5} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchOvertimes} />
        ) : filteredOvertimes.length === 0 ? (
          <EmptyState
            title="Tidak ada penugasan lembur"
            description="Belum ada data lembur untuk filter dan periode yang dipilih."
            actionLabel="+ Buat Penugasan Lembur"
            onAction={onOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/35 text-on-surface-variant uppercase font-bold tracking-wider text-[11px]">
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredOvertimes.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary/20 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Pegawai</th>
                  <th className="px-4 py-3">Tanggal &amp; Jenis Hari</th>
                  <th className="px-4 py-3">Jam Rencana</th>
                  <th className="px-4 py-3">Realisasi Kehadiran</th>
                  <th className="px-3 py-3">Payable</th>
                  <th className="px-4 py-3 min-w-[200px]">Uraian Tugas</th>
                  <th className="px-4 py-3 text-right">Estimasi Upah</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-on-surface font-normal">
                {filteredOvertimes.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const planHours = parseFloat(item.hours) || 0;
                  const payable = item.payable_hours != null ? parseFloat(item.payable_hours) : null;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-secondary-fixed/15 hover:bg-secondary-fixed/25' : 'hover:bg-surface-container-low/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary/20 cursor-pointer"
                        />
                      </td>

                      {/* Pegawai */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-xs flex items-center justify-center shrink-0">
                            {(item.employee_name || 'P').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-on-surface truncate">
                              {item.employee_name || 'Pegawai'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-outline text-[11px] truncate">
                                {item.nip ? `NIP: ${item.nip}` : `ID: ${item.employee_id}`}
                              </span>
                              {item.spk_number && (
                                <span className="px-1.5 py-0.2 rounded bg-surface-container text-[10px] text-on-surface-variant font-medium">
                                  {item.spk_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tanggal & Jenis Hari */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-semibold text-on-surface">{item.overtime_date}</span>
                          {getDayTypeBadge(item.day_type)}
                        </div>
                      </td>

                      {/* Jam Rencana */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-on-surface">
                            {item.start_time && item.end_time
                              ? `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`
                              : 'Sesuai Tugas'}
                          </span>
                          <span className="text-outline text-[11px]">({planHours} jam)</span>
                        </div>
                      </td>

                      {/* Realisasi Kehadiran */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-medium text-on-surface">
                            {item.start_time && item.end_time
                              ? `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`
                              : '—'}
                          </span>
                          {getRealizationBadge(item)}
                        </div>
                      </td>

                      {/* Durasi Payable */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-bold text-on-surface">
                          {payable != null ? `${payable} jam` : '—'}
                        </span>
                      </td>

                      {/* Uraian Tugas */}
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 leading-snug text-on-surface-variant max-w-xs" title={item.task_description}>
                          {item.task_description || '—'}
                        </p>
                      </td>

                      {/* Estimasi Upah */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-on-surface">
                          {item.estimated_wage != null
                            ? `Rp ${Number(item.estimated_wage).toLocaleString('id-ID')}`
                            : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {item.status === 'pending' && isHr && (
                            <>
                              <button
                                onClick={() => handleApprove(item.id)}
                                className="p-1 rounded hover:bg-emerald-100 text-primary transition-colors"
                                title="Setujui Penugasan"
                                type="button"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(item.id)}
                                className="p-1 rounded hover:bg-rose-100 text-rose-600 transition-colors"
                                title="Tolak Penugasan"
                                type="button"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {item.status === 'approved' && isHr && (
                            <button
                              onClick={() => handleOpenReconcile(item)}
                              className="px-2.5 py-1 rounded-md border border-secondary/40 text-secondary hover:bg-secondary-fixed/20 text-xs font-semibold transition-colors"
                              title="Rekonsiliasi Absensi"
                              type="button"
                            >
                              Rekonsiliasi
                            </button>
                          )}

                          {['pending', 'approved'].includes(item.status) && (
                            <button
                              onClick={() => handleCancel(item.id)}
                              className="p-1 rounded hover:bg-surface-container text-outline hover:text-rose-600 transition-colors"
                              title="Batalkan Penugasan"
                              type="button"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation Modal */}
      <OvertimeReconcileModal
        isOpen={isReconcileModalOpen}
        onClose={() => {
          setIsReconcileModalOpen(false);
          setSelectedOtForReconcile(null);
        }}
        overtime={selectedOtForReconcile}
        onSuccess={(msg) => {
          showToast(msg);
          fetchOvertimes();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
