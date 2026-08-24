import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Home, Sparkles, Plus, Edit2, Trash2, Save } from 'lucide-react';

export default function KontenBeranda() {
  const { schoolUnitId } = useOutletContext();
  const [hero, setHero] = useState({
    headline: '',
    subheadline: '',
    keywords: '',
    cta_button_label: '',
    cta_button_url: ''
  });
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [formHighlight, setFormHighlight] = useState({
    title: '',
    icon: 'BookOpen',
    description: '',
    detail_link_url: '',
    display_order: 1
  });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [heroRes, highRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/home/hero', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/home/highlights', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      if (heroRes.data?.data) {
        setHero(heroRes.data.data);
      }
      setHighlights(highRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching home content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHero = async (e) => {
    e.preventDefault();
    setSavingHero(true);
    try {
      await api.put('/api/v1/website-utama/admin/home/hero', hero, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      alert('Hero banner berhasil diperbarui!');
    } catch (err) {
      alert('Gagal menyimpan hero settings');
    } finally {
      setSavingHero(false);
    }
  };

  const handleSaveHighlight = async (e) => {
    e.preventDefault();
    try {
      if (editingHighlight) {
        await api.put(`/api/v1/website-utama/admin/home/highlights/${editingHighlight.id}`, formHighlight, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/home/highlights', formHighlight, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan highlight');
    }
  };

  const handleDeleteHighlight = async (id) => {
    if (!window.confirm('Yakin ingin menghapus keunggulan ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/home/highlights/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal menghapus highlight');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Beranda & Keunggulan</h1>
        <p className="text-xs text-slate-500">Konfigurasi hero section banner dan daftar keunggulan program sekolah.</p>
      </div>

      {/* Hero Section Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-6">
          <Home className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-800">Pengaturan Banner Hero (Beranda Utama)</h2>
        </div>

        <form onSubmit={handleSaveHero} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Headline Utama</label>
            <input
              type="text"
              value={hero.headline || ''}
              onChange={(e) => setHero({ ...hero, headline: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              placeholder="Contoh: Selamat Datang di SD Aldepos..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subheadline / Deskripsi Singkat</label>
            <input
              type="text"
              value={hero.subheadline || ''}
              onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              placeholder="Contoh: Membentuk Generasi Qurani yang Cerdas dan Berakhlak Mulia"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Label Tombol CTA</label>
              <input
                type="text"
                value={hero.cta_button_label || ''}
                onChange={(e) => setHero({ ...hero, cta_button_label: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="Daftar Sekarang"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">URL Tombol CTA</label>
              <input
                type="text"
                value={hero.cta_button_url || ''}
                onChange={(e) => setHero({ ...hero, cta_button_url: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="/ppdb"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingHero}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{savingHero ? 'Menyimpan...' : 'Simpan Hero Banner'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Highlights List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">Keunggulan Sekolah (Highlights)</h2>
          </div>
          <button
            onClick={() => {
              setEditingHighlight(null);
              setFormHighlight({ title: '', icon: 'BookOpen', description: '', detail_link_url: '', display_order: highlights.length + 1 });
              setShowModal(true);
            }}
            className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Keunggulan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlights.map((h) => (
            <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    Urutan: {h.display_order}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingHighlight(h);
                        setFormHighlight(h);
                        setShowModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteHighlight(h.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-xs text-slate-800">{h.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{h.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Form Highlight */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editingHighlight ? 'Edit Keunggulan' : 'Tambah Keunggulan Baru'}
            </h3>
            <form onSubmit={handleSaveHighlight} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Keunggulan</label>
                <input
                  type="text"
                  value={formHighlight.title}
                  onChange={(e) => setFormHighlight({ ...formHighlight, title: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows="3"
                  value={formHighlight.description || ''}
                  onChange={(e) => setFormHighlight({ ...formHighlight, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    value={formHighlight.display_order}
                    onChange={(e) => setFormHighlight({ ...formHighlight, display_order: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL Link Detail</label>
                  <input
                    type="text"
                    value={formHighlight.detail_link_url || ''}
                    onChange={(e) => setFormHighlight({ ...formHighlight, detail_link_url: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
