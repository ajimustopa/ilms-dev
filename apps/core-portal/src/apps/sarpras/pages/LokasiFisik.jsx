import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Building2,
  MapPin,
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function LokasiFisik() {
  const [activeTab, setActiveTab] = useState('sites'); // 'sites', 'buildings', 'rooms'
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('site'); // 'site', 'building', 'room'
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sitesRes, bldRes, rmsRes] = await Promise.all([
        api.get('/sarpras/sites'),
        api.get('/sarpras/buildings'),
        api.get('/sarpras/rooms')
      ]);
      if (sitesRes.data.success) setSites(sitesRes.data.data);
      if (bldRes.data.success) setBuildings(bldRes.data.data);
      if (rmsRes.data.success) setRooms(rmsRes.data.data);
    } catch (err) {
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = (type) => {
    setModalType(type);
    setEditItem(null);
    if (type === 'site') {
      setFormData({ name: '', address: '', land_area_m2: '', ownership_status: 'milik_sendiri', certificate_number: '', notes: '' });
    } else if (type === 'building') {
      setFormData({
        facility_site_id: sites[0]?.id || '',
        name: '',
        building_function: 'ruang kelas',
        floor_count: 1,
        building_area_m2: '',
        construction_year: new Date().getFullYear(),
        condition: 'baik'
      });
    } else if (type === 'room') {
      setFormData({
        facility_building_id: buildings[0]?.id || '',
        room_code: '',
        room_name: '',
        room_type: 'ruang_kelas',
        floor_number: 1,
        area_m2: '',
        capacity: 32,
        condition: 'baik'
      });
    }
    setModalOpen(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditItem(item);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (modalType === 'site') {
        if (editItem) {
          await api.put(`/sarpras/sites/${editItem.id}`, formData);
          setMessage({ type: 'success', text: 'Data lahan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/sites', formData);
          setMessage({ type: 'success', text: 'Lahan baru berhasil ditambahkan' });
        }
      } else if (modalType === 'building') {
        if (editItem) {
          await api.put(`/sarpras/buildings/${editItem.id}`, formData);
          setMessage({ type: 'success', text: 'Data bangunan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/buildings', formData);
          setMessage({ type: 'success', text: 'Bangunan baru berhasil ditambahkan' });
        }
      } else if (modalType === 'room') {
        if (editItem) {
          await api.put(`/sarpras/rooms/${editItem.id}`, formData);
          setMessage({ type: 'success', text: 'Data ruangan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/rooms', formData);
          setMessage({ type: 'success', text: 'Ruangan baru berhasil ditambahkan' });
        }
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Yakin ingin menghapus ${type} ini?`)) return;
    try {
      const endpoint = type === 'lahan' ? `/sarpras/sites/${id}` : type === 'bangunan' ? `/sarpras/buildings/${id}` : `/sarpras/rooms/${id}`;
      await api.delete(endpoint);
      setMessage({ type: 'success', text: `${type} berhasil dihapus` });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Lokasi & Denah Fisik</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarki fisik: Lahan (Site) &rarr; Bangunan (Building) &rarr; Ruangan (Room)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sites' && (
            <button
              onClick={() => openCreateModal('site')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lahan</span>
            </button>
          )}
          {activeTab === 'buildings' && (
            <button
              onClick={() => openCreateModal('building')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bangunan</span>
            </button>
          )}
          {activeTab === 'rooms' && (
            <button
              onClick={() => openCreateModal('room')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ruangan</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-4">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('sites')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'sites'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Lahan / Kampus ({sites.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('buildings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'buildings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bangunan / Gedung ({buildings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>Ruangan & Fasilitas ({rooms.length})</span>
        </button>
      </div>

      {/* Tab 1: Sites */}
      {activeTab === 'sites' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {site.ownership_status || 'Milik Sendiri'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">{site.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{site.address || 'Alamat belum diisi'}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Luas Lahan:</span>
                  <span className="font-semibold text-slate-700">{site.land_area_m2 ? `${Number(site.land_area_m2).toLocaleString()} m²` : '-'}</span>
                </div>
                {site.certificate_number && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>No. Sertifikat:</span>
                    <span className="font-mono text-slate-700">{site.certificate_number}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal('site', site)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  title="Edit Lahan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('lahan', site.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Hapus Lahan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Buildings */}
      {activeTab === 'buildings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((bld) => (
            <div key={bld.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    bld.condition === 'baik'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {bld.condition}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">{bld.name}</h3>
                <p className="text-xs text-indigo-600 font-medium mt-0.5">Lokasi: {bld.site_name}</p>
                <p className="text-xs text-slate-500 mt-1">Fungsi: {bld.building_function || '-'}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Jumlah Lantai:</span>
                  <span className="font-semibold text-slate-700">{bld.floor_count || 1} Lantai</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Luas Bangunan:</span>
                  <span className="font-semibold text-slate-700">{bld.building_area_m2 ? `${Number(bld.building_area_m2).toLocaleString()} m²` : '-'}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal('building', bld)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  title="Edit Bangunan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete('bangunan', bld.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Hapus Bangunan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Rooms */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Kode Ruangan</th>
                  <th className="px-4 py-3">Nama Ruangan</th>
                  <th className="px-4 py-3">Gedung / Lokasi</th>
                  <th className="px-4 py-3">Jenis Ruang</th>
                  <th className="px-4 py-3 text-center">Lantai</th>
                  <th className="px-4 py-3 text-center">Kapasitas</th>
                  <th className="px-4 py-3 text-center">Kondisi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{room.room_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{room.room_name}</td>
                    <td className="px-4 py-3 text-slate-600">{room.building_name} ({room.site_name})</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 capitalize">
                        {room.room_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">{room.floor_number ?? '-'}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">{room.capacity ? `${room.capacity} Org` : '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        room.condition === 'baik'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {room.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal('room', room)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('ruangan', room.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editItem ? 'Edit' : 'Tambah'} {modalType === 'site' ? 'Lahan' : modalType === 'building' ? 'Bangunan' : 'Ruangan'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Site Form */}
              {modalType === 'site' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lahan / Kampus *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Kampus Pusat Aldepos"
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Jl. Raya Aldepos No. 1"
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Luas Lahan (m²)</label>
                      <input
                        type="number"
                        value={formData.land_area_m2 || ''}
                        onChange={(e) => setFormData({ ...formData, land_area_m2: e.target.value })}
                        placeholder="5000"
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kepemilikan</label>
                      <select
                        value={formData.ownership_status || 'milik_sendiri'}
                        onChange={(e) => setFormData({ ...formData, ownership_status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      >
                        <option value="milik_sendiri">Milik Sendiri</option>
                        <option value="sewa">Sewa</option>
                        <option value="pinjam">Pinjam</option>
                        <option value="hibah">Hibah</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Sertifikat</label>
                    <input
                      type="text"
                      value={formData.certificate_number || ''}
                      onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                      placeholder="SHM-001/2020"
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              {/* Building Form */}
              {modalType === 'building' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Lahan / Lokasi *</label>
                    <select
                      required
                      value={formData.facility_site_id || ''}
                      onChange={(e) => setFormData({ ...formData, facility_site_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    >
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Gedung / Bangunan *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Gedung Al-Farabi (Kelas 7)"
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fungsi Bangunan</label>
                      <input
                        type="text"
                        value={formData.building_function || ''}
                        onChange={(e) => setFormData({ ...formData, building_function: e.target.value })}
                        placeholder="ruang kelas / laboratorium"
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Lantai</label>
                      <input
                        type="number"
                        value={formData.floor_count || ''}
                        onChange={(e) => setFormData({ ...formData, floor_count: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Room Form */}
              {modalType === 'room' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Gedung *</label>
                    <select
                      required
                      value={formData.facility_building_id || ''}
                      onChange={(e) => setFormData({ ...formData, facility_building_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    >
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.site_name})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Ruangan *</label>
                      <input
                        type="text"
                        required
                        value={formData.room_code || ''}
                        onChange={(e) => setFormData({ ...formData, room_code: e.target.value })}
                        placeholder="A101"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ruangan *</label>
                      <input
                        type="text"
                        required
                        value={formData.room_name || ''}
                        onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                        placeholder="Ruang Kelas 7A"
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ruangan</label>
                      <select
                        value={formData.room_type || 'ruang_kelas'}
                        onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      >
                        <option value="ruang_kelas">Ruang Kelas</option>
                        <option value="laboratorium">Laboratorium</option>
                        <option value="perpustakaan">Perpustakaan</option>
                        <option value="ruang_guru">Ruang Guru</option>
                        <option value="ruang_kepsek">Ruang Kepsek</option>
                        <option value="uks">UKS</option>
                        <option value="gudang">Gudang</option>
                        <option value="toilet">Toilet</option>
                        <option value="aula">Aula</option>
                        <option value="lapangan">Lapangan</option>
                        <option value="kantin">Kantin</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas (Orang)</label>
                      <input
                        type="number"
                        value={formData.capacity || ''}
                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                        placeholder="32"
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
