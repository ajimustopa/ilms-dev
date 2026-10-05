import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  Boxes,
  Plus,
  Edit2,
  QrCode,
  ArrowRightLeft,
  History,
  ScanBarcode,
  Printer,
  Loader2
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
      if (res.data?.success) {
        setAssets(res.data.data || []);
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
      if (res.data?.success) setRooms(res.data.data || []);
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
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Data aset berhasil diperbarui' });
      } else {
        await api.post('/sarpras/assets', formData);
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Aset baru berhasil didaftarkan' });
      }
      setCreateModalOpen(false);
      fetchAssets();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
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
      setMessage({ type: 'emerald', title: 'Berhasil', text: 'Mutasi lokasi aset berhasil disimpan' });
      setMutateModalOpen(false);
      fetchAssets();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryModal = async (asset) => {
    setMutateTargetAsset(asset);
    try {
      const res = await api.get(`/sarpras/assets/${asset.id}/mutations`);
      if (res.data?.success) {
        setMutationHistory(res.data.data || []);
        setHistoryModalOpen(true);
      }
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  const openQrModal = async (asset) => {
    try {
      const res = await api.get(`/sarpras/assets/${asset.id}/qr-code`);
      if (res.data?.success) {
        setQrData(res.data.data);
        setQrModalOpen(true);
      }
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  const handleScanLookup = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    try {
      const res = await api.post('/sarpras/assets/scan', { asset_code: scanInput.trim(), qr_code: scanInput.trim() });
      if (res.data?.success) {
        setScannedAsset(res.data.data);
      }
    } catch (err) {
      setMessage({ type: 'rose', title: 'Tidak Ditemukan', text: err.response?.data?.message || 'Aset tidak ditemukan' });
      setScannedAsset(null);
    }
  };

  // Filter definitions for FilterBar
  const filterDefinitions = [
    {
      id: 'category',
      label: 'Kategori',
      type: 'select',
      value: selectedCategory,
      defaultValue: '',
      options: [
        { label: 'Semua Kategori', value: '' },
        { label: 'Furnitur', value: 'furnitur' },
        { label: 'Elektronik', value: 'elektronik' },
        { label: 'Peralatan', value: 'peralatan' },
        { label: 'Kendaraan', value: 'kendaraan' }
      ]
    },
    {
      id: 'condition',
      label: 'Kondisi',
      type: 'select',
      value: selectedCondition,
      defaultValue: '',
      options: [
        { label: 'Semua Kondisi', value: '' },
        { label: 'Baik', value: 'baik' },
        { label: 'Rusak Ringan', value: 'rusak_ringan' },
        { label: 'Rusak Berat', value: 'rusak_berat' }
      ]
    },
    {
      id: 'room',
      label: 'Ruangan',
      type: 'select',
      value: selectedRoom,
      defaultValue: '',
      options: [
        { label: 'Semua Ruangan', value: '' },
        ...rooms.map(r => ({ label: `${r.room_name} (${r.room_code})`, value: String(r.id) }))
      ]
    }
  ];

  const handleFilterChange = (filterId, val) => {
    if (filterId === 'category') setSelectedCategory(val);
    if (filterId === 'condition') setSelectedCondition(val);
    if (filterId === 'room') setSelectedRoom(val);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedCondition('');
    setSelectedRoom('');
    setSearch('');
  };

  // Table columns definition
  const columns = useMemo(() => [
    {
      key: 'asset_code',
      header: 'Kode Aset',
      sortable: true,
      className: 'w-36 font-mono font-bold text-slate-800',
      render: (row) => row.asset_code
    },
    {
      key: 'name',
      header: 'Nama Barang / Aset',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400 capitalize">{row.category || 'Aset Umum'}</div>
        </div>
      )
    },
    {
      key: 'room_name',
      header: 'Ruangan Terkini',
      sortable: true,
      render: (row) => (
        <span className="text-slate-600">
          {row.room_name ? `${row.room_name} (${row.room_code})` : 'Belum Ditugaskan'}
        </span>
      )
    },
    {
      key: 'acquisition_value',
      header: 'Nilai Perolehan',
      sortable: true,
      align: 'right',
      className: 'num-cell font-medium text-slate-700',
      render: (row) => row.acquisition_value ? formatCurrency(row.acquisition_value) : '-'
    },
    {
      key: 'condition',
      header: 'Kondisi',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.condition || 'baik'} />
    },
    {
      key: 'qr_code',
      header: 'QR Code',
      align: 'center',
      className: 'w-20 text-center',
      render: (row) => (
        <button
          type="button"
          onClick={() => openQrModal(row)}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          title="Lihat QR Code"
        >
          <QrCode className="w-4 h-4 inline" />
        </button>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sticky: 'right',
      className: 'w-28 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openMutateModal(row)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
            title="Mutasi Lokasi"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openHistoryModal(row)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="Riwayat Mutasi"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
            title="Edit Aset"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], [rooms]);

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
            type="button"
            onClick={() => { setScanModalOpen(true); setScannedAsset(null); setScanInput(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Scan QR / Cari</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Baru</span>
          </button>
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

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari kode aset atau nama barang..."
        filters={filterDefinitions}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Assets Table */}
      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        emptyTitle="Tidak Ada Aset Inventaris"
        emptyDescription="Belum ada data aset atau filter yang Anda pilih tidak menemukan hasil."
      />

      {/* Modal Tambah/Edit Aset */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editItem ? 'Edit Aset Inventaris' : 'Daftarkan Aset Baru'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-asset"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Aset</span>
            </button>
          </div>
        }
      >
        <form id="form-asset" onSubmit={handleSaveAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Aset *</label>
              <input
                type="text"
                required
                value={formData.asset_code || ''}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={formData.category || 'furnitur'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan Penempatan</label>
            <select
              value={formData.facility_room_id || ''}
              onChange={(e) => setFormData({ ...formData, facility_room_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Perolehan</label>
              <input
                type="date"
                value={formData.acquisition_date || ''}
                onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kondisi</label>
            <select
              value={formData.condition || 'baik'}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            >
              <option value="baik">Baik</option>
              <option value="rusak_ringan">Rusak Ringan</option>
              <option value="rusak_berat">Rusak Berat</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal Mutasi Lokasi */}
      <Modal
        isOpen={mutateModalOpen}
        onClose={() => setMutateModalOpen(false)}
        title="Mutasi Lokasi Penempatan"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setMutateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-mutate"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              Catat Mutasi
            </button>
          </div>
        }
      >
        <div className="mb-4 text-xs text-slate-500">
          Aset: <strong className="text-slate-800">{mutateTargetAsset?.name} ({mutateTargetAsset?.asset_code})</strong>
        </div>
        <form id="form-mutate" onSubmit={handleMutateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan Tujuan Baru *</label>
            <select
              required
              value={mutateData.to_room_id || ''}
              onChange={(e) => setMutateData({ ...mutateData, to_room_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Riwayat Mutasi */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Riwayat Mutasi Lokasi"
        size="md"
        footer={
          <button
            type="button"
            onClick={() => setHistoryModalOpen(false)}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Tutup
          </button>
        }
      >
        <div className="mb-4 text-xs text-slate-500">
          Aset: <strong className="text-slate-800">{mutateTargetAsset?.name} ({mutateTargetAsset?.asset_code})</strong>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-3">
          {mutationHistory.length > 0 ? (
            mutationHistory.map((h, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>{h.from_room_name || 'Gudang/Awal'} &rarr; {h.to_room_name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{new Date(h.mutated_at).toLocaleString('id-ID')}</span>
                </div>
                {h.reason && <p className="text-slate-600 mt-1">{h.reason}</p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat mutasi untuk aset ini</p>
          )}
        </div>
      </Modal>

      {/* Modal QR Code */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="QR Code Label Aset"
        size="sm"
        footer={
          <div className="flex items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        }
      >
        <div className="text-center">
          <p className="text-xs text-slate-500">{qrData?.name}</p>
          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block">
            <div className="w-40 h-40 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2">
              <QrCode className="w-24 h-24 text-slate-800" />
              <span className="font-mono text-[10px] font-bold mt-1 text-slate-700">{qrData?.qr_code}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Scan / Cari Cepat */}
      <Modal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Scan Barcode / Cari Aset"
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => setScanModalOpen(false)}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-semibold"
          >
            Tutup
          </button>
        }
      >
        <form onSubmit={handleScanLookup} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Masukkan Kode QR / Barcode Aset</label>
            <input
              type="text"
              autoFocus
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Contoh: AST-0001 atau QR-AST-0001"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            Cari Aset
          </button>
        </form>

        {scannedAsset && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <p className="font-bold text-slate-900 text-sm">{scannedAsset.name}</p>
            <p className="text-slate-600">Kode: <span className="font-mono font-bold text-slate-800">{scannedAsset.asset_code}</span></p>
            <p className="text-slate-600">Lokasi: <span className="font-semibold text-slate-800">{scannedAsset.room_name} ({scannedAsset.building_name})</span></p>
            <p className="text-slate-600">Kondisi: <span className="capitalize font-semibold">{scannedAsset.condition}</span></p>
          </div>
        )}
      </Modal>
    </div>
  );
}
