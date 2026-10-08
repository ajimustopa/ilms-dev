import React from 'react';
import { ShieldCheck, UserCheck, Globe } from 'lucide-react';
import BrandLogo from '../../../../shared/components/brand/BrandLogo';
import LatticePattern from '../../../../shared/components/brand/LatticePattern';

/**
 * LoginBrandPanel — Panel Kiri Desktop (55% Width)
 * 
 * Menampilkan identitas institusional, ornamen islami, 3 pilar sistem (SSO, RBAC, Multikampus),
 * serta integritas sistem yayasan.
 */
export default function LoginBrandPanel() {
  const currentYear = new Date().getFullYear();

  return (
    <section className="relative hidden lg:flex lg:w-[55%] min-h-screen bg-brand-900 text-white p-8 md:p-12 lg:p-16 flex-col justify-between overflow-hidden select-none">
      {/* Ornamen Garis Islami Halus dengan Animasi Drift Pelan */}
      <LatticePattern
        opacity={0.12}
        color="#6ee7b7"
        animated={true}
        patternSize={96}
      />

      {/* Top Header: Identitas & Akreditasi Yayasan */}
      <div className="relative z-10">
        <BrandLogo
          variant="full"
          size="lg"
          theme="white"
          showSubtitle={true}
          subtitleText="Sistem Informasi Sekolah"
        />
        <div className="mt-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-emerald-950/70 border border-emerald-700/50 px-3 py-1 rounded-full text-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Yayasan Pondok Pesantren Terpadu Aldepos
          </span>
        </div>
      </div>

      {/* Middle Content: Manifesto & 3 Pilar Fitur */}
      <div className="relative z-10 my-auto py-8">
        <h1 className="text-3xl xl:text-4xl font-bold leading-tight text-white tracking-tight max-w-lg mb-4 ilms-fade-up" style={{ '--i': 1 }}>
          Satu portal untuk seluruh layanan sekolah.
        </h1>
        <p className="text-emerald-100/80 text-sm xl:text-base leading-relaxed max-w-md mb-8 ilms-fade-up" style={{ '--i': 2 }}>
          Kepala sekolah, dewan guru, staf kepegawaian, bendahara, pengelola sarpras, hingga kasir kantin masuk dari satu pintu.
        </p>

        {/* Feature Pillar List */}
        <div className="space-y-3.5 max-w-lg">
          {/* Pilar 1 */}
          <div className="flex items-start gap-3.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30 ilms-fade-up" style={{ '--i': 3 }}>
            <div className="w-8 h-8 rounded-md bg-brand-700/80 flex items-center justify-center shrink-0 border border-emerald-500/30 text-emerald-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">Satu akun untuk semua modul</div>
              <div className="text-xs text-emerald-200/70 mt-0.5">Single Sign-On (SSO) terintegrasi dengan validasi kredensial sentral.</div>
            </div>
          </div>

          {/* Pilar 2 */}
          <div className="flex items-start gap-3.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30 ilms-fade-up" style={{ '--i': 4 }}>
            <div className="w-8 h-8 rounded-md bg-brand-700/80 flex items-center justify-center shrink-0 border border-emerald-500/30 text-emerald-200">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">Akses menyesuaikan peran Anda</div>
              <div className="text-xs text-emerald-200/70 mt-0.5">Hak akses granular &amp; terenkripsi otomatis sesuai SK penugasan resmi.</div>
            </div>
          </div>

          {/* Pilar 3 */}
          <div className="flex items-start gap-3.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30 ilms-fade-up" style={{ '--i': 5 }}>
            <div className="w-8 h-8 rounded-md bg-brand-700/80 flex items-center justify-center shrink-0 border border-emerald-500/30 text-emerald-200">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">Terintegrasi lintas satuan pendidikan</div>
              <div className="text-xs text-emerald-200/70 mt-0.5">Sinkronisasi data santri Kepesantrenan, Madrasah Tsanawiyah, &amp; SMA.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Copyright & System Integrity Badge */}
      <div className="relative z-10 pt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="text-emerald-300/70">
          &copy; {currentYear} Yayasan Aldepos · Aldepos ILMS
        </div>
        <div className="text-[11px] text-emerald-300/80 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span>Sistem Aktif &amp; Terlindungi</span>
        </div>
      </div>
    </section>
  );
}
