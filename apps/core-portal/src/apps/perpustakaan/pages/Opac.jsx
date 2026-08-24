import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Search,
  Library,
  BookOpen,
  Filter,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Barcode,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight,
  BookMarked,
  X
} from 'lucide-react';

export default function Opac() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 12, total: 0, total_pages: 1 });

  // Search Filters
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Detail Modal
  const [selectedBookDetail, setSelectedBookDetail] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPublicCatalog();
  }, [pagination.page, selectedCategory, selectedMaterialType, availableOnly]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/v1/perpustakaan/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchPublicCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('per_page', pagination.per_page);
      if (q) params.append('q', q);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedMaterialType) params.append('material_type', selectedMaterialType);
      if (availableOnly) params.append('available_only', 'true');

      const res = await api.get(`/api/v1/perpustakaan/opac/search?${params.toString()}`);
      setBooks(res.data?.data?.items || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to search OPAC:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchPublicCatalog();
  };

  const handleOpenDetail = async (bookId) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/v1/perpustakaan/opac/books/${bookId}`);
      setSelectedBookDetail(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch book detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-900/40">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">OPAC ALDEPOS</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  Katalog Publik
                </span>
              </div>
              <p className="text-xs text-slate-400">Pencarian Koleksi Pustaka Pesantren & Sekolah</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              Portal Aplikasi
            </Link>
            <Link
              to="/perpustakaan/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-950/30 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Masuk Pustakawan</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner with Search */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 py-12 px-6 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Online Public Access Catalog (OPAC)</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Temukan Buku & Sumber Ilmu
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Cari ketersediaan buku di rak perpustakaan, kitab referensi, modul pelajaran, dan materi bacaan santri.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="pt-4 max-w-2xl mx-auto space-y-3">
            <div className="relative flex items-center shadow-2xl">
              <Search className="w-5 h-5 text-teal-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Ketik judul buku, nama pengarang, penerbit, atau ISBN..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Cari Buku
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-hidden focus:border-teal-500 text-xs"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedMaterialType}
                onChange={(e) => {
                  setSelectedMaterialType(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-hidden focus:border-teal-500 text-xs"
              >
                <option value="">Semua Jenis</option>
                <option value="book">Buku Fisik</option>
                <option value="ebook">E-Book</option>
                <option value="journal">Jurnal</option>
                <option value="magazine">Majalah</option>
                <option value="cd">CD / Multimedia</option>
              </select>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 cursor-pointer hover:bg-slate-700/60 transition select-none text-xs">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => {
                    setAvailableOnly(e.target.checked);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="rounded border-slate-600 text-teal-500 focus:ring-0"
                />
                <span>Hanya yang Tersedia di Rak</span>
              </label>
            </div>
          </form>
        </div>
      </div>

      {/* Main Results Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            Ditemukan <span className="font-bold text-white">{pagination.total}</span> judul buku
          </div>
          {q && (
            <div>
              Hasil pencarian untuk kata kunci: <span className="font-semibold text-teal-400">"{q}"</span>
            </div>
          )}
        </div>

        {/* Books Cards Grid */}
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">Tidak ada buku yang cocok</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba gunakan kata kunci lain, kurangi filter, atau hubungi pustakawan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {books.map((b) => (
              <div
                key={b.id}
                onClick={() => handleOpenDetail(b.id)}
                className="bg-slate-800/80 border border-slate-700/70 hover:border-teal-500/50 rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl hover:shadow-teal-950/20 transition duration-200 group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase tracking-wider">
                      {b.category || 'Umum'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.available_copies > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {b.available_copies > 0 ? `${b.available_copies} Tersedia` : 'Sedang Dipinjam'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition line-clamp-2 leading-snug">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {b.author || 'Penulis Anonim'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{b.shelf_location || 'Rak Utama'}</span>
                  </div>
                  <span className="text-teal-400 group-hover:translate-x-0.5 transition font-semibold flex items-center gap-0.5">
                    <span>Detail</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="pt-6 flex items-center justify-center gap-2 text-xs">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-3 py-1.5 text-slate-400">
              Halaman {pagination.page} dari {pagination.total_pages}
            </span>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* Book Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : selectedBookDetail ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                      {selectedBookDetail.category || 'Umum'}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1.5 leading-snug">
                      {selectedBookDetail.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedBookDetail.author || 'Penulis Anonim'}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">Penerbit</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {selectedBookDetail.publisher || '-'} ({selectedBookDetail.publish_year || '-'})
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">ISBN / Barcode</div>
                    <div className="font-mono text-teal-400 font-semibold mt-0.5">
                      {selectedBookDetail.isbn || '-'}
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">Lokasi Rak</div>
                    <div className="font-mono text-slate-200 font-semibold mt-0.5">
                      {selectedBookDetail.shelf_location || 'Rak Utama'}
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">Ketersediaan</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {selectedBookDetail.available_copies} dari {selectedBookDetail.total_copies} eksemplar
                    </div>
                  </div>
                </div>

                {/* Copies List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Daftar Eksemplar Fisik:
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedBookDetail.copies?.map((copy) => (
                      <div
                        key={copy.id}
                        className="bg-slate-800 p-2.5 rounded-xl border border-slate-700/70 flex items-center justify-between text-xs"
                      >
                        <div className="font-mono text-slate-200 font-bold">
                          {copy.copy_code || `COPY-${copy.id}`}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            copy.circulation_status === 'available'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {copy.circulation_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-right">
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        &copy; 2026 Perpustakaan Digital Aldepos IBS. Terbuka untuk umum dan seluruh santri/pegawai.
      </footer>
    </div>
  );
}
