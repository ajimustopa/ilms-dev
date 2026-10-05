import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ErrorState — Komponen penanganan error memuat data dengan tombol retry & detail teknis.
 * Sesuai Panduan Desain Enterprise Aldepos §4.5.
 */
export default function ErrorState({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kendala saat menghubungkan ke server atau memproses permintaan.',
  error,
  onRetry,
  retryText = 'Coba Lagi',
  technicalDetails,
  compact = false,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(false);

  const displayMessage = error?.message || message;
  const rawDetails = technicalDetails || (error?.stack ? String(error.stack) : (typeof error === 'object' ? JSON.stringify(error, null, 2) : null));

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg border border-rose-200 bg-rose-50/40 ${
        compact ? 'py-6 px-4' : 'py-10 px-6'
      } ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 border border-rose-200 shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>

      <h3 className="text-sm font-semibold text-rose-900 leading-snug">
        {title}
      </h3>

      <p className="text-xs text-rose-700 mt-1 max-w-md leading-relaxed">
        {displayMessage}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>{retryText}</span>
        </button>
      )}

      {rawDetails && (
        <div className="mt-4 w-full max-w-lg text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium underline underline-offset-2"
          >
            <span>{showDetails ? 'Sembunyikan detail teknis' : 'Lihat detail teknis'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showDetails && (
            <pre className="mt-2 p-2.5 rounded bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-40 border border-slate-800">
              {rawDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
