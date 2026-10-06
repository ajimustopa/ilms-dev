import React, { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * ListItem Component - Design System Portal Guru
 * Baris item data dengan tinggi minimum 44px (touch target nyaman) dan tata letak semantik.
 */
export const ListItem = forwardRef(({
  title,
  subtitle = null,
  description = null,
  avatar = null,
  icon = null,
  badge = null,
  rightElement = null,
  chevron = false,
  onClick = null,
  divider = true,
  className = '',
  as: Component = 'div',
  ...props
}, ref) => {
  const isInteractive = Boolean(onClick);
  const interactiveStyles = isInteractive
    ? 'cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset'
    : '';

  const dividerStyle = divider ? 'border-b border-slate-100 dark:border-slate-800/80 last:border-b-0' : '';

  return (
    <Component
      ref={ref}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      className={`flex items-center gap-3 px-3.5 py-3 min-h-[44px] text-left select-none ${interactiveStyles} ${dividerStyle} ${className}`}
      {...props}
    >
      {/* Left Slot: Avatar / Icon */}
      {(avatar || icon) && (
        <div className="shrink-0 flex items-center justify-center">
          {avatar ? (
            typeof avatar === 'string' ? (
              <img
                src={avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : avatar
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      )}

      {/* Center Slot: Title, Subtitle, Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </p>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </p>
        )}
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2 mt-1">
            {description}
          </p>
        )}
      </div>

      {/* Right Slot: Right element & optional Chevron */}
      {(rightElement || chevron) && (
        <div className="shrink-0 flex items-center gap-2 pl-2">
          {rightElement}
          {chevron && (
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          )}
        </div>
      )}
    </Component>
  );
});

ListItem.displayName = 'ListItem';
export default ListItem;
