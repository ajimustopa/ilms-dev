import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState — Komponen status kosong kontekstual untuk tabel, list, dan panel data.
 * Sesuai Panduan Desain Enterprise Aldepos §4.5.
 * 
 * Dilarang menggunakan teks generik "No data". Selalu berikan konteks dan aksi (CTA).
 */
export default function EmptyState({
  title = 'Belum Ada Data',
  description = 'Belum ada catatan atau transaksi yang sesuai dengan kriteria yang dipilih.',
  icon: Icon = Inbox,
  action,
  secondaryAction,
  compact = false,
  className = ''
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 ${
        compact ? 'py-6 px-4' : 'py-12 px-6'
      } ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/60 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      
      <h3 className="text-sm font-semibold text-slate-800 leading-snug">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2.5 flex-wrap justify-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
