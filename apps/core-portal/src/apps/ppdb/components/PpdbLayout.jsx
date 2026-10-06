import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users2,
  FileCheck2,
  Wallet,
  UserX,
  ChevronDown,
  Building2,
  PanelLeft,
  PanelLeftClose,
  LogOut,
  GraduationCap,
  Sparkles,
  School,
  ArrowRight,
  Grid
} from 'lucide-react';
import AcademicYearSelector from './AcademicYearSelector';

export default function PpdbLayout() {
  const location = useLocation();
  const { user, activeSchoolUnit, schoolUnits, changeActiveSchoolUnit, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [localUnits, setLocalUnits] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(() => {
    return localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  });

  // State Sidebar Collapsed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('aldepos_ppdb_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('aldepos_ppdb_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

  // Fetch school units
  useEffect(() => {
    api.get('/core/school-units')
      .then(res => {
        const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
        setLocalUnits(items);
        if (!activeSchoolUnit && items.length > 0) {
          const savedId = localStorage.getItem('aldepos_active_school_unit_id');
          if (savedId === 'all') {
            if (changeActiveSchoolUnit) changeActiveSchoolUnit({ id: 'all', name: 'Pusat Yayasan (Gabungan)', is_foundation: true });
          } else {
            const target = items.find(u => String(u.id) === String(savedId)) || items[0];
            if (target && changeActiveSchoolUnit) changeActiveSchoolUnit(target);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch academic years lookup
  useEffect(() => {
    api.get('/psb/lookups/academic-years')
      .then(res => {
        const list = res.data?.data || [];
        setAcademicYears(list);
        // Jika belum ada pilihan yang tersimpan, gunakan tahun ajaran aktif dari Modul Akademik
        const savedYear = localStorage.getItem('aldepos_ppdb_selected_academic_year');
        if (!savedYear) {
          const activeAy = list.find(ay => ay.is_active);
          if (activeAy?.name) {
            setSelectedAcademicYear(activeAy.name);
            localStorage.setItem('aldepos_ppdb_selected_academic_year', activeAy.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Handler ganti Tahun Ajaran global
  const handleSelectYear = (yearName) => {
    setSelectedAcademicYear(yearName);
    localStorage.setItem('aldepos_ppdb_selected_academic_year', yearName);
    setYearDropdownOpen(false);
    // Broadcast event ke seluruh window agar halaman yang me-listen langsung refresh
    window.dispatchEvent(new CustomEvent('aldepos_ppdb_academic_year_changed', { detail: yearName }));
  };

  // Fetch active PSB program
  useEffect(() => {
    api.get('/psb/programs', {
      params: {
        status: 'active',
        target_academic_year: selectedAcademicYear || undefined
      }
    })
      .then(res => {
        const progs = res.data?.data || [];
        if (progs.length > 0) {
          setActiveProgram(progs[0]);
        } else {
          setActiveProgram(null);
        }
      })
      .catch(() => {});
  }, [activeSchoolUnit, selectedAcademicYear]);

  const availableUnits = (schoolUnits && schoolUnits.length > 0) ? schoolUnits : localUnits;
  const isGabungan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.level === 'yayasan';
  const currentRole = user?.school_roles?.[0]?.role_name || user?.account_type || 'panitia_ppdb';

  // Daftar opsi Tahun Ajaran lengkap
  const displayYears = academicYears.length > 0
    ? academicYears
    : [
        { id: 1, name: '2026/2027', is_active: true },
        { id: 2, name: '2025/2026', is_active: false },
        { id: 3, name: '2024/2025', is_active: false }
      ];

  const activeYearObj = displayYears.find(y => y.name === selectedAcademicYear);

  const navItems = [
    {
      to: '/ppdb/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Ringkasan & Metrik PSB'
    },
    {
      to: '/ppdb/programs',
      label: 'Program & Kuota',
      icon: CalendarDays,
      desc: 'Gelombang & Kuota Rombel'
    },
    {
      to: '/ppdb/registrants',
      label: 'Data Calon Murid',
      icon: Users2,
      desc: 'Formulir, Berkas & Kasir'
    },
    {
      to: '/ppdb/selection',
      label: 'Seleksi & Pengumuman',
      icon: FileCheck2,
      desc: 'Tes, Penilaian & SKL'
    },
    {
      to: '/ppdb/enrollment',
      label: 'Uang Pangkal & Rombel',
      icon: Wallet,
      desc: 'Daftar Ulang & Penempatan'
    },
    {
      to: '/ppdb/withdrawals',
      label: 'Pengunduran Diri',
      icon: UserX,
      desc: 'Pembatalan & Refund'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800">
      {/* Top Bar Header */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5 text-emerald-600" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">PSB ALDEPOS</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  PPDB Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Sistem Penerimaan Santri Baru Terpadu</p>
            </div>
          </Link>

          {/* Tombol Portal Modul */}
          <Link
            to="/"
            title="Kembali ke Portal Modul (Launcher)"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition font-bold text-xs shadow-2xs border border-slate-200 group ml-2"
          >
            <Grid className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 shrink-0" />
            <span>Portal Modul</span>
          </Link>
        </div>

        {/* Center / Selectors (Tahun Ajaran & Satuan Pendidikan) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Dropdown Pilihan Tahun Ajaran (Academic Year) Global Modern */}
          <AcademicYearSelector
            value={selectedAcademicYear}
            onChange={handleSelectYear}
            years={academicYears}
            variant="navbar"
            dropdownAlign="right"
          />

          {/* School Unit Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setYearDropdownOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
                isGabungan
                  ? 'border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100/70'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Pilih Konteks Satuan Pendidikan"
            >
              <School className={`w-4 h-4 shrink-0 ${isGabungan ? 'text-indigo-600' : 'text-emerald-600'}`} />
              <span className="max-w-[120px] sm:max-w-[180px] truncate">
                {isGabungan ? 'Pusat Yayasan (Gabungan)' : (activeSchoolUnit?.name || 'Pilih Satuan')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-68 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Konteks Pengelolaan Satuan
                </div>

                {/* Opsi Konteks Gabungan Yayasan */}
                <button
                  type="button"
                  onClick={() => {
                    const gabunganUnit = { id: 'all', name: 'Pusat Yayasan (Gabungan)', is_foundation: true };
                    if (changeActiveSchoolUnit) changeActiveSchoolUnit(gabunganUnit);
                    localStorage.setItem('aldepos_active_school_unit_id', 'all');
                    localStorage.setItem('aldepos_active_school_unit', JSON.stringify(gabunganUnit));
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-50/60 transition-colors cursor-pointer border-b border-slate-100 ${
                    isGabungan ? 'bg-indigo-50 text-indigo-800 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-indigo-950">Pusat Yayasan (Gabungan)</div>
                      <div className="text-[10px] text-indigo-700/70">Pengelolaan terpusat seluruh satuan</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase font-bold">
                    Gabungan
                  </span>
                </button>

                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Satuan Pendidikan Satuan
                </div>

                {availableUnits.map(unit => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      if (changeActiveSchoolUnit) changeActiveSchoolUnit(unit);
                      localStorage.setItem('aldepos_active_school_unit_id', String(unit.id));
                      localStorage.setItem('aldepos_active_school_unit', JSON.stringify(unit));
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      !isGabungan && Number(activeSchoolUnit?.id) === Number(unit.id) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>{unit.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{unit.level}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User profile / Logout */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800">{user?.full_name || user?.name || 'Panitia PPDB'}</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">{currentRole}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 z-30 select-none ${
            isCollapsed ? 'w-18' : 'w-64'
          }`}
        >
          <div className="p-3 border-b border-slate-100">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Kembali ke Launcher"
            >
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {!isCollapsed && <span>Launcher Ekosistem</span>}
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && (
                    <div className="truncate flex-1">
                      <div>{item.label}</div>
                      <div className="text-[10px] opacity-75 font-normal">{item.desc}</div>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {!isCollapsed && (
            <div className="p-3 border-t border-slate-100 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Modul PSB Terintegrasi</span>
                <p className="text-[10px] mt-0.5 text-slate-400">Akademik • Keuangan • Core</p>
              </div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <Outlet context={{ selectedAcademicYear, setSelectedAcademicYear, academicYears, isGabungan, activeSchoolUnit, activeProgram }} />
        </main>
      </div>
    </div>
  );
}
