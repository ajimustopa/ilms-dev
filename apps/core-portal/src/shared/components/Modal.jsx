import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
  '4xl': 'max-w-7xl',
  wide: 'max-w-[1240px]',
  full: 'max-w-[92vw] h-[90vh]'
};

const VARIANT_HEADER_MAP = {
  default: {
    iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
    defaultIcon: null
  },
  danger: {
    iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
    defaultIcon: AlertCircle
  },
  warning: {
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    defaultIcon: AlertTriangle
  },
  info: {
    iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    defaultIcon: Info
  }
};

/**
 * Modal — Dialog generik untuk konfirmasi dan entri data sederhana.
 * Sesuai Panduan Desain Enterprise Aldepos §4.3 & §6.
 *
 * Form kompleks (multi-step / transaksi besar) dilarang menggunakan Modal;
 * gunakan halaman penuh (full-page) atau Drawer besar sesuai panduan.
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle,
  description,
  icon: CustomIcon,
  variant = 'default',
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = ''
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body background scrolling when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const headerConfig = VARIANT_HEADER_MAP[variant] || VARIANT_HEADER_MAP.default;
  const IconComponent = CustomIcon || headerConfig.defaultIcon;
  const displaySubtitle = subtitle || description;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[2px] animate-fadeIn"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full bg-white rounded-xl shadow-lg border border-slate-200/80 flex flex-col overflow-hidden transition-all duration-150 ${sizeClass} ${className}`}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              {IconComponent && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 mt-0.5 ${headerConfig.iconBg}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 id="modal-title" className="text-base font-bold text-slate-800 leading-snug">
                    {title}
                  </h3>
                )}
                {displaySubtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {displaySubtitle}
                  </p>
                )}
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0 cursor-pointer"
                aria-label="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 max-h-[calc(85vh-130px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
