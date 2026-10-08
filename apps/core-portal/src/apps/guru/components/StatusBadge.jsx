import React from 'react';

/**
 * StatusBadge Component - Design System Portal Guru
 * Menyediakan lencana status semantik multi-modal (teks + huruf kode / dot / ikon) sesuai token warna Portal Guru.
 */
export const StatusBadge = ({
  status = 'neutral', // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children,
  code = null, // e.g. 'H' (Hadir), 'I' (Izin), 'S' (Sakit), 'A' (Alpa)
  dot = false,
  icon = null,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = ''
}) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      codeBg: 'bg-emerald-600 text-white'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
      codeBg: 'bg-amber-600 text-white'
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
      codeBg: 'bg-rose-600 text-white'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
      codeBg: 'bg-indigo-600 text-white'
    },
    neutral: {
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
      codeBg: 'bg-slate-500 text-white'
    }
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 min-h-[22px]',
    md: 'text-xs px-2.5 py-1 gap-1.5 min-h-[26px]',
    lg: 'text-sm px-3 py-1.5 gap-2 min-h-[32px]'
  };

  const currentTheme = styles[status] || styles.neutral;

  const renderIcon = (ic) => {
    if (!ic) return null;
    if (React.isValidElement(ic)) return ic;
    if (typeof ic === 'function' || typeof ic === 'object') {
      const IconComponent = ic;
      return <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    }
    return null;
  };

  const renderedIcon = renderIcon(icon);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border select-none ${currentTheme.bg} ${sizes[size] || sizes.md} ${className}`}
    >
      {code && (
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${currentTheme.codeBg}`}
          aria-hidden="true"
        >
          {code}
        </span>
      )}
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentTheme.dot}`} aria-hidden="true" />
      )}
      {renderedIcon && (
        <span className="shrink-0 text-current flex items-center" aria-hidden="true">{renderedIcon}</span>
      )}
      {children && <span className="truncate">{children}</span>}
    </span>
  );
};

export default StatusBadge;
