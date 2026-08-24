import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  Target,
  BookOpenCheck,
  Award,
  BookMarked,
  BarChart3,
  LogOut,
  ChevronDown,
  School,
  Grid,
  Sparkles
} from 'lucide-react';

export default function AlquranLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'musyrif';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/alquran/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Target Hafalan',
      path: '/alquran/targets',
      icon: Target,
    },
    {
      label: 'Capaian & Setoran',
      path: '/alquran/records',
      icon: BookOpenCheck,
    },
    {
      label: 'Ujian Munaqasyah',
      path: '/alquran/exams',
      icon: Award,
    },
    {
      label: 'Kurikulum Kitab Kuning',
      path: '/alquran/books',
      icon: BookMarked,
    },
    {
      label: 'Laporan Capaian',
      path: '/alquran/reports',
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Nav */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950/30">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Tahfidz & Quran</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  IBS
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Sistem Tahfidz & Munaqasyah</p>
            </div>
          </div>

          {/* Unit Switcher */}
          <div className="px-3 py-3 border-b border-slate-800/60 bg-slate-900/50">
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                  {schoolUnits?.length > 0 ? (
                    schoolUnits.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          changeActiveSchoolUnit(u.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex items-center justify-between ${
                          activeSchoolUnit?.id === u.id ? 'text-emerald-400 font-bold bg-slate-700/50' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{u.name}</span>
                        {activeSchoolUnit?.id === u.id && <span className="text-[10px]">Aktif</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[11px] text-slate-400">Tidak ada unit lain</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Portal Switcher & Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition"
            >
              <Grid className="w-4 h-4" />
              <span>Kembali ke Portal Modul</span>
            </Link>

            <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || user?.username}</div>
                  <div className="text-[10px] text-emerald-400/90 truncate">{currentRole}</div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Tahfidz & Al-Quran</span>
            <span>&bull;</span>
            <span className="text-emerald-700 font-medium">{activeSchoolUnit?.name || 'Semua Unit'}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 font-medium">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Program Tahfidz IBS</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
