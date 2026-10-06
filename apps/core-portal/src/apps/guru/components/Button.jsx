import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button Component - Design System Portal Guru
 * Memenuhi touch target 44px, fokus terlihat jelas, dan multi-state (loading, disabled, hover/active).
 * Radius standar rounded-lg.
 */
export const Button = forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'brand-subtle' | 'gradient'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  fullWidth = false,
  type = 'button',
  className = '',
  onClick,
  ariaLabel,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-lg transition-colors select-none min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-2xs',
    gradient: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:opacity-95 shadow-2xs',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-200',
    outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-2xs',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    'brand-subtle': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200'
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 gap-1.5 min-h-[38px] sm:min-h-[40px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px]'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 text-current">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0 text-current">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
