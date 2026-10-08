import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Network,
  Clock,
  CalendarRange,
  Banknote,
  Award,
  LogOut,
  ChevronDown,
  School,
  Grid,
  BrainCircuit,
  HelpCircle,
  Sparkles,
  Tag,
  MapPin,
  Building2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function KepegawaianLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setIsReloading(true);
    setReloadKey((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent('app:reload-data'));
    setTimeout(() => {
      setIsReloading(false);
    }, 650);
  };

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'hrd';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/kepegawaian/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Data Pegawai',
      path: '/kepegawaian/employees',
      icon: Users,
    },
    {
      label: 'Status Kepegawaian',
      path: '/kepegawaian/employment-statuses',
      icon: Tag,
    },
    {
      label: 'Rekrutmen',
      path: '/kepegawaian/recruitment',
      icon: UserPlus,
    },
    {
      label: 'Tes Psikologi (Sesi)',
      path: '/kepegawaian/psikotes/sesi',
      icon: BrainCircuit,
    },
    {
      label: 'Tes Psikologi Saya',
      path: '/kepegawaian/psikotes/saya',
      icon: Sparkles,
    },
    {
      label: 'Bank Soal Psikotes',
      path: '/kepegawaian/psikotes/bank-soal',
      icon: HelpCircle,
    },
    {
      label: 'Struktur & DUK',
      path: '/kepegawaian/organization',
      icon: Network,
    },
    {
      label: 'Presensi / Absensi',
      path: '/kepegawaian/attendance',
      icon: Clock,
    },
    {
      label: 'Pengaturan Absensi',
      path: '/kepegawaian/attendance-settings',
      icon: MapPin,
    },
    {
      label: 'Cuti & Lembur',
      path: '/kepegawaian/leaves-overtimes',
      icon: CalendarRange,
    },
    {
      label: 'Penggajian (Payroll)',
      path: '/kepegawaian/payroll',
      icon: Banknote,
    },
    {
      label: 'Penilaian Kinerja',
      path: '/kepegawaian/performance',
      icon: Award,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Kiri - Fixed & Sticky */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 sticky top-0 h-screen z-30">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
              K
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-none">ALDEPOS</h1>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">Modul Kepegawaian</p>
            </div>
          </div>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Peran Aktif</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-indigo-300 border border-indigo-500/30">
            {currentRole}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu Kepegawaian ({navItems.length})
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>v1.0.0 &bull; Kepegawaian</span>
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
              Sistem Informasi Manajemen Kepegawaian & SDM (HRIS)
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Tombol Reload Data / Refresh Database Halaman Aktif */}
            <button
              type="button"
              onClick={handleReload}
              disabled={isReloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition shadow-2xs active:scale-95 disabled:opacity-60 group"
              title="Muat ulang seluruh data database pada halaman ini"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-transform ${
                  isReloading ? 'animate-spin text-emerald-600' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {isReloading ? 'Memuat Data...' : 'Reload Data'}
              </span>
            </button>

            {/* Dropdown Satuan Pendidikan Aktif */}
            {schoolUnits && schoolUnits.length > 0 && (
              <div className="relative">
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
                  {user?.full_name?.charAt(0) || 'K'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.full_name || 'HRD Admin'}
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
          <Outlet key={reloadKey} context={{ reloadKey, handleReload }} />
        </main>
      </div>
    </div>
  );
}
