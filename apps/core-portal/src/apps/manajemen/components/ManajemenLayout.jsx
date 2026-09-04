import React, { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Layers,
  CalendarDays,
  Target,
  Award,
  AlertTriangle,
  CheckSquare,
  Activity,
  FileCheck2,
  FolderArchive,
  LogOut,
  ChevronDown,
  School,
  Grid,
  ShieldCheck,
  TrendingUp,
  ClipboardCheck,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  CalendarRange,
  BarChart3,
  Calendar,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { ManajemenThemeProvider, useManajemenTheme, ThemeToggle } from '../theme';

function ManajemenLayoutContent() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const { theme, isDark } = useManajemenTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [integrationMode, setIntegrationMode] = useState('terintegrasi'); // 'terintegrasi' | 'mandiri'
  const location = useLocation();

  // State Sidebar Collapsed (Icon-Only Mode)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('aldepos_manajemen_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextVal = !prev;
      localStorage.setItem('aldepos_manajemen_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

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
      title: 'Utama & Profil',
      items: [
        {
          label: 'Executive Dashboard',
          path: '/manajemen/dashboard',
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: 'Profil Lembaga & Legalitas',
          path: '/manajemen/institution-profile',
          icon: School,
          show: true,
        },
      ],
    },
    {
      title: 'Perencanaan',
      items: [
        {
          label: 'Rencana Induk (RIPS)',
          path: '/manajemen/planning/rips',
          icon: Compass,
          show: true,
        },
        {
          label: 'RKJP & RKJM',
          path: '/manajemen/planning/rkjp-rkjm',
          icon: CalendarRange,
          show: true,
        },
        {
          label: 'Rencana Kerja Tahunan (RKT)',
          path: '/manajemen/planning/rkt',
          icon: CalendarDays,
          show: true,
        },
        {
          label: 'Tugas & Proyek',
          path: '/manajemen/tasks',
          icon: CheckSquare,
          show: true,
        },
      ],
    },
    {
      title: 'Mutu, Kinerja & Evaluasi',
      items: [
        {
          label: 'Evaluasi Diri (EVADIR)',
          path: '/manajemen/evadir',
          icon: Activity,
          show: true,
        },
        {
          label: 'Balanced Scorecard (BSC)',
          path: '/manajemen/bsc',
          icon: BarChart3,
          show: true,
        },
        {
          label: 'Akreditasi',
          path: '/manajemen/quality',
          icon: Award,
          show: true,
        },
        {
          label: 'Manajemen Risiko',
          path: '/manajemen/risks',
          icon: AlertTriangle,
          show: true,
        },
        {
          label: 'Evaluasi Kinerja SDM',
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
      ],
    },
    {
      title: 'Operasional & Tata Kelola',
      items: [
        {
          label: 'Approval Center',
          path: '/manajemen/approvals',
          icon: FileCheck2,
          show: true,
        },
        {
          label: 'Repositori Dokumen',
          path: '/manajemen/documents',
          icon: FolderArchive,
          show: true,
        },
        {
          label: 'Agenda & Kalender',
          path: '/manajemen/agenda',
          icon: Calendar,
          show: true,
        },
      ],
    },
  ];

  return (
    <div
      data-theme={theme}
      className="flex h-screen font-sans antialiased overflow-hidden mj-canvas transition-colors duration-300"
      style={{
        backgroundColor: 'var(--mj-bg-canvas)',
        color: 'var(--mj-text-primary)',
      }}
    >
      {/* Sidebar Nav */}
      <aside
        className={`flex flex-col justify-between border-r shadow-2xl shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-20 min-w-[5rem]' : 'w-72 min-w-[18rem]'
        }`}
        style={{
          backgroundColor: 'var(--mj-bg-sidebar)',
          borderColor: 'var(--mj-border-default)',
          color: 'var(--mj-text-secondary)',
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Header with Toggle Button */}
          <div
            className="p-3.5 border-b flex items-center justify-between gap-2 shrink-0 transition-colors duration-300"
            style={{
              borderColor: 'var(--mj-border-default)',
              backgroundColor: 'var(--mj-bg-card-subtle)',
            }}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-950/40 border border-indigo-400/20 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <h1
                    className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none"
                    style={{ color: 'var(--mj-text-primary)' }}
                  >
                    <span>Manajemen</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mj-badge-primary">
                      Strategis
                    </span>
                  </h1>
                  <p
                    className="text-[10px] font-medium truncate mt-1"
                    style={{ color: 'var(--mj-text-muted)' }}
                  >
                    Perencanaan, Mutu &amp; Kinerja
                  </p>
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={isCollapsed ? 'Perluas Navigasi (Tampilkan Teks)' : 'Ciutkan Navigasi (Tampilkan Ikon Saja)'}
              className="p-1.5 rounded-xl transition shrink-0 border hover:opacity-80"
              style={{
                backgroundColor: 'var(--mj-bg-input)',
                borderColor: 'var(--mj-border-default)',
                color: 'var(--mj-text-secondary)',
              }}
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4 text-indigo-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
            {navGroups.map((group, idx) => {
              const visibleItems = group.items.filter((item) => item.show);
              if (visibleItems.length === 0) return null;
              return (
                <div key={idx} className="space-y-1">
                  {!isCollapsed ? (
                    <div
                      className="px-3 mb-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center justify-between"
                      style={{ color: 'var(--mj-text-subtle)' }}
                    >
                      <span>{group.title}</span>
                    </div>
                  ) : (
                    <div
                      className="w-full h-px my-2"
                      style={{ backgroundColor: 'var(--mj-border-subtle)' }}
                    />
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item, itemIdx) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={itemIdx}
                          to={item.path}
                          title={isCollapsed ? `${group.title}: ${item.label}` : undefined}
                          className={({ isActive }) =>
                            `flex items-center ${
                              isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                            } rounded-xl text-xs transition-all ${
                              isActive ? 'mj-nav-item-active' : 'mj-nav-item'
                            }`
                          }
                        >
                          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} overflow-hidden`}>
                            <Icon className="w-4 h-4 shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!isCollapsed && <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launcher Switcher Shortcut */}
          <div
            className="p-3 border-t transition-colors duration-300"
            style={{
              borderColor: 'var(--mj-border-default)',
              backgroundColor: 'var(--mj-bg-card-subtle)',
            }}
          >
            <Link
              to="/"
              title={isCollapsed ? 'Pusat Akses Modul' : undefined}
              className={`flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'justify-center gap-2 px-3'
              } w-full py-2 rounded-xl border transition text-xs font-medium hover:opacity-90`}
              style={{
                backgroundColor: 'var(--mj-bg-input)',
                borderColor: 'var(--mj-border-default)',
                color: 'var(--mj-text-secondary)',
              }}
            >
              <Grid className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {!isCollapsed && <span>Pusat Akses Modul</span>}
            </Link>
          </div>
        </div>

        {/* User Footer Profile */}
        <div
          className="p-3 border-t flex items-center justify-between transition-colors duration-300"
          style={{
            borderColor: 'var(--mj-border-default)',
            backgroundColor: 'var(--mj-bg-card-subtle)',
          }}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p
                  className="text-xs font-bold truncate"
                  style={{ color: 'var(--mj-text-primary)' }}
                >
                  {user?.full_name || user?.username || 'Pengguna'}
                </p>
                <p
                  className="text-[10px] truncate uppercase font-semibold"
                  style={{ color: 'var(--mj-primary)' }}
                >
                  {currentRole}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => logout('/manajemen/login')}
            title="Keluar / Logout"
            className="p-2 rounded-xl transition border border-transparent hover:border-rose-500/30 shrink-0 hover:opacity-80"
            style={{
              color: 'var(--mj-text-muted)',
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ backgroundColor: 'var(--mj-bg-canvas)' }}
      >
        {/* Top bar info */}
        <header
          className="h-14 border-b px-6 flex items-center justify-between shrink-0 shadow-sm backdrop-blur-md z-10 transition-colors duration-300"
          style={{
            backgroundColor: 'var(--mj-bg-header)',
            borderColor: 'var(--mj-border-default)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--mj-text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--mj-text-primary)' }}>
              {integrationMode === 'terintegrasi'
                ? 'Pusat Yayasan & Lembaga'
                : (activeSchoolUnit?.name || 'Satuan Pendidikan')}
            </span>
            <span>/</span>
            <span className="font-semibold" style={{ color: 'var(--mj-primary)' }}>
              Mode: {integrationMode === 'terintegrasi' ? 'Perencanaan Terintegrasi' : 'Perencanaan Mandiri'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] transition-colors duration-300"
              style={{
                backgroundColor: 'var(--mj-bg-card-subtle)',
                borderColor: 'var(--mj-border-default)',
                color: 'var(--mj-text-secondary)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold" style={{ color: 'var(--mj-text-primary)' }}>Siklus 2026–2030</span>
              <span style={{ color: 'var(--mj-border-strong)' }}>|</span>
              <span>TA 2026/2027</span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold mj-badge-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Eksekutif Mutu</span>
            </span>

            {/* Theme Switcher Toggle (Far Right) */}
            <ThemeToggle showLabel={true} />
          </div>
        </header>

        {/* Page View */}
        <div
          className="flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors duration-300"
          style={{
            backgroundColor: 'var(--mj-bg-canvas)',
            color: 'var(--mj-text-primary)',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function ManajemenLayout() {
  return (
    <ManajemenThemeProvider>
      <ManajemenLayoutContent />
    </ManajemenThemeProvider>
  );
}

