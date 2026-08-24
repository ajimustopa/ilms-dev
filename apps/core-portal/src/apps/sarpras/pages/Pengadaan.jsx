import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Store,
  CheckCircle,
  PackageCheck,
  Search,
  Loader2,
  FileText
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
      if (procRes.data.success) setProcurements(procRes.data.data);
      if (vndRes.data.success) setVendors(vndRes.data.data);
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
      setMessage({ type: 'success', text: 'Pengajuan pengadaan barang berhasil dikirim' });
      setProcModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProc = async (id) => {
    if (!window.confirm('Setujui pengadaan barang ini?')) return;
    try {
      await api.put(`/sarpras/procurements/${id}/approve`);
      setMessage({ type: 'success', text: 'Pengadaan barang berhasil disetujui' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleReceiveProc = async (id) => {
    if (!window.confirm('Tandai barang telah diterima fisik?')) return;
    try {
      await api.put(`/sarpras/procurements/${id}/receive`);
      setMessage({ type: 'success', text: 'Barang pengadaan berhasil ditandai diterima' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
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
        setMessage({ type: 'success', text: 'Data vendor berhasil diperbarui' });
      } else {
        await api.post('/sarpras/vendors', vendorFormData);
        setMessage({ type: 'success', text: 'Vendor baru berhasil ditambahkan' });
      }
      setVendorModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Yakin ingin menghapus vendor ini?')) return;
    try {
      await api.delete(`/sarpras/vendors/${id}`);
      setMessage({ type: 'success', text: 'Vendor berhasil dihapus' });
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
          <h1 className="text-xl font-bold text-slate-900">Pengadaan Barang & Mitra Vendor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengajuan kebutuhan pengadaan sarpras, status persetujuan, penerimaan fisik, dan master supplier
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'procurements' ? (
            <button
              onClick={openCreateProcModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Pengadaan</span>
            </button>
          ) : (
            <button
              onClick={openCreateVendorModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Vendor</span>
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
          onClick={() => setActiveTab('procurements')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'procurements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Pengadaan Barang ({procurements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vendors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Master Vendor ({vendors.length})</span>
        </button>
      </div>

      {/* Tab 1: Procurements Table */}
      {activeTab === 'procurements' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Vendor Rekomendasi</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ref. Keuangan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procurements.length > 0 ? (
                  procurements.map((proc) => (
                    <tr key={proc.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">{proc.item_name}</td>
                      <td className="px-4 py-3 text-slate-600">{proc.vendor_name || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{proc.quantity} {proc.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          proc.status === 'diterima'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : proc.status === 'disetujui'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : proc.status === 'diajukan'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {proc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">
                        {proc.finance_reference_id ? `TX-#${proc.finance_reference_id}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {proc.status === 'diajukan' && (
                            <button
                              onClick={() => handleApproveProc(proc.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition"
                            >
                              Setujui
                            </button>
                          )}
                          {proc.status === 'disetujui' && (
                            <button
                              onClick={() => handleReceiveProc(proc.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Terima Barang</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                      Tidak ada data pengadaan barang
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Vendors Table */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                    {v.category || 'Umum'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">{v.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Kontak: {v.contact || '-'}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditVendorModal(v)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  title="Edit Vendor"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteVendor(v.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Hapus Vendor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ajukan Pengadaan */}
      {procModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Ajukan Pengadaan Barang</h3>

            <form onSubmit={handleCreateProcurement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang *</label>
                <input
                  type="text"
                  required
                  value={procFormData.item_name || ''}
                  onChange={(e) => setProcFormData({ ...procFormData, item_name: e.target.value })}
                  placeholder="Contoh: AC Split 1.5 PK Daikin"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
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
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={procFormData.unit || 'unit'}
                    onChange={(e) => setProcFormData({ ...procFormData, unit: e.target.value })}
                    placeholder="unit / set / pcs"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mitra Vendor (Opsional)</label>
                <select
                  value={procFormData.vendor_id || ''}
                  onChange={(e) => setProcFormData({ ...procFormData, vendor_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  <option value="">-- Pilih Vendor --</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProcModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Ajukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Vendor */}
      {vendorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {vendorEditItem ? 'Edit Data Vendor' : 'Tambah Vendor Supplier'}
            </h3>

            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Vendor / Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={vendorFormData.name || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                  placeholder="CV Sumber Sarana"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kontak / Telepon / Email</label>
                <input
                  type="text"
                  value={vendorFormData.contact || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contact: e.target.value })}
                  placeholder="021-9998888 / sales@vendor.com"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Barang</label>
                <input
                  type="text"
                  value={vendorFormData.category || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
                  placeholder="furnitur & ATK / Elektronik"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVendorModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
