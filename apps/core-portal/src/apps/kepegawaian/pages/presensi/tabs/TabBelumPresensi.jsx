import React, { useState } from 'react';
import {
  Clock,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  Copy,
  Check,
  Filter,
  AlertTriangle,
  Briefcase,
  HeartPulse,
  FileEdit,
  XCircle
} from 'lucide-react';

export default function TabBelumPresensi({
  candidates = [],
  loading,
  onQuickMark,
  date
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [quickModal, setQuickModal] = useState({ isOpen: false, empIds: [], status: '', label: '', reason: '' });
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map((c) => c.employee_id || c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Helper date formatted
  const formatDisplayDate = (dStr) => {
    if (!dStr) return 'Hari ini';
    try {
      const clean = dStr.split('T')[0];
      const [y, m, d] = clean.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
    } catch {
      return dStr;
    }
  };

  // WhatsApp Link Builder
  const getWhatsAppLink = (cand) => {
    const phone = cand.phone_number || cand.phone || cand.whatsapp_number;
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const msg = `Assalamu'alaikum Wr. Wb. Bpk/Ibu ${cand.full_name || 'Pegawai'}, kami dari HRD Yayasan Aldepos mengingatkan pencatatan presensi harian Anda untuk tanggal ${formatDisplayDate(date)}. Mohon dapat melakukan presensi mandiri atau mengonfirmasi ke HRD jika berhalangan. Terima kasih.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Handle open quick mark modal
  const openConfirmModal = (empIds, status, label) => {
    setQuickModal({
      isOpen: true,
      empIds: Array.isArray(empIds) ? empIds : [empIds],
      status,
      label,
      reason: `Ditandai ${label} oleh HRD`
    });
  };

  // Handle confirm submit quick mark
  const handleConfirmSubmit = async () => {
    if (quickModal.empIds.length === 0) return;
    setActionLoadingId('submit_modal');
    try {
      let subStatus = null;
      if (quickModal.status === 'duty_travel') subStatus = 'dinas_luar';
      else if (quickModal.status === 'leave') subStatus = 'cuti';
      else if (quickModal.status === 'permitted') subStatus = 'izin';
      else if (quickModal.status === 'sick') subStatus = 'sakit';

      await onQuickMark({
        employee_ids: quickModal.empIds,
        attendance_date: date,
        status: quickModal.status,
        sub_status: subStatus,
        reason: quickModal.reason,
        notes: quickModal.reason
      });

      setQuickModal({ isOpen: false, empIds: [], status: '', label: '', reason: '' });
      setSelectedIds([]);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk copy WhatsApp list
  const handleCopyAllContacts = () => {
    const list = candidates
      .filter((c) => c.phone_number || c.phone)
      .map((c) => `${c.full_name}: ${c.phone_number || c.phone}`)
      .join('\n');
    
    if (list) {
      navigator.clipboard.writeText(list);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 3000);
    } else {
      alert('Tidak ada nomor telepon yang tersedia pada daftar ini.');
    }
  };

  const currentTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  return (
    <div className="space-y-4">
      {/* 1. Amber Information Banner (Matching Stitch Design) */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-800 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-950">
                {candidates.length} Pegawai Belum Presensi
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-950">
                Batas Masuk 07:30 - 08:00 WIB
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Hingga pukul {currentTimeStr}, belum ada log presensi biometrik maupun check-in GPS terdata pada sistem untuk pegawai di bawah ini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyAllContacts}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors border border-amber-200 cursor-pointer"
            title="Salin semua nomor kontak pegawai yang belum presensi"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedAll ? 'Daftar Kontak Tersalin' : 'Salin Kontak (WA)'}</span>
          </button>

          {candidates.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const firstWithPhone = candidates.find(c => c.phone_number || c.phone);
                if (firstWithPhone) {
                  const link = getWhatsAppLink(firstWithPhone);
                  if (link) window.open(link, '_blank');
                } else {
                  handleCopyAllContacts();
                }
              }}
              className="h-8 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Pengingat ke Semua ({candidates.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Floating Bulk Action Bar (Saat Baris Dipilih) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-100/90 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-800">
              {selectedIds.length} pegawai dipilih
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              &bull; Tandai kehadiran massal:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openConfirmModal(selectedIds, 'permitted', 'Izin Resmi')}
              className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-200 text-sky-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Tandai Izin
            </button>
            <button
              type="button"
              onClick={() => openConfirmModal(selectedIds, 'sick', 'Sakit')}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Tandai Sakit
            </button>
            <button
              type="button"
              onClick={() => openConfirmModal(selectedIds, 'duty_travel', 'Dinas Luar')}
              className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-200 text-purple-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Tandai Dinas Luar
            </button>
            <button
              type="button"
              onClick={() => openConfirmModal(selectedIds, 'absent', 'Alpa')}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Tandai Alpa
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Data Table (Compact, Clean SaaS, Modern Typography) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedIds.length === candidates.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 min-w-[240px]">Pegawai</th>
                <th className="py-3 px-3.5 min-w-[190px]">Satuan / Unit</th>
                <th className="py-3 px-3.5 min-w-[180px]">Jadwal Hari Ini</th>
                <th className="py-3 px-3.5 min-w-[160px]">Status Sistem</th>
                <th className="py-3 px-3.5 min-w-[170px]">No. HP / Kontak</th>
                <th className="py-3 px-3.5 text-right min-w-[200px]">Tindakan Cepat</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
                    <span className="text-xs font-medium">Memeriksa jadwal &amp; status presensi pegawai...</span>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700 mb-1">
                      Semua Pegawai Sudah Presensi!
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Seluruh pegawai aktif yang memiliki jadwal kerja hari ini telah tercatat presensi atau memiliki pengajuan cuti yang disetujui.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const empId = cand.employee_id || cand.id;
                  const isSelected = selectedIds.includes(empId);
                  const phone = cand.phone_number || cand.phone;
                  const waLink = getWhatsAppLink(cand);

                  return (
                    <tr
                      key={empId}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(empId)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Pegawai Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                            {getInitials(cand.full_name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 truncate">
                              {cand.full_name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {cand.employee_number || 'NIP -'}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {cand.position_title || 'Tenaga Pendidik'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Satuan & Unit */}
                      <td className="py-3 px-3.5">
                        <span className="font-medium text-slate-900 block">
                          {cand.unit_name || cand.school_unit_name || 'SMA Aldepos'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {cand.position_title || 'Tenaga Pendidik'}
                        </span>
                      </td>

                      {/* Jadwal Hari Ini */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {cand.schedule_start_time ? cand.schedule_start_time.slice(0, 5) : '07:00'} -{' '}
                            {cand.schedule_end_time ? cand.schedule_end_time.slice(0, 5) : '15:00'} WIB
                          </span>
                        </div>
                        {cand.is_overdue ? (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 mt-0.5 font-mono">
                            Terlambat {cand.overdue_minutes} mnt
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 mt-0.5">
                            Sesuai Jadwal
                          </span>
                        )}
                      </td>

                      {/* Status Sistem */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span>Belum Check-In</span>
                        </span>
                      </td>

                      {/* Kontak & WhatsApp */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {phone ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {waLink ? (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-emerald-700 hover:underline font-semibold"
                                  title="Buka WhatsApp untuk kirim pengingat"
                                >
                                  {phone}
                                </a>
                              ) : (
                                <span>{phone}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">WA Siap Kirim</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic font-mono">-</span>
                        )}
                      </td>

                      {/* Tindakan Cepat */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openConfirmModal(empId, 'permitted', 'Izin Resmi')}
                            className="h-7 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                            title="Tandai Izin Resmi"
                          >
                            Izin
                          </button>

                          <button
                            type="button"
                            onClick={() => openConfirmModal(empId, 'sick', 'Surat Sakit')}
                            className="h-7 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                            title="Tandai Surat Sakit"
                          >
                            Sakit
                          </button>

                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Kirim Pengingat WhatsApp Langsung"
                            >
                              <Send className="w-3 h-3 text-emerald-600" />
                              <span>Ingatkan</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer Pagination & Summary Info */}
        <div className="bg-white border-t border-slate-200/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-slate-800 font-semibold">{candidates.length}</strong> pegawai belum presensi pada tanggal {formatDisplayDate(date)}
          </div>
          <div className="text-[11px] text-slate-400">
            * Tombol Ingatkan membuka WhatsApp Web/App dengan template pengingat siap kirim
          </div>
        </div>
      </div>

      {/* 5. Quick Mark Confirmation Modal */}
      {quickModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Konfirmasi Tandai {quickModal.label}
                </h3>
                <p className="text-xs text-slate-500">
                  Tandai status untuk {quickModal.empIds.length} pegawai terpilih.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alasan / Keterangan Wajib:
                </label>
                <textarea
                  rows={3}
                  value={quickModal.reason}
                  onChange={(e) => setQuickModal({ ...quickModal, reason: e.target.value })}
                  placeholder="Contoh: Izin keperluan keluarga mendesak / Surat sakit dokter terlampir..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Tanggal Presensi:</span>
                  <span className="font-mono font-semibold text-slate-700">{formatDisplayDate(date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pencatatan Audit Log:</span>
                  <span className="text-emerald-700 font-semibold">Terekam Otomatis (HRD)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickModal({ isOpen: false, empIds: [], status: '', label: '', reason: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoadingId !== null || !quickModal.reason.trim()}
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoadingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
