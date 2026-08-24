import React from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Newspaper,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export const revalidate = 60; // SSR Revalidate setiap 60 detik untuk SEO

export default async function HomePage() {
  let homeData: any = null;
  let newsList: any[] = [];

  try {
    const [homeRes, newsRes] = await Promise.all([
      publicApi.getHome(1),
      publicApi.getNews({ limit: 3 })
    ]);
    homeData = homeRes.data;
    newsList = newsRes.data || [];
  } catch (err) {
    console.error('Error fetching SSR home data:', err);
  }

  const hero = homeData?.hero || {
    headline: 'Membentuk Generasi Unggul, Cerdas, dan Berakhlak Qurani',
    subheadline: 'Pendidikan Islam Terpadu Berbasis Karakter & Wawasan Global',
    cta_button_label: 'Pendaftaran PPDB 2027/2028',
    cta_button_url: '/ppdb'
  };

  const highlights = homeData?.highlights || [];
  const stats = homeData?.live_statistics || {
    total_students: 120,
    total_teachers_staff: 24,
    accreditation_grade: 'A (Unggul)'
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 text-white py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Penerimaan Santri & Siswa Baru Tahun Ajaran 2027/2028 Telah Dibuka</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            {hero.headline}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {hero.subheadline}
          </p>

          <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
            <Link
              href={hero.cta_button_url || '/ppdb'}
              className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-900/40 transition-all hover:scale-105"
            >
              <span>{hero.cta_button_label || 'Daftar Sekarang'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/profil"
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm px-6 py-3.5 rounded-xl backdrop-blur-md transition-all"
            >
              <span>Profil Sekolah</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Live Statistics Bar */}
      <section className="max-w-6xl mx-auto px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="pt-4 sm:pt-0">
            <p className="text-3xl font-extrabold text-slate-900">{stats.total_students}+</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Santri & Siswa Aktif</p>
          </div>
          <div className="pt-4 sm:pt-0">
            <p className="text-3xl font-extrabold text-slate-900">{stats.total_teachers_staff}+</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Tenaga Pendidik & Asatidz</p>
          </div>
          <div className="pt-4 sm:pt-0">
            <p className="text-3xl font-extrabold text-emerald-600">{stats.accreditation_grade}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Status Akreditasi Resmi</p>
          </div>
        </div>
      </section>

      {/* 3. Keunggulan Sekolah (Highlights) */}
      <section className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
            Keunggulan Aldepos
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Mengapa Memilih Pendidikan di Aldepos?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Komitmen kami menghadirkan ekosistem pembelajaran yang seimbang antara sains, teknologi, dan akhlakul karimah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.length === 0 ? (
            <>
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Kurikulum Terpadu</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Integrasi kurikulum nasional berstandar tinggi dengan kurikulum kepesantrenan tahfidz dan bahasa Arab/Inggris.
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pendidik Profesional</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Diampu oleh guru dan asatidz lulusan perguruan tinggi terkemuka dalam dan luar negeri dengan dedikasi tinggi.
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pembinaan Karakter Santri</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lingkungan asrama kondusif 24 jam untuk pembentukan kemandirian, kedisiplinan, dan kepemimpinan islami.
                </p>
              </div>
            </>
          ) : (
            highlights.map((h: any) => (
              <div key={h.id} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3 hover:border-emerald-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{h.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{h.description}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Berita & Pengumuman Terbaru */}
      <section className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
              Warta Sekolah
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
              Berita & Pengumuman Terbaru
            </h2>
          </div>
          <Link
            href="/berita"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
          >
            <span>Lihat Semua Berita</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newsList.length === 0 ? (
            <div className="col-span-3 text-center py-10 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              Belum ada berita terpublikasi.
            </div>
          ) : (
            newsList.map((item: any) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-emerald-600 uppercase">{item.category || 'Berita'}</span>
                    <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('id-ID') : '-'}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors line-clamp-2">
                    <Link href={`/berita/${item.slug}`}>{item.title}</Link>
                  </h3>
                  <div
                    className="text-xs text-slate-500 line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
                <div className="px-6 pb-6 pt-2">
                  <Link
                    href={`/berita/${item.slug}`}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center space-x-1"
                  >
                    <span>Baca Selengkapnya</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* 5. CTA Pendaftaran PPDB */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Siap Bergabung Bersama Keluarga Besar Aldepos?</h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Daftarkan putra-putri Anda secara online melalui sistem PPDB terpadu. Proses mudah, cepat, dan transparan.
            </p>
          </div>
          <Link
            href="/ppdb"
            className="inline-flex items-center space-x-2 bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-sm px-8 py-4 rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            <span>Daftar PPDB Online</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
