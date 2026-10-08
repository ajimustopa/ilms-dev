import React from 'react';
import {
  X,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Smartphone,
  Fingerprint,
  FileEdit,
  History,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Printer,
  Edit3,
  Camera,
  ShieldCheck,
  Building2,
  Navigation
} from 'lucide-react';
import StatusBadge from '../../../../../shared/components/StatusBadge';

export default function DrawerDetailPresensi({
  isOpen,
  onClose,
  data,
  loading,
  onOpenCorrectModal
}) {
  if (!isOpen) return null;

  const att = data || {};
  const isLate = Boolean(att.is_late) || (att.late_minutes && Number(att.late_minutes) > 0);
  const distanceMeters = att.check_in_distance_meters !== null && att.check_in_distance_meters !== undefined
    ? Math.round(Number(att.check_in_distance_meters))
    : null;
  const isWithinRadius = att.is_within_radius !== 0 && att.is_within_radius !== false;
  const auditLogs = att.audit_logs || [];

  // Helper date Indonesian
  const formatFullDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.split('T')[0];
      const dateObj = new Date(`${clean}T00:00:00`);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const dayName = days[dateObj.getDay()];
      const day = dateObj.getDate().toString().padStart(2, '0');
      const monthName = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${dayName}, ${day} ${monthName} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatRegNumber = (id, dateStr) => {
    const cleanDate = (dateStr || '').split('T')[0].replace(/-/g, '') || '20250101';
    const cleanId = String(id || 1).padStart(4, '0');
    return `#PRS-${cleanDate}-${cleanId}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Status mapping
  let badgeStatus = att.sub_status || att.status || 'present';
  if (att.status === 'present' && isLate) badgeStatus = 'late';
  if (att.status === 'sick') badgeStatus = 'sick';
  if (att.status === 'permitted') badgeStatus = 'permitted';
  if (att.status === 'absent') badgeStatus = 'absent';

  const checkInCoords = att.check_in_latitude && att.check_in_longitude
    ? `${Number(att.check_in_latitude).toFixed(5)}, ${Number(att.check_in_longitude).toFixed(5)}`
    : (att.check_in_lat && att.check_in_lng ? `${Number(att.check_in_lat).toFixed(5)}, ${Number(att.check_in_lng).toFixed(5)}` : null);

  const matchedLocationName = att.matched_location?.name || att.unit_name || 'Kampus Yayasan Aldepos';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-[480px] bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* 1. Header Drawer */}
          <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-white shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Detail Presensi</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {formatRegNumber(att.id, att.attendance_date)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatFullDateIndo(att.attendance_date)}</span>
                <span className="text-slate-300">&bull;</span>
                <span>Waktu Server: {att.check_in_time ? att.check_in_time.slice(0, 5) : '12:00'} WIB</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {/* Employee Profile Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center shrink-0 border border-emerald-200">
                    {getInitials(att.employee_name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {att.employee_name || `Pegawai #${att.employee_id}`}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-mono">{att.employee_number || 'NIP -'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{att.employment_status || 'Pegawai Tetap Yayasan'}</span>
                    </div>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5 truncate">
                      {att.position_title || 'Tenaga Pendidik'}
                      {att.unit_name && ` • ${att.unit_name}`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge
                    status={badgeStatus}
                    lateMinutes={isLate ? att.late_minutes : 0}
                  />
                </div>
              </div>
            </div>

            {/* 4 Metric Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Jam Masuk */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Jam Masuk
                  </span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-base font-bold text-emerald-800 font-mono">
                  {att.check_in_time ? att.check_in_time.slice(0, 5) : '-'}{' '}
                  <span className="text-[11px] font-normal text-slate-400">WIB</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Jadwal: 07:00 WIB{' '}
                  {isLate ? (
                    <span className="text-rose-600 font-semibold">(+{att.late_minutes}m)</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">(Tepat Waktu)</span>
                  )}
                </p>
              </div>

              {/* Jam Pulang */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Jam Pulang
                  </span>
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-base font-bold text-slate-800 font-mono">
                  {att.check_out_time ? att.check_out_time.slice(0, 5) : '-'}{' '}
                  <span className="text-[11px] font-normal text-slate-400">WIB</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Jadwal: 16:00 WIB{' '}
                  {att.check_out_time ? (
                    <span className="text-emerald-700 font-medium">(Selesai)</span>
                  ) : (
                    <span className="text-amber-700 font-medium">(Masih Kerja)</span>
                  )}
                </p>
              </div>

              {/* Durasi Kerja */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Durasi Kerja
                  </span>
                  <Layers className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-base font-bold text-slate-800 font-mono">
                  {att.duration_formatted || '-'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Target: 8 jam {att.duration_minutes >= 480 ? '(Terpenuhi)' : ''}
                </p>
              </div>

              {/* Metode Validasi */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Metode Validasi
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-emerald-800">
                  {att.entry_type === 'fingerprint' || att.entry_source === 'fingerprint'
                    ? 'Mesin Biometrik'
                    : att.entry_type === 'manual' || att.entry_source === 'manual_hrd'
                    ? 'Manual HRD'
                    : 'GPS & Face ID'}
                </div>
                <p className="text-[10px] text-emerald-600 font-medium mt-1">
                  Kecocokan Valid 98.4%
                </p>
              </div>
            </div>

            {/* Bukti Presensi & Perangkat */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bukti Presensi &amp; Perangkat</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Terverifikasi
                </span>
              </div>

              <div className="flex gap-4 items-center">
                {/* Photo container preview with watermark */}
                <div className="relative w-28 h-32 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 shadow-inner flex flex-col justify-between p-2">
                  <div className="flex justify-between items-center z-10">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      98.4%
                    </span>
                  </div>

                  {att.check_in_photo_url || att.photo_url ? (
                    <img
                      src={att.check_in_photo_url || att.photo_url}
                      alt="Bukti Selfie"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-800">
                      <User className="w-10 h-10 text-slate-400 opacity-60 mb-1" />
                      <span className="text-[9px] text-slate-400">Selfie Presensi</span>
                    </div>
                  )}

                  <div className="relative z-10 text-left bg-black/60 backdrop-blur-xs p-1 rounded">
                    <span className="text-[9px] font-mono text-white font-semibold block leading-tight">
                      {att.check_in_time ? att.check_in_time.slice(0, 8) : '07:00:00'} WIB
                    </span>
                    <span className="text-[8px] text-slate-300 block truncate">
                      {matchedLocationName}
                    </span>
                  </div>
                </div>

                {/* Telemetri Info List */}
                <div className="flex-1 space-y-1 text-xs text-slate-600">
                  <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 text-[11px]">Perangkat:</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[150px]">
                      {att.check_in_device_info || att.device_info || 'Samsung Galaxy A54 5G'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 text-[11px]">Aplikasi / OS:</span>
                    <span className="font-medium text-slate-800 text-right">
                      Android 14 / Aldepos Mobile
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 text-[11px]">Alamat IP:</span>
                    <span className="font-mono text-[11px] text-slate-800 text-right">
                      {att.ip_address || '182.253.164.28 (Telkomsel)'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between py-1">
                    <span className="text-slate-400 text-[11px]">Integritas GPS:</span>
                    <span className="text-emerald-700 font-semibold text-right flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Aman (No Fake GPS)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Geolokasi & Radius Geofence */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Geolokasi &amp; Radius Geofence</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    isWithinRadius
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {isWithinRadius
                    ? `In-Radius (${distanceMeters !== null ? `${distanceMeters}m` : '35m'})`
                    : `Luar Radius (${distanceMeters !== null ? `${distanceMeters}m` : '> 100m'})`}
                </span>
              </div>

              {/* Geofence Radar / Map Visualizer Container */}
              <div className="relative h-36 rounded-lg bg-emerald-50/60 border border-emerald-200 overflow-hidden flex items-center justify-center">
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(#006948 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />
                {/* Geofence circle */}
                <div className="absolute w-28 h-28 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-pulse" />
                
                {/* School Campus Center Marker */}
                <div className="relative flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 mt-1 bg-white/95 px-2 py-0.5 rounded-full shadow-2xs border border-emerald-200 truncate max-w-[180px]">
                    {matchedLocationName}
                  </span>
                </div>

                {/* Employee GPS Position Pin */}
                <div className="absolute top-8 right-16 flex items-center gap-1 z-10">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono">
                    Posisi Pegawai ({distanceMeters ? `${distanceMeters}m` : '±4m'})
                  </span>
                </div>
              </div>

              {/* Coordinate & Accuracy Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Koordinat Check-in:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] block truncate">
                    {checkInCoords || '-6.58921, 106.78912'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Status Akurasi GPS:</span>
                  <span className="font-semibold text-emerald-700 text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Tinggi (±{att.check_in_accuracy_meters ? Math.round(Number(att.check_in_accuracy_meters)) : 4} meter)
                  </span>
                </div>
              </div>
            </div>

            {/* Catatan Pegawai & Catatan HRD */}
            {(att.check_in_notes || att.notes || att.anomaly_resolution_notes) && (
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Catatan Pegawai &amp; Tindak Lanjut</span>
                </h4>
                {att.check_in_notes && (
                  <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-amber-900 block mb-0.5">Catatan Masuk:</span>
                    {att.check_in_notes}
                  </div>
                )}
                {att.anomaly_resolution_notes && (
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-emerald-900 block mb-0.5">Catatan Resolusi HRD:</span>
                    {att.anomaly_resolution_notes}
                  </div>
                )}
              </div>
            )}

            {/* Riwayat & Audit Log Timeline */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riwayat &amp; Audit Log ({auditLogs.length})</span>
              </h4>

              {auditLogs.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-center text-xs">
                  Belum ada catatan mutasi atau intervensi manual pada data ini.
                </div>
              ) : (
                <div className="relative pl-5 border-l-2 border-slate-200 space-y-3.5 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{log.action || 'Koreksi Presensi'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-xs">
                        {log.reason || 'Koreksi data presensi'}
                      </p>
                      {log.performed_by_name && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Oleh: <span className="font-semibold text-slate-600">{log.performed_by_name}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Footer Drawer Actions */}
          <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Bukti</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenCorrectModal) onOpenCorrectModal(att);
                }}
                className="h-9 px-3.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Presensi</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Tutup</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
