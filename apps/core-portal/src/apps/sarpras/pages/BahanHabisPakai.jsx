import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  Archive,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  Check,
  Loader2
} from 'lucide-react';

export default function BahanHabisPakai() {
  const [activeTab, setActiveTab] = useState('items'); // 'items', 'opname'
  const [items, setItems] = useState([]);
  const [opnames, setOpnames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

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
      if (itemsRes.data?.success) setItems(itemsRes.data.data || []);
      if (opnameRes.data?.success) setOpnames(opnameRes.data.data || []);
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
      setMessage({ type: 'emerald', title: 'Berhasil', text: 'Item bahan habis pakai berhasil didaftarkan' });
      setItemModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
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
        type: 'emerald',
        title: 'Berhasil',
        text: `Stok ${mutationType === 'in' ? 'masuk' : 'keluar'} berhasil dicatat`
      });
      setMutationModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
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
      if (res.data?.success) {
        setMessage({ type: 'emerald', title: 'Berhasil', text: 'Sesi stock opname berhasil dimulai' });
        fetchData();
        openOpnameDetail(res.data.data);
      }
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  const openOpnameDetail = async (opname) => {
    try {
      const res = await api.get(`/sarpras/stock-opnames/${opname.id}`);
      if (res.data?.success) {
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
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
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
      setMessage({ type: 'emerald', title: 'Tersimpan', text: 'Data hitungan fisik berhasil disimpan' });
      openOpnameDetail(selectedOpname);
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeOpname = async () => {
    if (!window.confirm('Finalisasi sesi stock opname ini? Selisih stok akan otomatis disesuaikan ke master item.')) return;
    setSubmitting(true);
    try {
      await api.post(`/sarpras/stock-opnames/${selectedOpname.id}/finalize`);
      setMessage({ type: 'emerald', title: 'Selesai', text: 'Stock opname berhasil difinalisasi dan master stok telah diperbarui' });
      setOpnameModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(set);
  }, [items]);

  // Columns for Items DataTable
  const itemColumns = useMemo(() => [
    {
      key: 'item_code',
      header: 'Kode Barang',
      sortable: true,
      className: 'w-36 font-mono font-bold text-slate-800',
      render: (row) => row.item_code
    },
    {
      key: 'name',
      header: 'Nama Barang',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400 capitalize">{row.category || 'Umum'}</div>
        </div>
      )
    },
    {
      key: 'minimum_stock',
      header: 'Stok Minimal',
      sortable: true,
      align: 'right',
      className: 'num-cell text-slate-500 font-medium',
      render: (row) => `${row.minimum_stock} ${row.unit || 'pcs'}`
    },
    {
      key: 'current_stock',
      header: 'Stok Saat Ini',
      sortable: true,
      align: 'right',
      className: 'num-cell font-bold text-slate-800',
      render: (row) => {
        const isLow = Number(row.current_stock) <= Number(row.minimum_stock);
        return (
          <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>
            {row.current_stock} {row.unit || 'pcs'}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => {
        const isLow = Number(row.current_stock) <= Number(row.minimum_stock);
        return <StatusPill status={isLow ? 'menipis' : 'aman'} />;
      }
    },
    {
      key: 'actions',
      header: 'Mutasi Cepat',
      align: 'right',
      sticky: 'right',
      className: 'w-36 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => openMutationModal(row, 'in')}
            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Catat Stok Masuk"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => openMutationModal(row, 'out')}
            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Catat Stok Keluar"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      )
    }
  ], []);

  // Columns for Opname DataTable
  const opnameColumns = useMemo(() => [
    {
      key: 'id',
      header: 'ID Sesi',
      sortable: true,
      className: 'w-32 font-mono font-bold text-slate-800',
      render: (row) => `OPN-#${row.id}`
    },
    {
      key: 'opname_date',
      header: 'Tanggal Opname',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-800">{row.opname_date}</span>
    },
    {
      key: 'notes',
      header: 'Keterangan',
      render: (row) => <span className="text-slate-600">{row.notes || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.status || 'draft'} />
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      sticky: 'right',
      className: 'w-28 text-right bg-white',
      render: (row) => (
        <button
          type="button"
          onClick={() => openOpnameDetail(row)}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          {row.status === 'draft' ? 'Input Fisik' : 'Lihat Rekap'}
        </button>
      )
    }
  ], []);

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
              type="button"
              onClick={openCreateItemModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item BHP</span>
            </button>
          )}
          {activeTab === 'opname' && (
            <button
              type="button"
              onClick={handleStartOpname}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Mulai Sesi Opname Baru</span>
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
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Master Persediaan Barang ({items.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('opname')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'opname'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Sesi Stock Opname ({opnames.length})</span>
        </button>
      </div>

      {/* Tab 1: Master Items Table */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Cari kode atau nama barang BHP..."
            filters={[
              {
                id: 'category',
                label: 'Kategori',
                type: 'select',
                value: categoryFilter,
                defaultValue: '',
                options: [
                  { label: 'Semua Kategori', value: '' },
                  ...categories.map(c => ({ label: c, value: c }))
                ]
              }
            ]}
            onFilterChange={(_, val) => setCategoryFilter(val)}
            onReset={() => { setSearch(''); setCategoryFilter(''); }}
          />

          <DataTable
            columns={itemColumns}
            data={filteredItems}
            loading={loading}
            emptyTitle="Tidak Ada Bahan Habis Pakai"
            emptyDescription="Belum ada data barang atau filter pencarian tidak menemukan hasil."
          />
        </div>
      )}

      {/* Tab 2: Stock Opnames List */}
      {activeTab === 'opname' && (
        <DataTable
          columns={opnameColumns}
          data={opnames}
          loading={loading}
          emptyTitle="Belum Ada Sesi Opname"
          emptyDescription="Klik 'Mulai Sesi Opname Baru' untuk melakukan rekonsiliasi stok fisik."
        />
      )}

      {/* Modal Tambah Item BHP */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title="Tambah Master Bahan Habis Pakai"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setItemModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-item-bhp"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Item</span>
            </button>
          </div>
        }
      >
        <form id="form-item-bhp" onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Barang *</label>
              <input
                type="text"
                required
                value={itemFormData.item_code || ''}
                onChange={(e) => setItemFormData({ ...itemFormData, item_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <input
                type="text"
                value={itemFormData.category || ''}
                onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                placeholder="ATK / Kebersihan"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Minimal</label>
              <input
                type="number"
                value={itemFormData.minimum_stock || 0}
                onChange={(e) => setItemFormData({ ...itemFormData, minimum_stock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal</label>
              <input
                type="number"
                value={itemFormData.current_stock || 0}
                onChange={(e) => setItemFormData({ ...itemFormData, current_stock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Mutasi Masuk / Keluar */}
      <Modal
        isOpen={mutationModalOpen}
        onClose={() => setMutationModalOpen(false)}
        title={`Catat Stok ${mutationType === 'in' ? 'Masuk (Pasokan)' : 'Keluar (Pemakaian)'}`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setMutationModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-mutate-bhp"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-lg text-xs font-semibold transition cursor-pointer ${
                mutationType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Simpan Mutasi
            </button>
          </div>
        }
      >
        <div className="mb-4 text-xs text-slate-500">
          Barang: <strong className="text-slate-800">{targetItem?.name}</strong> (Stok saat ini: {targetItem?.current_stock} {targetItem?.unit})
        </div>

        <form id="form-mutate-bhp" onSubmit={handleMutationSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Tujuan</label>
            <textarea
              rows={2}
              value={mutationFormData.notes || ''}
              onChange={(e) => setMutationFormData({ ...mutationFormData, notes: e.target.value })}
              placeholder={mutationType === 'in' ? 'Pembelian / pengadaan baru' : 'Pemakaian kegiatan ujian'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Detail & Input Stock Opname */}
      <Modal
        isOpen={opnameModalOpen && !!selectedOpname}
        onClose={() => setOpnameModalOpen(false)}
        title={`Stock Opname #${selectedOpname?.id} • ${selectedOpname?.opname_date}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setOpnameModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Tutup
            </button>
            {selectedOpname?.status === 'draft' && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveOpnameCounts}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Draft Hitungan</span>
              </button>
            )}
          </div>
        }
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status Sesi:</span>
              <StatusPill status={selectedOpname?.status || 'draft'} />
            </div>
            {selectedOpname?.status === 'draft' && (
              <button
                type="button"
                onClick={handleFinalizeOpname}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Finalisasi Sesi</span>
              </button>
            )}
          </div>

          {/* Items List for Opname */}
          <div className="overflow-y-auto max-h-96 border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Barang</th>
                  <th className="px-3 py-2.5 text-right">Stok Sistem</th>
                  <th className="px-3 py-2.5 text-center">Hitung Fisik</th>
                  <th className="px-3 py-2.5 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedOpname?.items?.map((item) => {
                  const phys = opnamePhysicalInputs[item.consumable_item_id] ?? item.physical_stock;
                  const diff = Number(phys) - Number(item.system_stock);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {item.item_name}
                        <span className="text-[10px] text-slate-400 block font-mono">{item.item_code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-600 num-cell">
                        {item.system_stock} {item.item_unit}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {selectedOpname.status === 'draft' ? (
                          <input
                            type="number"
                            min="0"
                            value={opnamePhysicalInputs[item.consumable_item_id] ?? item.physical_stock}
                            onChange={(e) => setOpnamePhysicalInputs({
                              ...opnamePhysicalInputs,
                              [item.consumable_item_id]: e.target.value
                            })}
                            className="w-20 px-2 py-1 text-center font-bold border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                          />
                        ) : (
                          <span className="font-bold text-slate-800">{item.physical_stock}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold num-cell">
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
      </Modal>
    </div>
  );
}
