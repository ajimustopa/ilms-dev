import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';

/**
 * ErrorState Component - Design System Portal Guru
 * Tampilan status error yang informatif dengan tombol 'Coba Lagi' (touch target 44px).
 */
export const ErrorState = ({
  title = 'Terjadi Kesalahan',
  message = 'Gagal memuat data dari server. Silakan periksa koneksi internet Anda dan coba lagi.',
  onRetry = null,
  retryText = 'Coba Lagi',
  retryLoading = false,
  compact = false,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 ${
        compact ? 'py-5 px-4' : 'py-8 px-6'
      } ${className}`}
      role="alert"
    >
      <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-1">
        {title}
      </h4>
      <p className="text-xs text-rose-700/80 dark:text-rose-300/80 max-w-sm mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          loading={retryLoading}
          leftIcon={<RotateCw className="w-3.5 h-3.5" />}
          className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40"
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
