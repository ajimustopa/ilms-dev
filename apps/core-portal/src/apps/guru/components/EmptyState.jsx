import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState Component - Design System Portal Guru
 * Tampilan status kosong yang jujur, bersih, dan memandu pengguna (Anti-Mock).
 */
export const EmptyState = ({
  icon = null,
  title = 'Tidak Ada Data',
  description,
  message,
  action = null,
  actionText,
  actionLabel,
  onAction,
  compact = false,
  className = ''
}) => {
  // Helper to render icon whether it's a Component, Element, or null
  const renderIcon = () => {
    if (!icon) return <Inbox className="w-6 h-6" aria-hidden="true" />;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent className="w-6 h-6" aria-hidden="true" />;
    }
    return <Inbox className="w-6 h-6" aria-hidden="true" />;
  };

  const descText = description !== undefined
    ? description
    : (message !== undefined ? message : 'Belum ada data atau riwayat yang tersedia saat ini.');

  const btnText = actionText || actionLabel;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 ${
        compact ? 'py-6 px-4' : 'py-10 px-6'
      } ${className}`}
      role="status"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
        {renderIcon()}
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>
      {descText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
          {descText}
        </p>
      )}
      {action ? (
        <div className="mt-1">
          {action}
        </div>
      ) : btnText && onAction ? (
        <div className="mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="text-xs"
          >
            {btnText}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;

