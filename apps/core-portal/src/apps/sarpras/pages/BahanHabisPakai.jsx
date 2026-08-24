import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Archive,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Search,
  Loader2,
  Check,
  History,
  Lock
} from 'lucide-react';

export default function BahanHabisPakai() {
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'opname', 'mutations'
  const [items, setItems] = useState([]);
  const [opnames, setOpnames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemFormData, setItemFormData] = useState({});

  const [mutationModalOpen, setMutationModalOpen] = useState(false);
  const [mutationType, setMutationType] = useState('in'); // 'in', 'out'
  const [targetItem, setTargetItem] = useState(null);
  const [mutationFormData, setMutationFormData] = useState({ quantity: 1, notes: '' });

  // Opname Detail Modal
  const [opnameModalOpen, setOpnameModalOpen] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState(null);
  const [opnamePhysicalInputs, setOpnamePhysicalInputs] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, opnameRes] = await Promise.all([
        api.get('/sarpras/consumables'),
        api.get('/sarpras/stock-opnames')
      ]);
      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (opnameRes.data.success) setOpnames(opnameRes.data.data);
    } catch (err) {
      console.error('Error fetching consumables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Item Handlers
  const openCreateItemModal = () => {
    setItemFormData({
      item_code: `BHP-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      name: '',
      unit: 'pcs',
      category: 'ATK',
      minimum_stock: 5,
      current_stock: 0
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sarpras/consumables', itemFormData);
      setMessage({ type: 'success', text: 'Item bahan habis pakai berhasil ditambahkan' });
      setItemModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Stock In / Out Handlers
  const openMutationModal = (item, type) => {
    setTargetItem(item);
    setMutationType(type);
    setMutationFormData({ quantity: 1, notes: '' });
    setMutationModalOpen(true);
  };

  const handleMutationSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = mutationType === 'in'
        ? `/sarpras/consumables/${targetItem.id}/stock-in`
        : `/sarpras/consumables/${targetItem.id}/stock-out`;

      await api.post(endpoint, mutationFormData);
      setMessage({
        type: 'success',
        text: `Stok ${mutationType === 'in' ? 'masuk' : 'keluar'} berhasil dicatat`
      });
      setMutationModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Opname Handlers
  const handleStartOpname = async () => {
    if (!window.confirm('Mulai sesi stock opname baru untuk hari ini?')) return;
    try {
      const res = await api.post('/sarpras/stock-opnames', {
        opname_date: new Date().toISOString().split('T')[0],
        notes: 'Sesi Stock Opname Sarpras'
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Sesi stock opname berhasil dimulai' });
        fetchData();
        openOpnameDetail(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const openOpnameDetail = async (opname) => {
    try {
      const res = await api.get(`/sarpras/stock-opnames/${opname.id}`);
      if (res.data.success) {
        const data = res.data.data;
        setSelectedOpname(data);
        const inputs = {};
        data.items?.forEach(i => {
          inputs[i.consumable_item_id] = i.physical_stock;
        });
        setOpnamePhysicalInputs(inputs);
        setOpnameModalOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveOpnameCounts = async () => {
    setSubmitting(true);
    try {
      const itemsPayload = Object.entries(opnamePhysicalInputs).map(([itemId, phys]) => ({
        consumable_item_id: Number(itemId),
        physical_stock: Number(phys)
      }));

      await api.put(`/sarpras/stock-opnames/${selectedOpname.id}/items`, {
        items: itemsPayload
      });
      setMessage({ type: 'success', text: 'Data hitungan fisik berhasil disimpan' });
      openOpnameDetail(selectedOpname);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeOpname = async () => {
    if (!window.confirm('Finalisasi sesi stock opname ini? Selisih stok akan otomatis disesuaikan ke master item.')) return;
    setSubmitting(true);
    try {
      await api.post(`/sarpras/stock-opnames/${selectedOpname.id}/finalize`);
      setMessage({ type: 'success', text: 'Stock opname berhasil difinalisasi dan stok barang telah diperbarui' });
      setOpnameModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bahan Habis Pakai & Stock Opname</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen logistik ATK, perlengkapan kebersihan, mutasi masuk/keluar, dan rekonsiliasi opname
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'items' && (
            <button
              onClick={openCreateItemModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item BHP</span>
            </button>
          )}
          {activeTab === 'opname' && (
            <button
              onClick={handleStartOpname}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Mulai Sesi Opname Baru</span>
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
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Master Persediaan Barang ({items.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('opname')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'opname'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Sesi Stock Opname ({opnames.length})</span>
        </button>
      </div>

      {/* Tab 1: Master Items Table */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Kode Barang</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-center">Stok Minimal</th>
                  <th className="px-4 py-3 text-center">Stok Saat Ini</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Mutasi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((item) => {
                    const isLow = Number(item.current_stock) <= Number(item.minimum_stock);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{item.item_code}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                            {item.category || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 font-medium">
                          {item.minimum_stock} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.current_stock} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Menipis</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Aman</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openMutationModal(item, 'in')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Catat Stok Masuk"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Masuk</span>
                            </button>
                            <button
                              onClick={() => openMutationModal(item, 'out')}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Catat Stok Keluar"
                            >
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Keluar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                      Belum ada master bahan habis pakai
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Opnames List */}
      {activeTab === 'opname' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID Sesi</th>
                  <th className="px-4 py-3">Tanggal Opname</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opnames.length > 0 ? (
                  opnames.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">OPN-#{op.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{op.opname_date}</td>
                      <td className="px-4 py-3 text-slate-600">{op.notes || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          op.status === 'final'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {op.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openOpnameDetail(op)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition"
                        >
                          {op.status === 'draft' ? 'Input Fisik' : 'Lihat Rekap'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                      Belum ada sesi stock opname
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Item BHP */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tambah Master Bahan Habis Pakai</h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Barang *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.item_code || ''}
                    onChange={(e) => setItemFormData({ ...itemFormData, item_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={itemFormData.category || ''}
                    onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                    placeholder="ATK / Kebersihan"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.name || ''}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder="Contoh: Kertas A4 70gr"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.unit || 'pcs'}
                    onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                    placeholder="rim / botol"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Minimal</label>
                  <input
                    type="number"
                    value={itemFormData.minimum_stock || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, minimum_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={itemFormData.current_stock || 0}
                    onChange={(e) => setItemFormData({ ...itemFormData, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mutasi Masuk / Keluar */}
      {mutationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Catat Stok {mutationType === 'in' ? 'Masuk (Pasokan)' : 'Keluar (Pemakaian)'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Barang: <strong>{targetItem?.name}</strong> (Stok saat ini: {targetItem?.current_stock} {targetItem?.unit})
            </p>

            <form onSubmit={handleMutationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah ({targetItem?.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={mutationFormData.quantity || 1}
                  onChange={(e) => setMutationFormData({ ...mutationFormData, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Tujuan</label>
                <textarea
                  rows={2}
                  value={mutationFormData.notes || ''}
                  onChange={(e) => setMutationFormData({ ...mutationFormData, notes: e.target.value })}
                  placeholder={mutationType === 'in' ? 'Pembelian / pengadaan baru' : 'Pemakaian kegiatan ujian'}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMutationModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-semibold ${
                    mutationType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Input Stock Opname */}
      {opnameModalOpen && selectedOpname && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Stock Opname #{selectedOpname.id} &bull; {selectedOpname.opname_date}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Status: <span className="font-semibold uppercase">{selectedOpname.status}</span>
                  </p>
                </div>
                {selectedOpname.status === 'draft' && (
                  <button
                    onClick={handleFinalizeOpname}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finalisasi Sesi</span>
                  </button>
                )}
              </div>

              {/* Items List for Opname */}
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Barang</th>
                      <th className="px-3 py-2 text-center">Stok Sistem</th>
                      <th className="px-3 py-2 text-center">Hitung Fisik</th>
                      <th className="px-3 py-2 text-center">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOpname.items?.map((item) => {
                      const phys = opnamePhysicalInputs[item.consumable_item_id] ?? item.physical_stock;
                      const diff = Number(phys) - Number(item.system_stock);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {item.item_name}
                            <span className="text-[10px] text-slate-400 block font-mono">{item.item_code}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-600">
                            {item.system_stock} {item.item_unit}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {selectedOpname.status === 'draft' ? (
                              <input
                                type="number"
                                min="0"
                                value={opnamePhysicalInputs[item.consumable_item_id] ?? item.physical_stock}
                                onChange={(e) => setOpnamePhysicalInputs({
                                  ...opnamePhysicalInputs,
                                  [item.consumable_item_id]: e.target.value
                                })}
                                className="w-20 px-2 py-1 text-center font-bold border rounded-lg text-xs"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">{item.physical_stock}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            <span className={diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setOpnameModalOpen(false)}
                className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Tutup
              </button>
              {selectedOpname.status === 'draft' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveOpnameCounts}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Simpan Draft Hitungan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
