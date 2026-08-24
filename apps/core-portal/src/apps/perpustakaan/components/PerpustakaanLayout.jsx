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
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-950/30">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Perpustakaan</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                  E-Library
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Sirkulasi & OPAC Terpadu</p>
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
                  <School className="w-4 h-4 text-teal-400 shrink-0" />
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
                          ? 'bg-teal-600/20 text-teal-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className="truncate">{unit.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                        {unit.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/10 text-teal-300 border border-teal-500/30 shadow-xs'
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
              </div>
            ))}
          </div>

          {/* Launcher Portal Link */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/30 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Grid className="w-4 h-4 text-teal-400" />
              <span>Portal Aplikasi (Launcher)</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Modul Perpustakaan</span>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {activeSchoolUnit?.name || 'Seluruh Kampus (Yayasan)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Pustakawan'}
                </div>
                <div className="text-[10px] text-slate-500 capitalize leading-tight">
                  {currentRole.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/80">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
