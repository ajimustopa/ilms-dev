import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { attendanceService } from '../services/attendanceService';
import { formatIndonesianDate, getGreetingByTime, formatShortTime, HARI_INDONESIA, BULAN_INDONESIA } from '../utils/dateHelper';
import {
  Button,
  Card,
  ListItem,
  StatusBadge,
  FormField,
  Input,
  Textarea,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  PageHeader,
  SelectorKonteks,
  useToast
} from '../components';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Navigation,
  ShieldCheck,
  Calendar,
  Info,
  ChevronRight,
  Sparkles,
  Lock,
  Building,
  HelpCircle
} from 'lucide-react';

export default function AbsensiPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, activeSchoolUnit } = useTeacherAuth();

  // 1. Current Time & Status Data
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingToday, setLoadingToday] = useState(true);
  const [todayData, setTodayData] = useState(null);
  const [todayError, setTodayError] = useState(null);

  // 2. Geolocation State
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'locating' | 'active' | 'denied' | 'unavailable' | 'timeout'
  const [userCoords, setUserCoords] = useState(null); // { latitude, longitude, accuracy }
  const [gpsErrorMessage, setGpsErrorMessage] = useState(null);

  // 3. Action State (Check-in / Check-out)
  const [notes, setNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // 4. Monthly History State
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [monthlyError, setMonthlyError] = useState(null);

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance status
  const fetchTodayStatus = useCallback(async () => {
    setLoadingToday(true);
    setTodayError(null);
    try {
      const res = await attendanceService.getTodayStatus();
      const data = res?.data || res || {};
      setTodayData(data);
    } catch (err) {
      setTodayError(err?.message || 'Gagal memuat status presensi hari ini');
      setTodayData(null);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // Request GPS Geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMessage('Peramban web ini tidak mendukung fitur Geolocation GPS.');
      return;
    }

    setGpsStatus('locating');
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ latitude, longitude, accuracy });
        setGpsStatus('active');
        setGpsErrorMessage(null);
      },
      (error) => {
        setUserCoords(null);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
          setGpsErrorMessage('Izin akses lokasi ditolak oleh browser/perangkat Anda.');
        } else if (error.code === error.TIMEOUT) {
          setGpsStatus('timeout');
          setGpsErrorMessage('Waktu permintaan lokasi GPS habis. Pastikan sinyal GPS aktif.');
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

  // Fetch Monthly History
  const fetchMonthlyHistory = useCallback(async (month, year) => {
    setLoadingMonthly(true);
    setMonthlyError(null);
    try {
      // Calculate date_from & date_to
      const lastDay = new Date(year, month, 0).getDate();
      const monthStr = String(month).padStart(2, '0');
      const date_from = `${year}-${monthStr}-01`;
      const date_to = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const res = await attendanceService.getMonthlyAttendance({ date_from, date_to });
      const list = Array.isArray(res) ? res : (res?.attendances || res?.data || []);
      setMonthlyHistory(list);
    } catch (err) {
      setMonthlyError(err?.message || 'Gagal memuat riwayat kehadiran bulanan');
      setMonthlyHistory([]);
    } finally {
      setLoadingMonthly(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    requestLocation();
  }, [fetchTodayStatus, requestLocation]);

  useEffect(() => {
    fetchMonthlyHistory(selectedMonth, selectedYear);
  }, [fetchMonthlyHistory, selectedMonth, selectedYear]);

  // Helper Jarak Visual Haversine (Hanya untuk indikator UI panduan visual)
  const calculateVisualDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
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
  };

  // Evaluasi lokasi terdekat dari master locations
  const locations = todayData?.locations || [];
  const closestLocationInfo = useMemo(() => {
    if (!userCoords || locations.length === 0) return null;
    let closest = null;
    let minDistance = Infinity;

    locations.forEach((loc) => {
      if (loc.latitude && loc.longitude) {
        const d = calculateVisualDistance(
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
    return closest;
  }, [userCoords, locations]);

  const isVisuallyWithinRadius = closestLocationInfo
    ? closestLocationInfo.distanceMeters <= (closestLocationInfo.radius_meters || 100)
    : false;

  const attendance = todayData?.attendance;
  const workSchedule = todayData?.work_schedule;
  const hasCheckedIn = Boolean(attendance?.check_in_time);
  const hasCheckedOut = Boolean(attendance?.check_out_time);

  // Handle Check-In Submission
  const handleCheckIn = async () => {
    if (!userCoords) {
      toast.error('Lokasi GPS belum terdeteksi. Harap izinkan akses lokasi.', 'Akses Ditolak');
      return;
    }

    setSubmittingAction(true);
    try {
      const payload = {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        accuracy_meters: userCoords.accuracy,
        device_info: navigator.userAgent?.slice(0, 150) || 'Mobile Browser',
        notes: notes.trim() || undefined
      };

      const res = await attendanceService.checkIn(payload);
      toast.success('Presensi masuk berhasil dicatat secara resmi!', 'Check-In Sukses');
      setNotes('');
      fetchTodayStatus();
      fetchMonthlyHistory(selectedMonth, selectedYear);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan presensi masuk', 'Presensi Ditolak');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Check-Out Submission
  const handleCheckOut = async () => {
    if (!attendance?.id) {
      toast.error('Data presensi masuk belum ditemukan.', 'Error');
      return;
    }
    if (!userCoords) {
      toast.error('Lokasi GPS belum terdeteksi. Harap izinkan akses lokasi.', 'Akses Ditolak');
      return;
    }

    setSubmittingAction(true);
    try {
      const payload = {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        accuracy_meters: userCoords.accuracy,
        device_info: navigator.userAgent?.slice(0, 150) || 'Mobile Browser',
        notes: notes.trim() || undefined
      };

      await attendanceService.checkOut(attendance.id, payload);
      toast.success('Presensi pulang berhasil dicatat secara resmi!', 'Check-Out Sukses');
      setNotes('');
      fetchTodayStatus();
      fetchMonthlyHistory(selectedMonth, selectedYear);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal melakukan presensi pulang', 'Presensi Ditolak');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Ringkasan Kehadiran Bulanan
  const monthlySummary = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    monthlyHistory.forEach((att) => {
      if (att.status === 'present') {
        present += 1;
        if (att.is_late || att.late_minutes > 0) late += 1;
      } else if (att.status === 'leave' || att.status === 'sick' || att.status === 'permit') {
        leave += 1;
      } else if (att.status === 'absent') {
        absent += 1;
      }
    });

    return { present, late, leave, absent, total: monthlyHistory.length };
  }, [monthlyHistory]);

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title="Presensi Kehadiran Guru"
        subtitle="Verifikasi Geolocation GPS & Jam Kerja Shift"
        badge={
          <StatusBadge
            status={hasCheckedIn ? (hasCheckedOut ? 'indigo' : 'success') : 'warning'}
            size="sm"
          >
            {hasCheckedIn ? (hasCheckedOut ? 'Presensi Lengkap' : 'Sudah Masuk') : 'Belum Absen'}
          </StatusBadge>
        }
        actions={<SelectorKonteks />}
      />

      {/* 2. Jam Digital & Shift Kerja */}
      <Card ribbon="emerald" className="text-center py-4 space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {formatIndonesianDate(currentTime, true)}
        </p>

        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight my-1">
          {hours}:{minutes}:<span className="text-emerald-600 dark:text-emerald-400 text-2xl sm:text-3xl">{seconds}</span>
          <span className="text-xs font-sans font-bold text-slate-400 ml-2">WIB</span>
        </div>

        {workSchedule ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {workSchedule.shift_name || 'Shift Reguler'}: {formatShortTime(workSchedule.start_time)} - {formatShortTime(workSchedule.end_time)} WIB
            </span>
            {workSchedule.late_tolerance_minutes > 0 && (
              <span className="text-[10px] text-slate-500">(Toleransi {workSchedule.late_tolerance_minutes}m)</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jadwal kerja standar: 07:00 - 15:30 WIB
          </p>
        )}
      </Card>

      {/* 3. Panel Status Kehadiran Hari Ini (Check-in & Check-out) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Status Kehadiran Hari Ini</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Hasil rekapitulasi sesi kerja hari ini</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTodayStatus}
            disabled={loadingToday}
            leftIcon={<RotateCw className={`w-3.5 h-3.5 ${loadingToday ? 'animate-spin' : ''}`} />}
            className="text-xs min-h-[36px] text-slate-600"
          >
            Segarkan
          </Button>
        </div>

        {loadingToday ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : todayError ? (
          <ErrorState
            compact
            title="Gagal Memuat Status Presensi"
            message={todayError}
            onRetry={fetchTodayStatus}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kartu Masuk */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Presensi Masuk</span>
                {hasCheckedIn ? (
                  <StatusBadge
                    status={attendance?.status === 'late' || attendance?.late_minutes > 0 ? 'danger' : 'success'}
                    size="sm"
                  >
                    {attendance?.status === 'late' || attendance?.late_minutes > 0
                      ? `Terlambat ${attendance.late_minutes}m`
                      : 'Tepat Waktu'}
                  </StatusBadge>
                ) : (
                  <StatusBadge status="warning" size="sm">Belum Masuk</StatusBadge>
                )}
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {attendance?.check_in_time ? formatShortTime(attendance.check_in_time) : '--:--'} <span className="text-xs font-sans font-normal text-slate-500">WIB</span>
              </p>
              {hasCheckedIn && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Lokasi: {attendance?.matched_location_name || 'Titik Sekolah'} (±{attendance?.check_in_distance_meters || 0}m)
                </p>
              )}
            </div>

            {/* Kartu Pulang */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Presensi Pulang</span>
                {hasCheckedOut ? (
                  <StatusBadge status="info" size="sm">Tercatat Pulang</StatusBadge>
                ) : (
                  <StatusBadge status="neutral" size="sm">Belum Pulang</StatusBadge>
                )}
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {attendance?.check_out_time ? formatShortTime(attendance.check_out_time) : '--:--'} <span className="text-xs font-sans font-normal text-slate-500">WIB</span>
              </p>
              {hasCheckedOut && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Lokasi: {attendance?.matched_location_name || 'Titik Sekolah'} (±{attendance?.check_out_distance_meters || 0}m)
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 4. Geolocation GPS & Tombol Presensi */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Verifikasi Lokasi & Aksi Absensi</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Deteksi titik koordinat perangkat</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            disabled={gpsStatus === 'locating'}
            leftIcon={<Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />}
            className="text-xs min-h-[36px]"
          >
            {gpsStatus === 'locating' ? 'Mencari GPS...' : 'Perbarui Lokasi'}
          </Button>
        </div>

        {/* Status Geolocation Box */}
        {gpsStatus === 'denied' ? (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Akses Izin Lokasi Perangkat Ditolak</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Browser Anda menolak izin lokasi. Untuk melakukan presensi resmi:
            </p>
            <ol className="text-xs text-rose-700 dark:text-rose-300 list-decimal list-inside space-y-1 pl-1">
              <li>Ketuk ikon gembok / pengaturan di samping bilah URL browser Anda.</li>
              <li>Pilih <strong>Izin Situs (Permissions)</strong> lalu aktifkan <strong>Lokasi (Location)</strong> ke 'Izinkan (Allow)'.</li>
              <li>Ketuk tombol 'Perbarui Lokasi' di atas.</li>
            </ol>
          </div>
        ) : gpsStatus === 'unavailable' || gpsStatus === 'timeout' ? (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sinyal GPS Lemah atau Tidak Tersedia</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {gpsErrorMessage || 'Perangkat tidak dapat mengunci titik koordinat satelit GPS.'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Pastikan GPS diaktifkan dalam mode akurasi tinggi dan Anda tidak berada di ruang bawah tanah/terhalang tembok tebal.
            </p>
          </div>
        ) : locations.length === 0 && !loadingToday ? (
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Lokasi Sekolah Belum Didaftarkan</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Master titik lokasi presensi untuk unit kerja ini belum diatur oleh HRD/Kepegawaian. Silakan hubungi bagian tata usaha/kepegawaian.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Box Info Jarak Visual */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Titik Sekolah Terdekat:</span>
                </span>
                {closestLocationInfo ? (
                  <StatusBadge
                    status={isVisuallyWithinRadius ? 'success' : 'danger'}
                    size="sm"
                  >
                    {isVisuallyWithinRadius ? 'Di Dalam Radius' : 'Di Luar Radius'}
                  </StatusBadge>
                ) : (
                  <StatusBadge status="neutral" size="sm">Menghitung...</StatusBadge>
                )}
              </div>

              {closestLocationInfo ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {closestLocationInfo.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Perkiraan Jarak Anda: <strong className="text-slate-900 dark:text-slate-100 font-mono">±{closestLocationInfo.distanceMeters} meter</strong> (Batas Radius: {closestLocationInfo.radius_meters}m)
                  </p>
                  {userCoords?.accuracy && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Akurasi GPS: ±{Math.round(userCoords.accuracy)} meter
                      {userCoords.accuracy > 100 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1 font-sans font-medium">
                          (Sinyal kurang presisi, disarankan berada di area terbuka)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {gpsStatus === 'locating' ? 'Sedang mengukur jarak koordinat ke titik sekolah...' : 'Lokasi GPS siap.'}
                </p>
              )}

              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                * Catatan: Indikator jarak di atas adalah estimasi visual peramban. Keputusan resmi validasi radius dihitung ketat secara server-side saat tombol ditekan.
              </p>
            </div>

            {/* Input Catatan Opsional */}
            {!hasCheckedOut && (
              <FormField label="Catatan Presensi (Opsional)" helperText="Misal: Tugas piket pagi, kunjungan luar, atau dinas dalam.">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ketik catatan kehadiran jika ada..."
                />
              </FormField>
            )}

            {/* Tombol Absensi Utama */}
            <div className="pt-2">
              {!hasCheckedIn ? (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={submittingAction}
                  disabled={gpsStatus !== 'active' || !userCoords}
                  onClick={handleCheckIn}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                >
                  Absen Masuk (Check-In) Sekarang
                </Button>
              ) : !hasCheckedOut ? (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={submittingAction}
                  disabled={gpsStatus !== 'active' || !userCoords}
                  onClick={handleCheckOut}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  Absen Pulang (Check-Out) Sekarang
                </Button>
              ) : (
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Presensi Hari Ini Sudah Lengkap</span>
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    Terima kasih atas dedikasi Anda dalam mendidik santri hari ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 5. Rekapitulasi Riwayat Kehadiran Bulanan */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Riwayat Kehadiran Bulanan</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Rekapitulasi absensi mandiri</p>
            </div>
          </div>

          {/* Filter Bulan & Tahun */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              aria-label="Pilih Bulan"
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 min-h-[38px] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {BULAN_INDONESIA.map((bln, idx) => (
                <option key={idx} value={idx + 1}>
                  {bln}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Pilih Tahun"
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 min-h-[38px] text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Mini Bulanan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-center">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">Hadir</span>
            <span className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">{monthlySummary.present}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 text-center">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block">Terlambat</span>
            <span className="text-lg font-extrabold text-rose-900 dark:text-rose-100 font-mono">{monthlySummary.late}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-center">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block">Izin/Cuti</span>
            <span className="text-lg font-extrabold text-amber-900 dark:text-amber-100 font-mono">{monthlySummary.leave}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">Total Hari</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono">{monthlySummary.total}</span>
          </div>
        </div>

        {/* Daftar Kartu Kehadiran */}
        <div>
          {loadingMonthly ? (
            <SkeletonList count={4} />
          ) : monthlyError ? (
            <ErrorState
              compact
              title="Gagal Memuat Riwayat"
              message={monthlyError}
              onRetry={() => fetchMonthlyHistory(selectedMonth, selectedYear)}
            />
          ) : monthlyHistory.length === 0 ? (
            <EmptyState
              compact
              icon={<Calendar className="w-5 h-5 text-slate-400" />}
              title="Belum Ada Data Presensi Bulan Ini"
              description={`Tidak ditemukan catatan presensi pada periode ${BULAN_INDONESIA[selectedMonth - 1]} ${selectedYear}.`}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-0.5">
              {monthlyHistory.map((row) => {
                const dateObj = new Date(row.attendance_date);
                const dayName = HARI_INDONESIA[dateObj.getDay()] || '';
                const dateNum = dateObj.getDate();
                const isLate = row.is_late || row.late_minutes > 0;

                return (
                  <div
                    key={row.id}
                    className="py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors flex items-center justify-between gap-3 min-h-[44px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{dayName.slice(0, 3)}</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono leading-none">{dateNum}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {formatIndonesianDate(row.attendance_date, true)}
                          </p>
                          <StatusBadge
                            status={row.status === 'present' ? (isLate ? 'danger' : 'success') : (row.status === 'leave' ? 'warning' : 'neutral')}
                            size="sm"
                          >
                            {row.status === 'present'
                              ? (isLate ? `Terlambat ${row.late_minutes}m` : 'Hadir Tepat')
                              : (row.status === 'leave' ? 'Izin/Cuti' : 'Alpa')}
                          </StatusBadge>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          <span>Masuk: <strong className="text-slate-700 dark:text-slate-300">{formatShortTime(row.check_in_time)}</strong></span>
                          <span>•</span>
                          <span>Pulang: <strong className="text-slate-700 dark:text-slate-300">{formatShortTime(row.check_out_time)}</strong></span>
                        </div>

                        {row.check_in_notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 italic">
                            "{row.check_in_notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono block">
                        ±{row.check_in_distance_meters || 0}m
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
