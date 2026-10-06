import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Layers,
  FileCode2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function FeaturePlaceholder({
  featureCode = 'F',
  title = 'Fitur Portal Guru',
  description = 'Halaman ini sedang dalam tahap perancangan dan akan segera dibangun pada tahap pembangunan ulang berikutnya.',
  moduleName = 'Modul Terpadu',
  endpoints = [],
  nextPhase = 'Tahap Terjadwal',
  icon: Icon = Sparkles,
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Tombol Kembali */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali</span>
      </button>

      {/* Kartu Empty State "Segera Hadir" */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4 shadow-xs">
        {/* Ikon Utama */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-xs">
          <Icon className="w-8 h-8" />
        </div>

        {/* Badge & Kode Fitur */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {featureCode}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {moduleName}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{nextPhase}</span>
          </span>
        </div>

        {/* Judul & Deskripsi */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Informasi Teknis & Endpoint Terkait (jika ada) */}
        {endpoints && endpoints.length > 0 && (
          <div className="pt-4 border-t border-slate-100 text-left bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/60 max-w-lg mx-auto">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Koneksi API Backend Terverifikasi:</span>
            </div>
            <ul className="space-y-1">
              {endpoints.map((ep, idx) => (
                <li key={idx} className="text-[11px] font-mono text-slate-700 flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{ep}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigasi Cepat */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            to="/guru"
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition text-center shadow-xs"
          >
            Buka Beranda Portal Guru
          </Link>
          <Link
            to="/guru-lama/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition text-center flex items-center justify-center gap-1.5"
          >
            <span>Buka Versi Lama</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
