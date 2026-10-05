import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  ChefHat,
  CalendarDays,
  Truck,
  Warehouse,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import ErrorState from '../../../shared/components/ErrorState';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/v1/dapur/dashboard');
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat ringkasan dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <LoadingSkeleton type="card" rows={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LoadingSkeleton type="table" rows={4} columns={3} />
          <LoadingSkeleton type="table" rows={4} columns={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-lg border border-slate-200/80">
        <ErrorState
          error={error}
          onRetry={fetchDashboard}
          title="Gagal Memuat Dashboard Dapur"
        />
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_ingredients: 0,
    total_suppliers: 0,
    total_menus: 0,
    total_recipes: 0,
  };

  const serviceStatus = data?.service_status || {
    status: 'normal',
    announcement_message: 'Pelayanan makan santri berjalan lancar sesuai jadwal.',
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 leading-snug">
              Dashboard Dapur & Layanan Gizi
            </h1>
            <StatusPill variant="success">Central Kitchen</StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan terpadu pengadaan bahan baku, standar resep santri, dan distribusi makan.
          </p>
        </div>

        <Link
          to="/dapur/master-data"
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>Kelola Master Data</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Service Status Notice */}
      <FlatAlertBanner
        variant={serviceStatus.status === 'normal' ? 'info' : 'warning'}
        icon={Clock}
        title={`Status Layanan Makan Hari Ini: ${serviceStatus.status.toUpperCase()}`}
        description={serviceStatus.announcement_message}
      />

      {/* Metric Cards Grid - StatRibbonCard Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatRibbonCard
          label="Bahan Baku"
          value={metrics.total_ingredients}
          subtitle="Item terdaftar di gudang"
          icon={Warehouse}
          status="info"
          to="/dapur/master-data"
        />

        <StatRibbonCard
          label="Mitra Supplier"
          value={metrics.total_suppliers}
          subtitle="Vendor pangan aktif"
          icon={Truck}
          status="success"
          to="/dapur/master-data"
        />

        <StatRibbonCard
          label="Siklus Menu"
          value={metrics.total_menus}
          subtitle="Paket menu hidangan"
          icon={CalendarDays}
          status="neutral"
        />

        <StatRibbonCard
          label="Standar Resep"
          value={metrics.total_recipes}
          subtitle="SOP resep terverifikasi"
          icon={ChefHat}
          status="neutral"
        />
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Ingredients */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Bahan Baku Terbaru
              </h2>
            </div>
            <Link
              to="/dapur/master-data"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recent_ingredients?.length > 0 ? (
              data.recent_ingredients.map((ing) => (
                <div key={ing.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{ing.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-500">{ing.code}</span>
                      <span>•</span>
                      <span>{ing.category_name || 'Umum'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusPill variant={ing.status === 'active' ? 'success' : 'danger'}>
                      {ing.status}
                    </StatusPill>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono tnum">
                      Min: {ing.min_stock || 0} {ing.unit_code}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada bahan baku tercatat.
              </div>
            )}
          </div>
        </div>

        {/* Recent Menus */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Paket Menu Terencana
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Jadwal Pangan
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recent_menus?.length > 0 ? (
              data.recent_menus.map((menu) => (
                <div key={menu.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{menu.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="capitalize">{menu.menu_type}</span>
                      <span>•</span>
                      <span>{menu.menu_date || 'Template Siklus'}</span>
                    </div>
                  </div>
                  <div>
                    <StatusPill variant="warning">
                      {menu.status}
                    </StatusPill>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada menu terencana.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
