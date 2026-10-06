import React, { forwardRef } from 'react';

/**
 * Card Component - Design System Portal Guru
 * Menyediakan kontainer permukaan data modern dengan border-slate-200, rounded-xl, dan aksen semantik.
 */
export const Card = forwardRef(({
  children,
  ribbon = null, // 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  hoverable = false,
  padding = 'normal', // 'none' | 'sm' | 'normal' | 'lg'
  className = '',
  onClick,
  as: Component = 'div',
  ...props
}, ref) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    normal: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const ribbonColors = {
    indigo: 'border-l-4 border-l-indigo-500',
    info: 'border-l-4 border-l-indigo-500',
    emerald: 'border-l-4 border-l-emerald-500',
    success: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    warning: 'border-l-4 border-l-amber-500',
    rose: 'border-l-4 border-l-rose-500',
    danger: 'border-l-4 border-l-rose-500',
    slate: 'border-l-4 border-l-slate-400',
    neutral: 'border-l-4 border-l-slate-400'
  };

  const ribbonStyle = ribbon ? (ribbonColors[ribbon] || 'border-l-4 border-l-emerald-500') : '';
  const hoverStyle = hoverable || onClick
    ? 'cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50/50'
    : '';

  return (
    <Component
      ref={ref}
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl shadow-2xs ${paddings[padding] || paddings.normal} ${ribbonStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';
export default Card;
