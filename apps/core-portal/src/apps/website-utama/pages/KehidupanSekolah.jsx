import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Smile, Plus, Edit2, Trash2, Tag } from 'lucide-react';

export default function KehidupanSekolah() {
  const { schoolUnitId } = useOutletContext();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('facility');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    category: 'facility',
    title: '',
    description: '',
    photo_url: '',
    status: 'published'
  });

  const categories = [
    { key: 'facility', label: 'Fasilitas & Sarana' },
    { key: 'extracurricular', label: 'Ekstrakurikuler' },
    { key: 'school_rule', label: 'Tata Tertib' },
    { key: 'achievement', label: 'Prestasi Siswa' }
  ];

  useEffect(() => {
    fetchData();
  }, [schoolUnitId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/website-utama/admin/school-life?category=${activeTab}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setItems(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching school life items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, category: activeTab };
      if (editingItem) {
        await api.put(`/api/v1/website-utama/admin/school-life/${editingItem.id}`, payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/school-life', payload, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan data');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus item ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/school-life/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kehidupan Sekolah & Fasilitas</h1>
          <p className="text-xs text-slate-500">Kelola informasi fasilitas sekolah, kegiatan ekskul, tata tertib, dan prestasi.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setForm({ category: activeTab, title: '', description: '', photo_url: '', status: 'published' });
            setShowModal(true);
          }}
          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Item</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === cat.key
                ? 'border-emerald-600 text-emerald-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {item.status}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setForm(item);
                      setShowModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-xs text-slate-800">{item.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-3">{item.description}</p>
            </div>
            {item.photo_url && (
              <div className="mt-3 rounded-lg overflow-hidden h-28 bg-slate-100">
                <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editingItem ? 'Edit Item' : 'Tambah Item Baru'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Nama</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows="3"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Foto / Gambar</label>
                <input
                  type="text"
                  value={form.photo_url || ''}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="/images/fasilitas/lab-komputer.jpg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Publikasi</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
