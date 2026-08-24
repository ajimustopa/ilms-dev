import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  CalendarClock,
  Wrench,
  Truck,
  Archive,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Grid,
  ShieldAlert
} from 'lucide-react';

export default function SarprasLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'staf';

  const navGroups = [
    {
      title: 'Navigasi Utama',
      items: [
        { label: 'Dashboard', path: '/sarpras/dashboard', icon: LayoutDashboard },
        { label: 'Lokasi & Denah', path: '/sarpras/locations', icon: Building2 },
      ]
    },
    {
      title: 'Inventaris & Fasilitas',
      items: [
        { label: 'Inventaris Aset', path: '/sarpras/assets', icon: Boxes },
        { label: 'Peminjaman Fasilitas', path: '/sarpras/bookings', icon: CalendarClock },
        { label: 'Pemeliharaan & Servis', path: '/sarpras/maintenance', icon: Wrench },
      ]
    },
    {
      title: 'Logistik & Pengadaan',
      items: [
        { label: 'Pengadaan & Vendor', path: '/sarpras/procurement', icon: Truck },
        { label: 'Bahan Habis Pakai', path: '/sarpras/consumables', icon: Archive },
        { label: 'Laporan & Penyusutan', path: '/sarpras/reports', icon: BarChart3 },
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-950/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Sarpras</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Aset
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Sarana & Prasarana Sekolah</p>
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
                  <School className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate font-medium text-slate-200">
                    {activeSchoolUnit?.name || 'Pilih Satuan'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                  {schoolUnits?.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => {
                        changeActiveSchoolUnit(unit);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                        activeSchoolUnit?.id === unit.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="truncate">{unit.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase ml-2">{unit.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <div className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={idx}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Info & Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-[10px] text-slate-400 truncate capitalize">{currentRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/"
                title="Ke Launcher Modul"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/70 rounded-lg transition"
              >
                <Grid className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                title="Keluar / Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-800">Sistem Informasi Sarana & Prasarana</h2>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {activeSchoolUnit?.name || 'Semua Unit'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Menu Launcher</span>
            </Link>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
