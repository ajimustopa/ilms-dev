import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import DataTable from '../../../shared/components/DataTable';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatNumber } from '../../../shared/utils/formatters';
import {
  Building2,
  MapPin,
  DoorOpen,
  Plus,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';

export default function LokasiFisik() {
  const [activeTab, setActiveTab] = useState('sites'); // 'sites', 'buildings', 'rooms'
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

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
      if (sitesRes.data?.success) setSites(sitesRes.data.data || []);
      if (bldRes.data?.success) setBuildings(bldRes.data.data || []);
      if (rmsRes.data?.success) setRooms(rmsRes.data.data || []);
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
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Data lahan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/sites', formData);
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Lahan baru berhasil ditambahkan' });
        }
      } else if (modalType === 'building') {
        if (editItem) {
          await api.put(`/sarpras/buildings/${editItem.id}`, formData);
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Data bangunan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/buildings', formData);
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Bangunan baru berhasil ditambahkan' });
        }
      } else if (modalType === 'room') {
        if (editItem) {
          await api.put(`/sarpras/rooms/${editItem.id}`, formData);
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Data ruangan berhasil diperbarui' });
        } else {
          await api.post('/sarpras/rooms', formData);
          setMessage({ type: 'emerald', title: 'Berhasil', text: 'Ruangan baru berhasil ditambahkan' });
        }
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Yakin ingin menghapus ${type} ini?`)) return;
    try {
      const endpoint = type === 'lahan' ? `/sarpras/sites/${id}` : type === 'bangunan' ? `/sarpras/buildings/${id}` : `/sarpras/rooms/${id}`;
      await api.delete(endpoint);
      setMessage({ type: 'emerald', title: 'Dihapus', text: `${type} berhasil dihapus` });
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  // Rooms table columns
  const roomColumns = useMemo(() => [
    {
      key: 'room_code',
      header: 'Kode Ruangan',
      sortable: true,
      className: 'w-32 font-mono font-bold text-slate-800',
      render: (row) => row.room_code
    },
    {
      key: 'room_name',
      header: 'Nama Ruangan',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.room_name}</div>
          <div className="text-[11px] text-slate-400 capitalize">{row.room_type?.replace('_', ' ') || 'Ruangan'}</div>
        </div>
      )
    },
    {
      key: 'building_name',
      header: 'Gedung / Lokasi',
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.building_name} ({row.site_name})</span>
    },
    {
      key: 'floor_number',
      header: 'Lantai',
      sortable: true,
      align: 'center',
      className: 'w-20 text-center',
      render: (row) => row.floor_number ?? '-'
    },
    {
      key: 'capacity',
      header: 'Kapasitas',
      sortable: true,
      align: 'right',
      className: 'num-cell text-slate-700 font-medium',
      render: (row) => row.capacity ? `${formatNumber(row.capacity)} Org` : '-'
    },
    {
      key: 'condition',
      header: 'Kondisi',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.condition || 'baik'} />
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sticky: 'right',
      className: 'w-24 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEditModal('room', row)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
            title="Edit Ruangan"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete('ruangan', row.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            title="Hapus Ruangan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], []);

  // Buildings table columns
  const buildingColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Nama Gedung / Bangunan',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">Lokasi: {row.site_name}</div>
        </div>
      )
    },
    {
      key: 'building_function',
      header: 'Fungsi Bangunan',
      render: (row) => <span className="text-slate-600 capitalize">{row.building_function || '-'}</span>
    },
    {
      key: 'floor_count',
      header: 'Lantai',
      sortable: true,
      align: 'center',
      className: 'w-24 text-center',
      render: (row) => `${row.floor_count || 1} Lantai`
    },
    {
      key: 'building_area_m2',
      header: 'Luas Bangunan',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-slate-700',
      render: (row) => row.building_area_m2 ? `${formatNumber(row.building_area_m2)} m²` : '-'
    },
    {
      key: 'condition',
      header: 'Kondisi',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.condition || 'baik'} />
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sticky: 'right',
      className: 'w-24 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEditModal('building', row)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
            title="Edit Bangunan"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete('bangunan', row.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            title="Hapus Bangunan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lokasi & Fasilitas Fisik</h1>
          <p className="text-xs text-slate-500 mt-1">
            Struktur hierarki lokasi: Lahan / Kampus &rarr; Bangunan &rarr; Ruangan & Fasilitas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sites' && (
            <button
              type="button"
              onClick={() => openCreateModal('site')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lahan</span>
            </button>
          )}
          {activeTab === 'buildings' && (
            <button
              type="button"
              onClick={() => openCreateModal('building')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bangunan</span>
            </button>
          )}
          {activeTab === 'rooms' && (
            <button
              type="button"
              onClick={() => openCreateModal('room')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ruangan</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <FlatAlertBanner
          variant={message.type}
          title={message.title}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </FlatAlertBanner>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('sites')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'sites'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Lahan / Kampus ({sites.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('buildings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'buildings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bangunan / Gedung ({buildings.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'border-emerald-600 text-emerald-600'
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
            <div key={site.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <StatusPill status={site.ownership_status || 'milik_sendiri'} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">{site.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{site.address || 'Alamat belum diisi'}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Luas Lahan:</span>
                  <span className="font-semibold text-slate-700 num-cell">{site.land_area_m2 ? `${formatNumber(site.land_area_m2)} m²` : '-'}</span>
                </div>
                {site.certificate_number && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>No. Sertifikat:</span>
                    <span className="font-mono text-slate-700">{site.certificate_number}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal('site', site)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
                  title="Edit Lahan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete('lahan', site.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Hapus Lahan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Buildings */}
      {activeTab === 'buildings' && (
        <DataTable
          columns={buildingColumns}
          data={buildings}
          loading={loading}
          emptyTitle="Belum Ada Gedung"
          emptyDescription="Klik 'Tambah Bangunan' untuk mendaftarkan gedung/bangunan sekolah."
        />
      )}

      {/* Tab 3: Rooms */}
      {activeTab === 'rooms' && (
        <DataTable
          columns={roomColumns}
          data={rooms}
          loading={loading}
          emptyTitle="Belum Ada Ruangan"
          emptyDescription="Klik 'Tambah Ruangan' untuk mendaftarkan ruang kelas, lab, atau fasilitas."
        />
      )}

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editItem ? 'Edit' : 'Tambah'} ${modalType === 'site' ? 'Lahan' : modalType === 'building' ? 'Bangunan' : 'Ruangan'}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-lokasi"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Data</span>
            </button>
          </div>
        }
      >
        <form id="form-lokasi" onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Raya Aldepos No. 1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kepemilikan</label>
                  <select
                    value={formData.ownership_status || 'milik_sendiri'}
                    onChange={(e) => setFormData({ ...formData, ownership_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Lantai</label>
                  <input
                    type="number"
                    value={formData.floor_count || ''}
                    onChange={(e) => setFormData({ ...formData, floor_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ruangan</label>
                  <select
                    value={formData.room_type || 'ruang_kelas'}
                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
