import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * PageHeader Component - Design System Portal Guru
 * Header halaman mobile-first dengan tombol kembali (44px touch target), judul semibold, dan slot aksi.
 */
export const PageHeader = ({
  title,
  subtitle = null,
  badge = null,
  onBack = null,
  backUrl = null,
  showBack = false,
  actions = null,
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const hasBack = showBack || Boolean(onBack) || Boolean(backUrl);

  return (
    <div
      className={`flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-2xs mb-4 ${
        compact ? 'py-2 px-3 sm:px-4' : 'py-3 px-3.5 sm:px-4'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {hasBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Kembali"
            className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
              {title}
            </h1>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
