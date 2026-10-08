import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { attendanceService } from '../services/attendanceService';
import {
  formatIndonesianDate,
  formatShortTime,
  getIndonesianDayName,
  HARI_INDONESIA,
  BULAN_INDONESIA
} from '../utils/dateHelper';
import {
  StatRibbonCard,
  StatusBadge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SelectorKonteks,
  useToast
} from '../components';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Navigation,
  ShieldCheck,
  Calendar,
  CalendarDays,
  FileText,
  Upload,
  Camera,
  Image as ImageIcon,
  Check,
  Send,
  X,
  File,
  Eye,
  Download,
  Search,
  ChevronRight,
  TrendingUp,
  Building2,
  Info,
  Layers,
  Sparkles,
  Lock,
  UserCheck,
  Compass
} from 'lucide-react';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const LEAVE_TYPE_OPTIONS = [
  { value: 'sakit', label: 'Sakit (Surat Dokter)', subtitle: 'Kondisi kesehatan medis tidak memungkinkan' },
  { value: 'izin_pribadi', label: 'Izin Keperluan Keluarga', subtitle: 'Keperluan mendesak keluarga' },
  { value: 'cuti_tahunan', label: 'Cuti Tahunan', subtitle: 'Pengambilan hak kuota cuti tahunan' },
  { value: 'dinas_luar', label: 'Tugas Dinas Luar / Pelatihan', subtitle: 'Pelatihan, lomba, atau tugas kedinasan' },
  { value: 'cuti_khusus', label: 'Cuti Khusus (Haji/Umrah/Duka)', subtitle: 'Ibadah keagamaan atau masa duka' },
  { value: 'cuti_melahirkan', label: 'Cuti Melahirkan', subtitle: 'Hak cuti persalinan & pemulihan' }
];

/**
 * Rumus Haversine presisi tinggi (meter)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371e3; // meter
  const φ1 = (parseFloat(lat1) * Math.PI) / 180;
  const φ2 = (parseFloat(lat2) * Math.PI) / 180;
  const Δφ = ((parseFloat(lat2) - parseFloat(lat1)) * Math.PI) / 180;
  const Δλ = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Hitung selisih hari kerja (Senin - Sabtu)
 */
