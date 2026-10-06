import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  Clock,
  HeartHandshake,
  Activity,
  Calendar,
  Award,
  LogOut,
  ChevronDown,
  School,
  Grid,
  Users,
  Building2,
  PanelLeft,
  PanelLeftClose,
  History
} from 'lucide-react';

export default function AkademikLayout() {
  const location = useLocation();
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localUnits, setLocalUnits] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);

  // State Sidebar Collapsed (Icon-Only Mode)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('aldepos_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('aldepos_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

  useEffect(() => {
    api.get('/core/school-units')
      .then(res => {
        const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
        setLocalUnits(items);
        if (!activeSchoolUnit && items.length > 0) {
          const savedId = localStorage.getItem('aldepos_active_school_unit_id');
          const target = items.find(u => String(u.id) === String(savedId)) || items[0];
          if (target && changeActiveSchoolUnit) changeActiveSchoolUnit(target);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch active year and semester for active school unit
  useEffect(() => {
    const fetchActiveMaster = async () => {
      try {
        const params = {};
        if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') {
          params.satuan_pendidikan_id = activeSchoolUnit.id;
        }

        const [yearsRes, semestersRes] = await Promise.all([
          api.get('/akademik/academic-years', { params }).catch(() => ({ data: { data: [] } })),
          api.get('/akademik/semesters', { params }).catch(() => ({ data: { data: [] } })),
        ]);

        const yearsList = yearsRes.data?.data || [];
        const semestersList = semestersRes.data?.data || [];

        const actYear = yearsList.find(y => y.is_active) || yearsList[0] || null;
        const actSem = semestersList.find(s => s.is_active) || semestersList[0] || null;

        setActiveYear(actYear);
        setActiveSemester(actSem);
      } catch (err) {
        console.warn('Failed to load active year/semester:', err);
      }
    };

    fetchActiveMaster();
  }, [activeSchoolUnit]);

  const availableUnits = (schoolUnits && schoolUnits.length > 0) ? schoolUnits : localUnits;

  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'guru';

  const navItems = [
    {
      label: 'Dashboard',
      path: '/akademik/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Data Siswa & Wali',
      path: '/akademik/students',
      icon: GraduationCap,
    },
    {
      label: 'Rombongan Belajar',
      path: '/akademik/rombel',
      icon: Users,
    },
    {
      label: 'Kenaikan & Kelulusan',
      path: '/akademik/kenaikan-kelulusan',
      icon: Award,
    },
    {
      label: 'Master Data',
      path: '/akademik/master',
      icon: Building2,
    },
    {
      label: 'Kurikulum & Mapel',
      path: '/akademik/curriculum',
      icon: BookOpen,
    },
    {
      label: 'Jadwal Pelajaran',
      path: '/akademik/schedules',
      icon: Clock,
    },
    {
      label: 'Input Nilai Mapel',
      path: '/akademik/scores',
      icon: ClipboardList,
    },
    {
      label: 'Input Nilai Ekstrakurikuler',
      path: '/akademik/extracurricular-scores',
      icon: Award,
    },
    {
      label: 'Rapor Semester',
      path: '/akademik/report-cards',
      icon: FileSpreadsheet,
    },
    {
      label: 'Presensi & Izin',
      path: '/akademik/attendance',
      icon: Clock,
    },
    {
      label: 'Kesiswaan & BK',
      path: '/akademik/student-affairs',
      icon: HeartHandshake,
    },
    {
      label: 'Ekstrakurikuler',
      path: '/akademik/extracurriculars',
      icon: Activity,
    },
    {
      label: 'Kalender Akademik',
      path: '/akademik/calendar',
      icon: Calendar,
    },
    // Riwayat & Arsip
    {
      label: 'Riwayat & Impor Data',
      path: '/akademik/riwayat-data',
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Kiri - Sticky Top & Independent Scroll */}
      <aside className={`sticky top-0 h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Header Modul */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              A
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xs font-black text-white leading-none truncate">
                  Akademik & Kesiswaan
                </h1>
                <span className="text-[10px] text-emerald-400 font-bold tracking-wide uppercase block mt-1">
                  SIAKAD Aldepos
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Buka Sidebar Navigation (Tampilkan Teks)" : "Sembunyikan Navigasi (Tampilkan Ikon Saja)"}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0 border border-slate-700/60 shadow-2xs"
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4 text-emerald-400" /> : <PanelLeftClose className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* School Unit Selector */}
        {availableUnits && availableUnits.length > 0 && !isCollapsed && (
          <div className="p-3 bg-slate-800/40 border-b border-slate-800/60 shrink-0">
            <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
              Satuan Pendidikan Aktif
            </label>
            <div className="relative">
              <select
                value={activeSchoolUnit?.id || ''}
                onChange={(e) => {
                  if (!e.target.value) {
                    changeActiveSchoolUnit(null);
                  } else {
                    const selected = availableUnits.find(u => u.id === Number(e.target.value));
                    if (selected) changeActiveSchoolUnit(selected);
                  }
                }}
                className="w-full bg-slate-900 text-xs text-white rounded-lg border border-slate-700 py-1.5 px-2.5 focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer font-bold"
              >
                {(user?.account_type === 'admin' || user?.account_type === 'super_admin' || user?.school_roles?.some(r => r.role_name === 'admin_yayasan' || r.role_name === 'super_admin')) && (
                  <option value="">Semua Satuan Pendidikan (Yayasan)</option>
                )}
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Menu Navigasi Submodul - Independent Scroll Area */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-3 block mb-1">
              Menu Akademik
            </span>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md font-bold'
                      : 'text-slate-400 hover:bg-slate-800/90 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Launcher & User Profile Bottom */}
        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          <Link
            to="/"
            title={isCollapsed ? "Kembali ke Launcher" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-3'} py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors`}
          >
            <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && <span>Kembali ke Launcher</span>}
          </Link>

          <div className={`pt-2 border-t border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-white truncate">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-[10px] text-slate-300 capitalize truncate">
                    {currentRole}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0" title={user?.full_name || user?.username}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar - Sticky Top Header */}
        <header className="sticky top-0 z-[100] h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            {/* Toggle Sidebar Button at Top Navbar */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={isCollapsed ? "Buka Navigasi (Tampilkan Teks)" : "Sembunyikan Navigasi (Tampilkan Ikon Saja)"}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 font-bold text-xs shadow-2xs border border-slate-200 cursor-pointer"
            >
              {isCollapsed ? <PanelLeft className="w-4 h-4 text-emerald-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-600" />}
              <span className="hidden sm:inline">{isCollapsed ? 'Buka Sidebar' : 'Ciutkan Navigasi'}</span>
            </button>

            {/* Tombol Kembali ke Portal Modul */}
            <Link
              to="/"
              title="Kembali ke Portal Modul (Launcher)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition font-bold text-xs shadow-2xs border border-slate-200 group"
            >
              <Grid className="w-4 h-4 text-slate-600 group-hover:text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Portal Modul</span>
            </Link>

            {/* Custom Interactive School Unit Selector at Top Navbar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all duration-200 shadow-2xs group ${
                  dropdownOpen
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-emerald-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <School className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="text-[9.5px] font-black uppercase text-slate-400 block tracking-wider leading-none">
                    Satuan Pendidikan
                  </span>
                  <span className="text-xs font-black text-slate-800 group-hover:text-emerald-950 truncate block mt-0.5 max-w-[180px] sm:max-w-[260px]">
                    {activeSchoolUnit?.name || 'Semua Unit (Yayasan)'}
                  </span>
                </div>
                <div className="flex items-center gap-1 pl-1 shrink-0 border-l border-slate-200 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </div>
              </button>

              {/* Custom Popover Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[999]"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200/90 rounded-xl shadow-2xl z-[1000] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Pilih Satuan Pendidikan
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {availableUnits?.length || 0} Satuan
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 p-1 scrollbar-thin">
                      {(user?.account_type === 'admin' || user?.account_type === 'super_admin' || user?.school_roles?.some(r => r.role_name === 'admin_yayasan' || r.role_name === 'super_admin')) && (
                        <button
                          type="button"
                          onClick={() => {
                            changeActiveSchoolUnit(null);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group ${
                            !activeSchoolUnit
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              !activeSchoolUnit ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-black leading-tight">Semua Satuan Pendidikan</p>
                              <p className={`text-[10px] ${!activeSchoolUnit ? 'text-emerald-100' : 'text-slate-400'}`}>Tingkat Lembaga / Yayasan</p>
                            </div>
                          </div>
                          {!activeSchoolUnit && (
                            <span className="text-white font-black text-xs">✓</span>
                          )}
                        </button>
                      )}

                      {availableUnits && availableUnits.length > 0 ? (
                        availableUnits.map((unit) => {
                          const isSelected = activeSchoolUnit?.id === unit.id;
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => {
                                changeActiveSchoolUnit(unit);
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-md'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {unit.code || unit.name?.substring(0, 3)?.toUpperCase() || 'SCH'}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-black leading-tight truncate">{unit.name}</p>
                                  <p className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                    {unit.type || unit.level || 'Satuan Pendidikan Formal'}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-white font-black text-xs">✓</span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                          Memuat data satuan pendidikan...
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Academic Year & Active Semester Pill */}
            {(activeYear || activeSemester) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl shadow-2xs">
                {activeYear && (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>TA {activeYear.name}</span>
                  </div>
                )}
                {activeYear && activeSemester && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                )}
                {activeSemester && (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{activeSemester.name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:outline-none transition shadow-2xs"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <span>{user?.full_name || user?.username}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.username}</p>
                  </div>
                  <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Grid className="w-3.5 h-3.5 text-emerald-600" />
                    <span>App Launcher</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
