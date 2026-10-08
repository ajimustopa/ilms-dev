import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * BottomSheet — Modal lembar bawah responsif untuk antarmuka mobile/tablet
 * Sesuai Panduan Desain Enterprise Aldepos & RENCANA-IMPLEMENTASI Tahap 6.
 *
 * Fitur:
 * - Drag handle indicator khas mobile
 * - Slide-up animation (ilms-slide-up / CSS keyframes)
 * - Safe-area inset bottom padding untuk perangkat iOS/Android modern
 * - Penutupan via tombol close, backdrop click, atau tombol Esc
 * - Body scroll locking saat terbuka
 * - Focus management: Focus trapping di dalam sheet & pengembalian fokus ke pemicu saat ditutup
 * - Aksesibilitas: role="dialog", aria-modal="true"
 */
export default function BottomSheet({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  showHandle = true,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  maxHeight = 'max-h-[85vh]',
  className = ''
}) {
  const sheetRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Simpan elemen yang sedang aktif sebelum sheet dibuka
    triggerRef.current = document.activeElement;

    // Handle Esc key & Tab focus trap
    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Berikan fokus ke elemen interaktif pertama di dalam sheet
    const focusTimer = setTimeout(() => {
      if (sheetRef.current) {
        const firstFocusable = sheetRef.current.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(focusTimer);

      // Kembalikan fokus ke elemen pemicu saat sheet ditutup
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ilms-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Panel Pilihan'}
    >
      {/* Backdrop area click handler */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => {
          if (closeOnBackdrop) onClose?.();
        }}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className={`relative w-full bg-white dark:bg-slate-900 rounded-t-[24px] shadow-2xl border-t border-slate-200/80 dark:border-slate-800 p-5 pb-8 sm:pb-6 flex flex-col ${maxHeight} z-10 ilms-slide-up ${className}`}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Drag Handle Indicator */}
        {showHandle && (
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0" />
        )}

        {/* Optional Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                aria-label="Tutup panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Sheet Content Body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
