import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  FileCheck2,
  GraduationCap,
  LogOut,
  UserCircle,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CalendarDays,
  ShieldCheck
} from 'lucide-react';

export default function CalonMuridLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Dual Theme
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('aldepos_portal_theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('aldepos_portal_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-portal/me');
      setProfile(res.data?.data || null);
    } catch (err) {
      console.warn('Error fetching candidate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const registrant = profile?.registrant;

  const navItems = [
    {
      name: 'Beranda & Status',
      path: '/calon-murid/dashboard',
      icon: LayoutDashboard,
      badge: registrant?.status ? registrant.status.replace('_', ' ').toUpperCase() : null
    },
    {
      name: 'Data Lengkap Formulir',
      path: '/calon-murid/data-lengkap',
      icon: FileText
    },
    {
      name: 'Berkas Dokumen',
      path: '/calon-murid/dokumen',
      icon: UploadCloud,
      count: profile?.documents?.length || 0
    },
    {
      name: 'Tes Seleksi Masuk',
      path: '/calon-murid/test',
      icon: FileCheck2,
      count: profile?.test_sessions?.length || 0
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'placed':
        return { text: 'Diterima & Ditempatkan', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'test_passed':
        return { text: 'Lulus Tes Seleksi', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'testing':
        return { text: 'Tahap Ujian Seleksi', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'test_failed':
        return { text: 'Belum Lulus Tes', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'rejected':
        return { text: 'Belum Diterima', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      default:
        return { text: 'Berkas Terdaftar', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
  };

  const statusBadge = getStatusBadge(registrant?.status);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* TOP NAVBAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-2xs'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black shadow-md shadow-emerald-600/30">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-emerald-600 dark:text-emerald-400">
                    ALDEPOS
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                    Portal Calon Murid
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Penerimaan Murid Baru TP {registrant?.target_academic_year || '2026/2027'}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-1 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'C'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                    {registrant?.full_name || user?.full_name || 'Calon Santri'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {registrant?.registration_number || user?.username}
                  </p>
                </div>
              </button>

              {userDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 z-50 transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
                }`}>
                  <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-bold">{registrant?.full_name || user?.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">No. Reg: {registrant?.registration_number || '-'}</p>
                    <div className="mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      navigate('/calon-murid/login');
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar dari Portal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      {isMobileNavOpen && (
        <div className={`lg:hidden border-b px-4 py-3 space-y-1 transition ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </NavLink>
            );
          })}
        </div>
      )}

      {/* MAIN VIEW */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet context={{ profile, refreshProfile: fetchProfile }} />
      </main>

      {/* FOOTER */}
      <footer className={`border-t py-4 px-6 text-center text-xs transition ${
        isDark ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Yayasan Aldepos Salafiyah — Sistem Penerimaan Murid Baru</p>
          <p className="text-[11px] font-mono">Status Server: Online • Terenkripsi SSL</p>
        </div>
      </footer>
    </div>
  );
}
