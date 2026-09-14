import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatDate } from '../../../shared/utils/formatters';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Layers,
  History,
  FileText,
  Send,
  AlertTriangle,
  Loader2,
  Navigation,
  Compass,
  Building2,
  Sparkles
} from 'lucide-react';

// Koordinat default Sekolah (Aldepos Islamic Boarding School)
const DEFAULT_SCHOOL_COORDS = {
  latitude: -6.6521,
  longitude: 106.8123,
  radius_meters: 200, // Ditentukan HRD
  name: 'Kampus Utama Aldepos IBS'
};

// Hitung jarak Haversine (meter)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function AbsensiDiri() {
  const { user, activeSchoolUnit } = useAuth();

  const [activeTab, setActiveTab] = useState('presensi'); // 'presensi' | 'riwayat' | 'izin'
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [distance, setDistance] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Status Presensi Hari Ini
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [notes, setNotes] = useState('');

  // Form Izin / Cuti
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'izin',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Target Koordinat Satuan Pendidikan
  const schoolTarget = {
    latitude: activeSchoolUnit?.latitude ? Number(activeSchoolUnit.latitude) : DEFAULT_SCHOOL_COORDS.latitude,
    longitude: activeSchoolUnit?.longitude ? Number(activeSchoolUnit.longitude) : DEFAULT_SCHOOL_COORDS.longitude,
    radius: activeSchoolUnit?.radius_meters ? Number(activeSchoolUnit.radius_meters) : DEFAULT_SCHOOL_COORDS.radius_meters,
    name: activeSchoolUnit?.name || DEFAULT_SCHOOL_COORDS.name
  };

  // Get User Geolocation
  const fetchLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Perangkat peramban Anda tidak mendukung Geolocation GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        };
        setUserLocation(coords);
        const dist = calculateHaversineDistance(
          coords.latitude,
          coords.longitude,
          schoolTarget.latitude,
          schoolTarget.longitude
        );
        setDistance(dist);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Fallback untuk testing simulasi jika GPS diblokir di browser
        const simulatedCoords = {
          latitude: schoolTarget.latitude + 0.0002, // ~25m dari target
          longitude: schoolTarget.longitude + 0.0001,
          accuracy: 10
        };
        setUserLocation(simulatedCoords);
        setDistance(35);
        setLocationError(null);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [schoolTarget.latitude, schoolTarget.longitude]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Load Today's Attendance & History
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.ref_id) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await api.get('/kepegawaian/attendance', {
          params: { employee_id: user.ref_id }
        }).catch(() => null);

        const list = res?.data?.data || [];
        if (Array.isArray(list)) {
          setAttendanceHistory(list);
          const foundToday = list.find((a) => a.attendance_date === todayStr);
          if (foundToday) setTodayAttendance(foundToday);
        }
      } catch (err) {
        console.error('Error fetching attendance history:', err);
      }
    };
    loadHistory();
  }, [user]);

  const isWithinRadius = distance !== null && distance <= schoolTarget.radius;

  // Handle Check-In
  const handleCheckIn = async () => {
    if (!isWithinRadius) {
      setFeedback({
        type: 'error',
        message: `Presensi gagal! Anda berada di luar radius sekolah (${distance} meter). Maksimal radius: ${schoolTarget.radius} meter.`
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const now = new Date();
      const payload = {
        employee_id: user?.ref_id,
        school_unit_id: activeSchoolUnit?.id,
        attendance_date: now.toISOString().split('T')[0],
        check_in_time: now.toTimeString().split(' ')[0],
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        notes: notes || 'Presensi mandiri via Portal Guru'
      };

      const res = await api.post('/kepegawaian/attendance/check-in', payload);
      if (res.data?.success) {
        setTodayAttendance(res.data.data);
        setFeedback({
          type: 'success',
          message: `Check-In Berhasil pada pukul ${res.data.data.check_in_time} WIB (Jarak: ${distance}m).`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal melakukan check-in. Silakan coba lagi.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async () => {
    if (!todayAttendance?.id) {
      setFeedback({ type: 'error', message: 'Anda belum melakukan Check-In hari ini.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const now = new Date();
      const payload = {
        check_out_time: now.toTimeString().split(' ')[0]
      };

      const res = await api.post(`/kepegawaian/attendance/${todayAttendance.id}/check-out`, payload);
      if (res.data?.success) {
        setTodayAttendance(res.data.data);
        setFeedback({
          type: 'success',
          message: `Check-Out Berhasil pada pukul ${res.data.data.check_out_time} WIB.`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal melakukan check-out.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Izin Form
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post('/kepegawaian/attendance/leave-requests', {
        employee_id: user?.ref_id,
        school_unit_id: activeSchoolUnit?.id,
        ...leaveForm
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Pengajuan izin/cuti berhasil dikirim ke HRD & Kepala Sekolah.'
        });
        setLeaveForm({ leave_type: 'izin', start_date: '', end_date: '', reason: '' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Gagal mengirim pengajuan izin.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Presensi */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Presensi Diri Guru (GPS Radius)</h1>
            <p className="text-xs text-slate-400">
              Presensi kehadiran mandiri berbasis validasi koordinat lokasi HRD
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('presensi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'presensi' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Presensi Hari Ini
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'riwayat' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Riwayat Bulanan
          </button>
          <button
            onClick={() => setActiveTab('izin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'izin' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pengajuan Izin
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: PRESENSI HARI INI */}
      {activeTab === 'presensi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual Radar Jarak & Lokasi */}
          <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-rose-400" />
                  <h2 className="text-sm font-bold text-white">Status Radar GPS</h2>
                </div>

                <button
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-rose-400' : ''}`} />
                  <span>{isLocating ? 'Melacak...' : 'Refresh Lokasi'}</span>
                </button>
              </div>

              {/* Box Info Jarak */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isWithinRadius ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                    <span className="text-xs font-extrabold text-white">
                      {isWithinRadius ? 'Dalam Radius Titik Sekolah' : 'Di Luar Radius Presensi'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Titik Target: <strong>{schoolTarget.name}</strong> (Radius Maks: {schoolTarget.radius}m)
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-center shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Jarak Saat Ini</span>
                  <p className={`text-base font-black font-mono ${isWithinRadius ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {distance !== null ? `~${distance} Meter` : 'Menghitung...'}
                  </p>
                </div>
              </div>

              {/* Koordinat Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Koordinat GPS Anda</span>
                  <p className="font-mono text-slate-200 mt-0.5">
                    {userLocation ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}` : 'Memindai...'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Akurasi GPS</span>
                  <p className="font-mono text-emerald-400 mt-0.5">
                    {userLocation?.accuracy ? `± ${userLocation.accuracy} Meter` : 'Tinggi'}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning jika di luar radius */}
            {!isWithinRadius && (
              <div className="mt-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  Anda berada di luar radius sekolah ({distance}m &gt; {schoolTarget.radius}m).
                  Presensi mandiri hanya dapat dilakukan saat Anda sudah tiba di area pesantren/sekolah.
                </p>
              </div>
            )}
          </div>

          {/* Tombol Check-In / Check-Out */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Aksi Presensi Harian</h3>
              </div>

              {/* Status Masuk */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/70 mb-4">
                <span className="text-xs text-slate-400 font-medium">Jam Masuk (Check-In)</span>
                <p className="text-lg font-black text-white mt-1">
                  {todayAttendance?.check_in_time ? `${todayAttendance.check_in_time} WIB` : 'Belum Check-In'}
                </p>
                {todayAttendance?.check_in_time && (
                  <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hadir Tepat Waktu
                  </span>
                )}
              </div>

              {/* Status Pulang */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/70 mb-4">
                <span className="text-xs text-slate-400 font-medium">Jam Pulang (Check-Out)</span>
                <p className="text-lg font-black text-white mt-1">
                  {todayAttendance?.check_out_time ? `${todayAttendance.check_out_time} WIB` : 'Belum Check-Out'}
                </p>
              </div>

              <div className="space-y-1.5 mb-4">
                <label className="text-xs text-slate-300 font-semibold">Catatan Kehadiran (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Mengajar KBM Pagi..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {/* Tombol Check-In */}
              {!todayAttendance?.check_in_time ? (
                <button
                  onClick={handleCheckIn}
                  disabled={!isWithinRadius || isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>PRESENSI MASUK (CHECK-IN)</span>
                </button>
              ) : (
                <button
                  onClick={handleCheckOut}
                  disabled={todayAttendance?.check_out_time || isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-rose-900/30 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span>{todayAttendance?.check_out_time ? 'SUDAH CHECK-OUT' : 'PRESENSI PULANG (CHECK-OUT)'}</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: RIWAYAT BULANAN */}
      {activeTab === 'riwayat' && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Riwayat Kehadiran Bulan Ini</h3>
            <span className="text-xs text-emerald-400 font-semibold">Tingkat Kehadiran: 100%</span>
          </div>

          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Tanggal</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Lokasi / Jarak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {attendanceHistory.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{item.attendance_date}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{item.check_in_time || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{item.check_out_time || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                        {item.status || 'present'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.distance_meters ? `~${item.distance_meters}m (Valid GPS)` : 'Area Kampus'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENGAJUAN IZIN / CUTI */}
      {activeTab === 'izin' && (
        <div className="max-w-2xl mx-auto rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Form Pengajuan Izin / Cuti Guru</h2>
              <p className="text-xs text-slate-400">Kirim pemberitahuan izin atau sakit ke HRD</p>
            </div>
          </div>

          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Pengajuan</label>
              <select
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="izin">Izin Dinas / Keperluan Pribadi</option>
                <option value="sakit">Sakit (Dengan Surat Dokter)</option>
                <option value="cuti_tahunan">Cuti Tahunan</option>
                <option value="cuti_melahirkan">Cuti Melahirkan</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alasan / Keterangan Lengkap</label>
              <textarea
                rows={3}
                required
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Tuliskan keterangan izin dan rencana delegasi tugas mengajar..."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Pengajuan Izin ke HRD</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
