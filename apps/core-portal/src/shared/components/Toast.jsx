import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  PartyPopper
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modalAlert, setModalAlert] = useState(null);

  const addToast = useCallback((message, type = 'info', duration = 3800) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration, createdAt: Date.now() }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Modal alert dialog yang menarik untuk konfirmasi / info penting
  const showModal = useCallback((options) => {
    if (typeof options === 'string') {
      const isSuccess = /berhasil|sukses|saved|success/i.test(options);
      const isError = /gagal|error|wajib|tidak boleh|harus/i.test(options);
      options = {
        title: isSuccess ? 'Berhasil Disimpan!' : isError ? 'Perhatian' : 'Informasi',
        message: options,
        type: isSuccess ? 'success' : isError ? 'error' : 'info'
      };
    }
    setModalAlert(options);
  }, []);

  const closeModal = useCallback(() => {
    setModalAlert(null);
  }, []);

  const toast = {
    success: (msg, dur) => {
      addToast(msg, 'success', dur);
      // Tampilkan toast dan trigger modal jika pesan penting
      if (/berhasil|sukses/i.test(msg)) {
        showModal({ title: 'Berhasil Disimpan!', message: msg, type: 'success' });
      }
    },
    error: (msg, dur) => {
      addToast(msg, 'error', dur);
      showModal({ title: 'Terjadi Kesalahan', message: msg, type: 'error' });
    },
    warning: (msg, dur) => {
      addToast(msg, 'warning', dur);
      showModal({ title: 'Perhatian', message: msg, type: 'warning' });
    },
    info: (msg, dur) => {
      addToast(msg, 'info', dur);
    },
    alert: (titleOrMsg, message, type = 'info') => {
      if (!message) {
        showModal(titleOrMsg);
      } else {
        showModal({ title: titleOrMsg, message, type });
      }
    }
  };

  // Override window.alert agar seluruh pemanggilan alert bawaan browser
  // otomatis beralih menjadi pop-up animasi yang menarik!
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const str = String(msg || '');
      const isSuccess = /berhasil|sukses|saved|success/i.test(str);
      const isError = /gagal|error|wajib|tidak boleh|harus/i.test(str);

      addToast(str, isSuccess ? 'success' : isError ? 'error' : 'info');
      showModal({
        title: isSuccess ? 'Berhasil Disimpan!' : isError ? 'Perhatian / Validasi' : 'Informasi Sistem',
        message: str,
        type: isSuccess ? 'success' : isError ? 'error' : 'info'
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [addToast, showModal]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Notification Container (Pojok Kanan Atas) */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-3 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-2xl border text-xs font-medium backdrop-blur-xl transition-all duration-300 transform animate-in slide-in-from-top-4 fade-in ${
              t.type === 'success'
                ? 'bg-emerald-900/95 border-emerald-400/40 text-emerald-50 shadow-emerald-950/40'
                : t.type === 'error'
                ? 'bg-rose-900/95 border-rose-400/40 text-rose-50 shadow-rose-950/40'
                : t.type === 'warning'
                ? 'bg-amber-900/95 border-amber-400/40 text-amber-50 shadow-amber-950/40'
                : 'bg-slate-900/95 border-slate-700 text-slate-50 shadow-slate-950/40'
            }`}
          >
            <div className="shrink-0 p-1 rounded-xl bg-white/10 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-pulse" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-300" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-300" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-indigo-300" />}
            </div>
            <div className="flex-1 min-w-0 pr-1 leading-relaxed">
              <div className="font-bold tracking-wide uppercase text-[10px] opacity-80 mb-0.5">
                {t.type === 'success' ? 'Sukses' : t.type === 'error' ? 'Gagal' : 'Info'}
              </div>
              <div className="text-xs break-words">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-white/60 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Pop-Up Modal Berhasil / Informasi Beranimasi Menarik */}
      {modalAlert && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center transform animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Background Gradient Accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                modalAlert.type === 'success'
                  ? 'from-emerald-400 via-teal-500 to-emerald-600'
                  : modalAlert.type === 'error'
                  ? 'from-rose-500 via-red-500 to-amber-500'
                  : 'from-indigo-500 via-purple-500 to-pink-500'
              }`}
            />

            {/* Icon Animation Wrapper */}
            <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                  modalAlert.type === 'success'
                    ? 'bg-emerald-500'
                    : modalAlert.type === 'error'
                    ? 'bg-rose-500'
                    : 'bg-indigo-500'
                }`}
              />
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 ${
                  modalAlert.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                    : modalAlert.type === 'error'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200/80'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200/80'
                }`}
              >
                {modalAlert.type === 'success' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : modalAlert.type === 'error' ? (
                  <AlertCircle className="w-8 h-8 text-rose-600" />
                ) : (
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                )}
              </div>
            </div>

            {/* Title & Message */}
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-2">
              {modalAlert.title || 'Informasi'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6 px-2 break-words">
              {modalAlert.message}
            </p>

            {/* Action Button */}
            <button
              type="button"
              autoFocus
              onClick={closeModal}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all transform active:scale-95 ${
                modalAlert.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : modalAlert.type === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              OK, Mengerti
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log('[Toast Success]:', msg),
      error: (msg) => console.error('[Toast Error]:', msg),
      warning: (msg) => console.warn('[Toast Warning]:', msg),
      info: (msg) => console.log('[Toast Info]:', msg),
      alert: (titleOrMsg, msg, type) => console.log(`[Alert ${type}]:`, titleOrMsg, msg),
      showToast: (msg, type = 'info') => console.log(`[Toast ${type}]:`, msg),
    };
  }
  return {
    ...context,
    showToast: (msg, type = 'info') => {
      if (type === 'success') context.success(msg);
      else if (type === 'error') context.error(msg);
      else if (type === 'warning') context.warning(msg);
      else context.info(msg);
    }
  };
}

