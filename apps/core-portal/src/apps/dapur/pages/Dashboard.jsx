import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  ChefHat,
  UtensilsCrossed,
  PackageCheck,
  Truck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Loader2,
  Clock,
  CheckCircle2,
  CalendarDays,
  Coins,
  Warehouse
} from 'lucide-react';

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
      <div className="h-full flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 text-white shadow-xl shadow-amber-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Central Kitchen & Nutrition Management</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Dashboard Dapur & Layanan Gizi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-amber-100/90 max-w-xl">
              Pengelolaan terpadu pengadaan bahan baku, standar resep santri, produksi harian, hingga distribusi makan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dapur/master-data"
              className="px-4 py-2.5 rounded-xl bg-white text-amber-900 text-xs font-bold shadow-md hover:bg-amber-50 transition flex items-center gap-2"
            >
              <span>Kelola Master Data</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Service Status Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Status Layanan Makan Hari Ini:
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold uppercase">
              {serviceStatus.status}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {serviceStatus.announcement_message}
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bahan Baku
            </div>
            <div className="text-2xl font-black text-slate-800">
              {metrics.total_ingredients}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Item terdaftar di gudang
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mitra Supplier
            </div>
            <div className="text-2xl font-black text-slate-800">
              {metrics.total_suppliers}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Vendor pangan aktif
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Siklus Menu
            </div>
            <div className="text-2xl font-black text-slate-800">
              {metrics.total_menus}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Paket menu hidangan
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Standar Resep
            </div>
            <div className="text-2xl font-black text-slate-800">
              {metrics.total_recipes}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              SOP resep terverifikasi
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Ingredients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bahan Baku Terbaru
              </h2>
            </div>
            <Link
              to="/dapur/master-data"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recent_ingredients?.length > 0 ? (
              data.recent_ingredients.map((ing) => (
                <div key={ing.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{ing.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-slate-500">{ing.code}</span>
                      <span>•</span>
                      <span>{ing.category_name || 'Umum'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                      {ing.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Paket Menu Terencana
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Jadwal Pangan
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.recent_menus?.length > 0 ? (
              data.recent_menus.map((menu) => (
                <div key={menu.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{menu.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="capitalize">{menu.menu_type}</span>
                      <span>•</span>
                      <span>{menu.menu_date || 'Template Siklus'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200/60">
                      {menu.status}
                    </span>
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
