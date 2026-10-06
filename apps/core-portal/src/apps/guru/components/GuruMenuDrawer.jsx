import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { getDrawerSections, isMenuItemActive } from '../utils/guruNavigation';
import { X, GraduationCap, ChevronRight } from 'lucide-react';

/**
 * GuruMenuDrawer Component - Full Mobile Navigation Drawer
 * Mengakses seluruh menu Portal Guru dari layar mobile dengan pengelompokan ranah kerja dan hak akses peran.
 */
export function GuruMenuDrawer({ isOpen, onClose }) {
  const location = useLocation();
  const { teacherRoles, roleTitle } = useTeacherAuth();

  // Lock scroll body saat drawer terbuka
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = getDrawerSections(teacherRoles);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seluruh Menu Portal Guru"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop overlay */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Menu Portal Guru</h2>
              <p className="text-[11px] text-emerald-700 font-medium">Peran: {roleTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Menu"
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isMenuItemActive(item, location.pathname);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between p-2.5 min-h-[44px] rounded-lg border transition text-left select-none ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate text-slate-900">
                              {item.label}
                            </span>
                            {item.badgeRole && (
                              <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                                {item.badgeRole(teacherRoles)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GuruMenuDrawer;
