import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Building,
  FileText,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
  Check,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import StatusBadge from '../../../../shared/components/StatusBadge';
import api from '../../../../shared/services/api';
import { generateWhatsAppNotificationUrl, getLeaveErrorMessage } from './leaveErrorHelper';

export default function LeaveDetailDrawer({
  isOpen,
  onClose,
  leave,
  currentUser,
  onActionSuccess,
  onOpenReclassifyModal,
  onOpenReassignModal
}) {
  if (!isOpen || !leave) return null;

  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attachmentLoading, setAttachmentLoading] = useState(false);

  const permissions = currentUser?.permissions || [];
  const isHr = permissions.includes('kepegawaian.leave_requests.manage') ||
               permissions.includes('kepegawaian.leave_requests.override') ||
               currentUser?.role === 'super_admin';
  const canOverride = permissions.includes('kepegawaian.leave_requests.override') ||
                      currentUser?.role === 'super_admin';

  // Check if current user can act on the pending step
  const activeStep = (leave.approval_steps || []).find(s => s.status === 'pending' && s.step_no === leave.current_step_no);
  const isAssignedApprover = activeStep && (
    (currentUser?.employeeId && Number(currentUser.employeeId) === Number(activeStep.assigned_employee_id)) ||
    (activeStep.approver_source === 'hrd_pool' && isHr) ||
    isHr
  );

  const canTakeApprovalAction = leave.status === 'pending' && isAssignedApprover;
  const canCancelLeave = (leave.status === 'pending' || leave.status === 'approved' || leave.status === 'revision_requested') &&
    ((currentUser?.employeeId && Number(currentUser.employeeId) === Number(leave.employee_id)) || isHr);

  const handleApprove = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/approve`, {
        comment: comment.trim() || undefined
      });
      setComment('');
      if (onActionSuccess) onActionSuccess('Permohonan cuti berhasil disetujui');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setErrorMsg('Alasan penolakan wajib diisi');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/reject`, {
        rejection_reason: comment.trim()
      });
      setComment('');
      if (onActionSuccess) onActionSuccess('Permohonan cuti berhasil ditolak');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!comment.trim()) {
      setErrorMsg('Catatan arahan revisi wajib diisi');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/request-revision`, {
        comment: comment.trim()
      });
      setComment('');
      if (onActionSuccess) onActionSuccess('Permintaan revisi berhasil dikirim ke pemohon');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async () => {
    const confirmCancel = window.confirm('Apakah Anda yakin ingin membatalkan pengajuan cuti ini?');
    if (!confirmCancel) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/cancel`, {
        cancellation_reason: comment.trim() || 'Dibatalkan melalui portal'
      });
      setComment('');
      if (onActionSuccess) onActionSuccess('Permohonan cuti berhasil dibatalkan');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculate = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/kepegawaian/leave-requests/${leave.id}/recalculate`);
      if (onActionSuccess) onActionSuccess('Durasi cuti berhasil dihitung ulang');
      onClose();
    } catch (err) {
      setErrorMsg(getLeaveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async () => {
    setAttachmentLoading(true);
    try {
      const res = await api.get(`/kepegawaian/leave-requests/${leave.id}/attachment`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', leave.attachment_name || `lampiran_cuti_${leave.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh lampiran atau lampiran tidak ditemukan');
    } finally {
      setAttachmentLoading(false);
    }
  };

  // WhatsApp Notification Link
  const waUrl = generateWhatsAppNotificationUrl({
    phone: leave.employee_phone || leave.phone,
    employeeName: leave.employee_name,
    leaveTypeName: leave.leave_type_name || leave.leave_type,
    startDate: leave.start_date,
    endDate: leave.end_date,
    status: leave.status,
    comment: leave.rejection_reason || activeStep?.comment || comment
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[560px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* 1. Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Detail Pengajuan Cuti</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white text-slate-700 border border-slate-200">
                  CUT-{String(leave.id).padStart(5, '0')}
                </span>
                {leave.version > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    v{leave.version} (Revisi)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={leave.status} />
                <span className="text-[11px] text-slate-400">
                  • Diajukan: {leave.created_at ? String(leave.created_at).slice(0, 10) : '-'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              title="Tutup"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Perhatian</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Employee Profile Card */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-emerald-200 shadow-xs">
                {(leave.employee_name || 'P').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {leave.employee_name || 'Pegawai'}
                  </h3>
                  {leave.employment_status && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {leave.employment_status}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NIP: {leave.nip || '-'}
                </span>
                <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                  {leave.position_name || 'Staf / Pendidik'}
                </p>
                {leave.school_unit_id && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Unit Sekolah #{leave.school_unit_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan Permohonan
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: leave.leave_type_color || '#059669' }}
                  />
                  {leave.leave_type_name || leave.leave_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Periode Cuti:</span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5">
                    {leave.start_date} s.d {leave.end_date}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Durasi Terhitung:</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5">
                    {leave.duration_days} Hari ({leave.count_mode === 'calendar_days' ? 'Kalender' : 'Kerja'})
                  </span>
                </div>
              </div>

              {/* Portion Info */}
              {(leave.start_portion !== 'full' || leave.end_portion !== 'full') && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Setengah hari: Mulai ({leave.start_portion.toUpperCase()}) • Berakhir ({leave.end_portion.toUpperCase()})</span>
                </div>
              )}

              {/* Reason (with Privacy Guard) */}
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] text-slate-400 block mb-1">Keterangan / Alasan:</span>
                <p className="text-xs text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  {leave.reason || '-'}
                </p>
              </div>

              {/* Bypass Indicator */}
              {Boolean(leave.bypass_approval) && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Persetujuan Langsung (Bypass HR)</span>
                    <p className="mt-0.5 text-blue-800">{leave.bypass_reason || 'Bypass oleh administrator'}</p>
                  </div>
                </div>
              )}

              {leave.rejection_reason && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                  <span className="font-bold block text-rose-700">Alasan Penolakan:</span>
                  <p className="mt-0.5">{leave.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Balance Impact Card (if applicable) */}
            {leave.balance_preview && (
              <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Dampak Kuota / Saldo Cuti</span>
                  <span className="text-[11px] text-slate-500 font-mono">Tahun {leave.start_date?.slice(0, 4)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Jatah / Kuota</span>
                    <span className="text-sm font-bold text-slate-800">{leave.balance_preview.entitled} hr</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Terpakai</span>
                    <span className="text-sm font-bold text-slate-800">{leave.balance_preview.used} hr</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="text-[10px] text-emerald-700 block font-semibold">Tersedia</span>
                    <span className="text-sm font-bold text-emerald-900">{leave.balance_preview.available} hr</span>
                  </div>
                </div>
              </div>
            )}

            {/* Peer Overlap Widget (Names only per SPEC §2 #17) */}
            {leave.overlapping_colleagues && leave.overlapping_colleagues.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Rekan Seunit Cuti pada Tanggal yang Sama ({leave.overlapping_colleagues.length} orang)</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-slate-700 text-[11px]">
                  {leave.overlapping_colleagues.map((col, idx) => (
                    <li key={idx}>
                      <span className="font-semibold text-slate-900">{col.colleague_name}</span> ({col.leave_type}) • {col.start_date} s.d {col.end_date}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Attachment Card */}
            {leave.has_attachment && (
              <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2.5">
                <span className="text-xs font-bold text-slate-900 block">Lampiran Dokumen Bukti</span>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-xs text-slate-900 truncate">
                        {leave.attachment_name || 'Lampiran_Dokumen_Cuti'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {leave.attachment_size_bytes ? `${Math.round(leave.attachment_size_bytes / 1024)} KB • ` : ''}
                        Terverifikasi
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadAttachment}
                    disabled={attachmentLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs shadow-2xs transition-colors"
                    type="button"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>{attachmentLoading ? 'Mengunduh...' : 'Unduh'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Approval Workflow Timeline */}
            <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3.5">
              <span className="text-xs font-bold text-slate-900 block">Alur & Riwayat Persetujuan Bertingkat</span>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* 1. Submission */}
                <div className="relative flex items-start gap-2.5">
                  <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs">
                    <Check className="w-3 h-3" />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900">Pegawai Mengajukan</span>
                      <span className="text-[10px] text-slate-400">
                        {leave.created_at ? String(leave.created_at).slice(0, 16) : '-'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{leave.employee_name}</span>
                  </div>
                </div>

                {/* 2. Snapshot Steps */}
                {(leave.approval_steps || []).map((step, idx) => {
                  const isPending = step.status === 'pending';
                  const isApproved = step.status === 'approved';
                  const isRejected = step.status === 'rejected';
                  const isSkipped = step.status === 'skipped';
                  const isBypassed = step.status === 'bypassed';

                  let badgeColor = 'bg-slate-100 text-slate-500';
                  let icon = <span className="text-[10px]">{step.step_no}</span>;
                  let ringColor = 'bg-slate-200 text-slate-600';

                  if (isApproved) {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    icon = <Check className="w-3 h-3" />;
                    ringColor = 'bg-emerald-600 text-white';
                  } else if (isPending) {
                    badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                    icon = <Clock className="w-3 h-3" />;
                    ringColor = 'bg-amber-500 text-white animate-pulse';
                  } else if (isRejected) {
                    badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
                    icon = <X className="w-3 h-3" />;
                    ringColor = 'bg-rose-600 text-white';
                  } else if (isSkipped) {
                    badgeColor = 'bg-slate-100 text-slate-500';
                    icon = <span className="text-[9px]">S</span>;
                    ringColor = 'bg-slate-300 text-slate-600';
                  } else if (isBypassed) {
                    badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                    icon = <Check className="w-3 h-3" />;
                    ringColor = 'bg-blue-600 text-white';
                  }

                  const sourceLabels = {
                    direct_supervisor: 'Atasan Langsung',
                    unit_head: 'Kepala Sekolah',
                    hrd_pool: 'HRD / Kepegawaian',
                    yayasan_pool: 'Pengurus Yayasan'
                  };

                  return (
                    <div key={idx} className="relative flex items-start gap-2.5">
                      <span className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs ${ringColor}`}>
                        {icon}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {sourceLabels[step.approver_source] || step.approver_source}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${badgeColor}`}>
                            {step.status.toUpperCase()}
                          </span>
                        </div>

                        {step.assigned_employee_name && (
                          <span className="text-[11px] text-slate-500">
                            Ditugaskan ke: {step.assigned_employee_name}
                          </span>
                        )}

                        {step.acted_by_employee_name && (
                          <span className="text-[11px] text-slate-600 font-medium">
                            Diproses oleh: {step.acted_by_employee_name}
                            {step.acted_at && ` • ${String(step.acted_at).slice(0, 16)}`}
                          </span>
                        )}

                        {step.skip_reason && (
                          <span className="text-[10px] text-slate-400 italic">
                            ({step.skip_reason})
                          </span>
                        )}

                        {step.comment && (
                          <p className="text-[11px] text-slate-700 mt-1 bg-slate-50 p-2 rounded border border-slate-200 italic">
                            "{step.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approver Action Input (If permitted) */}
            {canTakeApprovalAction && (
              <div className="space-y-1.5 pt-2">
                <label className="block font-bold text-xs text-slate-800">
                  Catatan Persetujuan / Alasan Penolakan
                  <span className="text-slate-400 font-normal ml-1">(Wajib jika menolak/revisi)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors resize-none placeholder-slate-400"
                  placeholder="Tuliskan catatan arahan persetujuan atau alasan revisi/penolakan..."
                  rows={3}
                />
              </div>
            )}

            {/* HR Override Actions Section */}
            {isHr && (
              <div className="rounded-xl border border-dashed border-slate-300 p-3.5 bg-slate-50/50 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                  Aksi Khusus HRD & Override
                </span>
                <div className="flex flex-wrap gap-2">
                  {canOverride && (
                    <>
                      <button
                        onClick={() => onOpenReclassifyModal && onOpenReclassifyModal(leave)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
                        type="button"
                      >
                        Reklasifikasi Jenis
                      </button>
                      <button
                        onClick={() => onOpenReassignModal && onOpenReassignModal(leave)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
                        type="button"
                      >
                        Alihkan Penugasan
                      </button>
                      <button
                        onClick={handleRecalculate}
                        disabled={submitting}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1"
                        type="button"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-500" />
                        Hitung Ulang
                      </button>
                    </>
                  )}
                  {canCancelLeave && (
                    <button
                      onClick={handleCancelLeave}
                      disabled={submitting}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors"
                      type="button"
                    >
                      Batalkan Pengajuan
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Footer Action Controls */}
          <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-3 shrink-0 shadow-sm">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors shadow-2xs"
                title="Buka WhatsApp dengan pesan template"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Kabari via WhatsApp</span>
              </a>
            ) : (
              <div />
            )}

            {canTakeApprovalAction ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors shadow-2xs disabled:opacity-50"
                  type="button"
                >
                  Tolak
                </button>
                <button
                  onClick={handleRequestRevision}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs disabled:opacity-50"
                  type="button"
                >
                  Minta Revisi
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  type="button"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Memproses...' : 'Setujui'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors shadow-2xs"
                type="button"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
