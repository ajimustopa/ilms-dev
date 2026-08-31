import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BellRing,
  Search,
  Calendar,
  Tag,
  ArrowRight,
  X,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';

const CATEGORIES = ['Semua', 'Akademik', 'Yayasan', 'HRD', 'Agenda'];

export default function Pengumuman() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/website-utama/public/news').catch(() => null);
        const list = res?.data?.data?.items || res?.data?.data || [];

        if (Array.isArray(list) && list.length > 0) {
          setAnnouncements(list);
        } else {
          setAnnouncements([
            {
              id: 1,
              title: 'Jadwal Penilaian Sumatif Tengah Semester (STS) Genap 2026',
              category: 'Akademik',
              published_at: '2026-08-25',
              author: 'Waka Kurikulum',
              summary: 'Seluruh dewan guru dimohon menyelesaikan input Tujuan Pembelajaran (TP) dan bank kisi-kisi soal sebelum pekan depan.',
              content: `Kepada Seluruh Dewan Guru Aldepos IBS,

Diberitahukan bahwa pelaksanaan Sumatif Tengah Semester (STS) Genap Tahun Ajaran 2025/2026 akan dimulai pada pekan ke-2 bulan depan. 

Hal-hal yang perlu diperhatikan:
1. Input Capaian & Tujuan Pembelajaran (TP) pada Portal Guru paling lambat 31 Agustus 2026.
2. Penyerahan naskah dan kisi-kisi soal kepada Tim Kurikulum.
3. Kordinasi pengawasan ujian bersama wali kelas.

Atas perhatian dan kerjasamanya kami ucapkan terima kasih.`
            },
            {
              id: 2,
              title: 'Rapat Pleno Dewan Guru & Evaluasi KBM Bulanan',
              category: 'Agenda',
              published_at: '2026-08-24',
              author: 'Kepala Sekolah',
              summary: 'Rapat koordinasi kurikulum dan ketertiban santri bertempat di Aula Utama Pesantren hari Jumat pukul 14:00 WIB.',
              content: `Agenda Rapat Pleno Bulanan:
- Evaluasi presensi harian guru & rekap absensi santri.
- Laporan perkembangan program tahfidz & halaqah Al-Qur'an.
- Pembahasan sarana penunjang laboratorium dan perpustakaan.`
            },
            {
              id: 3,
              title: 'Pedoman Presensi Mandiri Berbasis GPS Geolocation',
              category: 'HRD',
              published_at: '2026-08-20',
              author: 'Divisi HRD Yayasan',
              summary: 'Mulai semester ini, presensi masuk & pulang dilakukan secara mandiri melalui Portal Guru dalam radius 200 meter dari titik koordinat sekolah.',
              content: `Presensi kehadiran guru wajib dilakukan melalui Portal Guru menggunakan perangkat masing-masing:
- Check-In dilakukan saat tiba di area pesantren (radius 200m).
- Check-Out dilakukan setelah menyelesaikan seluruh jam tatap muka dan tugas kedinasan hari tersebut.
- Apabila berhalangan hadir, silakan mengajukan izin resmi melalui menu Pengajuan Izin.`
            },
            {
              id: 4,
              title: 'Pembaruan Fasilitas Laboratorium Komputer & Server Ujian',
              category: 'Yayasan',
              published_at: '2026-08-18',
              author: 'Bagian Sarpras',
              summary: 'Laboratorium Komputer 1 & 2 telah dilengkapi jaringan internet berkecepatan tinggi untuk persiapan asesmen digital.',
              content: `Yayasan telah menyelesaikan peningkatan infrastruktur jaringan dan komputer untuk mendukung KBM berbasis teknologi di seluruh jenjang satuan pendidikan.`
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  const filteredItems = announcements.filter((item) => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchSearch =
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/25">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Papan Pengumuman & Berita</h1>
            <p className="text-xs text-slate-400">
              Pemberitahuan resmi yayasan, agenda kurikulum, dan ketetapan sekolah
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Kategori & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-950/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengumuman..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Grid Pengumuman */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-fuchsia-500/40 p-5 shadow-lg flex flex-col justify-between transition cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-bold">
                  {item.category || 'Pengumuman'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.published_at || 'Hari ini'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-fuchsia-400 transition line-clamp-2">
                {item.title}
              </h3>

              <p className="text-xs text-slate-400 line-clamp-3 mt-2 leading-relaxed">
                {item.summary || item.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-500 text-[11px]">Oleh: {item.author || 'Pimpinan Sekolah'}</span>
              <span className="text-fuchsia-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Baca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Detail Pengumuman */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {selectedItem.category || 'Pengumuman'}
                </span>
                <span className="text-xs text-slate-400">{selectedItem.published_at}</span>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white mb-3">{selectedItem.title}</h2>
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-6">
              {selectedItem.content || selectedItem.summary}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Penerbit: {selectedItem.author || 'Manajemen Sekolah'}</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