function calculateWorkDays(startStr, endStr) {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 1;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    // 0 = Ahad (libur)
    if (day !== 0) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export default function AbsensiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useTeacherAuth();
  const { activeContext } = useTeacherContext();

  // 1. Tab Navigasi Aktif ('presensi' | 'izin' | 'lembur')
  const initialTab = useMemo(() => {
    if (location.pathname.includes('/lembur') || searchParams.get('tab') === 'lembur') {
      return 'lembur';
    }
    if (location.pathname.includes('/izin') || location.pathname.includes('/cuti') || searchParams.get('tab') === 'izin') {
      return 'izin';
    }
    return 'presensi';
  }, [location.pathname, searchParams]);

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const qTab = searchParams.get('tab');
    if (qTab === 'lembur' || location.pathname.includes('/lembur')) {
      setActiveTab('lembur');
    } else if (qTab === 'izin' || location.pathname.includes('/izin') || location.pathname.includes('/cuti')) {
      setActiveTab('izin');
    } else if (qTab === 'presensi') {
      setActiveTab('presensi');
    }
  }, [searchParams, location.pathname]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // 2. Realtime Clock State
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // TAB 1: PRESENSI MANDIRI STATE
  // ==========================================
  const [loadingToday, setLoadingToday] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [workSchedule, setWorkSchedule] = useState(null);
  const [locations, setLocations] = useState([]);
  const [todayError, setTodayError] = useState(null);

  // Geolocation state
  const [gpsStatus, setGpsStatus] = useState('locating'); // 'locating' | 'active' | 'denied' | 'unavailable' | 'timeout'
  const [userCoords, setUserCoords] = useState(null); // { latitude, longitude, accuracy }
  const [gpsErrorMessage, setGpsErrorMessage] = useState(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Riwayat Presensi Bulanan
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyFilterStatus, setMonthlyFilterStatus] = useState('all');
  const [monthlySearch, setMonthlySearch] = useState('');

  // Klarifikasi / Lupa Absen State
  const [clarificationModalOpen, setClarificationModalOpen] = useState(false);
  const [clarificationForm, setClarificationForm] = useState({
    attendance_date: new Date().toISOString().slice(0, 10),
    entry_type: 'manual_forgot_in', // 'manual_forgot_in' | 'manual_forgot_out' | 'manual_correction'
    check_in_time: '07:30',
    check_out_time: '16:00',
    clarification_reason: ''
  });
  const [submittingClarification, setSubmittingClarification] = useState(false);

  // Request Location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMessage('Peramban web tidak mendukung fitur Geolocation GPS.');
      return;
    }

    setGpsStatus('locating');
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ latitude, longitude, accuracy });
        setGpsStatus('active');
        setGpsErrorMessage(null);
      },
      (err) => {
        setUserCoords(null);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsErrorMessage('Izin akses lokasi GPS ditolak oleh peramban. Silakan izinkan akses lokasi.');
        } else if (err.code === err.TIMEOUT) {
          setGpsStatus('timeout');
          setGpsErrorMessage('Waktu permintaan lokasi habis. Pastikan GPS perangkat aktif.');
        } else {
          setGpsStatus('unavailable');
          setGpsErrorMessage('Sinyal lokasi tidak dapat diperoleh. Pastikan GPS aktif.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  // Fetch status hari ini
  const fetchTodayStatus = useCallback(async () => {
    setLoadingToday(true);
    setTodayError(null);
    try {
      const res = await attendanceService.getTodayStatus();
      const data = res?.data || res || {};
      setTodayAttendance(data.attendance || null);
      setWorkSchedule(data.work_schedule || null);
      setLocations(data.locations || []);
    } catch (err) {
      setTodayError(err?.message || 'Gagal memuat status presensi hari ini.');
      setTodayAttendance(null);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // Fetch riwayat bulanan
  const fetchMonthlyAttendance = useCallback(async (m, y) => {
    setLoadingMonthly(true);
    try {
      const res = await attendanceService.getMonthlyAttendance({
        month: m,
        year: y
      });
      const list = Array.isArray(res) ? res : res?.attendances || res?.data || [];
      setMonthlyRecords(list);
    } catch {
      setMonthlyRecords([]);
    } finally {
      setLoadingMonthly(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    requestLocation();
    fetchMonthlyAttendance(selectedMonth, selectedYear);
  }, [fetchTodayStatus, requestLocation, fetchMonthlyAttendance, selectedMonth, selectedYear]);

  // Evaluasi Lokasi Terdekat & Jarak Radius
  const closestLocation = useMemo(() => {
    if (!userCoords || locations.length === 0) {
      // Default lokasi fallback jika belum ada data API lokasi
      return {
        id: 1,
        name: 'SMP Pondok Pesantren Aldepos',
        latitude: -6.597112,
        longitude: 106.799435,
        radius_meters: 150,
        distanceMeters: userCoords
          ? calculateHaversineDistance(userCoords.latitude, userCoords.longitude, -6.597112, 106.799435)
          : null
      };
    }

    let closest = null;
    let minDistance = Infinity;

    locations.forEach((loc) => {
      if (loc.latitude && loc.longitude) {
        const d = calculateHaversineDistance(
          userCoords.latitude,
          userCoords.longitude,
          loc.latitude,
          loc.longitude
        );
        if (d !== null && d < minDistance) {
          minDistance = d;
          closest = { ...loc, distanceMeters: d };
        }
      }
    });

    return closest || locations[0];
  }, [userCoords, locations]);

  const targetRadius = closestLocation?.radius_meters || 150;
  const currentDistance = closestLocation?.distanceMeters ?? null;
  const isInsideRadius = currentDistance !== null ? currentDistance <= targetRadius : false;
  const isGpsWeak = userCoords?.accuracy ? userCoords.accuracy > 50 : false;

  const hasCheckedIn = Boolean(todayAttendance?.check_in_time);
  const hasCheckedOut = Boolean(todayAttendance?.check_out_time);

  // Evaluasi Waktu Jam Pulang:
  // Untuk skema jadwal FLEKSIBEL: Pegawai boleh kapan saja absen pulang (setelah absen masuk), tidak perlu menunggu jam pulang baku.
  const officialEndTime = workSchedule?.end_time || '15:30:00';
  const isTimeForCheckOut = useMemo(() => {
    if (workSchedule?.is_flexible) {
      return true;
    }
    const now = currentTime;
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [eH, eM] = String(officialEndTime).split(':').map(Number);
    const endMins = (eH || 15) * 60 + (eM || 30);
    return currentMins >= endMins;
  }, [currentTime, officialEndTime, workSchedule]);

  // Submit Klarifikasi Lupa Absen
  const handleSubmitClarification = async (e) => {
    e.preventDefault();
    if (!clarificationForm.clarification_reason?.trim()) {
      toast.error('Alasan / keterangan lupa absen wajib diisi.');
      return;
    }

    setSubmittingClarification(true);
    try {
      await attendanceService.submitClarification({
        attendance_date: clarificationForm.attendance_date,
        entry_type: clarificationForm.entry_type,
        check_in_time: clarificationForm.check_in_time,
        check_out_time: clarificationForm.check_out_time,
        clarification_reason: clarificationForm.clarification_reason.trim()
      });
      toast.success('Pengajuan catatan presensi terlewat berhasil dikirim dan menunggu konfirmasi HRD.');
      setClarificationModalOpen(false);
      setClarificationForm({
        attendance_date: new Date().toISOString().slice(0, 10),
        entry_type: 'manual_forgot_in',
        check_in_time: '07:30',
        check_out_time: '16:00',
        clarification_reason: ''
      });
      fetchTodayStatus();
      fetchMonthlyAttendance(selectedMonth, selectedYear);
    } catch (err) {
      toast.error(err?.message || 'Gagal mengirim pengajuan klarifikasi.');
    } finally {
      setSubmittingClarification(false);
    }
  };

  // Handle Check-in Action
  const handleCheckIn = async () => {
    if (!userCoords) {
      toast.error('Gagal mendapatkan koordinat GPS. Pastikan izin lokasi aktif.');
      return;
    }
    if (!isInsideRadius) {
      toast.error(`Anda berada di luar radius sekolah (${currentDistance}m > ${targetRadius}m).`);
      return;
    }

    setSubmittingAttendance(true);
    try {
      await attendanceService.checkIn({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        accuracy_meters: userCoords.accuracy,
        device_info: navigator.userAgent.slice(0, 100),
        notes: `Presensi Masuk Web Guru (${currentDistance}m)`
      });
      toast.success('Alhamdulillah, presensi masuk berhasil dicatat!');
      fetchTodayStatus();
      fetchMonthlyAttendance(selectedMonth, selectedYear);
    } catch (err) {
      toast.error(err?.message || 'Gagal mencatat presensi masuk.');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Handle Check-out Action
  const handleCheckOut = async () => {
    if (!todayAttendance?.id) {
      toast.error('Data presensi masuk hari ini tidak ditemukan.');
      return;
    }
    if (!userCoords) {
      toast.error('Gagal mendapatkan koordinat GPS.');
      return;
    }

    setSubmittingAttendance(true);
    try {
      await attendanceService.checkOut(todayAttendance.id, {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        accuracy_meters: userCoords.accuracy,
        device_info: navigator.userAgent.slice(0, 100),
        notes: `Presensi Pulang Web Guru (${currentDistance}m)`
      });
      toast.success('Presensi kepulangan berhasil dicatat. Selamat beristirahat!');
      fetchTodayStatus();
      fetchMonthlyAttendance(selectedMonth, selectedYear);
    } catch (err) {
      toast.error(err?.message || 'Gagal mencatat presensi kepulangan.');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Ringkasan Kehadiran Bulanan
  const monthlyStats = useMemo(() => {
    let present = 0;
    let leave = 0;
    let sick = 0;
    let late = 0;

    monthlyRecords.forEach((r) => {
      if (r.status === 'present' || r.check_in_time) {
        if (r.status === 'late' || r.late_minutes > 0) {
          late++;
        } else {
          present++;
        }
      } else if (r.status === 'leave' || r.status === 'permit') {
        leave++;
      } else if (r.status === 'sick') {
        sick++;
      }
    });

    const totalActive = present + late + leave + sick;
    const rate = totalActive > 0 ? Math.round(((present + late) / totalActive) * 100) : 100;

    return {
      present,
      leave,
      sick,
      late,
      totalActive,
      rate
    };
  }, [monthlyRecords]);

  // Filtered Riwayat Log Bulanan
  const filteredMonthlyRecords = useMemo(() => {
    return monthlyRecords.filter((r) => {
      if (monthlyFilterStatus !== 'all') {
        if (monthlyFilterStatus === 'present' && r.status !== 'present') return false;
        if (monthlyFilterStatus === 'late' && r.status !== 'late') return false;
        if (monthlyFilterStatus === 'leave' && !['leave', 'permit', 'sick'].includes(r.status)) return false;
      }
      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        const dateStr = String(r.attendance_date || '').toLowerCase();
        const notesStr = String(r.notes || '').toLowerCase();
        return dateStr.includes(q) || notesStr.includes(q);
      }
      return true;
    });
  }, [monthlyRecords, monthlyFilterStatus, monthlySearch]);

  // ==========================================
  // TAB 2: PENGAJUAN CUTI & IZIN STATE
  // ==========================================
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('all');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');

  // Form State
  const todayIsoStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [formLeaveType, setFormLeaveType] = useState('sakit');
  const [formStartDate, setFormStartDate] = useState(todayIsoStr);
  const [formEndDate, setFormEndDate] = useState(todayIsoStr);
  const [formReason, setFormReason] = useState('');
  const [formAttachment, setFormAttachment] = useState(null); // { name, size, base64, mimeType }
  const [attachmentError, setAttachmentError] = useState(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState(null);

  const calculatedWorkDays = useMemo(() => {
    return calculateWorkDays(formStartDate, formEndDate);
  }, [formStartDate, formEndDate]);

  // Fetch Leave Requests
  const fetchLeaveRequests = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const res = await attendanceService.getMyLeaveRequests();
      const list = Array.isArray(res) ? res : res?.leave_requests || res?.data || [];
      setLeaveRequests(list);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'izin') {
      fetchLeaveRequests();
    }
  }, [activeTab, fetchLeaveRequests]);

  // Ringkasan Kuota Cuti
  const leaveQuotaStats = useMemo(() => {
    const totalQuota = 12;
    let usedDays = 0;
    let pendingCount = 0;

    leaveRequests.forEach((req) => {
      const isApproved = req.status === 'approved' || req.status === 'disetujui';
      const isPending = req.status === 'pending' || req.status === 'menunggu';

      if (isApproved && req.leave_type === 'cuti_tahunan') {
        const days = calculateWorkDays(req.start_date, req.end_date);
        usedDays += days;
      }
      if (isPending) {
        pendingCount++;
      }
    });

    const remainingDays = Math.max(0, totalQuota - usedDays);
    const percentRemaining = Math.round((remainingDays / totalQuota) * 100);

    return {
      totalQuota,
      usedDays,
      remainingDays,
      percentRemaining,
      pendingCount
    };
  }, [leaveRequests]);

  // Filtered Leave Requests Table
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((item) => {
      if (leaveFilterStatus !== 'all') {
        if (leaveFilterStatus === 'pending' && !['pending', 'menunggu'].includes(item.status)) return false;
        if (leaveFilterStatus === 'approved' && !['approved', 'disetujui'].includes(item.status)) return false;
        if (leaveFilterStatus === 'rejected' && !['rejected', 'ditolak'].includes(item.status)) return false;
      }
      if (leaveTypeFilter !== 'all' && item.leave_type !== leaveTypeFilter) {
        return false;
      }
      if (leaveSearch.trim()) {
        const q = leaveSearch.toLowerCase();
        const reasonStr = String(item.reason || item.alasan || '').toLowerCase();
        const noStr = String(item.leave_number || item.id || '').toLowerCase();
        return reasonStr.includes(q) || noStr.includes(q);
      }
      return true;
    });
  }, [leaveRequests, leaveFilterStatus, leaveTypeFilter, leaveSearch]);

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentError(null);
    const fileMime = file.type?.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!ALLOWED_MIME_TYPES.includes(fileMime) && !isAllowedExt) {
      setAttachmentError('Format berkas tidak didukung. Format diizinkan: PDF, JPG, PNG.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAttachmentError(`Ukuran berkas (${sizeMB} MB) melebihi batas maksimal 5 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormAttachment({
        name: file.name,
        size: file.size,
        mimeType: file.type || `image/${ext}`,
        base64: reader.result
      });
    };
    reader.onerror = () => {
      setAttachmentError('Gagal membaca berkas lampiran.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Leave Form
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!formReason.trim()) {
      toast.error('Alasan pengajuan izin / cuti wajib diisi.');
      return;
    }

    setSubmittingLeave(true);
    try {
      await attendanceService.submitLeaveRequest({
        leave_type: formLeaveType,
        start_date: formStartDate,
        end_date: formEndDate,
        reason: formReason.trim(),
        attachment: formAttachment ? formAttachment.base64 : null,
        attachment_name: formAttachment ? formAttachment.name : null
      });

      toast.success('Pengajuan cuti/izin berhasil dikirim ke HRD & Kepala Sekolah.');
      setFormReason('');
      setFormAttachment(null);
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengirim pengajuan cuti/izin.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // ==========================================
  // TAB 3: PENGAJUAN LEMBUR STATE
  // ==========================================
  const [loadingOvertimes, setLoadingOvertimes] = useState(false);
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [overtimeForm, setOvertimeForm] = useState({
    overtime_date: todayIsoStr,
    start_time: '17:00',
    end_time: '20:00',
    hours: '3.0',
    task_description: ''
  });
  const [submittingOvertime, setSubmittingOvertime] = useState(false);

  const fetchMyOvertimes = useCallback(async () => {
    setLoadingOvertimes(true);
    try {
      const res = await attendanceService.getMyOvertimes();
      const list = Array.isArray(res) ? res : res?.data || [];
      setOvertimeRecords(list);
    } catch {
      setOvertimeRecords([]);
    } finally {
      setLoadingOvertimes(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'lembur') {
      fetchMyOvertimes();
    }
  }, [activeTab, fetchMyOvertimes]);

  const handleSubmitOvertime = async (e) => {
    e.preventDefault();
    if (!overtimeForm.task_description.trim()) {
      toast.error('Uraian tugas/kegiatan lembur wajib diisi.');
      return;
    }

    setSubmittingOvertime(true);
    try {
      await attendanceService.submitOvertime({
        overtime_date: overtimeForm.overtime_date,
        start_time: overtimeForm.start_time,
        end_time: overtimeForm.end_time,
        hours: parseFloat(overtimeForm.hours) || 1.0,
        task_description: overtimeForm.task_description.trim(),
        notes: overtimeForm.task_description.trim()
      });
      toast.success('Pengajuan lembur berhasil dikirim ke HRD.');
      setOvertimeForm((prev) => ({ ...prev, task_description: '' }));
      fetchMyOvertimes();
    } catch (err) {
      toast.error(err?.message || 'Gagal mengirim pengajuan lembur.');
    } finally {
      setSubmittingOvertime(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Tab Navigation Atas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pb-1 border-b border-slate-200/70 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Presensi &amp; Pengajuan Izin
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            Kehadiran harian GPS, pengajuan ketidakhadiran, dan lembur.
          </p>
        </div>

        {/* Segmented Tab Bar Ramping (Mobile & Desktop) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 w-full sm:w-auto shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTabChange('presensi')}
              className={`flex-1 sm:flex-initial h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                activeTab === 'presensi'
                  ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-slate-200/60 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'presensi' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">
                <span className="inline sm:hidden">Presensi</span>
                <span className="hidden sm:inline">Presensi Diri (GPS)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('izin')}
              className={`flex-1 sm:flex-initial h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                activeTab === 'izin'
                  ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-slate-200/60 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'izin' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">
                <span className="inline sm:hidden">Cuti / Izin</span>
                <span className="hidden sm:inline">Pengajuan Cuti / Izin</span>
              </span>
              {leaveQuotaStats.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold">
                  {leaveQuotaStats.pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('lembur')}
              className={`flex-1 sm:flex-initial h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                activeTab === 'lembur'
                  ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-slate-200/60 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'lembur' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">
                <span className="inline sm:hidden">Lembur</span>
                <span className="hidden sm:inline">Pengajuan Lembur</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KONTEN TAB 1: PRESENSI MANDIRI (F1)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'presensi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Jam, Radar Geofence, & Tombol Check-In 52px (4-5 Span) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* 1. Time & Server Status Card */}
            <Card className="p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Waktu Server Presensi</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <Compass className="w-3 h-3 text-emerald-600" />
                  {gpsStatus === 'active'
                    ? `GPS Terhubung (±${Math.round(userCoords?.accuracy || 5)}m)`
                    : 'Mencari GPS...'}
                </span>
              </div>

              {/* Live High-Precision Clock */}
              <div className="text-center py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-sans font-bold text-4xl text-slate-900 tracking-tight tnum select-none">
                  {currentTime.toLocaleTimeString('id-ID', { hour12: false })}{' '}
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">
                    WIB
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  {formatIndonesianDate(currentTime, true)} •{' '}
                  <span className="text-emerald-700 font-mono">T.A 1448 H</span>
                </p>
              </div>

              {/* Countdown / Shift Banner */}
              <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-900">
                      {workSchedule?.is_flexible
                        ? `Jadwal Fleksibel (Target ${workSchedule?.flexible_target_hours || 8} Jam)`
                        : `Batas Masuk: ${workSchedule?.start_time ? formatShortTime(workSchedule.start_time) : '07:30'} WIB`}
                    </span>
                    <p className="text-[11px] text-emerald-800">
                      {workSchedule?.name || (workSchedule?.is_flexible ? 'Bebas Jam Masuk • Akumulasi Kerja' : 'Jam Kerja Guru Reguler')}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10.5px] uppercase">
                  {workSchedule?.is_flexible ? 'Fleksibel' : 'Tepat Waktu'}
                </span>
              </div>
            </Card>

            {/* 2. Interactive Radar & Geofencing Card */}
            <Card className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {closestLocation?.name || 'Kampus Pondok Pesantren Aldepos'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Radius Toleransi Geofence: {targetRadius} meter
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isInsideRadius
                      ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-300/50'
                      : 'bg-rose-100 text-rose-800 border border-rose-300/50'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isInsideRadius ? 'bg-emerald-600' : 'bg-rose-600'}`}
                  />
                  {currentDistance !== null ? `${currentDistance} m (${isInsideRadius ? 'Radius Aman' : 'Di Luar Area'})` : 'Memeriksa Jarak...'}
                </span>
              </div>

              {/* Visual Radar Map Representation */}
              <div className="relative w-full h-52 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 select-none">
                {/* Ambient Map Grid */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Compass Overlay */}
                <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-center bg-slate-900/80 px-1.5 py-1 rounded border border-slate-700/60 text-[9px] font-mono text-emerald-400">
                  <span className="font-bold text-emerald-300">U</span>
                  <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                </div>

                {/* Concentric Geofence Rings */}
                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-pulse" />
                <div className="absolute w-32 h-32 rounded-full border border-emerald-500/30" />
                <div className="absolute w-20 h-20 rounded-full border border-dashed border-emerald-400/40" />
                <div className="absolute w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-400/60" />

                {/* Rotating Sweep Line */}
                <div className="absolute w-36 h-36 rounded-full origin-center animate-spin pointer-events-none opacity-30">
                  <div className="w-1/2 h-1/2 bg-gradient-to-br from-emerald-400/40 to-transparent" />
                </div>

                {/* School Base Center Pin */}
                <div className="absolute flex flex-col items-center pointer-events-none z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center ring-2 ring-emerald-300/40 shadow-xs">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-medium text-emerald-200 mt-0.5 bg-slate-900/80 px-1 rounded border border-emerald-900/50">
                    Gedung Utama
                  </span>
                </div>

                {/* User Location Pin */}
                {userCoords && (
                  <div className="absolute top-12 left-20 flex flex-col items-center z-20 transition-transform">
                    <div className="relative">
                      <span className="absolute -inset-1 rounded-full bg-teal-400/30 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold text-[10px] shadow-sm ring-2 ring-emerald-500">
                        <MapPin className="w-3 h-3" />
                      </div>
                    </div>
                    <span className="mt-1 bg-slate-900 text-white text-[9px] px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                      Posisi Anda ({currentDistance ?? 0}m)
                    </span>
                  </div>
                )}

                {/* GPS Coordinates HUD */}
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                  <span className="text-slate-300 truncate">
                    {userCoords ? `${userCoords.latitude.toFixed(6)}, ${userCoords.longitude.toFixed(6)}` : 'Menunggu Sinyal GPS...'}
                  </span>
                  <span className={isInsideRadius ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {isInsideRadius ? 'Radius Aman OK' : 'Di Luar Radius'}
                  </span>
                </div>
              </div>

              {/* Status & Banner Turunan */}
              {gpsStatus === 'denied' && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold">Izin Lokasi Ditolak:</strong>
                    <span>Aktifkan izin lokasi pada browser untuk dapat mencatat kehadiran.</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={requestLocation} className="text-xs py-1 px-2">
                    Coba Lagi
                  </Button>
                </div>
              )}

              {gpsStatus === 'active' && isGpsWeak && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sinyal GPS lemah (±{Math.round(userCoords.accuracy)}m). Mohon berpindah ke area terbuka.</span>
                </div>
              )}

              {/* 3 Keadaan Tombol Utama Masif (Tinggi 52px) */}
              <div className="mt-4">
                {!hasCheckedIn ? (
                  /* Keadaan 1: Pagi / Belum Masuk */
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!isInsideRadius || submittingAttendance || gpsStatus === 'denied'}
                    onClick={handleCheckIn}
                    leftIcon={<Camera className="w-5 h-5" />}
                    className={`w-full h-[52px] rounded-xl font-bold text-sm tracking-wide shadow-sm justify-center ${
                      !isInsideRadius ? 'opacity-60 cursor-not-allowed bg-slate-300 text-slate-600' : ''
                    }`}
                  >
                    {submittingAttendance
                      ? 'Menyimpan Presensi...'
                      : !isInsideRadius
                      ? `Di Luar Radius (+${currentDistance ? currentDistance - targetRadius : 0}m)`
                      : 'Catat Kehadiran Masuk'}
                  </Button>
                ) : !hasCheckedOut ? (
                  /* Keadaan 2 & 3: Sudah Masuk (Menunggu Pulang / Siap Pulang) */
                  <div className="space-y-2.5">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-900">
                            Tercatat Masuk: {formatShortTime(todayAttendance.check_in_time)} WIB
                          </span>
                          <p className="text-[11px] text-emerald-700">
                            {todayAttendance.status === 'late'
                              ? `Terlambat ${todayAttendance.late_minutes} Menit`
                              : 'Hadir Tepat Waktu'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] uppercase">
                        Hadir
                      </span>
                    </div>

                    <Button
                      variant={isTimeForCheckOut ? 'primary' : 'outline'}
                      size="lg"
                      disabled={!isTimeForCheckOut || !isInsideRadius || submittingAttendance}
                      onClick={handleCheckOut}
                      leftIcon={<Clock className="w-5 h-5" />}
                      className={`w-full h-[52px] rounded-xl font-bold text-sm tracking-wide justify-center ${
                        isTimeForCheckOut
                          ? 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      {submittingAttendance
                        ? 'Menyimpan Pulang...'
                        : isTimeForCheckOut
                        ? 'Catat Kehadiran Pulang'
                        : `Menunggu Jam Pulang (${formatShortTime(officialEndTime)} WIB)`}
                    </Button>
                  </div>
                ) : (
                  /* Keadaan 4: Sudah Selesai Check-in dan Check-out */
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-emerald-900 text-xs">Kehadiran Hari Ini Lengkap</h4>
                    <p className="text-[11px] text-emerald-700">
                      Masuk: {formatShortTime(todayAttendance.check_in_time)} WIB • Pulang: {formatShortTime(todayAttendance.check_out_time)} WIB
                    </p>
                  </div>
                )}
              </div>

              {/* Tombol Pengajuan Lupa Absen / Klarifikasi Jam Terlewat */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setClarificationModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lupa Absen? Ajukan Klarifikasi Jam Presensi</span>
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500 mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Terverifikasi Geofencing Server Aldepos</span>
              </p>
            </Card>

            {/* 3. Ketentuan Kehadiran Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 text-xs flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">Ketentuan Presensi Tenaga Pendidik:</span>
                <p className="text-[11.5px] leading-relaxed text-slate-600">
                  {workSchedule?.is_flexible
                    ? 'Skema Jam Fleksibel: Anda dapat melakukan presensi pulang kapan saja setelah presensi masuk tercatat. Durasi jam kerja dihitung secara otomatis.'
                    : `Presensi kepulangan dibuka mulai pukul ${formatShortTime(officialEndTime)} WIB. Jika terlupa melakukan presensi masuk/pulang, gunakan fitur Pengajuan Klarifikasi untuk diverifikasi oleh HRD.`}
                </p>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: 4 Metric Cards, Mini Calendar Grid, & Log Table (7-8 Span) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {/* Metric Summary Header */}
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Presensi {BULAN_INDONESIA[selectedMonth - 1]} {selectedYear}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rekapitulasi kehadiran bulan berjalan
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono tnum">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {monthlyStats.rate}% Tingkat Kehadiran
                </span>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase">Hadir Tepat Waktu</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-emerald-950 font-mono tnum">{monthlyStats.present}</span>
                    <span className="text-xs text-emerald-700">Hari</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase">Izin / Dinas</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-amber-950 font-mono tnum">{monthlyStats.leave}</span>
                    <span className="text-xs text-amber-700">Hari</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase">Sakit</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-800 font-mono tnum">{monthlyStats.sick}</span>
                    <span className="text-xs text-slate-500">Hari</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100">
                  <span className="text-[11px] font-semibold text-rose-800 uppercase">Terlambat</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-rose-950 font-mono tnum">{monthlyStats.late}</span>
                    <span className="text-xs text-rose-700">Hari</span>
                  </div>
                </div>
              </div>

              {/* Mini Calendar Grid (Hari 1-31) */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Matriks Kehadiran {BULAN_INDONESIA[selectedMonth - 1]}:
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Hadir</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Izin</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Telat</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-14 md:grid-cols-16 gap-1.5 text-center text-[10.5px]">
                  {Array.from({ length: 31 }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const rec = monthlyRecords.find((r) => r.attendance_date === dateStr);
                    const isToday = new Date().getDate() === dayNum && (new Date().getMonth() + 1) === selectedMonth;

                    let bgClass = 'bg-slate-50 text-slate-400 border border-slate-100';
                    if (rec) {
                      if (rec.status === 'present') bgClass = 'bg-emerald-100 text-emerald-900 font-semibold';
                      else if (rec.status === 'late') bgClass = 'bg-rose-100 text-rose-900 font-semibold';
                      else if (rec.status === 'leave' || rec.status === 'sick') bgClass = 'bg-amber-100 text-amber-900 font-semibold';
                    }
                    if (isToday) {
                      bgClass += ' ring-2 ring-emerald-500 font-bold';
                    }

                    return (
                      <div key={dayNum} className={`p-1 rounded ${bgClass} tnum`} title={`${dayNum} ${BULAN_INDONESIA[selectedMonth - 1]}`}>
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Filter Toolbar & Log Table */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setMonthlyFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      monthlyFilterStatus === 'all'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Semua ({monthlyRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthlyFilterStatus('present')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      monthlyFilterStatus === 'present'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Hadir ({monthlyStats.present})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthlyFilterStatus('leave')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      monthlyFilterStatus === 'leave'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Izin / Sakit ({monthlyStats.leave + monthlyStats.sick})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-44">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={monthlySearch}
                      onChange={(e) => setMonthlySearch(e.target.value)}
                      placeholder="Cari tanggal..."
                      className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Log Table */}
              {loadingMonthly ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : filteredMonthlyRecords.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarDays className="w-7 h-7 text-slate-400" />}
                  title="Belum Ada Riwayat Presensi"
                  description="Riwayat catatan absensi bulan ini akan tampil di sini."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 font-mono">
                        <th className="py-2.5 px-3.5">TANGGAL & HARI</th>
                        <th className="py-2.5 px-3">JAM MASUK</th>
                        <th className="py-2.5 px-3">JAM PULANG</th>
                        <th className="py-2.5 px-3">METODE & LOKASI</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3">CATATAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredMonthlyRecords.map((item, idx) => {
                        const isLate = item.status === 'late' || item.late_minutes > 0;
                        const isPresent = item.status === 'present' || item.check_in_time;
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {item.attendance_date ? formatIndonesianDate(item.attendance_date, false) : '-'}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {item.attendance_date ? getIndonesianDayName(item.attendance_date) : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-medium tnum whitespace-nowrap">
                              {item.check_in_time ? formatShortTime(item.check_in_time) : '--:--'} WIB
                            </td>
                            <td className="py-3 px-3 font-mono font-medium tnum whitespace-nowrap">
                              {item.check_out_time ? formatShortTime(item.check_out_time) : '--:--'} WIB
                            </td>
                            <td className="py-3 px-3 text-[11.5px] text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.matched_location_name || 'Geofence Sekolah'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {item.clarification_status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Menunggu Konfirmasi HRD
                                </span>
                              ) : item.clarification_status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Klarifikasi Disetujui
                                </span>
                              ) : item.clarification_status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-900 border border-rose-300">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Klarifikasi Ditolak
                                </span>
                              ) : isLate ? (
                                <StatusBadge status="danger" size="sm">
                                  Terlambat {item.late_minutes}m
                                </StatusBadge>
                              ) : isPresent ? (
                                <StatusBadge status="success" size="sm">
                                  Tepat Waktu
                                </StatusBadge>
                              ) : (
                                <StatusBadge status="warning" size="sm">
                                  {item.status || 'Izin'}
                                </StatusBadge>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-500 max-w-xs truncate" title={item.clarification_reason || item.notes || ''}>
                              {item.clarification_reason ? (
                                <span className="text-amber-800 font-medium">[Klarifikasi] {item.clarification_reason}</span>
                              ) : (
                                item.notes || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 2: PENGAJUAN CUTI & IZIN (F2)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'izin' && (
        <div className="space-y-6">
          {/* 1. Stat Cards Kuota Cuti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Sisa Cuti Tahunan
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 tnum">{leaveQuotaStats.remainingDays}</span>
                    <span className="text-xs font-semibold text-slate-500">Hari</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span>{leaveQuotaStats.percentRemaining}% kuota tersisa</span>
                  <span className="font-semibold text-emerald-700 tnum">
                    {leaveQuotaStats.remainingDays} / {leaveQuotaStats.totalQuota} Hari
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${leaveQuotaStats.percentRemaining}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Cuti & Izin Terpakai
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 tnum">{leaveQuotaStats.usedDays}</span>
                    <span className="text-xs font-semibold text-slate-500">Hari</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100 tnum">
                  {leaveRequests.filter(r => r.status === 'approved' || r.status === 'disetujui').length} Pengajuan Disetujui
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Dalam Proses Review
                  </span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 tnum">{leaveQuotaStats.pendingCount}</span>
                    <span className="text-xs font-semibold text-slate-500">Berkas</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Menunggu HRD / Kepsek
                </span>
              </div>
            </Card>
          </div>

          {/* 2. Grid 2 Kolom: Tabel Status (Kiri 62%) & Form Pengajuan (Kanan 38%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Tabel Riwayat Pengajuan (7-8 Span) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Filter Toolbar */}
              <Card className="p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setLeaveFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        leaveFilterStatus === 'all'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Semua ({leaveRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveFilterStatus('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        leaveFilterStatus === 'pending'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Menunggu
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveFilterStatus('approved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        leaveFilterStatus === 'approved'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Disetujui
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveFilterStatus('rejected')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        leaveFilterStatus === 'rejected'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Ditolak
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={leaveSearch}
                        onChange={(e) => setLeaveSearch(e.target.value)}
                        placeholder="Cari alasan / nomor..."
                        className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Data Table Card */}
              <Card className="overflow-hidden">
                {loadingLeaves ? (
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : filteredLeaveRequests.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<FileText className="w-8 h-8 text-slate-400" />}
                    title="Belum Ada Pengajuan Izin"
                    description="Seluruh pengajuan cuti & izin Anda akan tercatat di sini beserta status verifikasinya."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 font-mono">
                          <th className="py-3 px-4">NO. PENGAJUAN</th>
                          <th className="py-3 px-4">TIPE & KEPERLUAN</th>
                          <th className="py-3 px-4">RENTANG TANGGAL</th>
                          <th className="py-3 px-3 text-center">DURASI</th>
                          <th className="py-3 px-4">STATUS</th>
                          <th className="py-3 px-4 text-right">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filteredLeaveRequests.map((item) => {
                          const isPending = item.status === 'pending' || item.status === 'menunggu';
                          const isApproved = item.status === 'approved' || item.status === 'disetujui';
                          const isRejected = item.status === 'rejected' || item.status === 'ditolak';
                          const dur = calculateWorkDays(item.start_date, item.end_date);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-emerald-700">
                                  #{item.leave_number || `IZN-${item.id}`}
                                </span>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {item.created_at ? formatIndonesianDate(item.created_at, false) : '-'}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 capitalize">
                                  {String(item.leave_type || 'Izin').replace('_', ' ')}
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px] mt-0.5">
                                  {item.reason || item.alasan || '-'}
                                </p>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {item.start_date ? formatIndonesianDate(item.start_date, false) : '-'} s/d{' '}
                                  {item.end_date ? formatIndonesianDate(item.end_date, false) : '-'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 tnum">
                                  {dur} Hari
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {isPending && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Menunggu HRD
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Disetujui
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    Ditolak
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLeaveDetail(item)}
                                  className="text-xs p-1.5 text-slate-600 hover:text-slate-900"
                                  title="Lihat Detail"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Kolom Kanan: Form Pengajuan Baru (4-5 Span) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Formulir Pengajuan Izin
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lengkapi permohonan ketidakhadiran dinas / cuti.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Semester Aktif
                  </span>
                </div>

                <form onSubmit={handleSubmitLeave} className="mt-4 space-y-4">
                  {/* Field 1: Tipe Permohonan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Tipe Permohonan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formLeaveType}
                      onChange={(e) => setFormLeaveType(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                    >
                      {LEAVE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field 2: Rentang Tanggal */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Rentang Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-0.5">Mulai</span>
                        <input
                          type="date"
                          value={formStartDate}
                          onChange={(e) => setFormStartDate(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-0.5">Selesai</span>
                        <input
                          type="date"
                          value={formEndDate}
                          min={formStartDate}
                          onChange={(e) => setFormEndDate(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 tnum">
                        <Clock className="w-3 h-3 text-emerald-700" />
                        Durasi: {calculatedWorkDays} Hari Kerja
                      </span>
                    </div>
                  </div>

                  {/* Field 3: Alasan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Alasan & Keterangan <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">Maks. 250 kata</span>
                    </div>
                    <textarea
                      rows={3}
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder="Tuliskan keterangan detail keperluan izin..."
                      className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 resize-none"
                    />
                  </div>

                  {/* Field 4: Lampiran Dokumen */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-800">
                        Lampiran Surat / Bukti (PDF, JPG maks 5 MB)
                      </label>
                    </div>

                    {formAttachment ? (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {formAttachment.name}
                            </p>
                            <span className="text-[10.5px] text-slate-400">
                              {(formAttachment.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormAttachment(null)}
                          className="w-6 h-6 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/30 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Pilih Berkas Lampiran</span>
                        <span className="text-[10.5px] text-slate-400 mt-0.5">PDF, PNG, JPG (Maks 5 MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}

                    {attachmentError && (
                      <p className="text-xs text-rose-600 mt-1">{attachmentError}</p>
                    )}
                  </div>

                  {/* Tombol Aksi Form */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setFormReason('');
                        setFormAttachment(null);
                      }}
                      className="w-1/3 text-xs rounded-lg py-2"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={submittingLeave}
                      leftIcon={<Send className="w-4 h-4" />}
                      className="w-2/3 text-xs rounded-lg py-2 font-bold justify-center"
                    >
                      {submittingLeave ? 'Mengirim...' : 'Kirim Pengajuan'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 3: PENGAJUAN LEMBUR MANDIRI GURU                               */}
      {/* ========================================================================= */}
      {activeTab === 'lembur' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Riwayat Pengajuan Lembur Pribadi (8 Kolom) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Lembur Saya</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar permohonan lembur mandiri dan status persetujuan dari HRD / Kepala Sekolah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchMyOvertimes}
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors self-start sm:self-auto"
                  title="Muat Ulang"
                >
                  <RotateCw className={`w-4 h-4 ${loadingOvertimes ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>

              {loadingOvertimes ? (
                <div className="py-12 text-center text-slate-400">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs">Memuat riwayat lembur...</p>
                </div>
              ) : overtimeRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">Belum Ada Pengajuan Lembur</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                    Silakan gunakan formulir di samping untuk mengajukan penugasan lembur di luar jam dinas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Tanggal Lembur</th>
                        <th className="py-2.5 px-3">Jam & Durasi</th>
                        <th className="py-2.5 px-3">Uraian Tugas</th>
                        <th className="py-2.5 px-3">Status HRD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overtimeRecords.map((ov) => (
                        <tr key={ov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-medium text-slate-800">
                            {formatIndonesianDate(ov.overtime_date, false)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-emerald-700">{parseFloat(ov.hours || 0).toFixed(1)} Jam</span>
                            {ov.start_time && ov.end_time && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {ov.start_time.slice(0, 5)} - {ov.end_time.slice(0, 5)} WIB
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <p className="text-slate-700 line-clamp-2">{ov.task_description || ov.notes || '-'}</p>
                            {ov.rejection_reason && (
                              <p className="text-[10.5px] text-rose-600 font-medium mt-0.5">
                                Catatan Ditolak: {ov.rejection_reason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {ov.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Disetujui
                              </span>
                            ) : ov.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" /> Ditolak
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" /> Menunggu HRD
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Kolom Kanan: Form Pengajuan Lembur (4 Kolom) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 border-t-2 border-t-emerald-600">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Clock className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Formulir Pengajuan Lembur</h3>
              </div>

              <form onSubmit={handleSubmitOvertime} className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Tanggal Lembur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={overtimeForm.overtime_date}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, overtime_date: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Jam Mulai (WIB)</label>
                    <input
                      type="time"
                      value={overtimeForm.start_time}
                      onChange={(e) => {
                        const st = e.target.value;
                        const et = overtimeForm.end_time || '20:00';
                        const startParts = st.split(':');
                        const endParts = et.split(':');
                        const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] || 0, 10);
                        const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10);
                        const diff = endMin >= startMin ? (endMin - startMin) / 60 : ((24 * 60 - startMin) + endMin) / 60;
                        setOvertimeForm({ ...overtimeForm, start_time: st, hours: String(Math.max(0.5, parseFloat(diff.toFixed(2)))) });
                      }}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Jam Selesai (WIB)</label>
                    <input
                      type="time"
                      value={overtimeForm.end_time}
                      onChange={(e) => {
                        const et = e.target.value;
                        const st = overtimeForm.start_time || '17:00';
                        const startParts = st.split(':');
                        const endParts = et.split(':');
                        const startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] || 0, 10);
                        const endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10);
                        const diff = endMin >= startMin ? (endMin - startMin) / 60 : ((24 * 60 - startMin) + endMin) / 60;
                        setOvertimeForm({ ...overtimeForm, end_time: et, hours: String(Math.max(0.5, parseFloat(diff.toFixed(2)))) });
                      }}
                      className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Durasi Total (Jam) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    required
                    value={overtimeForm.hours}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Uraian Tugas / Kegiatan Lembur <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={overtimeForm.task_description}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, task_description: e.target.value })}
                    placeholder="Contoh: Koreksi ujian santri, pendampingan ekstrakurikuler sore..."
                    className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingOvertime}
                    leftIcon={<Send className="w-4 h-4" />}
                    className="w-full text-xs rounded-lg py-2 font-bold justify-center"
                  >
                    {submittingOvertime ? 'Mengirim...' : 'Kirim Pengajuan Lembur'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Detail Pengajuan */}
      {selectedLeaveDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  #{selectedLeaveDetail.leave_number || `IZN-${selectedLeaveDetail.id}`}
                </span>
                <h3 className="text-base font-bold text-slate-900 capitalize">
                  {String(selectedLeaveDetail.leave_type || 'Izin').replace('_', ' ')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaveDetail(null)}
                className="w-7 h-7 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Rentang Tanggal & Durasi:</span>
                <p className="font-semibold text-slate-800">
                  {formatIndonesianDate(selectedLeaveDetail.start_date, false)} s/d{' '}
                  {formatIndonesianDate(selectedLeaveDetail.end_date, false)}{' '}
                  <span className="text-slate-500 font-normal">
                    ({calculateWorkDays(selectedLeaveDetail.start_date, selectedLeaveDetail.end_date)} Hari Kerja)
                  </span>
                </p>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Alasan:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {selectedLeaveDetail.reason || selectedLeaveDetail.alasan || '-'}
                </p>
              </div>

              {selectedLeaveDetail.notes && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Catatan Pimpinan / HRD:</span>
                  <p className="text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/70">
                    {selectedLeaveDetail.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLeaveDetail(null)}
                className="text-xs rounded-lg"
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODAL: PENGAJUAN KLARIFIKASI LUPA ABSEN (CATATAN HRD)
          ========================================================================= */}
      {clarificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Klarifikasi Presensi Terlewat / Lupa Absen
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Informasikan jam masuk/pulang riil untuk dikonfirmasi oleh HRD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClarificationModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClarification} className="mt-4 space-y-4">
              {/* Jenis Masalah / Terlewat */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Jenis Presensi Terlewat <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'manual_forgot_in', label: 'Lupa Masuk', desc: 'Sudah di lokasi tapi lupa check-in' },
                    { id: 'manual_forgot_out', label: 'Lupa Pulang', desc: 'Pulang tapi lupa check-out' },
                    { id: 'manual_correction', label: 'Lupa Keduanya', desc: 'Lupa absen seharian penuh' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setClarificationForm({ ...clarificationForm, entry_type: t.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        clarificationForm.entry_type === t.id
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-1 ring-amber-500 font-bold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggal Absensi */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Tanggal Presensi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={clarificationForm.attendance_date}
                  onChange={(e) => setClarificationForm({ ...clarificationForm, attendance_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
              </div>

              {/* Jam Masuk & Jam Pulang Riil */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Jam Masuk Sebenarnya
                  </label>
                  <input
                    type="time"
                    required={clarificationForm.entry_type !== 'manual_forgot_out'}
                    value={clarificationForm.check_in_time}
                    onChange={(e) => setClarificationForm({ ...clarificationForm, check_in_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Jam Pulang Sebenarnya
                  </label>
                  <input
                    type="time"
                    required={clarificationForm.entry_type !== 'manual_forgot_in'}
                    value={clarificationForm.check_out_time}
                    onChange={(e) => setClarificationForm({ ...clarificationForm, check_out_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Alasan / Catatan Klarifikasi */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Alasan / Keterangan Terlewat <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={clarificationForm.clarification_reason}
                  onChange={(e) => setClarificationForm({ ...clarificationForm, clarification_reason: e.target.value })}
                  placeholder="Contoh: Langsung mendampingi santri upacara bendera di lapangan sehingga lupa presensi masuk di aplikasi..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400 resize-none"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Catatan ini akan diteruskan ke Tim HRD/Kepala Unit untuk diverifikasi dan dikonfirmasi.
                </p>
              </div>

              {/* Banner Info Verifikasi */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  Data ini akan ditandai dengan status <strong>"Menunggu Konfirmasi HRD"</strong> sebelum diresmikan ke rekap kehadiran bulanan.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClarificationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingClarification}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingClarification ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Klarifikasi ke HRD</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
