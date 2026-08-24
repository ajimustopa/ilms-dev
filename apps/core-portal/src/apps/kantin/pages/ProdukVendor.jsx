import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Package,
  Plus,
  Edit2,
  ScanBarcode,
  Search,
  Loader2,
  AlertCircle,
  X,
  AlertTriangle,
  Barcode
} from 'lucide-react';

export default function ProdukVendor() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product_name: '',
    barcode: '',
    product_category_id: '',
    vendor_id: '',
    unit: 'pcs',
    min_stock: '10',
    current_stock: '0'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resCat, resVen] = await Promise.all([
        api.get('/kantin/vendor-products'),
        api.get('/kantin/product-categories?status=active'),
        api.get('/kantin/vendors?status=active')
      ]);
      setProducts(resProd.data?.data || []);
      setCategories(resCat.data?.data || []);
      setVendors(resVen.data?.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      product_name: '',
      barcode: '',
      product_category_id: categories[0]?.id || '',
      vendor_id: vendors[0]?.id || '',
      unit: 'pcs',
      min_stock: '10',
      current_stock: '0'
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || '',
      barcode: product.barcode || '',
      product_category_id: product.product_category_id || '',
      vendor_id: product.vendor_id || '',
      unit: product.unit || 'pcs',
      min_stock: String(product.min_stock || '0'),
      current_stock: String(product.current_stock || '0')
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        min_stock: Number(formData.min_stock) || 0,
        current_stock: Number(formData.current_stock) || 0
      };

      if (editingProduct) {
        await api.put(`/kantin/vendor-products/${editingProduct.id}`, payload);
      } else {
        await api.post('/kantin/vendor-products', payload);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data produk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBarcode = async (productId = null) => {
    try {
      await api.post('/kantin/vendor-products/generate-barcode', {
        product_id: productId
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate barcode');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/vendor-products/${id}/status`, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal update status');
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search) ||
    p.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Katalog Produk & Stok</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data produk kantin & vendor titipan, barcode scanning, dan batas stok minimal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGenerateBarcode(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Generate Semua Barcode</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk, barcode, vendor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredProducts.length}</span> Produk
        </div>
      </div>

      {/* Table Products */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data produk...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk & Barcode</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Vendor / Pemasok</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3">Stok Saat Ini</th>
                  <th className="px-4 py-3">Min. Stok</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{p.product_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px] text-slate-500">{p.barcode || 'Belum ada barcode'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {p.category || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{p.vendor || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.unit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          p.low_stock_warning
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {p.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{p.min_stock}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p.id, p.status)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!p.barcode && (
                          <button
                            type="button"
                            onClick={() => handleGenerateBarcode(p.id)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold transition"
                          >
                            + Barcode
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Produk */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Contoh: Air Mineral 600ml, Roti Gandum..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Barcode (Opsional)</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Biarkan kosong jika ingin digenerate sistem"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.product_category_id}
                    onChange={(e) => setFormData({ ...formData, product_category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Pemasok</label>
                  <select
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs / botol"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Stok Warning</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
