import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Newspaper, Plus, Edit2, Trash2, CheckCircle, Archive } from 'lucide-react';

export default function BeritaPengumuman() {
  const { schoolUnitId } = useOutletContext();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: 'Pengumuman',
    content: '',
    cover_image_url: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/website-utama/admin/news', {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setNews(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        slug: form.slug || generateSlug(form.title)
      };

      if (editingItem) {
        await api.put(`/api/v1/website-utama/admin/news/${editingItem.id}`, payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/news', payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan berita');
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/news/${id}/publish`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal mempublikasikan berita');
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/news/${id}/archive`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal mengarsipkan berita');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus berita ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/news/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal menghapus berita');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Berita & Pengumuman</h1>
          <p className="text-xs text-slate-500">Publikasikan informasi kegiatan, artikel berita, dan pengumuman resmi.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setForm({ title: '', slug: '', category: 'Pengumuman', content: '', cover_image_url: '', status: 'draft' });
            setShowModal(true);
          }}
          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tulis Berita Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-3 px-4">Judul & Kategori</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Tanggal Publikasi</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {news.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">{item.category || 'Berita'}</span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{item.slug}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'archived'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    {item.status !== 'published' && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        title="Publish"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === 'published' && (
                      <button
                        onClick={() => handleArchive(item.id)}
                        title="Arsipkan"
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setForm(item);
                        setShowModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form Berita */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editingItem ? 'Edit Berita' : 'Tulis Berita Baru'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Berita</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Pengumuman / Prestasi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Sampul</label>
                  <input
                    type="text"
                    value={form.cover_image_url || ''}
                    onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="/images/news/sample.jpg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten / Isi Berita</label>
                <textarea
                  rows="6"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="Tulis artikel berita..."
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Simpan Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
