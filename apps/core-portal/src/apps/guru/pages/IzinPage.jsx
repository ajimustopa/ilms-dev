import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { attendanceService } from '../services/attendanceService';
import { formatIndonesianDate } from '../utils/dateHelper';
import {
  Button,
  Card,
  ListItem,
  StatusBadge,
  FormField,
  Input,
  Select,
  Textarea,
  SelectSheet,
  BottomSheet,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonList,
  PageHeader,
  SegmentedTabs,
  SelectorKonteks,
  useToast
} from '../components';
import {
  ClipboardList,
  Plus,
  Calendar,
  FileText,
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  File,
  Eye,
  Info,
  Check,
  Send,
  UserCheck
} from 'lucide-react';

const LEAVE_TYPE_OPTIONS = [
  { value: 'sakit', label: 'Sakit (Surat Dokter)', subtitle: 'Izin tidak masuk karena kondisi kesehatan' },
  { value: 'izin_pribadi', label: 'Izin Keperluan Pribadi / Keluarga', subtitle: 'Keperluan mendesak atau keluarga' },
  { value: 'cuti_tahunan', label: 'Cuti Tahunan', subtitle: 'Pengambilan hak cuti tahunan resmi' },
  { value: 'cuti_melahirkan', label: 'Cuti Melahirkan', subtitle: 'Hak cuti persalinan & pemulihan' },
  { value: 'cuti_khusus', label: 'Cuti Khusus (Haji/Umrah/Berduka)', subtitle: 'Ibadah keagamaan atau masa duka' },
  { value: 'dinas_luar', label: 'Tugas / Dinas Luar', subtitle: 'Pelatihan, lomba, atau dinas luar sekolah' },
  { value: 'lainnya', label: 'Lainnya', subtitle: 'Keperluan di luar kategori di atas' }
];

