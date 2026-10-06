import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState Component - Design System Portal Guru
 * Tampilan status kosong yang jujur, bersih, dan memandu pengguna (Anti-Mock).
 */
export const EmptyState = ({
  icon = null,
  title = 'Tidak Ada Data',
  description = 'Belum ada data atau riwayat yang tersedia saat ini.',
  action = null,
  compact = false,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 ${
        compact ? 'py-6 px-4' : 'py-10 px-6'
      } ${className}`}
      role="status"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
        {icon || <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-1">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
