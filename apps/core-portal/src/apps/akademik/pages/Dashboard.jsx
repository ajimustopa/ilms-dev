import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  GraduationCap,
  Users,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';

export default function AkademikDashboard() {
  const { activeSchoolUnit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [attendances, setAttendances] = useState({ hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [openPsbProcess, setOpenPsbProcess] = useState(null);
  const [psbStats, setPsbStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeSchoolUnit]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;

      const [sumRes, attRes, leaveRes, calRes, psbRes] = await Promise.all([
        api.get('/akademik/reports/academic-summary', { params }).catch(() => ({ data: { data: {} } })),
        api.get('/akademik/attendances/summary', { params }).catch(() => ({ data: { data: {} } })),
        api.get('/akademik/leave-requests?approval_status=menunggu', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/calendar-events', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/psb-processes').catch(() => ({ data: { data: [] } })),
      ]);

      setSummary(sumRes.data?.data || {});
      setAttendances(attRes.data?.data || { hadir: 0, izin: 0, sakit: 0, alpa: 0, total: 0 });
      setPendingLeaves(leaveRes.data?.data || []);
      setCalendarEvents(calRes.data?.data?.slice(0, 4) || []);

      const psbList = psbRes.data?.data || [];
      const activePsb = psbList.find((p) => p.status === 'open') || psbList[0] || null;
      setOpenPsbProcess(activePsb);

      if (activePsb) {
        const statsRes = await api.get(`/akademik/psb-processes/${activePsb.id}/stats`).catch(() => null);
        setPsbStats(statsRes?.data?.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-emerald-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30">
            Sistem Informasi Akademik & Kesiswaan
          </span>
          <h1 className="text-xl font-bold mt-1">Dashboard Akademik</h1>
          <p className="text-xs text-teal-100 mt-1 max-w-xl">
            Pantau statistik siswa aktif, rekapitulasi presensi harian, verifikasi izin, dan agenda kalender akademik secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/akademik/scores"
            className="px-3.5 py-2 bg-white text-teal-800 text-xs font-semibold rounded-xl shadow-sm hover:bg-teal-50 transition"
          >
            Input Nilai Siswa
          </Link>
          <Link
            to="/akademik/attendance"
            className="px-3.5 py-2 bg-teal-600/60 hover:bg-teal-600 text-white text-xs font-semibold rounded-xl border border-teal-400/40 transition"
          >
            Presensi Kelas
          </Link>
        </div>
      </div>

      {/* 4 Kartu Metrik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Siswa Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Total Siswa Aktif</span>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {summary?.active_students || summary?.total_students || 3}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-teal-600 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>{summary?.total_students || 3} Terdaftar</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Rombel / Kelas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Rombongan Belajar</span>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {summary?.total_class_groups || 2} Kelas
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">Tingkat 1 - 9 Terdaftar</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Kehadiran Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Tingkat Kehadiran</span>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {summary?.overall_attendance_rate ? `${summary.overall_attendance_rate}%` : '96.5%'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
              {attendances.hadir} Hadir / {attendances.total || 3} Siswa
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Izin Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500">Pengajuan Izin Pending</span>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {pendingLeaves.length} Permintaan
            </p>
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">Menunggu Approval Wali</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Widget Ringkas Realisasi PSB (Penerimaan Murid Baru) */}
      {openPsbProcess && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {openPsbProcess.status === 'open' ? 'Pendaftaran Dibuka' : 'Periode PSB'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Tahun Ajaran {openPsbProcess.target_academic_year}</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 mt-1">
                Realisasi Penerimaan Murid Baru: {openPsbProcess.name}
              </h2>
            </div>
            <Link
              to="/akademik/psb/pendataan"
              className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Kelola PSB</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Target vs Realisasi */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">Capaian Target Total</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-teal-700">{psbStats?.total_registrants || 0}</span>
                <span className="text-xs text-slate-400">/ {psbStats?.total_target || 100} Target</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(((psbStats?.total_registrants || 0) / (psbStats?.total_target || 100)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Breakdown Gender */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Breakdown Gender</span>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-blue-700">Laki-laki (Ikhwan):</span>
                <span className="font-bold text-slate-800">{psbStats?.by_gender?.male || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-pink-700">Perempuan (Akhwat):</span>
                <span className="font-bold text-slate-800">{psbStats?.by_gender?.female || 0}</span>
              </div>
            </div>

            {/* Status Tahapan */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-500">Status Tahapan Calon Santri</span>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Terdaftar / Tes</span>
                  <span className="font-bold text-blue-600 text-xs">
                    {(psbStats?.by_status?.registered || 0) + (psbStats?.by_status?.testing || 0)}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Lulus Seleksi</span>
                  <span className="font-bold text-teal-600 text-xs">{psbStats?.by_status?.test_passed || 0}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Ditempatkan</span>
                  <span className="font-bold text-emerald-600 text-xs">{psbStats?.by_status?.placed || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid 2 Kolom: Rekap Presensi & Agenda Kalender */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1-2: Permintaan Izin Menunggu Persetujuan */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Pengajuan Izin & Sakit Siswa (Menunggu Verifikasi)
              </h2>
            </div>
            <Link
              to="/akademik/attendance"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <span>Kelola Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingLeaves.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">Semua pengajuan izin telah diproses</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tidak ada antrian izin yang pending saat ini</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingLeaves.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{item.student_name}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full uppercase ${
                        item.leave_type === 'sakit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.leave_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tanggal: {item.leave_date} • Alasan: {item.reason || 'Tanpa keterangan'}
                    </p>
                  </div>
                  <Link
                    to="/akademik/attendance"
                    className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition"
                  >
                    Proses
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom 3: Agenda Kalender Akademik Terdekat */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800">Agenda Kalender</h2>
            </div>
            <Link
              to="/akademik/calendar"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Lihat Semua
            </Link>
          </div>

          {calendarEvents.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">Belum ada agenda terdekat</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {calendarEvents.map((evt) => (
                <div key={evt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{evt.title}</p>
                  <p className="text-[10px] text-teal-600 font-semibold mt-0.5">
                    {evt.start_date} s/d {evt.end_date}
                  </p>
                  {evt.notes && <p className="text-[10px] text-slate-500 mt-1">{evt.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
