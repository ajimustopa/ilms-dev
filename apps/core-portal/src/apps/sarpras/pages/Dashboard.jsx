import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Building2,
  Boxes,
  CalendarClock,
  Wrench,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, lowStockRes, bookingsRes, maintRes] = await Promise.allSettled([
        api.get('/sarpras/reports/dashboard'),
        api.get('/sarpras/consumables/low-stock'),
        api.get('/sarpras/bookings?limit=5'),
        api.get('/sarpras/maintenance-requests?limit=5')
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data.success) {
        setSummary(dashRes.value.data.data);
      }
      if (lowStockRes.status === 'fulfilled' && lowStockRes.value.data.success) {
        setLowStockItems(lowStockRes.value.data.data || []);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data.success) {
        setRecentBookings(bookingsRes.value.data.data?.slice(0, 5) || []);
      }
      if (maintRes.status === 'fulfilled' && maintRes.value.data.success) {
        setRecentMaintenance(maintRes.value.data.data?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpis = [
    {
      title: 'Total Lahan & Bangunan',
      value: `${summary?.total_sites || 0} Lahan / ${summary?.total_buildings || 0} Gedung`,
      sub: `${summary?.total_rooms || 0} Ruangan Terdata`,
      icon: Building2,
      color: 'from-blue-600 to-indigo-700',
      textColor: 'text-blue-600',
      link: '/sarpras/locations'
    },
    {
      title: 'Inventaris Aset Aktif',
      value: `${summary?.total_active_assets || 0} Unit`,
      sub: 'Siap Pakai & Termonitor',
      icon: Boxes,
      color: 'from-indigo-600 to-violet-700',
      textColor: 'text-indigo-600',
      link: '/sarpras/assets'
    },
    {
      title: 'Pengajuan Peminjaman',
      value: `${summary?.pending_bookings || 0} Pending`,
      sub: 'Menunggu Persetujuan',
      icon: CalendarClock,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      link: '/sarpras/bookings'
    },
    {
      title: 'Tiket Perbaikan Aktif',
      value: `${summary?.active_maintenance_tickets || 0} Tiket`,
      sub: 'Dalam Proses Penanganan',
      icon: Wrench,
      color: 'from-rose-500 to-red-600',
      textColor: 'text-rose-600',
      link: '/sarpras/maintenance'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard Sarana & Prasarana</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring fisik lokasi, aset inventaris, peminjaman fasilitas, dan persediaan logistik
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <Link
            to="/sarpras/bookings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Pinjam Ruang</span>
          </Link>
        </div>
      </div>

      {/* Alert Stok Menipis Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Peringatan Stok Menipis ({lowStockItems.length} Barang)
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Terdapat barang habis pakai dengan jumlah stok di bawah batas minimal. Segera ajukan pengadaan baru.
              </p>
            </div>
          </div>
          <Link
            to="/sarpras/consumables"
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Lihat Stok
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{kpi.title}</p>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{kpi.value}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400 group-hover:text-indigo-600 transition">
                <span>Kelola data</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Two Column Section: Recent Bookings & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peminjaman Fasilitas Terkini */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800">Peminjaman Fasilitas Terbaru</h3>
            </div>
            <Link to="/sarpras/bookings" className="text-[11px] font-semibold text-indigo-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentBookings.length > 0 ? (
              recentBookings.map((b) => (
                <div key={b.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {b.room_name || b.other_facility_name || 'Fasilitas Sekolah'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {b.purpose} &bull; {b.booking_date} ({b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)})
                    </p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      b.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : b.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada permohonan peminjaman ruangan
              </div>
            )}
          </div>
        </div>

        {/* Laporan Perbaikan Terkini */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-800">Laporan Pemeliharaan & Kerusakan</h3>
            </div>
            <Link to="/sarpras/maintenance" className="text-[11px] font-semibold text-indigo-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentMaintenance.length > 0 ? (
              recentMaintenance.map((m) => (
                <div key={m.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {m.asset_name || m.room_name || `Tiket #${m.id}`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {m.damage_report}
                    </p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      m.repair_status === 'ditutup' || m.repair_status === 'selesai'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : m.repair_status === 'diproses'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {m.repair_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada tiket kerusakan yang dilaporkan
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
