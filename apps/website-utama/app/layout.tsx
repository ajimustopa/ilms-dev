import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Globe, Phone, Mail, MapPin, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Aldepos Islamic Boarding School - Sekolah Unggulan & Berkarakter',
  description: 'Portal Resmi Aldepos Islamic Boarding School. Informasi profil, kurikulum terpadu, prestasi, berita sekolah, dan pendaftaran peserta didik baru (PPDB daring).',
  keywords: 'Aldepos, Islamic Boarding School, Pesantren Modern, PPDB Online, SD SMP SMA Unggulan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="font-sans antialiased min-h-screen flex flex-col justify-between">
        {/* Top Header Contact Bar */}
        <div className="bg-slate-900 text-slate-300 text-xs py-2 px-6 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>(0251) 1234567 / 0812-3456-7890</span>
              </span>
              <span className="flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>info@aldeposibs.com</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                Tahun Ajaran 2027/2028 Dibuka
              </span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-900 tracking-tight block leading-tight">
                  ALDEPOS
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Islamic Boarding School
                </span>
              </div>
            </Link>

            {/* Public Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-700">
              <Link href="/" className="hover:text-emerald-600 transition-colors">
                Beranda
              </Link>
              <Link href="/profil" className="hover:text-emerald-600 transition-colors">
                Profil
              </Link>
              <Link href="/pengajar" className="hover:text-emerald-600 transition-colors">
                Pengajar
              </Link>
              <Link href="/berita" className="hover:text-emerald-600 transition-colors">
                Berita
              </Link>
              <Link href="/galeri" className="hover:text-emerald-600 transition-colors">
                Galeri
              </Link>
              <Link href="/kontak" className="hover:text-emerald-600 transition-colors">
                Kontak
              </Link>
            </nav>

            {/* PPDB CTA Button */}
            <div className="flex items-center space-x-3">
              <Link
                href="/ppdb"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-900/20 transition-all hover:scale-[1.02]"
              >
                <span>Daftar PPDB</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1">{children}</main>

        {/* Public Footer */}
        <footer className="bg-slate-950 text-white border-t border-slate-900 pt-12 pb-8">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-400">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-white">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Aldepos Islamic Boarding School</span>
              </div>
              <p className="leading-relaxed">
                Mencetak generasi rabbani yang beraqidah lurus, berakhlak mulia, cerdas, dan mandiri dengan kurikulum terpadu nasional & pesantren.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Tautan Cepat</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-emerald-400">Beranda</Link></li>
                <li><Link href="/profil" className="hover:text-emerald-400">Profil Pesantren</Link></li>
                <li><Link href="/ppdb" className="hover:text-emerald-400">Pendaftaran Siswa Baru</Link></li>
                <li><Link href="/berita" className="hover:text-emerald-400">Warta & Berita</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Jenjang Pendidikan</h4>
              <ul className="space-y-2">
                <li>SD Aldepos Islamic School</li>
                <li>SMP Aldepos Islamic Boarding School</li>
                <li>SMA Aldepos Islamic Boarding School</li>
                <li>Program Tahfidzul Quran Intensif</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-3">Kantor & Lokasi</h4>
              <p className="flex items-start space-x-2 leading-relaxed">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Jl. Raya Aldepos No. 1, Cijeruk, Kab. Bogor, Jawa Barat 16740</span>
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Layanan Informasi: Senin - Sabtu (08.00 - 16.00 WIB)
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-slate-900 flex flex-wrap justify-between items-center text-[11px] text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} Yayasan Aldepos. Seluruh Hak Cipta Dilindungi.</p>
            <p>Sistem Manajemen Terpadu Aldepos Core Service</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
