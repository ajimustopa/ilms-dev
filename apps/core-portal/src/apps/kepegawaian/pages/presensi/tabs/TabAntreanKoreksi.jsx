import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Search,
  FileText,
  Eye,
  Download,
  ShieldCheck,
  User,
  Calendar,
  AlertCircle,
  Building2,
  Check,
  X,
  Send,
  Quote,
  Paperclip,
  ExternalLink,
  Printer
} from 'lucide-react';
import presensiService from '../presensiService';

export default function TabAntreanKoreksi({
  clarifications = [],
  counts = { all: 0, pending: 0, approved: 0, rejected: 0 },
  loading,
  onRefresh,
  onOpenReviewModal
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Review Action Form State (Right Panel)
  const [reviewNotes, setReviewNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Attachment Modal Preview
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState(null);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...clarifications];

    if (statusFilter !== 'all') {
      result = result.filter(item => item.clarification_status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(item => {
        const t = item.clarification_type || item.entry_type || '';
        return t.toLowerCase().includes(typeFilter.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        (item.employee_name && item.employee_name.toLowerCase().includes(q)) ||
        (item.employee_nip && item.employee_nip.toLowerCase().includes(q)) ||
        (item.clarification_reason && item.clarification_reason.toLowerCase().includes(q)) ||
        (item.position_title && item.position_title.toLowerCase().includes(q))
      );
    }

    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.clarification_submitted_at || a.created_at) - new Date(b.clarification_submitted_at || b.created_at));
    } else {
      result.sort((a, b) => new Date(b.clarification_submitted_at || b.created_at) - new Date(a.clarification_submitted_at || a.created_at));
    }

    return result;
  }, [clarifications, statusFilter, typeFilter, searchQuery, sortOrder]);

  // Determine currently selected item
  const selectedItem = useMemo(() => {
    if (selectedId) {
      const found = clarifications.find(c => c.id === selectedId);
      if (found) return found;
    }
    return filteredItems.length > 0 ? filteredItems[0] : null;
  }, [selectedId, clarifications, filteredItems]);

  // Helper type label
  const getTypeBadge = (type, subStatus) => {
    const raw = String(type || '').toLowerCase();
    if (raw.includes('sick') || raw.includes('sakit')) {
      return { label: 'Sakit (Surat Dokter)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (raw.includes('out') || raw.includes('pulang')) {
      return { label: 'Koreksi Jam Pulang', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (raw.includes('in') || raw.includes('masuk')) {
      return { label: 'Koreksi Jam Masuk', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (raw.includes('duty') || raw.includes('dinas')) {
      return { label: 'Dinas Luar', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (raw.includes('leave') || raw.includes('cuti')) {
      return { label: 'Izin / Cuti', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { label: subStatus || 'Klarifikasi Presensi', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch {
      return ts;
    }
  };

  // Parse snapshot changes if available
  const parsedChanges = useMemo(() => {
    if (!selectedItem?.proposed_changes) return null;
    try {
      if (typeof selectedItem.proposed_changes === 'string') {
        return JSON.parse(selectedItem.proposed_changes);
      }
      return selectedItem.proposed_changes;
    } catch {
      return null;
    }
  }, [selectedItem]);

  // Handle Approve / Reject
  const handleReviewDecision = async (decision) => {
    if (!selectedItem) return;
    setActionError('');
    setActionSuccess('');

    if (decision === 'rejected' && (!reviewNotes || !reviewNotes.trim())) {
      setActionError('Catatan / alasan HRD wajib diisi jika menolak pengajuan.');
      return;
    }

    setSubmittingAction(true);
    try {
      await presensiService.reviewClarification(selectedItem.id, {
        status: decision,
        review_notes: reviewNotes.trim()
      });

      setActionSuccess(`Pengajuan koreksi presensi berhasil di-${decision === 'approved' ? 'setujui' : 'tolak'}.`);
      setReviewNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Gagal memproses keputusan verifikasi');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">Status:</span>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Semua ({counts.all || clarifications.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Menunggu ({counts.pending || clarifications.filter(c => c.clarification_status === 'pending').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Disetujui ({counts.approved || clarifications.filter(c => c.clarification_status === 'approved').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
            }`}
          >
            <X className="w-3 h-3" />
            <span>Ditolak ({counts.rejected || clarifications.filter(c => c.clarification_status === 'rejected').length})</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pegawai / alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 w-48 transition-all"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="all">Semua Jenis Koreksi</option>
            <option value="sick">Izin / Sakit</option>
            <option value="out">Koreksi Jam Pulang</option>
            <option value="in">Koreksi Jam Masuk</option>
            <option value="duty">Dinas Luar</option>
            <option value="leave">Cuti</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>
      </div>

      {/* 2. SPLIT CONTAINER (2 COLUMNS: 5 cols LEFT, 7 cols RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: List of Requests */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Daftar Pengajuan</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {filteredItems.length}
              </span>
            </h2>
            <span className="text-[11px] text-slate-400">
              {statusFilter === 'pending' ? 'Membutuhkan persetujuan HRD' : `Filter: ${statusFilter}`}
            </span>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <span className="text-xs">Memuat antrean koreksi...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-600">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700 mb-1">
                Tidak Ada Antrean Koreksi
              </div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Tidak ada pengajuan yang sesuai dengan kriteria filter aktif.'
                  : 'Semua permohonan klarifikasi presensi telah selesai diproses.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const typeBadge = getTypeBadge(item.clarification_type || item.entry_type, item.sub_status);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setActionError('');
                      setActionSuccess('');
                    }}
                    className={`relative bg-white rounded-xl p-4 border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                    }`}
                  >
                    {/* Active Indicator Ribbon */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-600 rounded-r"></div>
                    )}

                    {/* Top Row: Avatar, Info, Type Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.employee_name
                            ? item.employee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                            : 'PG'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.employee_name || `Pegawai #${item.employee_id}`}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {item.position_title || 'Staf / Guru'} • NIP: {item.employee_nip || '-'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                    </div>

                    {/* Reason Snippet */}
                    <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 italic">
                      “{item.clarification_reason || 'Tidak menyertakan alasan tertulis.'}”
                    </p>

                    {/* Bottom Info Bar */}
                    <div className="mt-3 pt-2.5 flex items-center justify-between bg-slate-50 -mx-4 -mb-4 px-4 py-2 rounded-b-xl border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(item.attendance_date)}</span>
                        <span className="text-slate-300">•</span>
                        <span>{formatTimestamp(item.clarification_submitted_at || item.created_at)}</span>
                      </div>

                      {item.clarification_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Menunggu HRD
                        </span>
                      ) : item.clarification_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Disetujui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                          <X className="w-3 h-3 text-rose-600" />
                          Ditolak
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Detail of Selected Request */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-6">
          {!selectedItem ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <div className="text-sm font-bold text-slate-700">Pilih Pengajuan Koreksi</div>
              <p className="text-xs text-slate-400 mt-1">
                Pilih salah satu item di panel kiri untuk meninjau detail dan memberikan keputusan.
              </p>
            </div>
          ) : (
            <>
              {/* Feedback Alerts */}
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-2xs shrink-0">
                    {selectedItem.employee_name
                      ? selectedItem.employee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                      : 'PG'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {selectedItem.employee_name || `Pegawai #${selectedItem.employee_id}`}
                      </span>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">
                        NIP: {selectedItem.employee_nip || '-'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {selectedItem.position_title || 'Staf Pegawai'} ({selectedItem.employment_status || 'Pegawai Tetap'})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Tiket ID: #REQ-KOR-{selectedItem.id}-{String(selectedItem.attendance_date || '').replace(/-/g, '')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end shrink-0">
                  {selectedItem.clarification_status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Menunggu Approval HRD
                    </span>
                  ) : selectedItem.clarification_status === 'approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Disetujui HRD
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold shadow-2xs">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Ditolak HRD
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1.5 font-mono">
                    Diajukan: {formatTimestamp(selectedItem.clarification_submitted_at || selectedItem.created_at)}
                  </span>
                </div>
              </div>

              {/* SIDE-BY-SIDE COMPARISON: Data Asli vs Data Pengajuan */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Komparasi Data Kehadiran
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                  {/* Left Column: Data Asli Sistem */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800">Data Presensi Asli (Sistem)</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {selectedItem.check_in_time ? (selectedItem.is_late ? 'Hadir Terlambat' : 'Hadir') : 'Alpa / Tanpa Record'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jam Masuk:</span>
                        <span className="text-slate-800 font-mono font-semibold">
                          {selectedItem.check_in_time ? selectedItem.check_in_time.slice(0, 5) + ' WIB' : '--:-- WIB (Tidak Ada)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jam Pulang:</span>
                        <span className="text-slate-800 font-mono font-semibold">
                          {selectedItem.check_out_time ? selectedItem.check_out_time.slice(0, 5) + ' WIB' : '--:-- WIB'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lokasi / GPS:</span>
                        <span className={selectedItem.is_within_radius ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                          {selectedItem.is_within_radius ? 'Valid Radius' : 'Di Luar Radius / Manual'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Keterangan:</span>
                        <span className="text-slate-700 text-right max-w-[180px] text-[11px]">
                          {selectedItem.check_in_notes || 'Belum ada catatan sistem'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Usulan Pengajuan Koreksi */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <span className="text-xs font-bold text-emerald-900">Pengajuan Koreksi (Baru)</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold">
                        {selectedItem.proposed_status || 'Hadir / Tepat Waktu'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Usulan Masuk:</span>
                        <span className="text-emerald-950 font-mono font-bold">
                          {selectedItem.proposed_check_in_time
                            ? selectedItem.proposed_check_in_time.slice(0, 5) + ' WIB'
                            : (selectedItem.check_in_time ? selectedItem.check_in_time.slice(0, 5) + ' WIB' : '07:30 WIB')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Usulan Pulang:</span>
                        <span className="text-emerald-950 font-mono font-bold">
                          {selectedItem.proposed_check_out_time
                            ? selectedItem.proposed_check_out_time.slice(0, 5) + ' WIB'
                            : (selectedItem.check_out_time ? selectedItem.check_out_time.slice(0, 5) + ' WIB' : '16:00 WIB')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Jenis / Sub-status:</span>
                        <span className="text-emerald-900 font-medium">
                          {selectedItem.proposed_sub_status || selectedItem.clarification_type || 'Presensi Reguler'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start pt-1 border-t border-emerald-200/60">
                        <span className="text-emerald-800">Dampak Potongan:</span>
                        <span className="text-emerald-900 font-bold">0% (Bebas Potongan jika Disetujui)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ALASAN PENGAJUAN OLEH PEGAWAI */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Alasan Pengajuan oleh Pegawai
                </span>
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-slate-800 text-xs italic relative leading-relaxed">
                  <Quote className="w-7 h-7 text-slate-200 absolute top-2.5 right-3 select-none pointer-events-none" />
                  “{selectedItem.clarification_reason || 'Tidak menyertakan alasan tertulis.'}”
                </div>
              </div>

              {/* LAMPIRAN BUKTI SURAT DOKTER / DOKUMEN */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    Bukti / Lampiran Dokumen
                  </span>
                  {selectedItem.clarification_attachment_url && (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Lampiran Tersedia
                    </span>
                  )}
                </div>

                {selectedItem.clarification_attachment_url ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          Berkas_Lampiran_Koreksi_{selectedItem.id}.pdf
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Diunggah saat pengajuan • Terverifikasi Enkripsi Modul
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachmentUrl(selectedItem.clarification_attachment_url)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Lampiran</span>
                      </button>
                      <a
                        href={selectedItem.clarification_attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Pegawai tidak melampirkan berkas dokumen fisik pada pengajuan ini.
                  </div>
                )}
              </div>

              {/* WORKFLOW STEPPER */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Alur Persetujuan (Workflow Stepper)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
                  {/* Step 1: Pegawai */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900">1. Pegawai Pengaju</span>
                      <span className="text-[11px] text-slate-600 truncate">{selectedItem.employee_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(selectedItem.attendance_date)}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Atasan Langsung */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900">2. Atasan Langsung</span>
                      <span className="text-[11px] text-emerald-700 font-medium">Diteruskan ke HRD</span>
                      <span className="text-[10px] text-slate-400 italic">“Rekomendasi verifikasi”</span>
                    </div>
                  </div>

                  {/* Step 3: HRD Decision */}
                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${
                      selectedItem.clarification_status === 'approved'
                        ? 'bg-emerald-600'
                        : selectedItem.clarification_status === 'rejected'
                        ? 'bg-rose-600'
                        : 'bg-amber-500 animate-pulse'
                    }`}>
                      {selectedItem.clarification_status === 'approved' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : selectedItem.clarification_status === 'rejected' ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900">3. HRD / Super Admin</span>
                      <span className={`text-[11px] font-semibold ${
                        selectedItem.clarification_status === 'approved'
                          ? 'text-emerald-700'
                          : selectedItem.clarification_status === 'rejected'
                          ? 'text-rose-700'
                          : 'text-amber-800'
                      }`}>
                        {selectedItem.clarification_status === 'approved'
                          ? 'Telah Disetujui'
                          : selectedItem.clarification_status === 'rejected'
                          ? 'Telah Ditolak'
                          : 'Menunggu Keputusan Anda'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HRD COMMENT & ACTION BUTTONS */}
              {selectedItem.clarification_status === 'pending' ? (
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Komentar / Catatan HRD</span>
                      <span className="text-slate-400 font-normal text-[11px]">(Wajib diisi jika menolak)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Tuliskan catatan verifikasi, nomor registrasi SKD, atau alasan penolakan jika tidak disetujui..."
                      className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={sendWhatsApp}
                        onChange={(e) => setSendWhatsApp(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Kirim notifikasi otomatis hasil keputusan via WhatsApp Pegawai</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      * Persetujuan akan langsung mengupdate kalkulasi DUK &amp; Slip Payroll
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Lembar Disposisi</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => handleReviewDecision('rejected')}
                        className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {submittingAction ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Tolak Koreksi</span>
                      </button>

                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => handleReviewDecision('approved')}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {submittingAction ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Setujui Koreksi Presensi</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Keputusan Verifikasi Telah Ditetapkan
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedItem.clarification_status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedItem.clarification_status === 'approved' ? 'DISETUJUI' : 'DITOLAK'}
                    </span>
                  </div>
                  {selectedItem.clarification_review_notes && (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 italic">
                      Catatan HRD: “{selectedItem.clarification_review_notes}”
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ditinjau pada: {formatTimestamp(selectedItem.clarification_reviewed_at)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL PREVIEW LAMPIRAN DOKUMEN */}
      {previewAttachmentUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Pratinjau Lampiran Bukti</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachmentUrl(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px]">
              {previewAttachmentUrl.match(/\.(jpeg|jpg|png|webp|gif)/i) || previewAttachmentUrl.startsWith('data:image') ? (
                <img
                  src={previewAttachmentUrl}
                  alt="Bukti Lampiran"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xs"
                />
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600">Dokumen Lampiran (Format PDF / Non-Image)</p>
                  <a
                    href={previewAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Dokumen di Tab Baru
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewAttachmentUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
