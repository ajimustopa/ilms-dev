import React, { forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * FormField Wrapper Component
 * Menyediakan label, pesan error, helper text, dan penanda wajib dengan aksesibilitas WAI-ARIA.
 */
export const FormField = ({
  id,
  label,
  required = false,
  error = null,
  helperText = null,
  className = '',
  children
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between select-none"
        >
          <span>
            {label}
            {required && <span className="text-rose-600 dark:text-rose-400 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          id: child.props.id || fieldId,
          error: error ? true : child.props.error,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': [errorId, helperId].filter(Boolean).join(' ') || undefined
        });
      })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Input Component
 * Min height 44px (touch target), tabular numbers untuk angka, left/right icon.
 */
export const Input = forwardRef(({
  type = 'text',
  error = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  tabular = false,
  disabled = false,
  ...props
}, ref) => {
  const errorStyles = error
    ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-200/90 dark:border-slate-700/80 focus:border-[#5B61F4] focus:ring-[#5B61F4]/20';

  const tnumClass = tabular || type === 'number' ? 'font-mono tabular-nums' : '';

  return (
    <div className="relative flex items-center w-full">
      {leftIcon && (
        <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={`w-full min-h-[46px] px-4 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border shadow-2xs transition-all outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 disabled:cursor-not-allowed ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${errorStyles} ${tnumClass} ${className}`}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3.5 text-slate-400 dark:text-slate-500 flex items-center justify-center">
          {rightIcon}
        </span>
      )}
    </div>
  );
});
Input.displayName = 'Input';

/**
 * Select Component
 * Native dropdown dengan wrapper berdesain konsisten & touch target 44px.
 */
export const Select = forwardRef(({
  error = false,
  className = '',
  children,
  disabled = false,
  ...props
}, ref) => {
  const errorStyles = error
    ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-200/90 dark:border-slate-700/80 focus:border-[#5B61F4] focus:ring-[#5B61F4]/20';

  return (
    <div className="relative flex items-center w-full">
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full min-h-[46px] appearance-none pl-4 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border shadow-2xs transition-all outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer ${errorStyles} ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 pointer-events-none" aria-hidden="true" />
    </div>
  );
});
Select.displayName = 'Select';

/**
 * Textarea Component
 */
export const Textarea = forwardRef(({
  error = false,
  rows = 3,
  className = '',
  disabled = false,
  maxLength = null,
  value = '',
  ...props
}, ref) => {
  const errorStyles = error
    ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
    : 'border-slate-200/90 dark:border-slate-700/80 focus:border-[#5B61F4] focus:ring-[#5B61F4]/20';

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="flex flex-col w-full gap-1">
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        value={value}
        maxLength={maxLength}
        className={`w-full p-3.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border shadow-2xs transition-all outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 disabled:cursor-not-allowed resize-y ${errorStyles} ${className}`}
        {...props}
      />
      {maxLength && (
        <span className="text-[11px] text-right text-slate-400 dark:text-slate-500 font-mono">
          {currentLength}/{maxLength}
        </span>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export default FormField;
