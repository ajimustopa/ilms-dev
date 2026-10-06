import React, { forwardRef } from 'react';

/**
 * Card Component - Design System Portal Guru
 * Menyediakan kontainer permukaan data, dengan opsi Ribbon Status 4px di sisi kiri (StatRibbonCard).
 */
export const Card = forwardRef(({
  children,
  ribbon = null, // 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  hoverable = false,
  padding = 'normal', // 'none' | 'sm' | 'normal' | 'lg'
  className = '',
  onClick,
  as: Component = 'div',
  ...props
}, ref) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-2.5 sm:p-3',
    normal: 'p-3.5 sm:p-4',
    lg: 'p-5 sm:p-6'
  };

  const ribbonColors = {
    emerald: 'border-l-4 border-l-emerald-500',
    success: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    warning: 'border-l-4 border-l-amber-500',
    rose: 'border-l-4 border-l-rose-500',
    danger: 'border-l-4 border-l-rose-500',
    indigo: 'border-l-4 border-l-indigo-500',
    info: 'border-l-4 border-l-indigo-500',
    slate: 'border-l-4 border-l-slate-400',
    neutral: 'border-l-4 border-l-slate-400'
  };

  const ribbonStyle = ribbon ? (ribbonColors[ribbon] || 'border-l-4 border-l-slate-400') : '';
  const hoverStyle = hoverable || onClick
    ? 'cursor-pointer transition-all active:bg-slate-50 hover:border-slate-300 dark:hover:border-slate-700 dark:active:bg-slate-800/60'
    : '';

  return (
    <Component
      ref={ref}
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none ${paddings[padding] || paddings.normal} ${ribbonStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';
export default Card;
