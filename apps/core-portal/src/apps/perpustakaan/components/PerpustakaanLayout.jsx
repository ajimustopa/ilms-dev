import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Users,
  Repeat,
  BookmarkCheck,
  AlertOctagon,
  BellRing,
  BarChart3,
  Search,
  LogOut,
  ChevronDown,
  School,
  Grid,
  Library
} from 'lucide-react';

export default function PerpustakaanLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'pustakawan';

  const navGroups = [
    {
      title: 'Navigasi Utama',
      items: [
        { label: 'Dashboard', path: '/perpustakaan/dashboard', icon: LayoutDashboard },
        { label: 'OPAC Pencarian', path: '/perpustakaan/opac', icon: Search },
      ]
    },
    {
      title: 'Katalog & Koleksi',
      items: [
        { label: 'Katalog Buku & Pustaka', path: '/perpustakaan/books', icon: BookOpen },
        { label: 'Kategori Koleksi', path: '/perpustakaan/categories', icon: Layers },
      ]
    },
    {
      title: 'Sirkulasi & Layanan',
      items: [
        { label: 'Data Anggota', path: '/perpustakaan/members', icon: Users },
        { label: 'Peminjaman & Kembali', path: '/perpustakaan/loans', icon: Repeat },
        { label: 'Reservasi Buku', path: '/perpustakaan/reservations', icon: BookmarkCheck },
        { label: 'Buku Hilang & Rusak', path: '/perpustakaan/lost-damaged', icon: AlertOctagon },
      ]
    },
    {
      title: 'Pengawasan & Laporan',
      items: [
        { label: 'Pengingat Jatuh Tempo', path: '/perpustakaan/reminders', icon: BellRing },
        { label: 'Laporan & Statistik', path: '/perpustakaan/reports', icon: BarChart3 },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Nav */}
      <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-3.5 flex items-center gap-2.5 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-2xs">
              <Library className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5 truncate">
                <span>Perpustakaan</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  E-Lib
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 truncate">Sirkulasi & OPAC Terpadu</p>
            </div>
          </div>

          {/* Unit Switcher */}
          <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-900/50 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-750 transition text-left text-xs cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium text-slate-200 text-xs">
                    {activeSchoolUnit?.name || 'Pilih Satuan'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                  {/* Opsi Semua Satuan (Data Gabungan) */}
                  <button
                    type="button"
                    onClick={() => {
                      changeActiveSchoolUnit(null);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center justify-between border-b border-slate-700/60 ${
                      !activeSchoolUnit || activeSchoolUnit.id === 'all'
                        ? 'bg-blue-600/20 text-blue-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="truncate font-semibold">Semua Satuan (Gabungan)</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-blue-900/60 text-blue-300 font-mono">
                      ALL
                    </span>
                  </button>

                  {schoolUnits?.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        changeActiveSchoolUnit(unit);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition flex items-center justify-between ${
                        activeSchoolUnit?.id === unit.id
                          ? 'bg-emerald-600/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="truncate">{unit.name}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                        {unit.code || unit.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                            isActive
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`
                        }
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Launcher Portal Link */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950/30 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Grid className="w-3.5 h-3.5 text-slate-400" />
              <span>Portal Launcher</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-12 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition shadow-2xs group"
              title="Kembali ke Portal Modul (Launcher)"
            >
              <Grid className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 shrink-0" />
              <span>Portal Modul</span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-3">
              <span>Perpustakaan</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {activeSchoolUnit?.name || 'Seluruh Satuan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {user?.full_name || 'Pustakawan'}
                </div>
                <div className="text-[10px] text-slate-500 capitalize leading-tight">
                  {currentRole.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/60">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
