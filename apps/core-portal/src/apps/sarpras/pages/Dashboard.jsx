import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import {
  Building2,
  Boxes,
  CalendarClock,
  Wrench,
  AlertTriangle,
  ArrowRight,
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

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.success) {
        setSummary(dashRes.value.data.data);
      }
      if (lowStockRes.status === 'fulfilled' && lowStockRes.value.data?.success) {
        setLowStockItems(lowStockRes.value.data.data || []);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data?.success) {
        setRecentBookings(bookingsRes.value.data.data?.slice(0, 5) || []);
      }
      if (maintRes.status === 'fulfilled' && maintRes.value.data?.success) {
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
      title: 'Lahan & Bangunan',
      value: `${summary?.total_sites || 0} Lahan / ${summary?.total_buildings || 0} Gedung`,
      sub: `${summary?.total_rooms || 0} Ruangan Terdata`,
      icon: Building2,
      variant: 'indigo',
      link: '/sarpras/locations'
    },
    {
      title: 'Inventaris Aset Aktif',
      value: `${summary?.total_active_assets || 0} Unit`,
      sub: 'Siap Pakai & Termonitor',
      icon: Boxes,
      variant: 'emerald',
      link: '/sarpras/assets'
    },
    {
      title: 'Pengajuan Peminjaman',
      value: `${summary?.pending_bookings || 0} Pending`,
      sub: 'Menunggu Persetujuan',
      icon: CalendarClock,
      variant: 'amber',
      link: '/sarpras/bookings'
    },
    {
      title: 'Tiket Perbaikan Aktif',
      value: `${summary?.active_maintenance_tickets || 0} Tiket`,
      sub: 'Dalam Penanganan',
      icon: Wrench,
      variant: 'rose',
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
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <Link
            to="/sarpras/bookings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Pinjam Ruang</span>
          </Link>
        </div>
      </div>

      {/* Alert Stok Menipis Banner */}
      {lowStockItems.length > 0 && (
        <FlatAlertBanner
          variant="amber"
          title={`Peringatan Stok Menipis (${lowStockItems.length} Barang)`}
          action={
            <Link
              to="/sarpras/consumables"
              className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              Lihat Stok
            </Link>
          }
        >
          Terdapat barang habis pakai dengan jumlah stok di bawah batas minimal. Segera lakukan pengadaan baru logistik.
        </FlatAlertBanner>
      )}

      {/* KPI Cards Grid */}
      {loading && !summary ? (
        <LoadingSkeleton type="card" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <Link key={idx} to={kpi.link} className="block group">
              <StatRibbonCard
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.sub}
                icon={kpi.icon}
                variant={kpi.variant}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Two Column Section: Recent Bookings & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peminjaman Fasilitas Terkini */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800">Peminjaman Fasilitas Terbaru</h3>
            </div>
            <Link to="/sarpras/bookings" className="text-[11px] font-semibold text-emerald-600 hover:underline">
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
                    <StatusPill status={b.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8">
                <EmptyState
                  title="Belum Ada Peminjaman"
                  description="Belum ada permohonan peminjaman ruangan atau fasilitas terkini."
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Laporan Perbaikan Terkini */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-800">Laporan Pemeliharaan & Kerusakan</h3>
            </div>
            <Link to="/sarpras/maintenance" className="text-[11px] font-semibold text-emerald-600 hover:underline">
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
                    <StatusPill status={m.repair_status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8">
                <EmptyState
                  title="Tidak Ada Tiket Kerusakan"
                  description="Seluruh sarana dan prasarana dalam kondisi operasional normal."
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
