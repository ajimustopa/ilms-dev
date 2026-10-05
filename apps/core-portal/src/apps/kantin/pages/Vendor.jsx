import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Store,
  Plus,
  Edit2,
  Search,
  Loader2,
  AlertCircle,
  X,
  Phone,
  UserCheck,
  History,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Tag,
  FileText,
  Truck,
  Handshake,
  Percent,
  ShoppingBag
} from 'lucide-react';

export default function Vendor() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'konsinyasi' | 'beli_putus'

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Status Change Modal State
  const [statusModalVendor, setStatusModalVendor] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Status History Modal State
  const [historyModalVendor, setHistoryModalVendor] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_type: 'konsinyasi',
    contact: '',
    address: '',
    canteen_share_pct: '10.00'
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kantin/vendors');
      setVendors(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({
      vendor_name: '',
      vendor_type: 'konsinyasi',
      contact: '',
      address: '',
      canteen_share_pct: '10.00'
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    const vType = vendor.vendor_type || 'konsinyasi';
    setFormData({
      vendor_name: vendor.vendor_name || '',
      vendor_type: vType,
      contact: vendor.contact || '',
      address: vendor.address || vendor.note || '',
      canteen_share_pct: vType === 'beli_putus' ? '0' : String(vendor.canteen_share_pct ?? '10.00')
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      ...formData,
      canteen_share_pct: formData.vendor_type === 'beli_putus' ? 0 : formData.canteen_share_pct
    };

    try {
      if (editingVendor) {
        await api.put(`/kantin/vendors/${editingVendor.id}`, payload);
      } else {
        await api.post('/kantin/vendors', payload);
      }

      setShowModal(false);
      fetchVendors();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan vendor');
    } finally {
      setSubmitting(false);
    }
  };

  // Buka Modal Konfirmasi Ubah Status
  const handleOpenStatusModal = (vendor) => {
    setStatusModalVendor(vendor);
    setStatusReason('');
    setStatusError(null);
  };

  // Eksekusi Ubah Status dengan Alasan
  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModalVendor) return;

    if (!statusReason.trim()) {
      setStatusError('Alasan perubahan status wajib diisi');
      return;
    }

    const nextStatus = statusModalVendor.status === 'active' ? 'inactive' : 'active';
    setStatusSubmitting(true);
    setStatusError(null);

    try {
      await api.patch(`/kantin/vendors/${statusModalVendor.id}/status`, {
        status: nextStatus,
        reason: statusReason.trim()
      });
      setStatusModalVendor(null);
      fetchVendors();
    } catch (err) {
      setStatusError(err.response?.data?.message || err.message || 'Gagal mengubah status vendor');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Buka Modal Riwayat Status
  const handleOpenHistoryModal = async (vendor) => {
    setHistoryModalVendor(vendor);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/kantin/vendors/${vendor.id}/status-histories`);
      setHistoryList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching vendor status history:', err);
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      v.vendor_name?.toLowerCase().includes(q) ||
      v.contact?.toLowerCase().includes(q) ||
      v.address?.toLowerCase().includes(q) ||
      v.status_note?.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchType = typeFilter === 'all' || (v.vendor_type || 'konsinyasi') === typeFilter;

    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Mitra Vendor &amp; Pemasok Kantin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola mitra Konsinyasi (titip jual bagi hasil) dan Suplier Grosir / Beli Putus (pengadaan pasokan jual lepas).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Vendor / Suplier</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama vendor, kontak, alamat..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tipe Kerjasama */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Semua Tipe
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('konsinyasi')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'konsinyasi'
                  ? 'bg-white text-amber-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 text-amber-600" />
              <span>Konsinyasi</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('beli_putus')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'beli_putus'
                  ? 'bg-white text-blue-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Beli Putus</span>
            </button>
          </div>

          {/* Filter Status Aktif */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Semua ({vendors.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Non-Aktif
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium shrink-0">
          Menampilkan <span className="font-bold text-slate-700">{filtered.length}</span> dari {vendors.length} Vendor
        </div>
      </div>

      {/* Tabel Data Vendor */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data vendor...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Vendor / Mitra</th>
                  <th className="px-4 py-3">Jenis Kerjasama</th>
                  <th className="px-4 py-3">Bagi Hasil Kantin</th>
                  <th className="px-4 py-3">Kontak / Telepon</th>
                  <th className="px-4 py-3">Alamat / Catatan</th>
                  <th className="px-4 py-3">Status Operasional</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((ven) => {
                  const isKonsinyasi = (ven.vendor_type || 'konsinyasi') === 'konsinyasi';
                  return (
                    <tr key={ven.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isKonsinyasi 
                              ? 'bg-amber-100 text-amber-800 border-amber-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {isKonsinyasi ? <Handshake className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{ven.vendor_name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID #{ven.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isKonsinyasi ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                            <Handshake className="w-3.5 h-3.5 text-amber-600" />
                            <span>Konsinyasi (Titip Jual)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Beli Putus (Suplier Grosir)</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isKonsinyasi ? (
                          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold inline-flex items-center gap-1">
                            <Percent className="w-3 h-3 text-amber-600" />
                            <span>{ven.canteen_share_pct ? `${Number(ven.canteen_share_pct)}%` : '10%'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-mono text-[11px] font-medium">
                            0% (Jual Lepas)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ven.contact || '-'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 max-w-xs">
                        <p className="truncate">{ven.address || ven.note || '-'}</p>
                      </td>

                      {/* Kolom Status Interaktif dengan Catatan Terakhir */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(ven)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                              ven.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                            }`}
                            title={`Klik untuk ${ven.status === 'active' ? 'menonaktifkan' : 'mengaktifkan'} vendor`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${ven.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                            <span>{ven.status === 'active' ? 'Aktif' : 'Non-Aktif'}</span>
                          </button>

                          {ven.status_note && (
                            <span className="text-[10px] text-slate-500 italic max-w-[180px] truncate" title={ven.status_note}>
                              "{ven.status_note}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi: Riwayat & Edit */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenHistoryModal(ven)}
                            className="px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                            title="Lihat riwayat catatan status & jejak audit vendor"
                          >
                            <History className="w-3.5 h-3.5 text-amber-600" />
                            <span>Riwayat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ven)}
                            className="px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                            title="Edit informasi vendor"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      {vendors.length === 0 ? 'Belum ada data vendor terdaftar' : 'Tidak ada vendor yang cocok dengan filter pencarian'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: FORM TAMBAH / EDIT DATA VENDOR */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>{editingVendor ? 'Edit Data Vendor / Suplier' : 'Tambah Vendor / Suplier Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Jenis Kerjasama / Tipe Vendor */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Jenis Kerjasama / Skema Pengadaan <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, vendor_type: 'konsinyasi' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      formData.vendor_type === 'konsinyasi'
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Handshake className={`w-4 h-4 ${formData.vendor_type === 'konsinyasi' ? 'text-amber-700' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${formData.vendor_type === 'konsinyasi' ? 'text-amber-900' : 'text-slate-700'}`}>
                          Konsinyasi
                        </span>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        formData.vendor_type === 'konsinyasi' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {formData.vendor_type === 'konsinyasi' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Mitra titip barang, kantin menerima komisi bagi hasil (%) dari penjualan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, vendor_type: 'beli_putus', canteen_share_pct: '0' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      formData.vendor_type === 'beli_putus'
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck className={`w-4 h-4 ${formData.vendor_type === 'beli_putus' ? 'text-blue-700' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${formData.vendor_type === 'beli_putus' ? 'text-blue-900' : 'text-slate-700'}`}>
                          Beli Putus / Suplier
                        </span>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        formData.vendor_type === 'beli_putus' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {formData.vendor_type === 'beli_putus' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Pemasok grosir/jual lepas modal kantin. Tidak ada sistem bagi hasil.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Vendor / Suplier / Mitra <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder={
                    formData.vendor_type === 'konsinyasi'
                      ? 'Contoh: Dapur Bu Aminah, Gorengan Pak Haji...'
                      : 'Contoh: Distributor PT Indofood, Agen Telur Berkah, Toko Grosir Jaya...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kontak Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                {formData.vendor_type === 'konsinyasi' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bagi Hasil Kantin (%) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formData.canteen_share_pct}
                      onChange={(e) => setFormData({ ...formData, canteen_share_pct: e.target.value })}
                      placeholder="10.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-900 focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Persentase komisi per penjualan</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Bagi Hasil Kantin</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 font-semibold flex items-center justify-between">
                      <span>0% (Beli Putus)</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm">Jual Lepas</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Keuntungan dari selisih HPP &amp; Jual</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat / Catatan Kerjasama</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat gudang / mitra, keterangan jadwal pengiriman atau ketentuan retur..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: KONFIRMASI UBAH STATUS VENDOR BESERTA ALASAN */}
      {/* ========================================================= */}
      {statusModalVendor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  statusModalVendor.status === 'active' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Konfirmasi Ubah Status Vendor</h3>
                  <p className="text-[11px] text-slate-500">{statusModalVendor.vendor_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalVendor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            )}

            {/* Visualisasi Transisi Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Status Saat Ini:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  statusModalVendor.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {statusModalVendor.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
              <div className="flex items-center justify-center py-1 text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Status Baru:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  statusModalVendor.status === 'active'
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {statusModalVendor.status === 'active' ? 'Non-Aktif' : 'Aktif'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Alasan Perubahan Status <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    statusModalVendor.status === 'active'
                      ? 'Contoh: Mitra mengajukan cuti/libur produksi sementara, kontrak berakhir...'
                      : 'Contoh: Mitra kembali aktif memasok makanan titipan konsinyasi, kontrak diperpanjang...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Alasan ini akan tersimpan permanen di jejak audit riwayat status vendor.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalVendor(null)}
                  disabled={statusSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting || !statusReason.trim()}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    statusModalVendor.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {statusSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{statusModalVendor.status === 'active' ? 'Konfirmasi Non-Aktifkan' : 'Konfirmasi Aktifkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RIWAYAT STATUS & JEJAK AUDIT VENDOR */}
      {/* ========================================================= */}
      {historyModalVendor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Riwayat Status &amp; Jejak Audit Vendor</h3>
                  <p className="text-[11px] text-slate-500">
                    Mitra: <strong className="text-slate-800">{historyModalVendor.vendor_name}</strong> (ID #{historyModalVendor.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalVendor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                <p className="text-xs text-slate-400">Memuat riwayat status...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-10 text-center text-slate-400 italic text-xs space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p>Belum ada catatan riwayat perubahan status untuk vendor ini.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {historyList.map((hist, idx) => (
                  <div key={hist.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          hist.new_status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {hist.previous_status === 'active' ? 'Aktif' : 'Non-Aktif'} → {hist.new_status === 'active' ? 'Aktif' : 'Non-Aktif'}
                        </span>
                        <span className="text-slate-600 text-[11px] font-semibold">
                          Oleh: {hist.changed_by_name || 'Petugas'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(hist.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">
                        Alasan Perubahan:
                      </span>
                      <p className="text-slate-800 italic text-xs font-medium">"{hist.reason}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryModalVendor(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
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
