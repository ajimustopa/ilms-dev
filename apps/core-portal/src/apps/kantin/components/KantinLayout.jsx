import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Users,
  Sliders,
  Package,
  Tags,
  Store,
  PackagePlus,
  RotateCcw,
  Coins,
  Receipt,
  BadgeDollarSign,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Grid,
  UtensilsCrossed
} from 'lucide-react';

export default function KantinLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'kasir';

  const navGroups = [
    {
      title: 'Operasional Kasir',
      items: [
        { label: 'Dashboard', path: '/kantin/dashboard', icon: LayoutDashboard },
        { label: 'Kasir POS (Penjualan)', path: '/kantin/pos', icon: ShoppingCart },
        { label: 'Top Up & Tarik Tunai', path: '/kantin/wallet', icon: Wallet },
      ]
    },
    {
      title: 'Santri & Limit',
      items: [
        { label: 'Data Santri Kantin', path: '/kantin/students', icon: Users },
        { label: 'Limit Jajan Harian', path: '/kantin/limits', icon: Sliders },
      ]
    },
    {
      title: 'Produk & Inventori',
      items: [
        { label: 'Daftar Produk', path: '/kantin/products', icon: Package },
        { label: 'Kategori Produk', path: '/kantin/categories', icon: Tags },
        { label: 'Vendor / Supplier', path: '/kantin/vendors', icon: Store },
        { label: 'Penerimaan Barang', path: '/kantin/goods-receipts', icon: PackagePlus },
        { label: 'Retur Barang', path: '/kantin/product-returns', icon: RotateCcw },
      ]
    },
    {
      title: 'Keuangan & Bagi Hasil',
      items: [
        { label: 'Piutang Hak Kantin', path: '/kantin/receivables-canteen', icon: Coins },
        { label: 'Hak Vendor & Pembayaran', path: '/kantin/receivables-vendor', icon: Receipt },
        { label: 'Pengeluaran Operasional', path: '/kantin/expenses', icon: BadgeDollarSign },
        { label: 'Laporan Komprehensif', path: '/kantin/reports', icon: BarChart3 },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Nav */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Kantin Smart</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  POS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Cashless & Revenue Sharing</p>
            </div>
          </div>

          {/* Unit Switcher */}
          <div className="px-3 py-3 border-b border-slate-800/60 bg-slate-900/50 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/90 border border-slate-700 hover:bg-slate-800 transition text-left text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <School className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium text-slate-200">
                    {activeSchoolUnit?.name || 'Pilih Satuan Pendidikan'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                  {schoolUnits?.length > 0 ? (
                    schoolUnits.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          changeActiveSchoolUnit(u);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition ${
                          activeSchoolUnit?.id === u.id
                            ? 'text-emerald-400 font-bold bg-slate-700/40'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{u.name}</span>
                        {activeSchoolUnit?.id === u.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">Tidak ada unit</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User Profile & Back to Launcher */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/30 shrink-0 space-y-2">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-800/40">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || 'Pengguna Kantin'}</p>
                <p className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">
                  {currentRole}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition border border-slate-700"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Menu Utama Portal</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
