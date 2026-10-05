import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_BORDER_MAP = {
  success: 'border-l-emerald-500',
  danger: 'border-l-rose-500',
  warning: 'border-l-amber-500',
  info: 'border-l-indigo-500',
  neutral: 'border-l-slate-300'
};

export default function StatRibbonCard({
  label,
  title,
  value,
  context,
  subtitle,
  badge,
  children,
  status = 'neutral',
  icon: Icon,
  onClick,
  to
}) {
  const borderStatusClass = STATUS_BORDER_MAP[status] || STATUS_BORDER_MAP.neutral;
  const isInteractive = Boolean(to || onClick);
  const displayLabel = label || title;
  const displayContext = context || subtitle;
  
  const containerClasses = `p-3 rounded-lg bg-white border border-slate-200/80 border-l-[3px] ${borderStatusClass} flex flex-col justify-between ${
    isInteractive ? 'hover:border-slate-300 hover:shadow-2xs transition group cursor-pointer text-left' : ''
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">
            {displayLabel}
          </span>
        </div>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1.5">
        <div className="text-lg font-bold tnum text-slate-800 leading-tight truncate">
          {value}
        </div>
        {displayContext && (
          typeof displayContext === 'string' ? (
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {displayContext}
            </p>
          ) : (
            <div className="mt-1">{displayContext}</div>
          )
        )}
        {children}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={containerClasses}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={containerClasses}>
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}
