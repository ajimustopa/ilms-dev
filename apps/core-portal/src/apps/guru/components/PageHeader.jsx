import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

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
      className={`flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 ${
        compact ? 'py-2 px-3 sm:px-4' : 'py-3 px-3.5 sm:px-4'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {hasBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Kembali"
            className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate leading-snug">
              {title}
            </h1>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
