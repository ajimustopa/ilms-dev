import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * BottomSheet Component - Design System Portal Guru
 * Modal Dialog & Bottom Sheet responsif dengan React Portal (document.body), scroll lock, penanganan ESC, dan layout aman agar tidak terpotong.
 */
export const BottomSheet = ({
  isOpen = false,
  onClose,
  title = null,
  description = null,
  children,
  footer = null,
  maxHeight = 'max-h-[85vh]',
  className = ''
}) => {
  const sheetRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll saat bottom sheet terbuka
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Tangani tombol Escape untuk menutup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container (my-auto menjamin tidak terpotong di atas viewport) */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 my-0 sm:my-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden ${maxHeight} ${className}`}
      >
        {/* Mobile Pull/Drag Handle */}
        <div className="sm:hidden flex items-center justify-center pt-2.5 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/80 shrink-0">
            <div className="min-w-0 pr-2">
              {title && (
                <h3 id="bottom-sheet-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/80 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (mounted && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

export default BottomSheet;
