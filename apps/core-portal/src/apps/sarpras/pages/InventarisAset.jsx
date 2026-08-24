import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Boxes,
  Plus,
  Edit2,
  Trash2,
  QrCode,
  ArrowRightLeft,
  Search,
  Filter,
  Loader2,
  History,
  ScanBarcode,
  Printer,
  CheckCircle,
  Eye
} from 'lucide-react';

export default function InventarisAset() {
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  const [mutateModalOpen, setMutateModalOpen] = useState(false);
  const [mutateTargetAsset, setMutateTargetAsset] = useState(null);
  const [mutateData, setMutateData] = useState({ to_room_id: '', reason: '' });

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [mutationHistory, setMutationHistory] = useState([]);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedAsset, setScannedAsset] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedCondition) params.append('condition', selectedCondition);
      if (selectedRoom) params.append('room_id', selectedRoom);

      const res = await api.get(`/sarpras/assets?${params.toString()}`);
      if (res.data.success) {
        setAssets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/sarpras/rooms');
      if (res.data.success) setRooms(res.data.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [search, selectedCategory, selectedCondition, selectedRoom]);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({
      asset_code: `AST-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      name: '',
      category: 'furnitur',
      facility_room_id: rooms[0]?.id || '',
      acquisition_value: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      condition: 'baik',
      status: 'active'
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (asset) => {
    setEditItem(asset);
    setFormData({ ...asset });
    setCreateModalOpen(true);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editItem) {
        await api.put(`/sarpras/assets/${editItem.id}`, formData);
        setMessage({ type: 'success', text: 'Aset berhasil diperbarui' });
      } else {
        await api.post('/sarpras/assets', formData);
        setMessage({ type: 'success', text: 'Aset baru berhasil didaftarkan' });
      }
      setCreateModalOpen(false);
      fetchAssets();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openMutateModal = (asset) => {
    setMutateTargetAsset(asset);
    setMutateData({ to_room_id: rooms[0]?.id || '', reason: '' });
    setMutateModalOpen(true);
  };

  const handleMutateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/sarpras/assets/${mutateTargetAsset.id}/mutate`, mutateData);
      setMessage({ type: 'success', text: 'Mutasi lokasi aset berhasil disimpan' });
      setMutateModalOpen(false);
      fetchAssets();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryModal = async (asset) => {
    setMutateTargetAsset(asset);
    try {
      const res = await api.get(`/sarpras/assets/${asset.id}/mutations`);
      if (res.data.success) {
        setMutationHistory(res.data.data);
        setHistoryModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const openQrModal = async (asset) => {
    try {
      const res = await api.get(`/sarpras/assets/${asset.id}/qr-code`);
      if (res.data.success) {
        setQrData(res.data.data);
        setQrModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleScanLookup = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    try {
      const res = await api.post('/sarpras/assets/scan', { asset_code: scanInput.trim(), qr_code: scanInput.trim() });
      if (res.data.success) {
        setScannedAsset(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Aset tidak ditemukan');
      setScannedAsset(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventaris Aset & Fasilitas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan inventaris, lokasi penempatan, riwayat mutasi, dan pencetakan barcode/QR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setScanModalOpen(true); setScannedAsset(null); setScanInput(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Scan QR / Cari</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Baru</span>
          </button>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode aset atau nama barang..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="w-40">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">Semua Kategori</option>
            <option value="furnitur">Furnitur</option>
            <option value="elektronik">Elektronik</option>
            <option value="peralatan">Peralatan</option>
            <option value="kendaraan">Kendaraan</option>
          </select>
        </div>

        <div className="w-40">
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">Semua Kondisi</option>
            <option value="baik">Baik</option>
            <option value="rusak_ringan">Rusak Ringan</option>
            <option value="rusak_berat">Rusak Berat</option>
          </select>
        </div>

        <div className="w-48">
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">Semua Ruangan</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>)}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Kode Aset</th>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Ruangan Terkini</th>
                <th className="px-4 py-3 text-right">Nilai Perolehan</th>
                <th className="px-4 py-3 text-center">Kondisi</th>
                <th className="px-4 py-3 text-center">QR Code</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{asset.asset_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{asset.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 capitalize">
                        {asset.category || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {asset.room_name ? `${asset.room_name} (${asset.room_code})` : 'Belum Ditugaskan'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {asset.acquisition_value ? `Rp ${Number(asset.acquisition_value).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        asset.condition === 'baik'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : asset.condition === 'rusak_ringan'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openQrModal(asset)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                        title="Lihat QR Code"
                      >
                        <QrCode className="w-4 h-4 inline" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openMutateModal(asset)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Mutasi Lokasi"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openHistoryModal(asset)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                          title="Riwayat Mutasi"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(asset)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Edit Aset"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                    Tidak ada data aset inventaris yang sesuai
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Aset */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editItem ? 'Edit Aset Inventaris' : 'Daftarkan Aset Baru'}
            </h3>

            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Aset *</label>
                  <input
                    type="text"
                    required
                    value={formData.asset_code || ''}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category || 'furnitur'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="furnitur">Furnitur</option>
                    <option value="elektronik">Elektronik</option>
                    <option value="peralatan">Peralatan</option>
                    <option value="kendaraan">Kendaraan</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang / Aset *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Proyektor Epson EB-X500"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan Penempatan</label>
                <select
                  value={formData.facility_room_id || ''}
                  onChange={(e) => setFormData({ ...formData, facility_room_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  <option value="">-- Pilih Ruangan --</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Perolehan (Rp)</label>
                  <input
                    type="number"
                    value={formData.acquisition_value || ''}
                    onChange={(e) => setFormData({ ...formData, acquisition_value: e.target.value })}
                    placeholder="4500000"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Perolehan</label>
                  <input
                    type="date"
                    value={formData.acquisition_date || ''}
                    onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kondisi</label>
                <select
                  value={formData.condition || 'baik'}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
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
                  <span>Simpan Aset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mutasi Lokasi */}
      {mutateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-1">Mutasi Lokasi Penempatan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Aset: <strong className="text-slate-800">{mutateTargetAsset?.name} ({mutateTargetAsset?.asset_code})</strong>
            </p>

            <form onSubmit={handleMutateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan Tujuan Baru *</label>
                <select
                  required
                  value={mutateData.to_room_id || ''}
                  onChange={(e) => setMutateData({ ...mutateData, to_room_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Perpindahan / Mutasi</label>
                <textarea
                  rows={3}
                  value={mutateData.reason || ''}
                  onChange={(e) => setMutateData({ ...mutateData, reason: e.target.value })}
                  placeholder="Contoh: Dipindahkan ke Lab Komputer untuk praktikum"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMutateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Catat Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Mutasi */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-1">Riwayat Mutasi Lokasi</h3>
            <p className="text-xs text-slate-500 mb-4">
              Aset: <strong className="text-slate-800">{mutateTargetAsset?.name} ({mutateTargetAsset?.asset_code})</strong>
            </p>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {mutationHistory.length > 0 ? (
                mutationHistory.map((h, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{h.from_room_name || 'Gudang/Awal'} &rarr; {h.to_room_name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{new Date(h.mutated_at).toLocaleString()}</span>
                    </div>
                    {h.reason && <p className="text-slate-600 mt-1">{h.reason}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat mutasi untuk aset ini</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center">
            <h3 className="text-base font-bold text-slate-900">QR Code Label Aset</h3>
            <p className="text-xs text-slate-500 mt-1">{qrData?.name}</p>

            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block">
              {/* Fallback QR representation */}
              <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-2">
                <QrCode className="w-24 h-24 text-slate-800" />
                <span className="font-mono text-[10px] font-bold mt-1 text-indigo-600">{qrData?.qr_code}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Label</span>
              </button>
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scan / Cari Cepat */}
      {scanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Scan Barcode / Cari Aset</h3>
            <form onSubmit={handleScanLookup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Masukkan Kode QR / Barcode Aset</label>
                <input
                  type="text"
                  autoFocus
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Contoh: AST-0001 atau QR-AST-0001"
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold text-indigo-600 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
              >
                Cari Aset
              </button>
            </form>

            {scannedAsset && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs space-y-1.5">
                <p className="font-bold text-indigo-900 text-sm">{scannedAsset.name}</p>
                <p className="text-slate-600">Kode: <span className="font-mono font-bold">{scannedAsset.asset_code}</span></p>
                <p className="text-slate-600">Lokasi: <span className="font-semibold">{scannedAsset.room_name} ({scannedAsset.building_name})</span></p>
                <p className="text-slate-600">Kondisi: <span className="capitalize font-semibold">{scannedAsset.condition}</span></p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setScanModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold"
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
