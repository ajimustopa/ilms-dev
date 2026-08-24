import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Award,
  TrendingUp,
  ClipboardCheck,
  Briefcase,
  LogOut,
  ChevronDown,
  School,
  Grid,
  ShieldCheck,
  BarChart2
} from 'lucide-react';

export default function ManajemenLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'pegawai_umum';
  const permissions = user?.permissions || [];

  const hasPerm = (prefix) => {
    if (user?.account_type === 'superadmin' || currentRole === 'super_admin' || currentRole === 'admin_yayasan') {
      return true;
    }
    return permissions.some((p) => p.startsWith(prefix) || p === '*');
  };

  const navGroups = [
    {
      title: 'Menu Utama',
      items: [
        {
          label: 'Executive Dashboard',
          path: '/manajemen/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: 'Perencanaan (RIPS/RKS)',
          path: '/manajemen/planning',
          icon: Compass,
          show: hasPerm('manajemen.planning') || hasPerm('manajemen'),
        },
        {
          label: 'Penjaminan Mutu & KPI',
          path: '/manajemen/quality',
          icon: Award,
          show: hasPerm('manajemen.quality') || hasPerm('manajemen'),
        },
        {
          label: 'Evaluasi Kinerja',
          path: '/manajemen/performance',
          icon: TrendingUp,
          show: hasPerm('manajemen.performance') || hasPerm('manajemen'),
        },
        {
          label: 'Supervisi Akademik',
          path: '/manajemen/supervision',
          icon: ClipboardCheck,
          show: hasPerm('manajemen.supervision') || hasPerm('manajemen'),
        },
        {
          label: 'Proyek, Task & Approval',
          path: '/manajemen/projects',
          icon: Briefcase,
          show: hasPerm('manajemen.projects') || hasPerm('manajemen'),
        },
      ].filter((item) => item.show),
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Nav */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-xl">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-950/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Manajemen</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Executive
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Mutu, Kinerja & Supervisi</p>
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
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Satuan Pendidikan
                  </div>
                  {schoolUnits?.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        changeActiveSchoolUnit(unit);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-700/80 transition ${
                        activeSchoolUnit?.id === unit.id
                          ? 'text-indigo-400 font-bold bg-slate-700/40'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span className="truncate">{unit.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item, itemIdx) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={itemIdx}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 font-semibold'
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

          {/* Launcher Switcher Shortcut */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
            <Link
              to="/launcher"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition text-xs font-medium"
            >
              <Grid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Portal Launcher</span>
            </Link>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || user?.username || 'Pengguna'}
              </p>
              <p className="text-[10px] text-indigo-400 truncate uppercase font-medium">
                {currentRole}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Keluar / Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar info */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{activeSchoolUnit?.name || 'Sekolah'}</span>
            <span>/</span>
            <span className="text-indigo-600 font-medium">Sistem Manajemen & Mutu Terpadu</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistem Aktif & Terhubung
            </span>
          </div>
        </header>

        {/* Page View */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
