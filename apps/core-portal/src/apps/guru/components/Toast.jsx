import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * Toast Component & Provider - Design System Portal Guru
 * Notifikasi popup mengambang yang ringkas, non-intrusif, dan ramah pembaca layar.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 3500, title = null }) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [...prev, { id, message, type, duration, title }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    show: (msg, opts) => addToast({ message: msg, ...opts }),
    success: (msg, title = 'Berhasil') => addToast({ message: msg, type: 'success', title }),
    error: (msg, title = 'Gagal') => addToast({ message: msg, type: 'error', title }),
    warning: (msg, title = 'Perhatian') => addToast({ message: msg, type: 'warning', title }),
    info: (msg, title = 'Informasi') => addToast({ message: msg, type: 'info', title })
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
  };

  const borders = {
    success: 'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800',
    error: 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800',
    warning: 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800',
    info: 'border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-800'
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Fixed Toast Container */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none"
        aria-live="polite"
        role="region"
        aria-label="Notifikasi"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-white dark:bg-slate-900 border rounded-lg shadow-lg text-slate-900 dark:text-slate-100 transition-all animate-in slide-in-from-top-3 duration-200 ${borders[t.type] || borders.info}`}
          >
            {icons[t.type] || icons.info}
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {t.title}
                </p>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside Provider
    return {
      show: (msg) => console.log('Toast (outside provider):', msg),
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      warning: (msg) => console.warn('Toast warning:', msg),
      info: (msg) => console.info('Toast info:', msg)
    };
  }
  return context;
};

export default ToastProvider;
