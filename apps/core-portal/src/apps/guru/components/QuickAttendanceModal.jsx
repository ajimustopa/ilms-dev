import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../services/attendanceService';
import { formatIndonesianDate, getGreetingByTime } from '../utils/dateHelper';
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export default function QuickAttendanceModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Update jam realtime setiap detik saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Load status presensi hari ini saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await attendanceService.getTodayStatus();
      setTodayData(res);
    } catch (err) {
      // Jika endpoint gagal, simpan pesan error tanpa mock data
      setErrorMessage(err.message || 'Gagal memuat status presensi hari ini');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = () => {
    onClose();
    navigate('/guru/absensi?action=checkin');
  };

  const handleQuickCheckOut = () => {
    onClose();
    navigate('/guru/absensi?action=checkout');
  };

  if (!isOpen) return null;

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  const attendance = todayData?.attendance;
  const hasCheckedIn = Boolean(attendance?.check_in_time);
  const hasCheckedOut = Boolean(attendance?.check_out_time);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Presensi Cepat Guru</h3>
              <p className="text-[11px] text-slate-500">{formatIndonesianDate(currentTime, true)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Konten Jam & Status */}
        <div className="p-5 space-y-4">
          {/* Jam Digital */}
          <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs text-slate-500 font-medium">{getGreetingByTime()}</p>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono my-0.5">
              {hours}:{minutes}:<span className="text-emerald-600 text-2xl">{seconds}</span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>Verifikasi Geolocation GPS</span>
            </p>
          </div>

          {/* Status Hari Ini */}
          {loading ? (
            <div className="py-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Memeriksa status kehadiran...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Info Presensi</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">Masuk (Check-In)</span>
                <span className="font-bold text-slate-900 text-sm font-mono block">
                  {attendance?.check_in_time ? attendance.check_in_time.slice(0, 5) : '--:--'}
                </span>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  hasCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {hasCheckedIn ? 'Sudah Masuk' : 'Belum Absen'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">Pulang (Check-Out)</span>
                <span className="font-bold text-slate-900 text-sm font-mono block">
                  {attendance?.check_out_time ? attendance.check_out_time.slice(0, 5) : '--:--'}
                </span>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  hasCheckedOut ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {hasCheckedOut ? 'Sudah Pulang' : 'Belum Pulang'}
                </span>
              </div>
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="space-y-2 pt-1">
            {!hasCheckedIn ? (
              <button
                type="button"
                onClick={handleQuickCheckIn}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Buka Presensi Masuk (Check-In)</span>
              </button>
            ) : !hasCheckedOut ? (
              <button
                type="button"
                onClick={handleQuickCheckOut}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Buka Presensi Pulang (Check-Out)</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-center font-medium">
                Presensi hari ini sudah lengkap (Masuk & Pulang).
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/guru/absensi');
              }}
              className="w-full h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition"
            >
              <span>Lihat Riwayat & Pengajuan Izin</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
