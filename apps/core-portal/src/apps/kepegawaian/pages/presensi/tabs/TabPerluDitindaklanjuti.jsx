import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  X,
  FileText,
  UserX,
  History,
  MapPinOff,
  Smartphone,
  LogOut,
  CalendarX,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Printer,
  ShieldCheck,
  ExternalLink,
  Info,
  AlertCircle,
  Gavel,
  Radio
} from 'lucide-react';
import presensiService from '../presensiService';

export default function TabPerluDitindaklanjuti({
  anomalies = [],
  anomalySummary = {},
  loading,
  onResolveAnomaly,
  onOpenDetailDrawer,
  onRefresh
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'baru', 'ditangani', 'selesai'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Per-row investigasi notes & submitting state
  const [hrNotesMap, setHrNotesMap] = useState({});
  const [submittingMap, setSubmittingMap] = useState({});
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Toggle expand row
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper type badge
  const getTypeBadge = (type, primaryLabel) => {
    switch (type) {
      case 'fake_gps':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />,
          label: primaryLabel || 'Indikasi Fake GPS',
          bg: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'outside_radius':
        return {
          icon: <MapPinOff className="w-3.5 h-3.5 text-amber-700" />,
          label: primaryLabel || 'Di Luar Radius',
          bg: 'bg-amber-50 text-amber-900 border-amber-200'
        };
      case 'repeated_late':
      case 'extreme_late':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-indigo-700" />,
          label: primaryLabel || 'Terlambat Berulang',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200'
        };
      case 'repeated_absent':
        return {
          icon: <UserX className="w-3.5 h-3.5 text-rose-700" />,
          label: primaryLabel || 'Alpa Berulang',
          bg: 'bg-rose-50 text-rose-800 border-rose-200'
        };
      case 'missing_checkout':
        return {
          icon: <LogOut className="w-3.5 h-3.5 text-slate-700" />,
          label: primaryLabel || 'Belum Check-Out',
          bg: 'bg-slate-100 text-slate-800 border-slate-200'
        };
      case 'leave_conflict':
        return {
          icon: <CalendarX className="w-3.5 h-3.5 text-emerald-700" />,
          label: primaryLabel || 'Konflik Cuti / Dinas',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'unusual_device':
        return {
          icon: <Smartphone className="w-3.5 h-3.5 text-sky-700" />,
          label: primaryLabel || 'Perangkat Asing',
          bg: 'bg-sky-50 text-sky-800 border-sky-200'
        };
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />,
          label: primaryLabel || 'Anomali Presensi',
          bg: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  // Filter anomalies in frontend
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(anom => {
      if (statusFilter !== 'all' && anom.status !== statusFilter) return false;
      if (severityFilter !== 'all' && anom.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && anom.primary_type !== typeFilter && !anom.anomaly_types?.some(t => t.type === typeFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = anom.employee_name && anom.employee_name.toLowerCase().includes(q);
        const matchNip = anom.employee_nip && anom.employee_nip.toLowerCase().includes(q);
        const matchTitle = anom.finding_title && anom.finding_title.toLowerCase().includes(q);
        const matchDetail = anom.finding_detail && anom.finding_detail.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchTitle && !matchDetail) return false;
      }
      return true;
    });
  }, [anomalies, statusFilter, severityFilter, typeFilter, searchQuery]);

  // Handle Resolve Submit
  const handleExecuteResolution = async (anom, action, customStatus) => {
    const note = hrNotesMap[anom.id] || '';
    setSubmittingMap(prev => ({ ...prev, [anom.id]: true }));
    setActionSuccessMsg('');

    try {
      if (onResolveAnomaly) {
        await onResolveAnomaly(anom.id, {
          resolution_action: action,
          status: customStatus || (action === 'accept' || action === 'force_alpha' ? 'selesai' : 'ditangani'),
          notes: note
        });
      } else {
        await presensiService.resolveAnomaly(anom.id, {
          resolution_action: action,
          status: customStatus || (action === 'accept' || action === 'force_alpha' ? 'selesai' : 'ditangani'),
          notes: note
        });
      }

      setActionSuccessMsg(`Tindak lanjut anomali pegawai ${anom.employee_name} berhasil disimpan.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tindak lanjut anomali');
    } finally {
      setSubmittingMap(prev => ({ ...prev, [anom.id]: false }));
    }
  };

  // WhatsApp Warning Generator
  const generateWhatsAppLink = (anom) => {
    const rawPhone = anom.phone_number || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');
    const msg = `*PEMBERITAHUAN & TEGURAN DISIPLIN KEPEGAWAIAN ALDEPOS*\n\n` +
      `Yth. Bpk/Ibu *${anom.employee_name}*,\n\n` +
      `Sistem Presensi & Kepegawaian Yayasan Aldepos mendeteksi adanya catatan anomali presensi pada:\n` +
      `• Tanggal: *${anom.attendance_date}*\n` +
      `• Jenis Temuan: *${anom.finding_title || 'Anomali Presensi'}*\n` +
      `• Detail: _${anom.finding_detail || '-' }_\n\n` +
      `Mohon segera memberikan klarifikasi melalui Portal Guru / HRIS atau menemui bagian HRD Yayasan.\n\n` +
      `Terima kasih,\n*Biro Kepegawaian & SDM Yayasan Aldepos*`;

    return `https://wa.me/${cleanPhone || ''}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. 7 SUMMARY TILES PER FINDING TYPE */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Tile 1: Terlambat Berulang */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'repeated_late' ? 'all' : 'repeated_late')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'repeated_late' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Terlambat Berulang</span>
              <span className="text-[10px] text-slate-400">Pola $\ge 3$x</span>
            </div>
          </div>
          <span className="text-sm font-bold text-indigo-700">{anomalySummary.repeated_late || 0}</span>
        </div>

        {/* Tile 2: Alpa Berulang */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'repeated_absent' ? 'all' : 'repeated_absent')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'repeated_absent' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <UserX className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Alpa Berulang</span>
              <span className="text-[10px] text-slate-400">Pola $\ge 2$x</span>
            </div>
          </div>
          <span className="text-sm font-bold text-rose-700">{anomalySummary.repeated_absent || 0}</span>
        </div>

        {/* Tile 3: Di Luar Radius */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'outside_radius' ? 'all' : 'outside_radius')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'outside_radius' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-800 shrink-0">
              <MapPinOff className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Di Luar Radius</span>
              <span className="text-[10px] text-slate-400">GPS Diluar</span>
            </div>
          </div>
          <span className="text-sm font-bold text-amber-800">{anomalySummary.outside_radius || 0}</span>
        </div>

        {/* Tile 4: Indikasi Fake GPS */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'fake_gps' ? 'all' : 'fake_gps')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'fake_gps' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Indikasi Fake GPS</span>
              <span className="text-[10px] text-slate-400">Telemetri aneh</span>
            </div>
          </div>
          <span className="text-sm font-bold text-purple-700">{anomalySummary.fake_gps || 0}</span>
        </div>

        {/* Tile 5: Perangkat Asing */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'unusual_device' ? 'all' : 'unusual_device')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'unusual_device' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Perangkat Asing</span>
              <span className="text-[10px] text-slate-400">User-Agent</span>
            </div>
          </div>
          <span className="text-sm font-bold text-sky-700">{anomalySummary.unusual_device || 0}</span>
        </div>

        {/* Tile 6: Belum Check-Out */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'missing_checkout' ? 'all' : 'missing_checkout')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'missing_checkout' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Belum Check-out</span>
              <span className="text-[10px] text-slate-400">Gantung</span>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-800">{anomalySummary.missing_checkout || 0}</span>
        </div>

        {/* Tile 7: Konflik Cuti/Dinas */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'leave_conflict' ? 'all' : 'leave_conflict')}
          className={`bg-white hover:bg-slate-50 transition-all p-3 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer select-none ${
            typeFilter === 'leave_conflict' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <CalendarX className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">Konflik Cuti/SK</span>
              <span className="text-[10px] text-slate-400">Tumpang-tindih</span>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-700">{anomalySummary.leave_conflict || 0}</span>
        </div>
      </div>

      {/* 2. MAIN TABLE CARD */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
        {/* Table Header with Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Anomali Presensi &amp; Temuan yang Perlu Ditindaklanjuti
              </h2>
              <p className="text-[11px] text-slate-500">
                Deteksi otomatis deviasi jam kerja, anomali geolokasi GPS, dan benturan izin/cuti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Tingkat</option>
              <option value="high">Tingkat: Tinggi</option>
              <option value="medium">Tingkat: Sedang</option>
              <option value="low">Tingkat: Rendah</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="baru">Status: Baru</option>
              <option value="ditangani">Status: Ditangani</option>
              <option value="selesai">Status: Selesai</option>
            </select>
          </div>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMsg && (
          <div className="m-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Disclaimer Note */}
        <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 text-[11px] text-purple-900 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>
            <strong>Catatan Kepatuhan:</strong> Deteksi Indikasi Fake GPS merupakan analisis heuristik telemetri (bukan vonis mutlak). Selalu verifikasi langsung dengan pegawai sebelum menetapkan sanksi.
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3.5">Pegawai</th>
                <th className="p-3.5">Jenis Temuan</th>
                <th className="p-3.5">Detail Anomali / Pelanggaran</th>
                <th className="p-3.5">Tanggal Kejadian</th>
                <th className="p-3.5 text-center">Tingkat</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
                    <span className="text-xs font-medium">Memeriksa anomali presensi...</span>
                  </td>
                </tr>
              ) : filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-700 mb-1">
                      Semua Data Presensi Bersih!
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Tidak ada temuan anomali presensi, deviasi jarak geofence, atau pelanggaran disiplin pada filter aktif ini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((anom) => {
                  const isExpanded = expandedId === anom.id;
                  const typeBadge = getTypeBadge(anom.primary_type, anom.finding_title);
                  const isSubmitting = submittingMap[anom.id] || false;

                  return (
                    <React.Fragment key={anom.id}>
                      {/* Main Table Row */}
                      <tr className={`transition-colors ${isExpanded ? 'bg-slate-50/80 font-medium' : 'hover:bg-slate-50/50'}`}>
                        {/* Pegawai */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {anom.employee_name ? anom.employee_name.charAt(0) : 'P'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {anom.employee_name || `Pegawai #${anom.employee_id}`}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {anom.employee_nip || 'NIP -'} • {anom.position_title || 'Staf'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Jenis Temuan Chip */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${typeBadge.bg}`}>
                            {typeBadge.icon}
                            <span>{typeBadge.label}</span>
                          </span>
                        </td>

                        {/* Detail Anomali */}
                        <td className="p-3.5 max-w-xs">
                          <p className="text-xs text-slate-800 line-clamp-2">
                            {anom.finding_detail || anom.check_in_notes || 'Terdeteksi ketidaksesuaian data'}
                          </p>
                        </td>

                        {/* Tanggal & Waktu */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                          <div>{anom.attendance_date}</div>
                          <div className="text-[10px] text-slate-400">
                            Masuk: {anom.check_in_time ? anom.check_in_time.slice(0, 5) : '--:--'}
                          </div>
                        </td>

                        {/* Tingkat Keparahan */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {anom.severity === 'high' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                              Tinggi
                            </span>
                          ) : anom.severity === 'medium' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                              Sedang
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              Rendah
                            </span>
                          )}
                        </td>

                        {/* Status Tindak Lanjut */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {anom.status === 'selesai' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Check className="w-3 h-3" />
                              Selesai
                            </span>
                          ) : anom.status === 'ditangani' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                              Ditangani
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              Baru
                            </span>
                          )}
                        </td>

                        {/* Aksi Toggle */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(anom.id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Tutup' : 'Tindak Lanjuti'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Investigation Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" className="p-0 bg-slate-50 border-y border-slate-200">
                            <div className="p-5 flex flex-col gap-4">
                              {/* Header Drawer */}
                              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                                  <span>Investigasi Detail Anomali &amp; Tindak Lanjut Kepegawaian</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ID Record: #{anom.id} • Tanggal: {anom.attendance_date}
                                </span>
                              </div>

                              {/* 3 Columns Investigation Details */}
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Column 1: Telemetry & Device Details */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Data Telemetri &amp; Perangkat
                                  </h3>
                                  <div className="space-y-1.5 text-xs text-slate-600">
                                    <div className="flex justify-between py-1 bg-slate-50 px-2 rounded font-mono text-[11px]">
                                      <span className="text-slate-400">Koordinat Check-In:</span>
                                      <span className="font-semibold text-slate-800">
                                        {anom.check_in_latitude ? `${anom.check_in_latitude}, ${anom.check_in_longitude}` : 'Tidak Terdata'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1 px-2">
                                      <span className="text-slate-400">Jarak ke Geofence:</span>
                                      <span className={anom.is_within_radius ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                        {anom.check_in_distance_meters ? `${Math.round(anom.check_in_distance_meters)} meter` : '0 m'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                                      <span className="text-slate-400">Akurasi GPS Satelit:</span>
                                      <span className="font-mono text-slate-800">
                                        {anom.check_in_accuracy_meters ? `${Math.round(anom.check_in_accuracy_meters)}m` : '-'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-1 px-2">
                                      <span className="text-slate-400">Header / Perangkat:</span>
                                      <span className="font-mono text-[10px] text-slate-700 truncate max-w-[150px]" title={anom.check_in_device_info}>
                                        {anom.check_in_device_info || 'Mobile App Pegawai'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2: Historical Record & Context */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Rekam Jejak &amp; Konteks Bulan Ini
                                  </h3>
                                  <div className="space-y-2 text-xs">
                                    <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-start gap-2">
                                      <Clock className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                                      <p className="text-[11px] text-indigo-950">
                                        Akumulasi Keterlambatan: <strong>{anom.emp_stats?.total_late || 0}x</strong> ({anom.emp_stats?.total_late_minutes || 0} menit).
                                      </p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100 flex items-start gap-2">
                                      <UserX className="w-3.5 h-3.5 text-rose-700 shrink-0 mt-0.5" />
                                      <p className="text-[11px] text-rose-950">
                                        Akumulasi Alpa / Tanpa Keterangan: <strong>{anom.emp_stats?.total_absent || 0} hari</strong>.
                                      </p>
                                    </div>
                                    {anom.check_in_notes && (
                                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                                        Catatan Presensi: “{anom.check_in_notes}”
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Column 3: HRD Action & Decision Form */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
                                  <div>
                                    <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                      Catatan HRD / Hasil Klarifikasi
                                    </h3>
                                    <textarea
                                      rows={3}
                                      value={hrNotesMap[anom.id] !== undefined ? hrNotesMap[anom.id] : (anom.anomaly_resolution_notes || '')}
                                      onChange={(e) => setHrNotesMap({ ...hrNotesMap, [anom.id]: e.target.value })}
                                      placeholder="Tuliskan hasil klarifikasi, instruksi pembinaan, atau alasan penyelesaian..."
                                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400">
                                      * Keputusan akan disimpan ke Audit Trail
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Action Buttons */}
                              <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetailDrawer && onOpenDetailDrawer(anom)}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Buka Drawer Detail Presensi</span>
                                  </button>
                                  <a
                                    href={generateWhatsAppLink(anom)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Kirim Teguran WhatsApp</span>
                                  </a>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleExecuteResolution(anom, 'force_alpha', 'selesai')}
                                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Gavel className="w-3.5 h-3.5" />
                                    <span>Batalkan Presensi (Jadikan Alpa)</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleExecuteResolution(anom, 'note_only', 'ditangani')}
                                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Tandai Ditangani</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleExecuteResolution(anom, 'accept', 'selesai')}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isSubmitting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Tandai Selesai / Terverifikasi</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{filteredAnomalies.length}</span> temuan presensi yang membutuhkan tindak lanjut
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            * Menyelesaikan anomali akan memperbarui catatan DUK &amp; Payroll
          </div>
        </div>
      </div>
    </div>
  );
}
