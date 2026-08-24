import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
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
  Building2
} from 'lucide-react';

export default function AkademikLayout() {
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localUnits, setLocalUnits] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);

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
        if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;

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
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Kiri */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Header Modul */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white leading-none truncate">
              Akademik & Kesiswaan
            </h1>
            <span className="text-[10px] text-teal-400 font-medium tracking-wide uppercase">
              SIAKAD Aldepos
            </span>
          </div>
        </div>

        {/* School Unit Selector */}
        {availableUnits && availableUnits.length > 0 && (
          <div className="p-3 bg-slate-800/40 border-b border-slate-800/60">
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
                className="w-full bg-slate-900 text-xs text-white rounded-lg border border-slate-700 py-1.5 px-2.5 focus:outline-none focus:border-teal-500 appearance-none pr-8 cursor-pointer font-bold"
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

        {/* Menu Navigasi Submodul */}
        <div className="p-3">
          <span className="text-[10px] font-semibold uppercase text-slate-300 tracking-wider px-3 block mb-1">
            Menu Akademik
          </span>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Launcher & User Profile Bottom */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Grid className="w-4 h-4 text-teal-400" />
            <span>Kembali ke Launcher</span>
          </Link>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between px-1">
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
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            {/* School Unit Selector at Top */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition shadow-2xs">
              <School className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Satuan Pendidikan:</span>
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
                className="bg-transparent text-xs font-extrabold text-teal-950 focus:outline-none cursor-pointer pr-2"
              >
                {(user?.account_type === 'admin' || user?.account_type === 'super_admin' || user?.school_roles?.some(r => r.role_name === 'admin_yayasan' || r.role_name === 'super_admin')) && (
                  <option value="">Semua Satuan Pendidikan (Yayasan)</option>
                )}
                {availableUnits && availableUnits.length > 0 ? (
                  availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))
                ) : (
                  <option value="">Memuat data satuan pendidikan...</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Academic Year & Active Semester Pill */}
            {(activeYear || activeSemester) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50/90 border border-teal-200/80 rounded-xl shadow-2xs">
                {activeYear && (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-900">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>TA {activeYear.name}</span>
                  </div>
                )}
                {activeYear && activeSemester && (
                  <span className="w-1 h-1 rounded-full bg-teal-400"></span>
                )}
                {activeSemester && (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800">
                    <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
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
                <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
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
                    <Grid className="w-3.5 h-3.5 text-teal-600" />
                    <span>App Launcher</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
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
