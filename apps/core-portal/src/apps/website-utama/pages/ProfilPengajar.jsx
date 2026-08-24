import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Users, Plus, Edit2, Trash2, User } from 'lucide-react';

export default function ProfilPengajar() {
  const { schoolUnitId } = useOutletContext();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    position: '',
    photo_url: '',
    short_bio: '',
    display_order: 1
  });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/website-utama/admin/staff-profiles', {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setProfiles(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching staff profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/api/v1/website-utama/admin/staff-profiles/${editingItem.id}`, form, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      } else {
        await api.post('/api/v1/website-utama/admin/staff-profiles', form, {
          headers: { 'X-School-Unit-Id': schoolUnitId }
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan profil pengajar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus profil pengajar ini?')) return;
    try {
      await api.delete(`/api/v1/website-utama/admin/staff-profiles/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal menghapus profil');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Profil Tenaga Pendidik & Staf</h1>
          <p className="text-xs text-slate-500">Kelola daftar dewan guru dan struktur pengajar yang tampil di website publik.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setForm({ full_name: '', position: '', photo_url: '', short_bio: '', display_order: profiles.length + 1 });
            setShowModal(true);
          }}
          className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Profil Guru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0 overflow-hidden">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-slate-800 truncate">{p.full_name}</h3>
                <p className="text-[11px] text-emerald-600 font-semibold truncate">{p.position}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{p.short_bio || 'Belum ada biografi singkat.'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>Urutan: {p.display_order}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setEditingItem(p);
                    setForm(p);
                    setShowModal(true);
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editingItem ? 'Edit Profil Pengajar' : 'Tambah Profil Pengajar'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Mata Pelajaran</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Foto Profil</label>
                <input
                  type="text"
                  value={form.photo_url || ''}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="/images/staff/nama-guru.jpg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Biografi Singkat</label>
                <textarea
                  rows="3"
                  value={form.short_bio || ''}
                  onChange={(e) => setForm({ ...form, short_bio: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
