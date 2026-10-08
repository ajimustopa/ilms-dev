import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { getRoleLabel, getInitials } from '../roleLabels';
import { isSuperAdminUser, getUserRoleNames } from '../accessControl';
import BottomSheet from '../../../shared/components/BottomSheet';

/**
 * AvatarMenu — Komponen Menu Profil & Akun Pengguna (Desktop Dropdown & Mobile Bottom Sheet)
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 4:
 * - Desktop: Popover dropdown di pojok kanan atas.
 * - Mobile: Bottom sheet modern dengan safe area dan drag handle.
 * - Navigasi:
 *   - "Panel Pengguna" -> /core/dashboard
 *   - "Pengaturan" -> /core/users (HANYA untuk Superadmin / user yang berhak)
 *   - "Keluar" -> memanggil logout() dari AuthContext
 * - "Ganti Kata Sandi" tidak dirender (belum ada route mandiri di core-portal).
 */
export default function AvatarMenu({
  user,
  onLogout,
  className = ''
}) {
  const navigate = useNavigate();
  const [isOpenDesktop, setIsOpenDesktop] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const dropdownRef = useRef(null);

  const fullName = user?.full_name || user?.name || user?.username || 'Pengguna';
  const roleNames = getUserRoleNames(user);
  const roleLabel = getRoleLabel(user);
  const initials = getInitials(fullName);
  const canAccessSettings = isSuperAdminUser(user, roleNames);
  const userIdentifier = user?.email || user?.username || '';

  // Close desktop dropdown on outside click or Esc
  useEffect(() => {
    if (!isOpenDesktop) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpenDesktop(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpenDesktop(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenDesktop]);

  const handleNavigate = (path) => {
    setIsOpenDesktop(false);
    setIsOpenMobile(false);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setIsOpenDesktop(false);
    setIsOpenMobile(false);
    onLogout();
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          // Open mobile bottom sheet on mobile, desktop dropdown on larger screens
          if (window.innerWidth < 640) {
            setIsOpenMobile(true);
          } else {
            setIsOpenDesktop(!isOpenDesktop);
          }
        }}
        aria-expanded={isOpenDesktop || isOpenMobile}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group active:scale-95"
      >
        {/* Avatar Circle with Initials */}
        <div className="w-8 h-8 rounded-full bg-emerald-700 text-emerald-50 dark:bg-emerald-600 dark:text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-white dark:ring-slate-800 shrink-0">
          {initials}
        </div>

        {/* Name & Role text (Desktop only) */}
        <div className="hidden sm:block text-left min-w-0">
          <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[130px]">
            {fullName}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate max-w-[130px]">
            {roleLabel}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
            isOpenDesktop ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
          }`}
        />
      </button>

      {/* ========================================================================= */}
      {/* DESKTOP POPOVER DROPDOWN                                                  */}
      {/* ========================================================================= */}
      {isOpenDesktop && (
        <div
          role="menu"
          className="hidden sm:block absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-2 shadow-xl z-50 ilms-fade-in"
        >
          {/* User Header */}
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {fullName}
              </p>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                {roleLabel}
              </span>
            </div>
            {userIdentifier && (
              <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                {userIdentifier}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1 space-y-0.5">
            {/* Panel Pengguna */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate('/core/dashboard')}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2.5 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Panel Pengguna</span>
            </button>

            {/* Pengaturan (Hanya untuk Superadmin / berhak) */}
            {canAccessSettings && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleNavigate('/core/users')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2.5 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>Pengaturan</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* Keluar */}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogoutClick}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM SHEET                                                      */}
      {/* ========================================================================= */}
      <BottomSheet
        isOpen={isOpenMobile}
        onClose={() => setIsOpenMobile(false)}
        showCloseButton={true}
      >
        {/* User Card Header */}
        <div className="flex items-center gap-3.5 pb-4 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {fullName}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 shrink-0">
                {roleLabel}
              </span>
            </div>
            {userIdentifier && (
              <p className="text-xs text-slate-400 dark:text-slate-400 truncate">
                {userIdentifier}
              </p>
            )}
          </div>
        </div>

        {/* Mobile Menu Action Rows */}
        <div className="flex flex-col gap-1.5">
          {/* Panel Pengguna */}
          <button
            type="button"
            onClick={() => handleNavigate('/core/dashboard')}
            className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Panel Pengguna
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Pengaturan (Hanya untuk yang berhak) */}
          {canAccessSettings && (
            <button
              type="button"
              onClick={() => handleNavigate('/core/users')}
              className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Pengaturan
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* Spacer */}
          <div className="h-1" />

          {/* Keluar dari Akun (Destructive) */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-bold">
                Keluar dari Akun
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
