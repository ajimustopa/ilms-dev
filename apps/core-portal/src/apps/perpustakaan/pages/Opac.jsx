import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Search,
  BookOpen,
  MapPin,
  Barcode,
  Loader2,
  BookMarked
} from 'lucide-react';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import Pagination from '../../../shared/components/Pagination';
import EmptyState from '../../../shared/components/EmptyState';

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

  const handleSearch = (text) => {
    setQ(text);
    setPagination((prev) => ({ ...prev, page: 1 }));
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
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            OPAC — Katalog Pencarian Publik
          </h1>
          <StatusPill variant="info">Koleksi Terbuka</StatusPill>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Cari buku bacaan, literatur islami, jurnal, dan lokasi ketersediaan rak secara realtime.
        </p>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={q}
        onSearchChange={handleSearch}
        searchPlaceholder="Ketik judul buku, nama pengarang, atau topik..."
        onReset={() => {
          setQ('');
          setSelectedCategory('');
          setSelectedMaterialType('');
          setAvailableOnly(false);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hasActiveFilters={Boolean(selectedCategory || selectedMaterialType || availableOnly || q)}
        filters={
          <>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMaterialType}
              onChange={(e) => {
                setSelectedMaterialType(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Semua Jenis</option>
              <option value="book">Buku Fisik</option>
              <option value="ebook">E-Book</option>
              <option value="journal">Jurnal</option>
            </select>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => {
                  setAvailableOnly(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Tersedia Saja</span>
            </label>
          </>
        }
        actions={
          <span className="text-xs text-slate-500">
            Ditemukan: <span className="font-bold text-slate-800 tnum">{pagination.total}</span> buku
          </span>
        }
      />

      {/* Grid Books Card */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => handleOpenDetail(book.id)}
              className="bg-white rounded-lg border border-slate-200/80 p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-2xs transition cursor-pointer group text-left"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {book.category_name || 'Umum'}
                  </span>
                  <StatusPill variant={book.available_copies > 0 ? 'success' : 'danger'}>
                    {book.available_copies > 0 ? `${book.available_copies} Tersedia` : 'Kosong'}
                  </StatusPill>
                </div>

                <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                  {book.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Oleh: <span className="font-medium text-slate-700">{book.author || 'Anonim'}</span>
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{book.shelf_location || 'Rak Umum'}</span>
                <span className="text-emerald-600 font-semibold group-hover:underline">Lihat Detail &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Buku Tidak Ditemukan"
          description="Tidak ada koleksi pustaka yang cocok dengan kata kunci pencarian Anda."
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalItems={pagination.total}
        pageSize={pagination.per_page}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedBookDetail?.title || 'Detail Buku'}
        subtitle="Informasi lengkap bibliografi & ketersediaan eksemplar di rak."
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setDetailModalOpen(false)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        }
      >
        {loadingDetail ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : selectedBookDetail ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-slate-400 text-[11px] block">Penulis / Pengarang</span>
                <span className="font-semibold text-slate-800">{selectedBookDetail.author || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Penerbit & Tahun</span>
                <span className="font-semibold text-slate-800">
                  {selectedBookDetail.publisher || '-'} ({selectedBookDetail.publish_year || '-'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Nomor ISBN</span>
                <span className="font-mono text-slate-800">{selectedBookDetail.isbn || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Lokasi Rak</span>
                <span className="font-mono font-bold text-emerald-700">{selectedBookDetail.shelf_location || '-'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Status Ketersediaan Fisik ({selectedBookDetail.copies?.length || 0} Eksemplar)
              </h4>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                {selectedBookDetail.copies?.map((c) => (
                  <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-slate-700">{c.copy_code}</span>
                    <StatusPill variant={c.status === 'available' ? 'success' : 'warning'}>
                      {c.status === 'available' ? 'Tersedia di Rak' : 'Sedang Dipinjam'}
                    </StatusPill>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
