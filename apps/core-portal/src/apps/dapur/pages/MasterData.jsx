import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import {
  Warehouse,
  Plus,
  Edit2,
  Layers,
  Scale,
  Truck,
  XCircle,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('ingredients'); // 'ingredients' | 'units' | 'suppliers' | 'categories'
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  const [search, setSearch] = useState('');

  // Dropdown reference data
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [conversions, setConversions] = useState([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchInitialRefs();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchInitialRefs = async () => {
    try {
      const [resUnits, resCats] = await Promise.all([
        api.get('/api/v1/dapur/units'),
        api.get('/api/v1/dapur/master-data?type=ingredient_category'),
      ]);
      setUnits(resUnits.data?.data || []);
      setCategories(resCats.data?.data || []);
    } catch (e) {
      console.error('Failed to fetch refs:', e);
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'ingredients') {
        const res = await api.get('/api/v1/dapur/ingredients');
        setDataList(res.data?.data?.items || []);
      } else if (activeTab === 'units') {
        const [resU, resC] = await Promise.all([
          api.get('/api/v1/dapur/units'),
          api.get('/api/v1/dapur/units/conversions'),
        ]);
        setDataList(resU.data?.data || []);
        setConversions(resC.data?.data || []);
      } else if (activeTab === 'suppliers') {
        const res = await api.get('/api/v1/dapur/suppliers');
        setDataList(res.data?.data || []);
      } else if (activeTab === 'categories') {
        const res = await api.get('/api/v1/dapur/master-data?type=ingredient_category');
        setDataList(res.data?.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedItem(null);
    setErrorMsg(null);

    if (activeTab === 'ingredients') {
      setFormData({
        code: `ING-${Date.now().toString().slice(-4)}`,
        name: '',
        category_id: categories[0]?.id || 1,
        base_unit_id: units[0]?.id || 1,
        min_stock: 10,
        description: '',
      });
    } else if (activeTab === 'units') {
      setFormData({
        code: '',
        name: '',
        unit_type: 'weight',
      });
    } else if (activeTab === 'suppliers') {
      setFormData({
        code: `SUP-${Date.now().toString().slice(-4)}`,
        name: '',
        contact_person: '',
        phone: '',
        address: '',
      });
    } else if (activeTab === 'categories') {
      setFormData({
        master_type: 'ingredient_category',
        code: `CAT-${Date.now().toString().slice(-4)}`,
        name: '',
        category: 'Bahan Segar',
        description: '',
      });
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setErrorMsg(null);
    setFormData({ ...item });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (activeTab === 'ingredients') {
        const payload = {
          ...formData,
          category_id: Number(formData.category_id),
          base_unit_id: Number(formData.base_unit_id),
          min_stock: Number(formData.min_stock) || 0,
        };
        if (modalMode === 'create') {
          await api.post('/api/v1/dapur/ingredients', payload);
        } else {
          await api.put(`/api/v1/dapur/ingredients/${selectedItem.id}`, payload);
        }
      } else if (activeTab === 'units') {
        if (modalMode === 'create') {
          await api.post('/api/v1/dapur/units', formData);
        }
      } else if (activeTab === 'suppliers') {
        if (modalMode === 'create') {
          await api.post('/api/v1/dapur/suppliers', formData);
        } else {
          await api.put(`/api/v1/dapur/suppliers/${selectedItem.id}`, formData);
        }
      } else if (activeTab === 'categories') {
        if (modalMode === 'create') {
          await api.post('/api/v1/dapur/master-data', formData);
        } else {
          await api.put(`/api/v1/dapur/master-data/${selectedItem.id}`, formData);
        }
      }

      setModalOpen(false);
      fetchTabData();
      fetchInitialRefs();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateIngredient = async (id) => {
    if (!window.confirm('Nonaktifkan bahan baku ini?')) return;
    try {
      await api.post(`/api/v1/dapur/ingredients/${id}/deactivate`);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menonaktifkan');
    }
  };

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dataList;
    return dataList.filter((item) => (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.contact_person && item.contact_person.toLowerCase().includes(q))
    ));
  }, [dataList, search]);

  // Column definitions for each tab
  const ingredientColumns = [
    {
      key: 'name',
      label: 'Bahan Baku',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{row.code}</div>
        </div>
      )
    },
    {
      key: 'category_name',
      label: 'Kategori',
      render: (val) => <span className="text-slate-600">{val || '-'}</span>
    },
    {
      key: 'base_unit_name',
      label: 'Satuan Dasar',
      render: (val, row) => (
        <span className="font-mono text-slate-700">
          {val} ({row.base_unit_code || '-'})
        </span>
      )
    },
    {
      key: 'min_stock',
      label: 'Min. Stok',
      type: 'number',
      render: (val, row) => `${val || 0} ${row.base_unit_code || ''}`
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '100px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '90px',
      render: (_, item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {item.status === 'active' && (
            <button
              type="button"
              onClick={() => handleDeactivateIngredient(item.id)}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Nonaktifkan"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const unitColumns = [
    {
      key: 'code',
      label: 'Kode Satuan',
      width: '140px',
      render: (val) => <span className="font-mono font-bold text-slate-800">{val}</span>
    },
    {
      key: 'name',
      label: 'Nama Lengkap',
      render: (val) => <span className="font-medium text-slate-700">{val}</span>
    },
    {
      key: 'unit_type',
      label: 'Jenis Satuan',
      render: (val) => <span className="capitalize text-slate-600">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '100px'
    }
  ];

  const supplierColumns = [
    {
      key: 'name',
      label: 'Supplier / Vendor',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{row.code}</div>
        </div>
      )
    },
    {
      key: 'contact_person',
      label: 'Kontak Person',
      render: (val) => <span className="text-slate-600">{val || '-'}</span>
    },
    {
      key: 'phone',
      label: 'No. Telepon / WA',
      render: (val) => <span className="font-mono text-slate-600">{val || '-'}</span>
    },
    {
      key: 'address',
      label: 'Alamat',
      render: (val) => <span className="text-slate-500 max-w-xs truncate block">{val || '-'}</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '80px',
      render: (_, item) => (
        <button
          type="button"
          onClick={() => handleOpenEdit(item)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const categoryColumns = [
    {
      key: 'code',
      label: 'Kode',
      width: '130px',
      render: (val) => <span className="font-mono font-bold text-slate-800">{val}</span>
    },
    {
      key: 'name',
      label: 'Nama Kategori',
      render: (val) => <span className="font-semibold text-slate-800">{val}</span>
    },
    {
      key: 'category',
      label: 'Grup / Sifat',
      render: (val) => <span className="text-slate-600">{val || '-'}</span>
    },
    {
      key: 'description',
      label: 'Deskripsi',
      render: (val) => <span className="text-slate-500">{val || '-'}</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '80px',
      render: (_, item) => (
        <button
          type="button"
          onClick={() => handleOpenEdit(item)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  const currentColumns = {
    ingredients: ingredientColumns,
    units: unitColumns,
    suppliers: supplierColumns,
    categories: categoryColumns,
  }[activeTab] || ingredientColumns;

  const currentTabLabel = {
    ingredients: 'Bahan Baku',
    units: 'Satuan',
    suppliers: 'Supplier',
    categories: 'Kategori Bahan',
  }[activeTab];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Master Data Dapur & Logistik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog bahan baku, satuan & konversi, vendor supplier, dan klasifikasi dapur.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah {currentTabLabel}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'ingredients', label: 'Bahan Baku', icon: Warehouse },
          { id: 'units', label: 'Satuan & Konversi', icon: Scale },
          { id: 'suppliers', label: 'Supplier / Vendor', icon: Truck },
          { id: 'categories', label: 'Kategori Bahan', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition -mb-px cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Cari berdasarkan nama atau kode ${currentTabLabel.toLowerCase()}...`}
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{filteredData.length}</span> data
          </span>
        }
      />

      {/* Generic DataTable View */}
      <DataTable
        columns={currentColumns}
        data={filteredData}
        loading={loading}
        density="compact"
        emptyTitle={`Belum Ada Data ${currentTabLabel}`}
        emptyDescription={`Belum ada data ${currentTabLabel.toLowerCase()} yang terdaftar pada sistem dapur.`}
        emptyAction={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah {currentTabLabel} Baru</span>
          </button>
        }
      />

      {/* Conversion Rules Extra Box (Khusus Tab Units) */}
      {activeTab === 'units' && conversions.length > 0 && (
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
            Aturan Konversi Antar Satuan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {conversions.map((conv) => (
              <div
                key={conv.id}
                className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs flex items-center justify-between"
              >
                <span className="font-semibold text-slate-700">1 {conv.from_unit_code}</span>
                <span className="text-slate-400">=</span>
                <span className="font-mono text-emerald-700 font-bold tnum">
                  {conv.factor} {conv.to_unit_code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generic Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? `Tambah ${currentTabLabel} Baru` : `Edit ${currentTabLabel}`}
        subtitle="Isi informasi master data dapur di bawah ini dengan lengkap dan valid."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Data</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMsg && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Data"
              description={errorMsg}
            />
          )}

          <form onSubmit={handleSave} className="space-y-3">
            {activeTab === 'ingredients' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kode Bahan
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Bahan
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <select
                      value={formData.category_id || ''}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Satuan Dasar
                    </label>
                    <select
                      value={formData.base_unit_id || ''}
                      onChange={(e) => setFormData({ ...formData, base_unit_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Stok Aman
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_stock || 0}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </>
            )}

            {activeTab === 'units' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Satuan (misal: kg, gr, ltr)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Satuan
                  </label>
                  <select
                    value={formData.unit_type || 'weight'}
                    onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="weight">Berat (Weight)</option>
                    <option value="volume">Volume</option>
                    <option value="count">Jumlah (Count/Pieces)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'suppliers' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kode Supplier
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Supplier
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kontak Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person || ''}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Telepon / WA
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kode Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grup / Klasifikasi
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Bahan Segar / Bahan Kering / Beku"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </Modal>
    </div>
  );
}
