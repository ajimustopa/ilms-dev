import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  BookCopy,
  Barcode,
  Loader2,
  X
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import Drawer from '../../../shared/components/Drawer';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

export default function Katalog() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedBook, setSelectedBook] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Copies Drawer
  const [copiesDrawerOpen, setCopiesDrawerOpen] = useState(false);
  const [activeBookForCopies, setActiveBookForCopies] = useState(null);
  const [copiesList, setCopiesList] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [newCopyCode, setNewCopyCode] = useState('');
  const [addingCopy, setAddingCopy] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, selectedCategory, selectedMaterialType, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/v1/perpustakaan/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('per_page', pagination.per_page);
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedMaterialType) params.append('material_type', selectedMaterialType);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/api/v1/perpustakaan/books?${params.toString()}`);
      setBooks(res.data?.data?.items || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat katalog buku');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedBook(null);
    setErrorMsg(null);
    setFormData({
      material_type: 'book',
      title: '',
      author: '',
      publisher: '',
      publish_year: new Date().getFullYear(),
      isbn: '',
      category_id: categories[0]?.id || '',
      shelf_location: 'A1-01',
      total_copies: 1,
      source_type: 'purchase',
      status: 'active',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (book) => {
    setModalMode('edit');
    setSelectedBook(book);
    setErrorMsg(null);
    setFormData({ ...book });
    setModalOpen(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        category_id: Number(formData.category_id),
        publish_year: Number(formData.publish_year),
        total_copies: Number(formData.total_copies) || 1,
      };

      if (modalMode === 'create') {
        await api.post('/api/v1/perpustakaan/books', payload);
      } else {
        await api.put(`/api/v1/perpustakaan/books/${selectedBook.id}`, payload);
      }

      setModalOpen(false);
      fetchBooks();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan data buku');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (book) => {
    if (!window.confirm(`Hapus judul buku "${book.title}" beserta seluruh eksemplarnya?`)) return;

    try {
      await api.delete(`/api/v1/perpustakaan/books/${book.id}`);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menghapus buku');
    }
  };

  const handleOpenCopies = async (book) => {
    setActiveBookForCopies(book);
    setCopiesDrawerOpen(true);
    setLoadingCopies(true);
    setNewCopyCode('');
    try {
      const res = await api.get(`/api/v1/perpustakaan/books/${book.id}/copies`);
      setCopiesList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch copies:', err);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleAddCopy = async (e) => {
    e.preventDefault();
    if (!newCopyCode.trim()) return;

    setAddingCopy(true);
    try {
      await api.post(`/api/v1/perpustakaan/books/${activeBookForCopies.id}/copies`, {
        copy_code: newCopyCode.trim(),
        condition: 'good',
        status: 'available',
      });
      setNewCopyCode('');
      // Reload copies & book list
      const res = await api.get(`/api/v1/perpustakaan/books/${activeBookForCopies.id}/copies`);
      setCopiesList(res.data?.data || []);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menambah eksemplar');
    } finally {
      setAddingCopy(false);
    }
  };

  const handleUpdateCopyStatus = async (copyId, nextStatus) => {
    try {
      await api.patch(`/api/v1/perpustakaan/copies/${copyId}/status`, { status: nextStatus });
      const res = await api.get(`/api/v1/perpustakaan/books/${activeBookForCopies.id}/copies`);
      setCopiesList(res.data?.data || []);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memperbarui status eksemplar');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Judul & Penulis',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {row.author || 'Anonim'} • {row.publisher || '-'} ({row.publish_year || '-'})
          </div>
        </div>
      )
    },
    {
      key: 'category_name',
      label: 'Kategori / ISBN',
      render: (val, row) => (
        <div>
          <div className="text-slate-700 font-medium">{val || 'Umum'}</div>
          <div className="text-[11px] font-mono text-slate-400">{row.isbn || '-'}</div>
        </div>
      )
    },
    {
      key: 'shelf_location',
      label: 'Lokasi Rak',
      render: (val) => (
        <span className="font-mono text-slate-700 font-medium">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'copies',
      label: 'Eksemplar Fisik',
      render: (_, row) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 tnum">
            {row.available_copies || 0} / {row.total_copies || 0} Tersedia
          </div>
          <div className="text-[10px] text-slate-400 capitalize">{row.material_type || 'Buku'}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '100px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '120px',
      render: (_, item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleOpenCopies(item)}
            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            title="Kelola Eksemplar Fisik"
          >
            <BookCopy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Edit Buku"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteBook(item)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Hapus Buku"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Katalog Buku & Koleksi Pustaka
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen master data judul buku, nomor ISBN, penempatan rak, dan salinan fisik.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Judul Buku</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Cari judul, penulis, atau ISBN..."
        onReset={() => {
          setSearch('');
          setSelectedCategory('');
          setSelectedMaterialType('');
          setSelectedStatus('');
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hasActiveFilters={Boolean(selectedCategory || selectedMaterialType || selectedStatus || search)}
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
              <option value="magazine">Majalah</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{pagination.total}</span> judul
          </span>
        }
      />

      {/* Generic DataTable View */}
      <DataTable
        columns={columns}
        data={books}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Buku Terdaftar"
        emptyDescription="Koleksi buku belum tersedia atau tidak cocok dengan filter pencarian yang diterapkan."
        emptyAction={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Judul Buku Baru</span>
          </button>
        }
        pagination={{
          currentPage: pagination.page,
          totalItems: pagination.total,
          pageSize: pagination.per_page,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage }))
        }}
      />

      {/* Modal Tambah / Edit Buku */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Tambah Judul Buku Baru' : 'Edit Judul Buku'}
        subtitle="Masukkan detail bibliografi buku dan lokasi rak penyimpanan."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveBook}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Judul Buku</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {errorMsg && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Buku"
              description={errorMsg}
            />
          )}

          <form onSubmit={handleSaveBook} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Utama Buku / Pustaka
              </label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Fiqih Sunnah Jilid 1"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penulis / Pengarang
                </label>
                <input
                  type="text"
                  required
                  value={formData.author || ''}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Sayyid Sabiq"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penerbit
                </label>
                <input
                  type="text"
                  value={formData.publisher || ''}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  placeholder="Darul Kutub"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Koleksi
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Terbit
                </label>
                <input
                  type="number"
                  value={formData.publish_year || ''}
                  onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ISBN / Barcode
                </label>
                <input
                  type="text"
                  value={formData.isbn || ''}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="978-602-..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi Rak
                </label>
                <input
                  type="text"
                  value={formData.shelf_location || ''}
                  onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                  placeholder="Rak A1-02"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Eksemplar Awal
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_copies || 1}
                  onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Drawer Kelola Eksemplar Fisik */}
      <Drawer
        isOpen={copiesDrawerOpen}
        onClose={() => setCopiesDrawerOpen(false)}
        title="Kelola Salinan Eksemplar Fisik"
        subtitle={activeBookForCopies ? `${activeBookForCopies.title} (${activeBookForCopies.author})` : ''}
        size="md"
      >
        <div className="space-y-4">
          {/* Form Tambah Barcode / Eksemplar Baru */}
          <form onSubmit={handleAddCopy} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Registrasi Eksemplar Baru (Barcode / Kode Fisik)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={newCopyCode}
                onChange={(e) => setNewCopyCode(e.target.value)}
                placeholder="Contoh: BK-2026-001"
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="submit"
                disabled={addingCopy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {addingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Tambah</span>
              </button>
            </div>
          </form>

          {/* List Eksemplar */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Daftar Eksemplar Terdaftar ({copiesList.length})
            </h4>

            {loadingCopies ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              </div>
            ) : copiesList.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                {copiesList.map((copy) => (
                  <div key={copy.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/70 transition">
                    <div>
                      <div className="font-mono font-bold text-slate-800">{copy.copy_code}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Kondisi: <span className="capitalize">{copy.condition || 'Baik'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusPill
                        variant={
                          copy.status === 'available'
                            ? 'success'
                            : copy.status === 'borrowed'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {copy.status}
                      </StatusPill>

                      {copy.status !== 'borrowed' && (
                        <select
                          value={copy.status}
                          onChange={(e) => handleUpdateCopyStatus(copy.id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:bg-white focus:outline-none"
                        >
                          <option value="available">Tersedia</option>
                          <option value="damaged">Rusak</option>
                          <option value="lost">Hilang</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Belum ada eksemplar terdaftar untuk buku ini.
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
