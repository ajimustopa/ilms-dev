import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Warehouse,
  Plus,
  Search,
  Filter,
  Loader2,
  Trash2,
  Edit2,
  Building2,
  Layers,
  Scale,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';

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

  const filteredData = dataList.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.contact_person && item.contact_person.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
            Master Data Dapur & Logistik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog bahan baku, satuan & konversi, vendor supplier, dan klasifikasi dapur.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah {activeTab === 'ingredients' ? 'Bahan Baku' : activeTab === 'units' ? 'Satuan' : activeTab === 'suppliers' ? 'Supplier' : 'Kategori'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
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
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer ${
                isActive
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 transition"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-800">{filteredData.length}</span> data
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Tidak ada data ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'ingredients' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode & Nama</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Satuan Dasar</th>
                    <th className="py-3 px-4">Min. Stok</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.category_name || '-'}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {item.base_unit_name} ({item.base_unit_code})
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.min_stock || 0} {item.base_unit_code}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.status === 'active' && (
                            <button
                              onClick={() => handleDeactivateIngredient(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Nonaktifkan"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'units' && (
              <div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Kode Satuan</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Jenis Satuan</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.code}</td>
                        <td className="py-3 px-4 text-slate-700">{item.name}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{item.unit_type}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {conversions.length > 0 && (
                  <div className="p-4 bg-slate-50/80 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                      Aturan Konversi Antar Satuan
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {conversions.map((conv) => (
                        <div key={conv.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-700">1 {conv.from_unit_code}</span>
                          <span className="text-slate-400">=</span>
                          <span className="font-mono text-amber-600 font-bold">{conv.factor} {conv.to_unit_code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'suppliers' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode & Nama Supplier</th>
                    <th className="py-3 px-4">Kontak Person</th>
                    <th className="py-3 px-4">No. Telepon</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.contact_person || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{item.phone || '-'}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{item.address || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'categories' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Kategori</th>
                    <th className="py-3 px-4">Grup / Sifat</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-slate-600">{item.category || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{item.description || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">
                {modalMode === 'create' ? 'Tambah Data Baru' : 'Edit Data'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jenis Satuan
                    </label>
                    <select
                      value={formData.unit_type || 'weight'}
                      onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
