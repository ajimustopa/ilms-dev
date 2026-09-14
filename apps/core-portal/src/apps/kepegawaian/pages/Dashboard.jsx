import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Users,
  CalendarRange,
  Clock,
  UserPlus,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Award,
  Banknote,
  Network
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function Dashboard() {
  const { user, activeSchoolUnit } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    breakdownStatus: [],
    pendingLeaves: 0,
    pendingOvertimes: 0,
    totalCandidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [statsRes, leavesRes, overtimesRes, candidatesRes] = await Promise.allSettled([
        api.get('/kepegawaian/statistics?dimension=employment_status'),
        api.get('/kepegawaian/leave-requests?status=pending'),
        api.get('/kepegawaian/overtimes?status=pending'),
        api.get('/kepegawaian/recruitment-candidates')
      ]);

      const statData = statsRes.status === 'fulfilled' ? statsRes.value.data?.data : null;
      const leaveData = leavesRes.status === 'fulfilled' ? leavesRes.value.data?.data : [];
      const overtimeData = overtimesRes.status === 'fulfilled' ? overtimesRes.value.data?.data : [];
      const candidateData = candidatesRes.status === 'fulfilled' ? candidatesRes.value.data?.data : [];

      setStats({
        totalEmployees: statData?.total_active_employees || 0,
        breakdownStatus: statData?.breakdown || [],
        pendingLeaves: Array.isArray(leaveData) ? leaveData.length : 0,
        pendingOvertimes: Array.isArray(overtimeData) ? overtimeData.length : 0,
        totalCandidates: Array.isArray(candidateData) ? candidateData.length : 0,
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat ringkasan dashboard kepegawaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeSchoolUnit]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold">
            Dashboard Kepegawaian &bull; {user?.full_name || 'HRD Admin'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Satuan Pendidikan Aktif:{' '}
            <span className="text-emerald-400 font-semibold">
              {activeSchoolUnit?.name || 'Seluruh Satuan Pendidikan'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <FlatAlertBanner
          type="error"
          message={errorMsg}
        />
      )}

      {/* Stats Cards dengan StatRibbonCard (§10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatRibbonCard
          title="Total Pegawai Aktif"
          value={`${stats.totalEmployees} Orang`}
          variant="info"
          subtitle="Master Data Terdaftar"
          icon={Users}
        />
        <StatRibbonCard
          title="Pengajuan Cuti Pending"
          value={`${stats.pendingLeaves} Berkas`}
          variant="warning"
          subtitle="Menunggu Approval HRD"
          icon={CalendarRange}
        />
        <StatRibbonCard
          title="Pengajuan Lembur Pending"
          value={`${stats.pendingOvertimes} Berkas`}
          variant="danger"
          subtitle="Perlu Verifikasi Jam"
          icon={Clock}
        />
        <StatRibbonCard
          title="Kandidat Rekrutmen"
          value={`${stats.totalCandidates} Pelamar`}
          variant="success"
          subtitle="Tahap Screening & Tes"
          icon={UserPlus}
        />
      </div>

      {/* Komposisi Status Kepegawaian */}
      {stats.breakdownStatus.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Komposisi Status Pegawai
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.breakdownStatus.map((b, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 uppercase">{b.label}</span>
                <span className="text-sm font-bold text-slate-900 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                  {b.count} orang
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Master Data Pegawai</h3>
            <p className="text-xs text-slate-500 mb-4">
              Kelola data induk pendidik & tenaga kependidikan, riwayat jabatan, keluarga, dan dokumen.
            </p>
          </div>
          <Link
            to="/kepegawaian/employees"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Buka Data Pegawai</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Banknote className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Penggajian (Payroll)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Proses perhitungan gaji bulanan, rincian komponen tunjangan/potongan, dan slip gaji.
            </p>
          </div>
          <Link
            to="/kepegawaian/payroll"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Kelola Payroll</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
              <Network className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Struktur Organisasi & DUK</h3>
            <p className="text-xs text-slate-500 mb-4">
              Bagan pohon hierarki jabatan, atasan langsung, dan Daftar Urut Kepangkatan (DUK).
            </p>
          </div>
          <Link
            to="/kepegawaian/organization"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800"
          >
            <span>Lihat Bagan & DUK</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
