import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import {
  Building2,
  ChevronDown,
  LogOut,
  User,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function GuruHeader() {
  const { user, logout, activeSchoolUnit, schoolUnits, selectSchoolUnit, roleTitle } = useTeacherAuth();
  const navigate = useNavigate();
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/guru/login');
  };

  const displayName = user?.full_name || user?.name || user?.username || 'Guru';
  const unitName = activeSchoolUnit?.name || 'Yayasan Aldepos';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100/80 dark:border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Sisi Kiri: Brand & Unit Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/guru"
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
            title="Beranda Portal Guru"
          >
            <div className="w-9 h-9 rounded-2xl bg-[#5B61F4] text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block tracking-tight">Portal Guru</span>
              <span className="text-[10px] text-[#5B61F4] dark:text-indigo-400 font-bold block tracking-wider uppercase">Aldepos IBS</span>
            </div>
          </Link>

          {/* Unit Selector (Pilihan Satuan Pendidikan) */}
          {schoolUnits && schoolUnits.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                className="h-8.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-full flex items-center gap-1.5 transition shadow-xs border border-slate-200/80 dark:border-slate-700 max-w-[170px] sm:max-w-[240px]"
              >
                <Building2 className="w-3.5 h-3.5 text-[#5B61F4] shrink-0" />
                <span className="truncate">{unitName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${showUnitDropdown ? 'rotate-180 text-[#5B61F4]' : ''}`} />
              </button>

              {showUnitDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUnitDropdown(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      Pilih Satuan Pendidikan
                    </div>
                    <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
                      {schoolUnits.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            selectSchoolUnit(unit);
                            setShowUnitDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-2xl text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                            activeSchoolUnit?.id === unit.id ? 'font-bold text-[#5B61F4] bg-indigo-50/70 dark:bg-indigo-950/50' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{unit.name}</span>
                          {activeSchoolUnit?.id === unit.id && (
                            <span className="w-2 h-2 rounded-full bg-[#5B61F4] shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-8.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-full flex items-center gap-1.5 shadow-xs border border-slate-200/60 dark:border-slate-700 max-w-[170px] sm:max-w-none">
              <Building2 className="w-3.5 h-3.5 text-[#5B61F4] shrink-0" />
              <span className="truncate">{unitName}</span>
            </div>
          )}
        </div>

        {/* Sisi Kanan: User Profile, Role Badge & Logout */}
        <div className="flex items-center gap-2.5">
          {/* Badge Peran Guru */}
          <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#5B61F4] dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/80">
            {roleTitle}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="h-10 px-2 rounded-full flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800 transition focus:outline-none group"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-[#5B61F4] dark:text-indigo-300 flex items-center justify-center font-extrabold text-xs uppercase border border-indigo-200 dark:border-indigo-800 shadow-xs group-hover:scale-105 transition-transform">
                  {displayName.charAt(0)}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <span className="hidden md:block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180 text-[#5B61F4]' : ''}`} />
            </button>

            {showProfileDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                    <p className="text-[11px] text-[#5B61F4] font-bold">{roleTitle}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email || user?.username}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/guru/profil"
                      onClick={() => setShowProfileDropdown(false)}
                      className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profil Saya & Password</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default GuruHeader;
