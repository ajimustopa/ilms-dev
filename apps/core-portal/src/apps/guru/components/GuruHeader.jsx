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

export default function GuruHeader() {
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Sisi Kiri: Brand & Unit Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/guru"
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            title="Beranda Portal Guru"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm group-hover:bg-emerald-700 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <span className="text-sm font-bold text-slate-900 block tracking-tight">Portal Guru</span>
              <span className="text-[10px] text-emerald-700 font-semibold block tracking-wider uppercase">Aldepos IBS</span>
            </div>
          </Link>

          {/* Unit Selector (Pilihan Satuan Pendidikan) */}
          {schoolUnits && schoolUnits.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                className="h-8 px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md flex items-center gap-1.5 transition border border-slate-200/80 max-w-[160px] sm:max-w-[220px]"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{unitName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {showUnitDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUnitDropdown(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Ganti Satuan Pendidikan
                    </div>
                    {schoolUnits.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          selectSchoolUnit(unit);
                          setShowUnitDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                          activeSchoolUnit?.id === unit.id ? 'font-semibold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{unit.name}</span>
                        {activeSchoolUnit?.id === unit.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-8 px-2.5 text-xs font-medium text-slate-600 bg-slate-100/70 rounded-md flex items-center gap-1.5 border border-slate-200/60 max-w-[160px] sm:max-w-none">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{unitName}</span>
            </div>
          )}
        </div>

        {/* Sisi Kanan: User Profile, Role Badge & Logout */}
        <div className="flex items-center gap-2">
          {/* Badge Peran Guru */}
          <div className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {roleTitle}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="h-9 px-2 rounded-lg flex items-center gap-2 text-slate-700 hover:bg-slate-100 transition focus:outline-none"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-300">
                {displayName.charAt(0)}
              </div>
              <span className="hidden md:block text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">{roleTitle}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email || user?.username}</p>
                  </div>

                  <Link
                    to="/guru/profil"
                    onClick={() => setShowProfileDropdown(false)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profil Saya & Password</span>
                  </Link>

                  <Link
                    to="/guru-lama/dashboard"
                    onClick={() => setShowProfileDropdown(false)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-amber-500" />
                    <span>Buka Portal Guru Lama</span>
                  </Link>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
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
