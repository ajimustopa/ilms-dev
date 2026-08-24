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

  const statCards = [
    {
      title: 'Total Pegawai Aktif',
      value: `${stats.totalEmployees} Orang`,
      change: 'Master Data',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      title: 'Pengajuan Cuti Pending',
      value: `${stats.pendingLeaves} Berkas`,
      change: 'Perlu Approval',
      icon: CalendarRange,
      color: 'text-amber-600 bg-amber-50'
    },
    {
      title: 'Pengajuan Lembur Pending',
      value: `${stats.pendingOvertimes} Berkas`,
      change: 'Perlu Approval',
      icon: Clock,
      color: 'text-rose-600 bg-rose-50'
    },
    {
      title: 'Kandidat Rekrutmen',
      value: `${stats.totalCandidates} Pelamar`,
      change: 'Tahap Seleksi',
      icon: UserPlus,
      color: 'text-emerald-600 bg-emerald-50'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Dashboard Kepegawaian &bull; {user?.full_name || 'HRD Admin'} 👋
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Satuan Pendidikan Aktif:{' '}
            <span className="text-indigo-400 font-semibold">
              {activeSchoolUnit?.name || 'Seluruh Satuan Pendidikan'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.change}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-800">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : item.value}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{item.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Komposisi Status Kepegawaian */}
      {stats.breakdownStatus.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Komposisi Status Pegawai
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.breakdownStatus.map((b, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 uppercase">{b.label}</span>
                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                  {b.count} orang
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Master Data Pegawai</h3>
          <p className="text-xs text-slate-500 mb-4">
            Kelola data induk pendidik & tenaga kependidikan, riwayat jabatan, keluarga, dan pensiun.
          </p>
          <Link
            to="/kepegawaian/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Buka Data Pegawai</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Banknote className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Penggajian (Payroll)</h3>
          <p className="text-xs text-slate-500 mb-4">
            Proses perhitungan gaji bulanan, rincian komponen tunjangan/potongan, dan verifikasi berkas.
          </p>
          <Link
            to="/kepegawaian/payroll"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Kelola Payroll</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Network className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Struktur Organisasi & DUK</h3>
          <p className="text-xs text-slate-500 mb-4">
            Bagan pohon hierarki jabatan, atasan langsung, dan Daftar Urut Kepangkatan (DUK).
          </p>
          <Link
            to="/kepegawaian/organization"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Lihat Bagan & DUK</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
