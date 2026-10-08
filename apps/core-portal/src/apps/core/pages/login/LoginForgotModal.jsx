import React, { useEffect, useRef } from 'react';
import { ShieldAlert, X, Mail, Phone, ExternalLink } from 'lucide-react';

/**
 * LoginForgotModal — Dialog Informasi Bantuan Reset Kata Sandi
 * 
 * Sesuai panduan keamanan dan desain, akun pegawai & santri dikelola terpusat
 * oleh Administrator IT Yayasan.
 */
export default function LoginForgotModal({ isOpen, onClose }) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs ilms-fade-in"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Close */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Judul */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-brand-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 id="forgot-modal-title" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Bantuan Reset Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Otorisasi Keamanan Akun Terpadu
            </p>
          </div>
        </div>

        {/* Deskripsi Kebijakan Keamanan */}
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 mb-6">
          <p>
            Untuk menjaga keamanan data terpadu pesantren dan integritas hak akses, pengaturan ulang kata sandi dilakukan secara terverifikasi melalui <strong>Biro IT &amp; Administrasi Sistem</strong>.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3.5 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
              <Mail className="w-4 h-4 text-brand-700 dark:text-emerald-400 shrink-0" />
              <span>it-helpdesk@aldepos.sch.id</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
              <Phone className="w-4 h-4 text-brand-700 dark:text-emerald-400 shrink-0" />
              <span>Ekstensi Kantor IT: Ext. 104</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sertakan Nama Lengkap, NIP/ID Pegawai, dan Satuan Pendidikan tempat Anda bertugas saat mengajukan permohonan.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-xs rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            Saya Mengerti &bull; Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
