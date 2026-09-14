import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  full: 'max-w-full'
};

/**
 * Drawer — Panel offcanvas generik untuk filter lanjutan, detail cepat, approval, & audit log.
 * Sesuai Panduan Desain Enterprise Aldepos §4.4 & §6.
 */
export default function Drawer({
  isOpen = false,
  onClose,
  title,
  subtitle,
  description,
  position = 'right',
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = ''
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const displaySubtitle = subtitle || description;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const positionClasses = {
    right: `right-0 top-0 bottom-0 h-full w-full ${sizeClass} translate-x-0`,
    left: `left-0 top-0 bottom-0 h-full w-full ${sizeClass} translate-x-0`,
    bottom: `bottom-0 left-0 right-0 max-h-[85vh] w-full translate-y-0 rounded-t-xl`
  }[position] || positionClasses.right;

  const drawerContent = (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-[2px]">
      {/* Backdrop click area */}
      <div
        className="absolute inset-0 transition-opacity"
        onClick={() => {
          if (closeOnBackdrop) onClose?.();
        }}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        className={`absolute bg-white shadow-xl border-l border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out ${positionClasses} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-bold text-slate-800 leading-snug">
                {title}
              </h3>
            )}
            {displaySubtitle && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {displaySubtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0 cursor-pointer"
            aria-label="Tutup panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerContent, document.body)
    : drawerContent;
}
