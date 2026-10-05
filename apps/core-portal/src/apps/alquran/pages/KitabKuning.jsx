import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import {
  BookMarked,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

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
    setError(null);
    try {
      const res = await api.get('/alquran/books?status_active=true');
      setBooks(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat kurikulum kitab kuning');
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
        teacher_ref_id: Number(formData.teacher_ref_id)
      };

      if (editingBook) {
        await api.put(`/alquran/books/${editingBook.id}`, payload);
      } else {
        await api.post('/alquran/books', payload);
      }

      setShowModal(false);
      fetchBooks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data kitab kuning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Hapus kurikulum kitab "${book.book_name}"?`)) return;

    try {
      await api.delete(`/alquran/books/${book.id}`);
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menghapus kitab');
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      return (
        search === '' ||
        (b.book_name && b.book_name.toLowerCase().includes(search.toLowerCase())) ||
        (b.author && b.author.toLowerCase().includes(search.toLowerCase())) ||
        (b.level && b.level.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [books, search]);

  const columns = [
    {
      key: 'book_name',
      label: 'Nama Kitab & Pengarang',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pengarang: <span className="font-medium text-slate-600">{row.author || 'Ulama Salaf'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'level',
      label: 'Tingkat / Marhalah',
      render: (val) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {val || 'Dasar'}
        </span>
      )
    },
    {
      key: 'teacher_ref_id',
      label: 'Guru Pengampu (Ustadz)',
      render: (val) => <span className="text-slate-700">Asatidz ID #{val || '1'}</span>
    },
    {
      key: 'status_active',
      label: 'Status',
      render: (val) => (
        <StatusPill variant={val !== false ? 'success' : 'neutral'}>
          {val !== false ? 'Aktif Diajarkan' : 'Arsip'}
        </StatusPill>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '100px',
      render: (_, book) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEditModal(book)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Edit Kitab"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(book)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Hapus Kitab"
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
            Kurikulum Kitab Kuning & Dirasah Islamiyah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kitab rujukan fiqih, aqidah, nahwu, hadits, dan asatidz pengampu halaqah.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Kitab Kuning</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama kitab, pengarang, atau tingkatan..."
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{filteredBooks.length}</span> kitab
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={filteredBooks}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Kitab Terdaftar"
        emptyDescription="Katalog kurikulum kitab kuning pondok belum tersedia."
        emptyAction={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kitab Pertama</span>
          </button>
        }
      />

      {/* Modal Tambah / Edit Kitab */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBook ? 'Edit Kurikulum Kitab' : 'Tambah Kitab Kuning Baru'}
        subtitle="Entri nama kitab, pengarang ulama, tingkat pembelajaran, dan pengampu."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Kitab</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Data"
              description={error}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kitab Kuning
              </label>
              <input
                type="text"
                required
                value={formData.book_name}
                onChange={(e) => setFormData({ ...formData, book_name: e.target.value })}
                placeholder="Contoh: Matan Al-Ghayah wat Taqrib (Fiqih)"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pengarang / Muallif
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Contoh: Al-Qadhi Abu Syuja'"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat / Marhalah
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="Pemula">Pemula (Ibtidai)</option>
                  <option value="Menengah">Menengah (Mutawassith)</option>
                  <option value="Lanjutan">Lanjutan (Mutaqaddim)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Guru Pengampu
                </label>
                <input
                  type="number"
                  required
                  value={formData.teacher_ref_id}
                  onChange={(e) => setFormData({ ...formData, teacher_ref_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
