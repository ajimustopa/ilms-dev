import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Image, Plus, Edit2, Trash2, Video, Eye } from 'lucide-react';

export default function GaleriKegiatan() {
  const { schoolUnitId } = useOutletContext();
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [albumForm, setAlbumForm] = useState({ album_name: '', event_date: '', description: '' });
  const [itemForm, setItemForm] = useState({ media_type: 'photo', media_url: '', display_order: 1 });

  useEffect(() => {
    fetchGalleries();
  }, [schoolUnitId]);

  const fetchGalleries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/website-utama/admin/galleries', {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setGalleries(res.data?.data || []);
      if (res.data?.data?.length > 0 && !selectedGallery) {
        fetchGalleryDetail(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching galleries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryDetail = async (id) => {
    try {
      const res = await api.get(`/api/v1/website-utama/public/galleries/${id}`);
      setSelectedGallery(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching gallery detail:', err);
    }
  };

  const handleSaveAlbum = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/website-utama/admin/galleries', albumForm, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setShowAlbumModal(false);
      fetchGalleries();
    } catch (err) {
      alert('Gagal membuat album');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/v1/website-utama/admin/galleries/${selectedGallery.id}/items`, itemForm, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setShowItemModal(false);
      fetchGalleryDetail(selectedGallery.id);
    } catch (err) {
      alert('Gagal menambahkan item foto/video');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Hapus media ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/galleries/${selectedGallery.id}/items/${itemId}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchGalleryDetail(selectedGallery.id);
    } catch (err) {
      alert('Gagal menghapus item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Galeri Foto & Video Dokumentasi</h1>
          <p className="text-xs text-slate-500">Kelola album dokumentasi kegiatan santri, perlombaan, dan fasilitas.</p>
        </div>
        <button
          onClick={() => {
            setAlbumForm({ album_name: '', event_date: '', description: '' });
            setShowAlbumModal(true);
          }}
          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Album Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daftar Album */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daftar Album</h2>
          {galleries.map((g) => (
            <div
              key={g.id}
              onClick={() => fetchGalleryDetail(g.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedGallery?.id === g.id
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs">{g.album_name}</p>
                <span className="text-[10px] text-slate-400 font-normal">
                  {g.event_date ? new Date(g.event_date).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Item Media Album */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {selectedGallery ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{selectedGallery.album_name}</h2>
                  <p className="text-xs text-slate-500">{selectedGallery.description || 'Tidak ada deskripsi.'}</p>
                </div>
                <button
                  onClick={() => {
                    setItemForm({ media_type: 'photo', media_url: '', display_order: (selectedGallery.items?.length || 0) + 1 });
                    setShowItemModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Foto/Video</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedGallery.items?.map((item) => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 h-32">
                    <img src={item.media_url} alt="media" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">Pilih album untuk melihat item media.</div>
          )}
        </div>
      </div>

      {/* Modal Album */}
      {showAlbumModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Buat Album Kegiatan Baru</h3>
            <form onSubmit={handleSaveAlbum} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Album</label>
                <input
                  type="text"
                  value={albumForm.album_name}
                  onChange={(e) => setAlbumForm({ ...albumForm, album_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  value={albumForm.event_date}
                  onChange={(e) => setAlbumForm({ ...albumForm, event_date: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows="3"
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAlbumModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan Album</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tambah Media ke Album</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Media</label>
                <select
                  value={itemForm.media_type}
                  onChange={(e) => setItemForm({ ...itemForm, media_type: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="photo">Foto</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Media</label>
                <input
                  type="text"
                  value={itemForm.media_url}
                  onChange={(e) => setItemForm({ ...itemForm, media_url: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="/images/gallery/photo1.jpg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                <input
                  type="number"
                  value={itemForm.display_order}
                  onChange={(e) => setItemForm({ ...itemForm, display_order: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Tambah</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
