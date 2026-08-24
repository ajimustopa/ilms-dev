import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Loader2,
  Layers,
  Barcode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Eye,
  BookCopy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

  // Copies Modal
  const [copiesModalOpen, setCopiesModalOpen] = useState(false);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchBooks();
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
    setFormData({
      ...book,
      category_id: book.category_id || '',
    });
    setModalOpen(true);
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        publish_year: formData.publish_year ? Number(formData.publish_year) : null,
        total_copies: Number(formData.total_copies) || 0,
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

  const handleDeleteBook = async (id, title) => {
    if (!window.confirm(`Nonaktifkan koleksi buku "${title}" dari katalog?`)) return;
    try {
      await api.delete(`/api/v1/perpustakaan/books/${id}`);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menonaktifkan buku');
    }
  };

  // Open Copies Detail Modal
  const handleOpenCopies = async (book) => {
    setActiveBookForCopies(book);
    setCopiesModalOpen(true);
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
    if (!activeBookForCopies) return;
    setAddingCopy(true);
    try {
      await api.post(`/api/v1/perpustakaan/books/${activeBookForCopies.id}/copies`, {
        copy_code: newCopyCode || undefined,
        condition_status: 'good',
        circulation_status: 'available',
      });
      setNewCopyCode('');
      // Refresh copies list & books
      const res = await api.get(`/api/v1/perpustakaan/books/${activeBookForCopies.id}/copies`);
      setCopiesList(res.data?.data || []);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menambah eksemplar');
    } finally {
      setAddingCopy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
            Katalog Buku & Bahan Pustaka
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data induk pustaka, nomor klasifikasi/ISBN, nomor rak, dan eksemplar fisik.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Judul Buku</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul, pengarang, penerbit, atau ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
            >
              <option value="">Semua Jenis</option>
              <option value="book">Buku (Fisik)</option>
              <option value="ebook">E-Book</option>
              <option value="journal">Jurnal</option>
              <option value="magazine">Majalah</option>
              <option value="cd">CD / Multimedia</option>
              <option value="other">Lainnya</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </form>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Tidak ada data koleksi buku ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Judul & Pengarang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Jenis & ISBN</th>
                  <th className="py-3 px-4">Lokasi Rak</th>
                  <th className="py-3 px-4 text-center">Eksemplar</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-xs sm:text-sm leading-tight">
                        {b.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {b.author || 'Penulis tidak dicantumkan'} • {b.publisher || 'Penerbit -'} ({b.publish_year || '-'})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {b.category_name || 'Umum'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="capitalize font-medium text-slate-700">{b.material_type}</div>
                      <div className="text-[11px] font-mono text-slate-400">{b.isbn || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {b.shelf_location || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenCopies(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-mono font-bold text-xs transition border border-teal-200/60 cursor-pointer"
                        title="Klik untuk kelola eksemplar fisik"
                      >
                        <BookCopy className="w-3.5 h-3.5" />
                        <span>{b.total_copies || 0} unit</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer"
                          title="Edit Buku"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'active' && (
                          <button
                            onClick={() => handleDeleteBook(b.id, b.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Nonaktifkan Buku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan halaman <span className="font-bold text-slate-800">{pagination.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{pagination.total_pages || 1}</span> (Total: {pagination.total} buku)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form Tambah / Edit Buku */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">
                {modalMode === 'create' ? 'Tambah Judul Buku Baru' : 'Edit Informasi Buku'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Buku / Koleksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masukkan judul buku lengkap"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penulis / Pengarang
                  </label>
                  <input
                    type="text"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Nama pengarang"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                    placeholder="Nama penerbit"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={formData.publish_year || ''}
                    onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                    placeholder="978-..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Rak
                  </label>
                  <input
                    type="text"
                    value={formData.shelf_location || ''}
                    onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                    placeholder="misal: A1-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Koleksi
                  </label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Bahan Pustaka
                  </label>
                  <select
                    value={formData.material_type || 'book'}
                    onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
                  >
                    <option value="book">Buku (Fisik)</option>
                    <option value="ebook">E-Book</option>
                    <option value="journal">Jurnal</option>
                    <option value="magazine">Majalah</option>
                    <option value="cd">CD / Multimedia</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sumber Perolehan
                  </label>
                  <select
                    value={formData.source_type || 'purchase'}
                    onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs capitalize"
                  >
                    <option value="purchase">Pembelian</option>
                    <option value="donation">Hibah / Donasi</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Koleksi
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Data Buku</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Eksemplar Fisik */}
      {copiesModalOpen && activeBookForCopies && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BookCopy className="w-4 h-4 text-teal-600" />
                  <span>Daftar Eksemplar Fisik</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {activeBookForCopies.title}
                </p>
              </div>
              <button
                onClick={() => setCopiesModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Copy Form */}
            <form onSubmit={handleAddCopy} className="py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Kode Barcode Eksemplar (opsional / otomatis)"
                  value={newCopyCode}
                  onChange={(e) => setNewCopyCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={addingCopy}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {addingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Tambah Eksemplar</span>
              </button>
            </form>

            {/* Copies Table */}
            <div className="flex-1 overflow-y-auto py-2">
              {loadingCopies ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                </div>
              ) : copiesList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Belum ada eksemplar fisik untuk buku ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Kode Eksemplar</th>
                      <th className="py-2.5 px-3">Kondisi Fisik</th>
                      <th className="py-2.5 px-3">Status Sirkulasi</th>
                      <th className="py-2.5 px-3">Lokasi Rak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {copiesList.map((copy) => (
                      <tr key={copy.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {copy.copy_code || `COPY-${copy.id}`}
                        </td>
                        <td className="py-2.5 px-3 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              copy.condition_status === 'good'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {copy.condition_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              copy.circulation_status === 'available'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : copy.circulation_status === 'borrowed'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {copy.circulation_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {copy.shelf_location || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right shrink-0">
              <button
                onClick={() => setCopiesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
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
