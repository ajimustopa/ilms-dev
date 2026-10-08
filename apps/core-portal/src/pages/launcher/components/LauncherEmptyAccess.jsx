import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, Mail, PhoneCall } from 'lucide-react';

/**
 * LauncherEmptyAccess — Empty State Ketika Pengguna Belum Diberikan Otorisasi Modul (RBAC Zero-Access)
 * 
 * Sesuai ATURAN dan RENCANA-IMPLEMENTASI Tahap 5:
 * - Menampilkan status wibawa institusional saat user tidak memiliki hak akses modul apapun.
 * - ID Pengguna dengan tombol salin (copy chip).
 * - CTA bantuan untuk menghubungi Administrator IT Pesantren.
 */
export default function LauncherEmptyAccess({
  user,
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const userId = user?.id ? `USR-${user.id}` : user?.username || 'USR-UNASSIGNED';

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(userId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center max-w-xl mx-auto shadow-xs ilms-fade-in ${className}`}
    >
      {/* Icon Frame */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-5 text-slate-400 dark:text-slate-500 shadow-2xs">
        <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-700 dark:text-emerald-400 stroke-[1.5]" />
      </div>

      {/* Typography */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
        Belum ada modul yang dapat Anda akses
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-md mx-auto">
        Akun Anda telah terverifikasi dalam sistem namun belum diberikan hak akses (RBAC) ke modul manapun. Silakan hubungi Administrator IT untuk meminta penugasan peran.
      </p>

      {/* User Identifier Chip */}
      <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-medium">
          ID Pengguna: <strong className="text-slate-900 dark:text-white font-semibold">{userId}</strong>
        </span>
        <button
          type="button"
          onClick={handleCopyId}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors ml-1 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Helpdesk Notice */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span>Butuh bantuan cepat? Hubungi Biro IT & SIM</span>
        <span className="hidden sm:inline">•</span>
        <span className="font-semibold text-slate-600 dark:text-slate-300">Ext. 104 / it-helpdesk@aldepos.sch.id</span>
      </div>
    </div>
  );
}
