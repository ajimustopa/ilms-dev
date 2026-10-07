import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarRange,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  FileText,
  AlertTriangle,
  User,
  Building,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  Download,
  Calendar as CalendarIcon,
  Inbox,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Loader2,
  Paperclip,
  RefreshCw,
  FileDown
} from 'lucide-react';
import StatusBadge from '../../../../shared/components/StatusBadge';
import LoadingSkeleton from '../../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../../shared/components/EmptyState';
import ErrorState from '../../../../shared/components/ErrorState';
import api from '../../../../shared/services/api';

import LeaveDetailDrawer from './LeaveDetailDrawer';
import LeaveReclassifyModal from './LeaveReclassifyModal';
import LeaveReassignModal from './LeaveReassignModal';
import LeaveBulkActionModal from './LeaveBulkActionModal';

export default function LeaveRequestsTab({
  currentUser,
  activeSchoolUnit,
  leaveTypes = [],
  employees = [],
  onOpenCreateModal,
  onShowToast
}) {
  // Active Queue: 'all', 'inbox', 'needs_review'
  const [queueTab, setQueueTab] = useState('all');

  // Table Data State
  const [leaves, setLeaves] = useState([]);
  const [inboxLeaves, setInboxLeaves] = useState([]);
  const [needsReviewLeaves, setNeedsReviewLeaves] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Summary Metrics State
  const [metrics, setMetrics] = useState({
    pending: 0,
    approvedMonth: 0,
    rejectedMonth: 0,
    onLeaveToday: 0,
    upcoming7Days: 0,
    missingDocuments: 0
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [datePreset, setDatePreset] = useState('month'); // 'all', 'month', 'next_month', 'semester'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Drawer State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null); // 'approve' | 'reject' | null

  const isHr = currentUser?.permissions?.includes('kepegawaian.leave_requests.manage') ||
               currentUser?.permissions?.includes('kepegawaian.leave_requests.override') ||
               currentUser?.role === 'super_admin';

  // Calculate Date Range from Presets
  const activeDateRange = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed

    if (datePreset === 'month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: `${start.toLocaleDateString('id-ID', { month: 'short' })} ${y}`
      };
    } else if (datePreset === 'next_month') {
      const start = new Date(y, m + 1, 1);
      const end = new Date(y, m + 2, 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: `${start.toLocaleDateString('id-ID', { month: 'short' })} ${y}`
      };
    } else if (datePreset === 'semester') {
      // Semester 1: Jul-Des, Semester 2: Jan-Jun
      const isSem1 = m >= 6;
      const start = isSem1 ? new Date(y, 6, 1) : new Date(y, 0, 1);
      const end = isSem1 ? new Date(y, 11, 31) : new Date(y, 5, 30);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        label: isSem1 ? `Sem 1 (${y})` : `Sem 2 (${y})`
      };
    }
    return {
      start: customStartDate || '',
      end: customEndDate || '',
      label: 'Kustom'
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch Leave Data
  const fetchLeavesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeSchoolUnit?.id) params.append('school_unit_id', activeSchoolUnit.id);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedType) params.append('leave_type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      if (activeDateRange.start) params.append('start_date', activeDateRange.start);
      if (activeDateRange.end) params.append('end_date', activeDateRange.end);

      params.append('page', currentPage);
      params.append('per_page', perPage);

      let endpoint = '/kepegawaian/leave-requests';
      if (queueTab === 'inbox') endpoint = '/kepegawaian/leave-requests/inbox';
      if (queueTab === 'needs_review') endpoint = '/kepegawaian/leave-requests/needs-review';

      const res = await api.get(`${endpoint}?${params.toString()}`);
      if (res.data?.success) {
        const items = res.data.data || [];
        setLeaves(items);
        setTotalItems(res.data.total || items.length);

        // Compute metrics from dataset
        const todayStr = new Date().toISOString().slice(0, 10);
        const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

        setMetrics({
          pending: items.filter(l => l.status === 'pending').length,
          approvedMonth: items.filter(l => l.status === 'approved').length,
          rejectedMonth: items.filter(l => l.status === 'rejected').length,
          onLeaveToday: items.filter(l => l.status === 'approved' && l.start_date <= todayStr && l.end_date >= todayStr).length,
          upcoming7Days: items.filter(l => l.status === 'approved' && l.start_date > todayStr && l.start_date <= next7DaysStr).length,
          missingDocuments: items.filter(l => l.attachment_rule === 'required' && !l.has_attachment).length
        });
      }
    } catch (err) {
      console.error('Fetch leaves error:', err);
      setError('Gagal memuat data pengajuan cuti. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Queue Counts (Inbox and Needs-Review)
  const fetchQueueCounts = async () => {
    try {
      const [inboxRes, reviewRes] = await Promise.all([
        api.get('/kepegawaian/leave-requests/inbox?per_page=1'),
        api.get('/kepegawaian/leave-requests/needs-review?per_page=1')
      ]);
      if (inboxRes.data?.success) setInboxLeaves(inboxRes.data.data || []);
      if (reviewRes.data?.success) setNeedsReviewLeaves(reviewRes.data.data || []);
    } catch (err) {
      console.error('Fetch queue counts error:', err);
    }
  };

  useEffect(() => {
    fetchLeavesData();
    fetchQueueCounts();
    setSelectedIds([]);
  }, [queueTab, activeSchoolUnit, searchQuery, selectedType, selectedStatus, datePreset, customStartDate, customEndDate, currentPage, perPage]);

  // Open Detail Drawer
  const handleOpenDetail = async (leaveItem) => {
    try {
      const res = await api.get(`/kepegawaian/leave-requests/${leaveItem.id}`);
      if (res.data?.success) {
        setSelectedLeave(res.data.data);
      } else {
        setSelectedLeave(leaveItem);
      }
    } catch (e) {
      setSelectedLeave(leaveItem);
    }
    setIsDrawerOpen(true);
  };

  // Quick Inline Approve
  const handleQuickApprove = async (leaveItem) => {
    try {
      const res = await api.post(`/kepegawaian/leave-requests/${leaveItem.id}/approve`, {
        comment: 'Disetujui cepat melalui tabel'
      });
      if (res.data?.success) {
        if (onShowToast) onShowToast('Permohonan cuti berhasil disetujui');
        fetchLeavesData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui pengajuan');
    }
  };

  // Quick Inline Reject
  const handleQuickReject = async (leaveItem) => {
    const reason = window.prompt('Masukkan alasan penolakan permohonan cuti:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await api.post(`/kepegawaian/leave-requests/${leaveItem.id}/reject`, {
        rejection_reason: reason.trim()
      });
      if (res.data?.success) {
        if (onShowToast) onShowToast('Permohonan cuti ditolak');
        fetchLeavesData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak pengajuan');
    }
  };

  // Toggle Row Selection
  const toggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedIds.length === leaves.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leaves.map(l => l.id));
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedStatus('');
    setDatePreset('month');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  // Export CSV Helper
  const handleExportCsv = () => {
    if (leaves.length === 0) {
      alert('Tidak ada data yang dapat diekspor');
      return;
    }

    const headers = ['ID', 'Pegawai', 'NIP', 'Jenis Cuti', 'Mulai', 'Selesai', 'Durasi (Hari)', 'Status', 'Alasan'];
    const rows = leaves.map(l => [
      l.id,
      `"${l.employee_name || ''}"`,
      `"${l.nip || ''}"`,
      `"${l.leave_type_name || l.leave_type}"`,
      l.start_date,
      l.end_date,
      l.duration_days,
      l.status,
      `"${(l.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pengajuan_cuti_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4">
      {/* 1. Summary Metric Cards (6 Cards matching precision design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Menunggu Persetujuan */}
        <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 line-clamp-1">Menunggu Persetujuan</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.pending}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Perlu tindakan
            </span>
          </div>
        </div>

        {/* Card 2: Disetujui Bulan Ini */}
        <div className="bg-white rounded-xl p-3.5 border border-emerald-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800 line-clamp-1">Disetujui Periode Ini</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.approvedMonth}</span>
            <span className="text-[11px] text-slate-500 font-medium">{activeDateRange.label}</span>
          </div>
        </div>

        {/* Card 3: Ditolak Bulan Ini */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 line-clamp-1">Ditolak Periode Ini</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.rejectedMonth}</span>
            <span className="text-[11px] text-slate-400">Total berkas</span>
          </div>
        </div>

        {/* Card 4: Sedang Cuti Hari Ini */}
        <div className="bg-white rounded-xl p-3.5 border border-blue-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800 line-clamp-1">Sedang Cuti Hari Ini</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.onLeaveToday}</span>
            <span className="text-[11px] text-blue-600 font-medium">Pegawai aktif</span>
          </div>
        </div>

        {/* Card 5: Akan Cuti 7 Hari ke Depan */}
        <div className="bg-white rounded-xl p-3.5 border border-purple-200/70 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-800 line-clamp-1">Akan Cuti 7 Hari</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.upcoming7Days}</span>
            <span className="text-[11px] text-purple-600 font-medium">Terjadwal</span>
          </div>
        </div>

        {/* Card 6: Perlu Dokumen Pendukung */}
        <div className="bg-white rounded-xl p-3.5 border border-red-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-800 line-clamp-1">Perlu Lampiran</span>
            <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Paperclip className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.missingDocuments}</span>
            <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
              Belum lengkap
            </span>
          </div>
        </div>
      </div>

      {/* 2. Queue Tabs (Semua / Kotak Masuk / Perlu Tinjauan) */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setQueueTab('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              queueTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Semua Pengajuan</span>
          </button>

          <button
            onClick={() => { setQueueTab('inbox'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              queueTab === 'inbox'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Kotak Masuk Persetujuan</span>
            {inboxLeaves.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-indigo-700 font-bold text-[10px]">
                {inboxLeaves.length}
              </span>
            )}
          </button>

          {isHr && (
            <button
              onClick={() => { setQueueTab('needs_review'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                queueTab === 'needs_review'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Perlu Tinjauan Khusus</span>
              {needsReviewLeaves.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-800 font-bold text-[10px]">
                  {needsReviewLeaves.length}
                </span>
              )}
            </button>
          )}
        </div>

        <button
          onClick={fetchLeavesData}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Muat Ulang Tabel"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. Filter Bar Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai, NIP, atau alasan..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors outline-none"
            />
          </div>

          {/* Jenis Cuti Dropdown */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:border-emerald-500 outline-none"
            >
              <option value="">Semua Jenis Cuti</option>
              {leaveTypes.map(t => (
                <option key={t.id || t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:border-emerald-500 outline-none"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="rejected">Ditolak (Rejected)</option>
              <option value="revision_requested">Perlu Revisi</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setDatePreset('month')}
              className={`flex-1 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                datePreset === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDatePreset('next_month')}
              className={`flex-1 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                datePreset === 'next_month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Depan
            </button>
            <button
              onClick={() => setDatePreset('semester')}
              className={`flex-1 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                datePreset === 'semester' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester
            </button>
          </div>
        </div>

        {/* Filter Bar Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-[11px]">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Periode Aktif:</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {activeDateRange.start || 'Semua'} s.d {activeDateRange.end || 'Semua'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs transition-colors"
            >
              Reset Filter
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bulk Action Floating Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
              {selectedIds.length}
            </span>
            <span className="font-medium">permohonan dipilih dari tabel</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkActionType('approve')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Setujui Terpilih</span>
            </button>
            <button
              onClick={() => setBulkActionType('reject')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tolak Terpilih</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs underline"
            >
              Batalkan Seleksi
            </button>
          </div>
        </div>
      )}

      {/* 5. Server-Side Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8">
            <LoadingSkeleton count={6} />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState message={error} onRetry={fetchLeavesData} />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <CalendarRange className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Tidak ada permohonan cuti / izin ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Gunakan tombol "Ajukan Cuti / Izin" untuk membuat permohonan baru atau sesuaikan filter pencarian.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-4 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700"
            >
              Ajukan Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] select-none sticky top-0 z-10">
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leaves.length && leaves.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </th>
                  <th className="px-3 py-3 min-w-[200px]">PEGAWAI</th>
                  <th className="px-3 py-3 min-w-[140px]">JENIS CUTI</th>
                  <th className="px-3 py-3 min-w-[150px]">PERIODE TANGGAL</th>
                  <th className="px-3 py-3 min-w-[180px]">ALASAN</th>
                  <th className="px-3 py-3 min-w-[100px] text-center">LAMPIRAN</th>
                  <th className="px-3 py-3 min-w-[100px]">STATUS</th>
                  <th className="px-3 py-3 min-w-[130px]">TAHAP APPROVAL</th>
                  <th className="px-3 py-3 min-w-[110px] text-right pr-4">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => {
                  const isSelected = selectedIds.includes(leave.id);
                  const isPending = leave.status === 'pending';
                  const steps = leave.approval_steps || [];

                  return (
                    <tr
                      key={leave.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(leave.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                      </td>

                      {/* Pegawai */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {(leave.employee_name || 'P').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 truncate">
                              {leave.employee_name || 'Pegawai'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {leave.nip || `ID:${leave.employee_id}`}
                            </span>
                            <span className="text-[10px] text-slate-600 truncate">
                              {leave.position_name || 'Staf Pegawai'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jenis Cuti */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[11px] w-fit border border-slate-200">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: leave.leave_type_color || '#059669' }}
                            />
                            {leave.leave_type_name || leave.leave_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {leave.count_mode === 'calendar_days' ? 'Hari Kalender' : 'Hari Kerja'}
                          </span>
                        </div>
                      </td>

                      {/* Periode Tanggal */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-xs">
                            {leave.start_date} s.d {leave.end_date}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {leave.duration_days} Hari
                          </span>
                        </div>
                      </td>

                      {/* Alasan (with privacy check) */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 max-w-xs">
                          <p className="text-slate-700 text-xs truncate" title={leave.reason}>
                            {leave.reason || '-'}
                          </p>
                          {leave.has_overlap && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-semibold w-fit border border-rose-200">
                              ⚠️ Bentrok Cuti Seunit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lampiran */}
                      <td className="px-3 py-3 text-center">
                        {leave.has_attachment ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            <span>Ada</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <StatusBadge status={leave.status} />
                      </td>

                      {/* Tahap Approval (Visual Mini Step Dots) */}
                      <td className="px-3 py-3">
                        {steps.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {steps.map((st, i) => (
                              <React.Fragment key={st.step_no || i}>
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    st.status === 'approved'
                                      ? 'bg-emerald-600 text-white'
                                      : st.status === 'pending'
                                      ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-100'
                                      : st.status === 'rejected'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                  title={`Langkah ${st.step_no}: ${st.approver_source} (${st.status})`}
                                >
                                  {st.status === 'approved' ? '✓' : st.status === 'rejected' ? '✗' : st.step_no}
                                </span>
                                {i < steps.length - 1 && (
                                  <div
                                    className={`w-2 h-0.5 ${
                                      st.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                  />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Aksi Controls */}
                      <td className="px-3 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(leave)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isPending && isHr && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(leave)}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Setujui Cepat"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuickReject(leave)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Tolak"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
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

        {/* 6. Table Footer / Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-slate-900 font-bold">{leaves.length}</strong> dari{' '}
              <strong className="text-slate-900 font-bold">{totalItems}</strong> pengajuan
            </span>
            <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Per halaman:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 rounded border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &lt; Sebelumnya
            </button>
            <span className="px-3 py-1 font-bold text-slate-900 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={leaves.length < perPage || currentPage * perPage >= totalItems}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Berikutnya &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <LeaveDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        leave={selectedLeave}
        currentUser={currentUser}
        onActionSuccess={(msg) => {
          if (onShowToast) onShowToast(msg);
          fetchLeavesData();
        }}
        onOpenReclassifyModal={(leaveItem) => {
          setSelectedLeave(leaveItem);
          setIsReclassifyOpen(true);
        }}
        onOpenReassignModal={(leaveItem) => {
          setSelectedLeave(leaveItem);
          setIsReassignOpen(true);
        }}
      />

      {/* HR Reclassify Modal */}
      <LeaveReclassifyModal
        isOpen={isReclassifyOpen}
        onClose={() => setIsReclassifyOpen(false)}
        leave={selectedLeave}
        leaveTypes={leaveTypes}
        onSuccess={(msg) => {
          if (onShowToast) onShowToast(msg);
          fetchLeavesData();
        }}
      />

      {/* HR Reassign Approver Modal */}
      <LeaveReassignModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        leave={selectedLeave}
        employees={employees}
        onSuccess={(msg) => {
          if (onShowToast) onShowToast(msg);
          fetchLeavesData();
        }}
      />

      {/* Bulk Action Modal */}
      <LeaveBulkActionModal
        isOpen={Boolean(bulkActionType)}
        onClose={() => setBulkActionType(null)}
        actionType={bulkActionType}
        selectedIds={selectedIds}
        onSuccess={(msg) => {
          if (onShowToast) onShowToast(msg);
          setSelectedIds([]);
          fetchLeavesData();
        }}
      />
    </div>
  );
}
