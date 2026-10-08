import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  LogOut,
  User,
  ShieldAlert,
  Smartphone,
  Fingerprint,
  FileEdit,
  Eye,
  ChevronRight,
  MoreVertical,
  Check,
  Send,
  Sparkles,
  Calendar
} from 'lucide-react';
import StatusBadge from '../../../../../shared/components/StatusBadge';

export default function TabPresensiHariIni({
  attendances = [],
  loading,
  onCheckOut,
  onOpenCorrectModal,
  onOpenReviewModal,
  onOpenDetailDrawer,
  pagination = {},
  onPageChange,
  onPerPageChange
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === attendances.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(attendances.map((a) => a.id));
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

  // Helper to format date into "04 Mar 2025"
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.split('T')[0];
      const [y, m, d] = clean.split('-');
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const monthName = months[parseInt(m, 10) - 1] || m;
      return `${d} ${monthName} ${y}`;
    } catch {
      return dateStr;
    }
  };

  // Helper to calculate working duration
  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    try {
      const [h1, m1] = checkIn.split(':').map(Number);
      const [h2, m2] = checkOut.split(':').map(Number);
      let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hours}j ${mins}m`;
    } catch {
      return null;
    }
  };

  // Format initials for avatar
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const page = pagination.page || 1;
  const perPage = pagination.per_page || 50;
  const total = pagination.total !== undefined ? pagination.total : attendances.length;
  const totalPages = pagination.total_pages || Math.ceil(total / perPage) || 1;

  const startRecord = total === 0 ? 0 : (page - 1) * perPage + 1;
  const endRecord = Math.min(page * perPage, total);

  return (
    <div className="space-y-3">
      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-100/90 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-800">
              {selectedIds.length} baris dipilih
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              &bull; Tindakan cepat untuk data terpilih:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert(`Aksi ubah status massal untuk ${selectedIds.length} pegawai akan aktif di tahap berikutnya.`)}
              className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ubah Status Massal</span>
            </button>

            <button
              type="button"
              onClick={() => alert(`Pengingat presensi ke ${selectedIds.length} pegawai telah diantrekan.`)}
              className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-sky-600" />
              <span>Kirim Pengingat (WA)</span>
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="h-8 px-2.5 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={attendances.length > 0 && selectedIds.length === attendances.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-4 min-w-[240px]">Pegawai</th>
                <th className="py-3 px-3 whitespace-nowrap">Jam Masuk</th>
                <th className="py-3 px-3 whitespace-nowrap">Jam Pulang</th>
                <th className="py-3 px-3 whitespace-nowrap">Durasi</th>
                <th className="py-3 px-4 min-w-[190px]">Status &amp; Ketepatan</th>
                <th className="py-3 px-4 min-w-[210px]">Lokasi GPS &amp; Catatan</th>
                <th className="py-3 px-3 text-right w-24">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
                    <span className="text-xs font-medium">Memuat data presensi pegawai...</span>
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700 mb-1">
                      Tidak Ada Catatan Presensi
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Tidak ditemukan data presensi pada rentang tanggal atau filter yang dipilih.
                    </p>
                  </td>
                </tr>
              ) : (
                attendances.map((att) => {
                  const isSelected = selectedIds.includes(att.id);
                  const duration = formatDuration(att.check_in_time, att.check_out_time);
                  const isLate = Boolean(att.is_late) || (att.late_minutes && Number(att.late_minutes) > 0);
                  const distanceMeters = att.check_in_distance_meters ? Math.round(Number(att.check_in_distance_meters)) : null;
                  const isWithinRadius = att.is_within_radius !== 0 && att.is_within_radius !== false;

                  // Status mapping
                  let badgeStatus = att.sub_status || att.status || 'present';
                  if (att.status === 'present' && isLate) badgeStatus = 'late';
                  if (att.status === 'sick') badgeStatus = 'sick';
                  if (att.status === 'permitted') badgeStatus = 'permitted';
                  if (att.status === 'absent') badgeStatus = 'absent';

                  return (
                    <tr
                      key={att.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/40'
                          : isLate
                          ? 'bg-amber-50/20'
                          : att.status === 'absent'
                          ? 'bg-rose-50/20'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(att.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-600 font-mono text-[11px]">
                        {formatDateDisplay(att.attendance_date)}
                      </td>

                      {/* Pegawai Info */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onOpenDetailDrawer(att)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200/60 group-hover:bg-emerald-200 group-hover:text-emerald-900 transition-colors">
                            {getInitials(att.employee_name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                              <span>{att.employee_name || `Pegawai #${att.employee_id}`}</span>
                              <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="font-mono text-[11px] text-slate-400">
                              {att.employee_number || 'NIP -'}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {att.position_title || 'Tenaga Pendidik'}
                              {att.unit_name && ` • ${att.unit_name}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Jam Masuk */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {att.check_in_time ? (
                          <div className="flex items-center gap-1 font-mono font-semibold text-xs text-emerald-700">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{att.check_in_time.slice(0, 5)} WIB</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Jam Pulang */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {att.check_out_time ? (
                          <span className="font-mono font-medium text-xs text-slate-700">
                            {att.check_out_time.slice(0, 5)} WIB
                          </span>
                        ) : att.status === 'present' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            Masih Kerja
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* Durasi Jam Kerja */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-600">
                        {duration ? (
                          <span className="font-semibold">{duration}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Status & Ketepatan */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-start">
                          {att.clarification_status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Klarifikasi Pending</span>
                            </span>
                          ) : (
                            <StatusBadge
                              status={badgeStatus}
                              lateMinutes={isLate ? att.late_minutes : 0}
                            />
                          )}

                          {isLate && (
                            <span className="text-[10px] text-amber-700 font-semibold font-mono pl-1">
                              Terlambat {att.late_minutes} mnt
                            </span>
                          )}

                          {att.is_anomaly === 1 && !att.anomaly_resolved && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 mt-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>Anomali Radius</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lokasi GPS & Catatan */}
                      <td className="py-3 px-4 text-xs">
                        <div className="space-y-0.5">
                          {/* Lokasi Geofence */}
                          <div className="flex items-center gap-1 text-slate-800 text-[11px]">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                !isWithinRadius
                                  ? 'bg-rose-500'
                                  : distanceMeters !== null
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span className="font-medium truncate max-w-[200px]">
                              {!isWithinRadius
                                ? `Luar Radius (${distanceMeters ? (distanceMeters > 1000 ? `${(distanceMeters/1000).toFixed(1)} km` : `${distanceMeters}m`) : 'Unknown'})`
                                : distanceMeters !== null
                                ? `Kampus (In-Radius ${distanceMeters}m)`
                                : 'Lokasi Terverifikasi'}
                            </span>
                          </div>

                          {/* Sumber Log & Catatan */}
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            {att.entry_type === 'fingerprint' || att.entry_source === 'fingerprint' ? (
                              <span>Mesin Sidik Jari</span>
                            ) : att.entry_type === 'manual' || att.entry_source === 'manual_hrd' ? (
                              <span className="text-purple-700 font-medium">Manual HRD</span>
                            ) : (
                              <span>Face Recognition Mobile</span>
                            )}
                            {(att.check_in_notes || att.notes) && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[130px]" title={att.check_in_notes || att.notes}>
                                  {att.check_in_notes || att.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Review Klarifikasi */}
                          {att.clarification_status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => onOpenReviewModal(att)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Review Klarifikasi Lupa Absen"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Review</span>
                            </button>
                          ) : (
                            <>
                              {/* Quick Check-Out jika masih kerja */}
                              {!att.check_out_time && att.status === 'present' && (
                                <button
                                  type="button"
                                  onClick={() => onCheckOut(att.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                                  title="Catat Check-Out Pegawai"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Tombol Buka Drawer Detail */}
                              <button
                                type="button"
                                onClick={() => onOpenDetailDrawer(att)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Lihat Telemetri & Detail Presensi"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Tombol Koreksi HRD */}
                              <button
                                type="button"
                                onClick={() => onOpenCorrectModal(att)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Koreksi Presensi"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

        {/* Footer Pagination & Row Summary (Matching Design) */}
        <div className="bg-white border-t border-slate-200/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Summary Info */}
          <div className="flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-slate-800 font-semibold">{startRecord} - {endRecord}</strong> dari <strong className="text-slate-800 font-semibold">{total}</strong> pegawai
            </span>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Tampilkan:</span>
              <select
                value={perPage}
                onChange={(e) => onPerPageChange && onPerPageChange(Number(e.target.value))}
                className="h-7 px-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 per halaman</option>
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
                <option value={100}>100 per halaman</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange && onPageChange(page - 1)}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Prev</span>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange && onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && (
                <>
                  <span className="px-1 text-slate-400 text-xs">...</span>
                  <button
                    type="button"
                    onClick={() => onPageChange && onPageChange(totalPages)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer ${
                      page === totalPages ? 'bg-emerald-700 text-white shadow-2xs' : ''
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange && onPageChange(page + 1)}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