const LEAVE_TYPE_MAP = {
  sakit: { label: 'Sakit', status: 'info' },
  izin_pribadi: { label: 'Izin Pribadi', status: 'warning' },
  cuti_tahunan: { label: 'Cuti Tahunan', status: 'neutral' },
  cuti_melahirkan: { label: 'Cuti Melahirkan', status: 'neutral' },
  cuti_khusus: { label: 'Cuti Khusus', status: 'neutral' },
  dinas_luar: { label: 'Dinas Luar', status: 'info' },
  lainnya: { label: 'Lainnya', status: 'neutral' }
};

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function IzinPage() {
  const toast = useToast();
  const { user } = useTeacherAuth();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'form'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'

  // List State
  const [loadingList, setLoadingList] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [listError, setListError] = useState(null);

  // Selected Detail Modal
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [leaveType, setLeaveType] = useState('sakit');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null); // { name, base64, mimeType, size }
  const [attachmentError, setAttachmentError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetch Teacher's Leave Requests
  const fetchMyLeaves = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await attendanceService.getMyLeaveRequests();
      const list = Array.isArray(res) ? res : (res?.leave_requests || res?.data || []);
      setLeaveRequests(list);
    } catch (err) {
      setListError(err?.message || 'Gagal memuat daftar pengajuan izin');
      setLeaveRequests([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLeaves();
  }, [fetchMyLeaves]);

  // Handle File Selection (Camera / Gallery / File Picker)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentError(null);

    // 1. Validasi MIME Type & Ekstensi (Tahap 8)
    const fileMime = file.type?.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!ALLOWED_MIME_TYPES.includes(fileMime) && !isAllowedExt) {
      setAttachmentError('Format berkas tidak didukung. Format yang diizinkan: PDF, JPG, PNG, WEBP.');
      return;
    }

    // 2. Validasi Ukuran (Maksimal 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAttachmentError(`Ukuran berkas (${sizeMB} MB) melebihi batas maksimal 5 MB.`);
      return;
    }

    // 3. Konversi File ke Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result; // data:image/png;base64,...
      setAttachmentFile({
        name: file.name,
        size: file.size,
        mimeType: file.type || `image/${ext}`,
        base64: base64Data
      });
    };
    reader.onerror = () => {
      setAttachmentError('Gagal membaca berkas lampiran.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentError(null);
  };

  // Calculate Duration in Days
  const calculatedDuration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return -1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Handle Form Submission
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!leaveType) errors.leaveType = 'Pilih jenis izin';
    if (!startDate) errors.startDate = 'Tanggal mulai wajib diisi';
    if (!endDate) errors.endDate = 'Tanggal selesai wajib diisi';
    if (calculatedDuration < 1) errors.endDate = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
    if (!reason.trim() || reason.trim().length < 5) {
      errors.reason = 'Alasan pengajuan wajib diisi minimal 5 karakter';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setSubmitting(true);
    try {
      const payload = {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        attachment: attachmentFile ? {
          name: attachmentFile.name,
          data: attachmentFile.base64,
          mimeType: attachmentFile.mimeType
        } : undefined
      };

      await attendanceService.submitLeaveRequest(payload);
      toast.success('Pengajuan izin berhasil dikirimkan ke HRD!', 'Berhasil Diajukan');

      // Reset Form & Switch Tab
      setLeaveType('sakit');
      setStartDate(todayStr);
      setEndDate(todayStr);
      setReason('');
      setAttachmentFile(null);
      setActiveTab('list');
      fetchMyLeaves();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim pengajuan izin', 'Pengajuan Gagal');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    if (statusFilter === 'all') return leaveRequests;
    return leaveRequests.filter((item) => item.status === statusFilter);
  }, [leaveRequests, statusFilter]);

  const pendingCount = useMemo(() => {
    return leaveRequests.filter((item) => item.status === 'pending').length;
  }, [leaveRequests]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Pengajuan Cuti & Izin Guru"
        subtitle="Manajemen Izin Tidak Masuk & Riwayat Persetujuan"
        badge={
          pendingCount > 0 ? (
            <StatusBadge status="warning" size="sm">
              {pendingCount} Menunggu
            </StatusBadge>
          ) : (
            <StatusBadge status="neutral" size="sm">
              {leaveRequests.length} Total Pengajuan
            </StatusBadge>
          )
        }
        actions={<SelectorKonteks />}
      />

      {/* 2. Tab Navigasi: Daftar vs Buat Izin */}
      <SegmentedTabs
        tabs={[
          { id: 'list', label: 'Daftar Izin Saya', count: leaveRequests.length, icon: <ClipboardList className="w-4 h-4" /> },
          { id: 'form', label: 'Ajukan Izin Baru', icon: <Plus className="w-4 h-4" /> }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        fullWidth
      />

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR IZIN SAYA                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'pending', label: 'Menunggu HRD' },
              { id: 'approved', label: 'Disetujui' },
              { id: 'rejected', label: 'Ditolak' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List Content */}
          {loadingList ? (
            <SkeletonList count={3} />
          ) : listError ? (
            <ErrorState
              title="Gagal Memuat Daftar Izin"
              message={listError}
              onRetry={fetchMyLeaves}
            />
          ) : filteredList.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-6 h-6 text-slate-400" />}
              title="Belum Ada Pengajuan Izin"
              description={
                statusFilter === 'all'
                  ? 'Anda belum memiliki riwayat pengajuan izin tidak masuk atau cuti.'
                  : `Tidak ada pengajuan izin dengan status '${statusFilter}'.`
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('form')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Ajukan Izin Sekarang
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => {
                const typeConfig = LEAVE_TYPE_MAP[item.leave_type] || { label: item.leave_type, status: 'neutral' };
                const isPending = item.status === 'pending';
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected';

                const statusLabel = isPending ? 'Menunggu Persetujuan' : (isApproved ? 'Disetujui' : 'Ditolak');
                const statusTheme = isPending ? 'warning' : (isApproved ? 'success' : 'danger');

                return (
                  <Card
                    key={item.id}
                    ribbon={statusTheme}
                    hoverable
                    onClick={() => setSelectedDetail(item)}
                    className="space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {typeConfig.label}
                          </h3>
                          <StatusBadge status={statusTheme} size="sm">
                            {statusLabel}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatIndonesianDate(item.start_date, false)}</span>
                          {item.start_date !== item.end_date && (
                            <>
                              <span>s/d</span>
                              <span>{formatIndonesianDate(item.end_date, false)}</span>
                            </>
                          )}
                        </p>
                      </div>

                      {item.attachment_url && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full shrink-0">
                          <FileText className="w-3 h-3" />
                          <span>Ada Berkas</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                      "{item.reason}"
                    </p>

                    {/* Footer Info */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Diajukan: {formatIndonesianDate(item.created_at || item.start_date, false)}</span>
                      {item.approver_name && (
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Oleh: {item.approver_name}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FORMULIR PENGAJUAN IZIN BARU                                       */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <Card as="form" onSubmit={handleSubmitLeave} className="space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Formulir Permohonan Izin / Cuti
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Isi data permohonan dengan jujur dan lampirkan surat keterangan jika diperlukan.
            </p>
          </div>

          {/* 1. Jenis Izin */}
          <FormField
            label="Jenis Izin / Cuti"
            required
            error={formErrors.leaveType}
            helperText="Pilih kategori izin yang sesuai."
          >
            <SelectSheet
              title="Pilih Jenis Izin"
              label="Jenis Izin"
              options={LEAVE_TYPE_OPTIONS}
              value={leaveType}
              onChange={(val) => setLeaveType(val)}
            />
          </FormField>

          {/* 2. Tanggal Mulai & Selesai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Tanggal Mulai" required error={formErrors.startDate}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormField>

            <FormField label="Tanggal Selesai" required error={formErrors.endDate}>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormField>
          </div>

          {/* Indikator Durasi */}
          {calculatedDuration > 0 && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Total Durasi: <strong>{calculatedDuration} Hari Kerja</strong> ({formatIndonesianDate(startDate, false)} - {formatIndonesianDate(endDate, false)})
              </span>
            </div>
          )}

          {/* 3. Alasan Izin */}
          <FormField
            label="Alasan / Keterangan Izin"
            required
            error={formErrors.reason}
            helperText="Jelaskan alasan izin secara ringkas dan jelas."
          >
            <Textarea
              rows={3}
              maxLength={300}
              placeholder="Contoh: Mengalami demam tinggi dan disarankan dokter untuk istirahat selama 2 hari..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>

          {/* 4. Unggah Berkas Lampiran (Foto / PDF / Kamera) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
              Lampiran Dokumen / Surat Dokter (Opsional)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Format yang diizinkan: <strong>PDF, JPG, PNG, WEBP</strong> (Maks. 5 MB).
            </p>

            {attachmentFile ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {attachmentFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {(attachmentFile.size / 1024).toFixed(1)} KB • {attachmentFile.mimeType}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition"
                  aria-label="Hapus lampiran"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-lg p-4 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center gap-1.5 min-h-[44px]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto atau Pilih Berkas Lampiran</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Ketuk untuk membuka kamera atau galeri dokumen
                  </span>
                </label>

                {attachmentError && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{attachmentError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tombol Aksi Form */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setActiveTab('list')}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={submitting}
              leftIcon={<Send className="w-4 h-4" />}
              className="flex-1"
            >
              Kirim Pengajuan
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* DETAIL MODAL (BOTTOM SHEET)                                               */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        title="Detail Pengajuan Izin"
        description={`ID Pengajuan: #${selectedDetail?.id || '-'}`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setSelectedDetail(null)}
            >
              Tutup Detail
            </Button>
          </div>
        }
      >
        {selectedDetail && (
          <div className="space-y-4 py-1 text-xs">
            {/* Status Header */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Kategori Izin:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {LEAVE_TYPE_MAP[selectedDetail.leave_type]?.label || selectedDetail.leave_type}
                </span>
              </div>
              <StatusBadge
                status={
                  selectedDetail.status === 'pending'
                    ? 'warning'
                    : selectedDetail.status === 'approved'
                    ? 'success'
                    : 'danger'
                }
                size="md"
              >
                {selectedDetail.status === 'pending'
                  ? 'Menunggu Persetujuan'
                  : selectedDetail.status === 'approved'
                  ? 'Disetujui'
                  : 'Ditolak'}
              </StatusBadge>
            </div>

            {/* Periode */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Mulai:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formatIndonesianDate(selectedDetail.start_date, true)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Selesai:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {formatIndonesianDate(selectedDetail.end_date, true)}
                </span>
              </div>
            </div>

            {/* Alasan */}
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Alasan Pengajuan:</span>
              <p className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                "{selectedDetail.reason || '-'}"
              </p>
            </div>

            {/* Status Telaah HRD / Catatan */}
            {selectedDetail.rejection_reason && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Catatan Penolakan:</span>
                </p>
                <p className="text-xs">{selectedDetail.rejection_reason}</p>
              </div>
            )}

            {/* Lampiran */}
            {selectedDetail.attachment_url && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Berkas Lampiran:</span>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate text-xs font-medium">
                      {selectedDetail.attachment_name || 'Dokumen Surat Keterangan'}
                    </span>
                  </div>
                  <a
                    href={selectedDetail.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 shrink-0"
                  >
                    Buka File
                  </a>
                </div>
              </div>
            )}

            {/* Catatan Pembatalan */}
            {selectedDetail.status === 'pending' && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>Informasi Pembatalan</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Pengajuan izin ini sedang dalam proses antrean telaah HRD. Jika ingin membatalkan, silakan konfirmasikan langsung ke bagian Tata Usaha / Kepegawaian sekolah.
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
