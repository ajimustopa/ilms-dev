import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookMarked,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function KitabKuning() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    book_name: '',
    author: '',
    level: 'Pemula',
    teacher_ref_id: '1'
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alquran/books?status_active=true');
      setBooks(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const openCreateModal = () => {
    setEditingBook(null);
    setFormData({
      book_name: '',
      author: '',
      level: 'Pemula',
      teacher_ref_id: '1'
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      book_name: book.book_name || '',
      author: book.author || '',
      level: book.level || 'Pemula',
      teacher_ref_id: book.teacher_ref_id ? String(book.teacher_ref_id) : '1'
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        teacher_ref_id: formData.teacher_ref_id ? Number(formData.teacher_ref_id) : null
      };

      if (editingBook) {
        await api.put(`/alquran/books/${editingBook.id}`, payload);
      } else {
        await api.post('/alquran/books', payload);
      }

      setShowModal(false);
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data kitab');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menonaktifkan kurikulum kitab ini?')) return;
    try {
      await api.delete(`/alquran/books/${id}`);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menonaktifkan kitab');
    }
  };

  const filteredBooks = books.filter(b =>
    b.book_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.level?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Kurikulum Kitab Kuning</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen daftar kitab turats/kuning yang diajarkan, pengarang, jenjang tingkatan, dan ustadz pengampu
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kitab Baru</span>
        </button>
      </div>

      {/* Control Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul kitab, pengarang, tingkatan..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredBooks.length}</span> kitab aktif
        </div>
      </div>

      {/* Grid Cards of Kitab */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-400">Memuat data kitab...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {b.level || 'Umum'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  {b.book_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Karya: <span className="font-semibold text-slate-700">{b.author || 'Tidak dicatat'}</span>
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Ustadz Pengampu:</span>
                  <span className="font-semibold text-slate-800">Pegawai #{b.teacher_ref_id || '-'}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(b)}
                  className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Nonaktifkan</span>
                </button>
              </div>
            </div>
          ))}

          {filteredBooks.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 italic text-xs">
              Belum ada data kurikulum kitab kuning
            </div>
          )}
        </div>
      )}

      {/* Modal Form Kitab */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingBook ? 'Edit Data Kitab Kuning' : 'Tambah Kitab Kuning Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kitab</label>
                <input
                  type="text"
                  required
                  value={formData.book_name}
                  onChange={(e) => setFormData({ ...formData, book_name: e.target.value })}
                  placeholder="Contoh: Safinatun Najah, Fathul Qorib..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pengarang / Muallif</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Contoh: Syekh Salim bin Sumair"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkatan / Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Pemula">Pemula (Ibtidai)</option>
                    <option value="Menengah">Menengah (Tawassuth)</option>
                    <option value="Lanjutan">Lanjutan (Mutaqaddim)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Ustadz Pengampu</label>
                  <input
                    type="number"
                    value={formData.teacher_ref_id}
                    onChange={(e) => setFormData({ ...formData, teacher_ref_id: e.target.value })}
                    placeholder="ID Pegawai"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kitab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
