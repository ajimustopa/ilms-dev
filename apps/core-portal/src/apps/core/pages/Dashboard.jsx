import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import { Users, School, Webhook, CheckCircle2, ArrowUpRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function Dashboard() {
  const { user, activeSchoolUnit } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSchools: 0,
    totalSubscribers: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [usersRes, schoolsRes, subsRes, logsRes] = await Promise.allSettled([
        api.get('/core/users?limit=1'),
        api.get('/core/school-units'),
        api.get('/core/webhooks/subscribers'),
        api.get('/core/activity-logs/admin?limit=5')
      ]);

      setStats({
        totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data?.data?.pagination?.total_items || 0 : 0,
        totalSchools: schoolsRes.status === 'fulfilled' ? schoolsRes.value.data?.data?.items?.length || 0 : 0,
        totalSubscribers: subsRes.status === 'fulfilled' ? subsRes.value.data?.data?.length || 0 : 0,
      });

      if (logsRes.status === 'fulfilled' && logsRes.value.data?.data?.items) {
        setRecentLogs(logsRes.value.data.data.items.slice(0, 5));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    { title: 'Total Pengguna Terdaftar', value: `${stats.totalUsers} Akun`, change: 'Aktif', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { title: 'Satuan Pendidikan', value: `${stats.totalSchools} Unit`, change: 'Terdata', icon: School, color: 'text-emerald-600 bg-emerald-50' },
    { title: 'Webhook Subscribers', value: `${stats.totalSubscribers} Aplikasi`, change: 'Terhubung', icon: Webhook, color: 'text-purple-600 bg-purple-50' },
    { title: 'Status SSO Gateway', value: 'Online', change: '99.9% Uptime', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Selamat Datang, {user?.full_name || user?.username || 'Admin'}! 👋
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Satuan Pendidikan Aktif:{' '}
            <span className="text-emerald-400 font-semibold">
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
            <div key={index} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
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

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Manajemen Pengguna</h3>
          <p className="text-xs text-slate-500 mb-4">
            Kelola akun pengguna, status aktivasi, dan reset password dari modul terpusat.
          </p>
          <Link
            to="/core/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>Buka Manajemen User</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Satuan Pendidikan</h3>
          <p className="text-xs text-slate-500 mb-4">
            Konfigurasi profil sekolah TK, SD, SMP, SMA, dan riwayat status operasional.
          </p>
          <Link
            to="/core/school-units"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>Kelola Sekolah</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5">Audit Log Lintas Aplikasi</h3>
          <p className="text-xs text-slate-500 mb-4">
            Pantau seluruh aktivitas administratif dari 14 aplikasi dalam satu dashboard.
          </p>
          <Link
            to="/core/audit-logs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>Lihat Log Audit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
