import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Globe,
  LayoutDashboard,
  Home,
  Users,
  Smile,
  Newspaper,
  Image,
  HelpCircle,
  Calendar,
  UserPlus,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  ExternalLink,
  ShieldCheck,
  Grid
} from 'lucide-react';

export default function WebsiteUtamaLayout() {
  const { user, logout, activeSchoolUnit, schoolUnits: authSchoolUnits, changeActiveSchoolUnit } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const schoolUnits = (authSchoolUnits && authSchoolUnits.length > 0) ? authSchoolUnits : (user?.school_units || []);
  const currentUnit = activeSchoolUnit || schoolUnits[0];

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { name: 'Dashboard CMS', path: '/website-utama/dashboard', icon: LayoutDashboard },
    { name: 'Beranda & Keunggulan', path: '/website-utama/home', icon: Home },
    { name: 'Profil Pengajar', path: '/website-utama/staff-profiles', icon: Users },
    { name: 'Kehidupan Sekolah', path: '/website-utama/school-life', icon: Smile },
    { name: 'Berita & Pengumuman', path: '/website-utama/news', icon: Newspaper },
    { name: 'Galeri Kegiatan', path: '/website-utama/galleries', icon: Image },
    { name: 'FAQ & Testimoni', path: '/website-utama/faqs-testimonials', icon: HelpCircle },
    { name: 'Agenda & Akreditasi', path: '/website-utama/events-accreditations', icon: Calendar },
    { name: 'PPDB Online (Admin)', path: '/website-utama/ppdb', icon: UserPlus },
    { name: 'Layanan Konsultasi', path: '/website-utama/consultation', icon: MessageSquare },
    { name: 'Artikel & Moderasi', path: '/website-utama/articles', icon: FileText },
    { name: 'Pengaturan & Akses CMS', path: '/website-utama/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shadow-xl z-20">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white tracking-wide">CMS WEBSITE</h1>
              <p className="text-[11px] text-emerald-400 font-medium">Portal & PPDB Online</p>
            </div>
          </div>
        </div>

        {/* Satuan Pendidikan Selector */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/60">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Satuan Pendidikan
          </label>
          <div className="relative">
            <select
              value={activeSchoolUnit?.id || 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  if (changeActiveSchoolUnit) changeActiveSchoolUnit(null);
                } else {
                  const u = schoolUnits.find(unit => String(unit.id) === e.target.value);
                  if (u && changeActiveSchoolUnit) changeActiveSchoolUnit(u);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none font-medium cursor-pointer"
            >
              <option value="all">Semua Satuan (Data Gabungan)</option>
              {schoolUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Admin CMS'}</p>
                <span className="inline-flex items-center text-[10px] text-emerald-400">
                  <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                  {user?.account_type || 'Superadmin'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <Link
              to="/"
              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center justify-center space-x-1 py-1"
            >
              <span>Kembali ke App Launcher</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition shadow-2xs group"
              title="Kembali ke Portal Modul (Launcher)"
            >
              <Grid className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 shrink-0" />
              <span>Portal Modul</span>
            </Link>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-800 leading-tight">{currentUnit?.name || 'SD Aldepos Islamic School'}</h2>
                <p className="text-[11px] text-slate-500">Panel Administrasi Konten & PPDB Online</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="http://localhost:3000/api/v1/website-utama/public/home"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Live Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{user?.username}</p>
              <p className="text-[10px] text-slate-500">{user?.full_name}</p>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet context={{ schoolUnitId: currentUnit?.id || 1 }} />
        </main>
      </div>
    </div>
  );
}
