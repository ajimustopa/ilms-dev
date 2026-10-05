import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import DataTable from '../../../shared/components/DataTable';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatNumber } from '../../../shared/utils/formatters';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Store,
  PackageCheck,
  Check,
  Loader2
} from 'lucide-react';

export default function Pengadaan() {
  const [activeTab, setActiveTab] = useState('procurements'); // 'procurements', 'vendors'
  const [procurements, setProcurements] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [procModalOpen, setProcModalOpen] = useState(false);
  const [procFormData, setProcFormData] = useState({});

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorEditItem, setVendorEditItem] = useState(null);
  const [vendorFormData, setVendorFormData] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [procRes, vndRes] = await Promise.all([
        api.get('/sarpras/procurements'),
        api.get('/sarpras/vendors')
      ]);
      if (procRes.data?.success) setProcurements(procRes.data.data || []);
      if (vndRes.data?.success) setVendors(vndRes.data.data || []);
    } catch (err) {
      console.error('Error fetching procurement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Procurement Handlers
  const openCreateProcModal = () => {
    setProcFormData({
      vendor_id: vendors[0]?.id || '',
      item_name: '',
      quantity: 1,
      unit: 'unit'
    });
    setProcModalOpen(true);
  };

  const handleCreateProcurement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sarpras/procurements', procFormData);
      setMessage({ type: 'emerald', title: 'Berhasil', text: 'Pengajuan pengadaan barang berhasil dikirim' });
      setProcModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProc = async (id) => {
    if (!window.confirm('Setujui pengadaan barang ini?')) return;
    try {
      await api.put(`/sarpras/procurements/${id}/approve`);
      setMessage({ type: 'emerald', title: 'Disetujui', text: 'Pengadaan barang berhasil disetujui' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  const handleReceiveProc = async (id) => {
    if (!window.confirm('Tandai barang telah diterima fisik?')) return;
    try {
      await api.put(`/sarpras/procurements/${id}/receive`);
      setMessage({ type: 'emerald', title: 'Diterima', text: 'Barang pengadaan berhasil ditandai diterima fisik' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  // Vendor Handlers
  const openCreateVendorModal = () => {
    setVendorEditItem(null);
    setVendorFormData({ name: '', contact: '', category: 'furnitur & ATK' });
    setVendorModalOpen(true);
  };

  const openEditVendorModal = (vnd) => {
    setVendorEditItem(vnd);
    setVendorFormData({ ...vnd });
    setVendorModalOpen(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (vendorEditItem) {
        await api.put(`/sarpras/vendors/${vendorEditItem.id}`, vendorFormData);
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Data vendor berhasil diperbarui' });
      } else {
        await api.post('/sarpras/vendors', vendorFormData);
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Vendor baru berhasil ditambahkan' });
      }
      setVendorModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Yakin ingin menghapus vendor ini?')) return;
    try {
      await api.delete(`/sarpras/vendors/${id}`);
      setMessage({ type: 'emerald', title: 'Dihapus', text: 'Vendor berhasil dihapus' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  // Procurement table columns
  const procurementColumns = useMemo(() => [
    {
      key: 'item_name',
      header: 'Nama Barang',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.item_name}</span>
    },
    {
      key: 'vendor_name',
      header: 'Vendor Rekomendasi',
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.vendor_name || '-'}</span>
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      sortable: true,
      align: 'right',
      className: 'num-cell font-bold text-slate-700',
      render: (row) => `${formatNumber(row.quantity)} ${row.unit || 'unit'}`
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.status || 'diajukan'} />
    },
    {
      key: 'finance_ref',
      header: 'Ref. Keuangan',
      align: 'center',
      className: 'w-32 text-center font-mono text-xs text-slate-500',
      render: (row) => row.finance_reference_id ? `TX-#${row.finance_reference_id}` : '-'
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sticky: 'right',
      className: 'w-36 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'diajukan' && (
            <button
              type="button"
              onClick={() => handleApproveProc(row.id)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Setujui
            </button>
          )}
          {row.status === 'disetujui' && (
            <button
              type="button"
              onClick={() => handleReceiveProc(row.id)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Terima</span>
            </button>
          )}
        </div>
      )
    }
  ], []);

  // Vendor table columns
  const vendorColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Nama Vendor / Perusahaan',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.name}</span>
    },
    {
      key: 'category',
      header: 'Kategori Pasokan',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700 capitalize text-xs">
          {row.category || 'Umum'}
        </span>
      )
    },
    {
      key: 'contact',
      header: 'Kontak / Telepon',
      render: (row) => <span className="text-slate-600 font-mono text-xs">{row.contact || '-'}</span>
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
            onClick={() => openEditVendorModal(row)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
            title="Edit Vendor"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteVendor(row.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            title="Hapus Vendor"
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pengadaan Barang & Mitra Vendor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengajuan kebutuhan pengadaan sarpras, status persetujuan, penerimaan fisik, dan master supplier
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'procurements' ? (
            <button
              type="button"
              onClick={openCreateProcModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Pengadaan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateVendorModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Vendor</span>
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
          onClick={() => setActiveTab('procurements')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'procurements'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Pengadaan Barang ({procurements.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vendors'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Master Vendor ({vendors.length})</span>
        </button>
      </div>

      {/* Tab 1: Procurements Table */}
      {activeTab === 'procurements' && (
        <DataTable
          columns={procurementColumns}
          data={procurements}
          loading={loading}
          emptyTitle="Belum Ada Pengadaan"
          emptyDescription="Klik 'Ajukan Pengadaan' untuk mengajukan pengadaan barang inventaris atau logistik."
        />
      )}

      {/* Tab 2: Vendors Table */}
      {activeTab === 'vendors' && (
        <DataTable
          columns={vendorColumns}
          data={vendors}
          loading={loading}
          emptyTitle="Belum Ada Data Vendor"
          emptyDescription="Klik 'Tambah Vendor' untuk mencatat data supplier atau rekanan sarpras."
        />
      )}

      {/* Modal Ajukan Pengadaan */}
      <Modal
        isOpen={procModalOpen}
        onClose={() => setProcModalOpen(false)}
        title="Ajukan Pengadaan Barang"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setProcModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-proc"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Ajukan</span>
            </button>
          </div>
        }
      >
        <form id="form-proc" onSubmit={handleCreateProcurement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang *</label>
            <input
              type="text"
              required
              value={procFormData.item_name || ''}
              onChange={(e) => setProcFormData({ ...procFormData, item_name: e.target.value })}
              placeholder="Contoh: AC Split 1.5 PK Daikin"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah *</label>
              <input
                type="number"
                required
                min="1"
                value={procFormData.quantity || 1}
                onChange={(e) => setProcFormData({ ...procFormData, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                value={procFormData.unit || 'unit'}
                onChange={(e) => setProcFormData({ ...procFormData, unit: e.target.value })}
                placeholder="unit / set / pcs"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mitra Vendor (Opsional)</label>
            <select
              value={procFormData.vendor_id || ''}
              onChange={(e) => setProcFormData({ ...procFormData, vendor_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">-- Pilih Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah/Edit Vendor */}
      <Modal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        title={vendorEditItem ? 'Edit Data Vendor' : 'Tambah Vendor Supplier'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setVendorModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-vendor"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Vendor</span>
            </button>
          </div>
        }
      >
        <form id="form-vendor" onSubmit={handleSaveVendor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Vendor / Perusahaan *</label>
            <input
              type="text"
              required
              value={vendorFormData.name || ''}
              onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
              placeholder="CV Sumber Sarana"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kontak / Telepon / Email</label>
            <input
              type="text"
              value={vendorFormData.contact || ''}
              onChange={(e) => setVendorFormData({ ...vendorFormData, contact: e.target.value })}
              placeholder="021-9998888 / sales@vendor.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Pasokan</label>
            <input
              type="text"
              value={vendorFormData.category || ''}
              onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
              placeholder="furnitur & ATK / Elektronik"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
