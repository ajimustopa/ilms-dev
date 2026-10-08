import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  School,
  Settings,
  Webhook,
  KeyRound,
  FileClock,
  LogOut,
  ChevronDown,
  UserCircle,
  Grid,
  CheckCircle2
} from 'lucide-react';

export default function Layout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kumpulkan seluruh wewenang/role yang dimiliki user
  const userRoles = new Set();
  if (user?.account_type) userRoles.add(String(user.account_type).toLowerCase().trim());
  if (user?.role) userRoles.add(String(user.role).toLowerCase().trim());
  if (user?.active_role) userRoles.add(String(user.active_role).toLowerCase().trim());
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string') userRoles.add(r.toLowerCase().trim());
      else if (r?.role_name) userRoles.add(String(r.role_name).toLowerCase().trim());
      else if (r?.name) userRoles.add(String(r.name).toLowerCase().trim());
    });
  }
  if (Array.isArray(user?.school_roles)) {
    user.school_roles.forEach((sr) => {
      if (typeof sr === 'string') userRoles.add(sr.toLowerCase().trim());
      else if (sr?.role_name) userRoles.add(String(sr.role_name).toLowerCase().trim());
      else if (sr?.name) userRoles.add(String(sr.name).toLowerCase().trim());
    });
  }
  if (Array.isArray(user?.school_units)) {
    user.school_units.forEach((su) => {
      if (su?.role) userRoles.add(String(su.role).toLowerCase().trim());
      if (Array.isArray(su?.roles)) {
        su.roles.forEach((r) => {
          if (typeof r === 'string') userRoles.add(r.toLowerCase().trim());
          else if (r?.role_name) userRoles.add(String(r.role_name).toLowerCase().trim());
          else if (r?.name) userRoles.add(String(r.name).toLowerCase().trim());
        });
      }
    });
  }

  const isSuperAdmin =
    user?.is_super_admin ||
    userRoles.has('super_admin') ||
    userRoles.has('superadmin') ||
    userRoles.has('admin') ||
    userRoles.has('developer');

  const isAdminYayasan = userRoles.has('admin_yayasan');
  const isAdminSatuan = userRoles.has('admin_satuan_pendidikan') || userRoles.has('admin_satuan');

  // Ambil nama role aktif user untuk badge
  let currentRole = 'super_admin';
  if (isSuperAdmin) currentRole = 'super_admin';
  else if (isAdminYayasan) currentRole = 'admin_yayasan';
  else if (isAdminSatuan) currentRole = 'admin_satuan_pendidikan';
  else if (userRoles.size > 0) currentRole = Array.from(userRoles)[0];
  else currentRole = user?.account_type || 'user';

  // Daftar navigasi dengan filter role sesuai roles.md
  const allNavItems = [
    {
      label: 'Dashboard',
      path: '/core/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan', 'developer', 'admin']
    },
    {
      label: 'Manajemen User',
      path: '/core/users',
      icon: Users,
      roles: ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan']
    },
    {
      label: 'Role & Permission',
      path: '/core/roles',
      icon: ShieldCheck,
      roles: ['super_admin', 'admin_yayasan']
    },
    {
      label: 'Profil Yayasan',
      path: '/core/foundation',
      icon: Building2,
      roles: ['super_admin', 'admin_yayasan']
    },
    {
      label: 'Satuan Pendidikan',
      path: '/core/school-units',
      icon: School,
      roles: ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan']
    },
    {
      label: 'Pengaturan Sistem',
      path: '/core/settings',
      icon: Settings,
      roles: ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan']
    },
    {
      label: 'Webhook Subscribers',
      path: '/core/webhooks',
      icon: Webhook,
      roles: ['super_admin', 'developer']
    },
    {
      label: 'API Gateway & Clients',
      path: '/core/api-clients',
      icon: KeyRound,
      roles: ['super_admin', 'developer']
    },
    {
      label: 'Audit Log',
      path: '/core/audit-logs',
      icon: FileClock,
      roles: ['super_admin', 'admin_yayasan', 'admin_satuan_pendidikan', 'developer']
    },
  ];

  // Filter navigasi berdasarkan role user
  const visibleNavItems = allNavItems.filter((item) => {
    if (isSuperAdmin) return true;
    return item.roles.some((r) => userRoles.has(r.toLowerCase().trim()));
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Kiri */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              A
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-none">ALDEPOS</h1>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">Core Service Admin</p>
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
            Menu Otorisasi ({visibleNavItems.length})
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
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
          <span>v1.0.0 &bull; Core Service</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </div>
      </aside>

      {/* Konten Kanan */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Atas */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          {/* Header Title & Portal Link */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-2xs"
              title="Ke Portal Utama"
            >
              <Grid className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Portal Aplikasi</span>
            </NavLink>
            <div className="text-xs font-semibold text-slate-600 hidden md:block">
              Pusat Autentikasi SSO & Manajemen Organisasi
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Dropdown Satuan Pendidikan Aktif */}
            {schoolUnits && schoolUnits.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition shadow-2xs ${
                    !activeSchoolUnit || activeSchoolUnit.id === 'all'
                      ? 'border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Ganti Konteks Satuan Pendidikan / Data Gabungan"
                >
                  {!activeSchoolUnit || activeSchoolUnit.id === 'all' ? (
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ) : (
                    <School className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="max-w-[170px] truncate font-semibold">
                    {!activeSchoolUnit || activeSchoolUnit.id === 'all'
                      ? 'Semua Satuan (Gabungan)'
                      : activeSchoolUnit.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Konteks Data Aktif</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {schoolUnits.length} Unit
                      </span>
                    </div>

                    {/* Pilihan 1: Semua Satuan Pendidikan (Data Gabungan) */}
                    <button
                      type="button"
                      onClick={() => {
                        changeActiveSchoolUnit(null);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-blue-50/60 transition border-b border-slate-100 ${
                        !activeSchoolUnit || activeSchoolUnit.id === 'all'
                          ? 'bg-blue-50 text-blue-800 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">Semua Satuan (Data Gabungan)</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Pusat Yayasan &bull; Rekap Lintas Seluruh Unit
                          </span>
                        </div>
                      </div>
                      {(!activeSchoolUnit || activeSchoolUnit.id === 'all') && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                      )}
                    </button>

                    {/* Pilihan 2: Masing-masing Satuan Pendidikan */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 py-1">
                      {schoolUnits.map((unit) => {
                        const isSelected = activeSchoolUnit?.id === unit.id;
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => {
                              changeActiveSchoolUnit(unit);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-bold'
                                : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <School className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{unit.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  Jenjang: {unit.level || unit.school_level || '-'} &bull; NPSN: {unit.npsn || '-'}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profil User Badge */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.full_name || 'Administrator'}
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
