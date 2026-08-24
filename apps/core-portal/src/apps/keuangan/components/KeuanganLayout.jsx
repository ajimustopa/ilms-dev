import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  FolderTree,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Coins,
  BookOpen,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Grid
} from 'lucide-react';

export default function KeuanganLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'admin_keuangan';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/keuangan/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Data Master',
      path: '/keuangan/master-data',
      icon: FolderTree,
    },
    {
      label: 'Rencana Anggaran (RAPBS)',
      path: '/keuangan/budget',
      icon: FileSpreadsheet,
    },
    {
      label: 'Tagihan Siswa',
      path: '/keuangan/bills',
      icon: Receipt,
    },
    {
      label: 'Pembayaran & Kwitansi',
      path: '/keuangan/payments',
      icon: CreditCard,
    },
    {
      label: 'Pengeluaran & Belanja',
      path: '/keuangan/expenses',
      icon: Wallet,
    },
    {
      label: 'Penerimaan Non-SPP',
      path: '/keuangan/other-incomes',
      icon: ArrowUpRight,
    },
    {
      label: 'Penggajian (Payroll)',
      path: '/keuangan/payroll',
      icon: Coins,
    },
    {
      label: 'Pembukuan & Tabungan',
      path: '/keuangan/bookkeeping',
      icon: BookOpen,
    },
    {
      label: 'Laporan Keuangan',
      path: '/keuangan/reports',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Kiri */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              K
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-none">ALDEPOS</h1>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">Modul Keuangan</p>
            </div>
          </div>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Peran Aktif</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {currentRole}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu Keuangan ({navItems.length})
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>v1.0.0 &bull; Keuangan</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </aside>

      {/* Konten Kanan */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Atas */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          {/* Header Title & Portal Link */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-2xs"
              title="Ke Portal Utama"
            >
              <Grid className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Portal Aplikasi</span>
            </Link>
            <div className="text-xs font-semibold text-slate-600 hidden md:block">
              Sistem Pengelolaan Keuangan & Akuntansi Sekolah
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Dropdown Satuan Pendidikan Aktif */}
            {schoolUnits && schoolUnits.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
                >
                  <School className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="max-w-[140px] truncate">
                    {activeSchoolUnit ? activeSchoolUnit.name : 'Pilih Satuan'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Pilih Satuan Pendidikan Aktif
                    </div>
                    {schoolUnits.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          changeActiveSchoolUnit(unit);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition ${
                          activeSchoolUnit?.id === unit.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span>{unit.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">NPSN: {unit.npsn || '-'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profil User Badge */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'K'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.full_name || 'Bendahara / Keuangan'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider capitalize">
                    {user?.username} ({currentRole})
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Keluar / Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
