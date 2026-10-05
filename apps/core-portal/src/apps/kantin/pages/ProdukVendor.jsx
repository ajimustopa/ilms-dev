import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import BarcodeCanvas from '../components/BarcodeCanvas';
import {
  downloadBarcodeLabelJpg,
  compressProductImage
} from '../utils/barcodeHelper';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
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
  Barcode,
  Store,
  Layers,
  Sparkles,
  Coins,
  Boxes,
  TrendingUp,
  Tag,
  Download,
  UploadCloud,
  ImageIcon,
  Trash2,
  Eye,
  CheckCircle2,
  RefreshCw,
  History,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Undo2,
  CalendarDays,
  Receipt,
  ShoppingCart,
  ShieldCheck,
  ShieldAlert,
  Info,
  CalendarRange
} from 'lucide-react';

const COMMON_UNITS = ['pcs', 'botol', 'bungkus', 'porsi', 'cup', 'kotak', 'dus', 'pack', 'butir', 'buah'];

export default function ProdukVendor() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modal Create / Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Barcode Preview & Download Modal State
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState(null);

  // Product History & Mutations Modal State
  const [historyModalProduct, setHistoryModalProduct] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState('timeline'); // 'timeline' | 'receipts' | 'sales' | 'returns'
  const [historyDateFilter, setHistoryDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'

  // Image Upload & Minimizer State
  const [imageCompressing, setImageCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    product_name: '',
    barcode: '',
    image_url: '',
    product_category_id: '',
    vendor_id: '',
    unit: 'pcs',
    cost_price: '0',
    sale_price: '0',
    min_stock: '10'
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

  // Dropdown options yang diformat khusus untuk SearchableSelect
  const categoryOptions = useMemo(() => {
    return categories.map(c => ({
      value: c.id,
      label: c.category_name,
      sublabel: c.description || undefined,
      badge: 'Kategori',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
    }));
  }, [categories]);

  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id,
      label: v.vendor_name,
      sublabel: v.contact ? `Kontak: ${v.contact}` : (v.address || undefined),
      badge: v.canteen_share_pct ? `Bagi Hasil ${v.canteen_share_pct}%` : undefined,
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }));
  }, [vendors]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setCompressionStats(null);
    setFormData({
      product_name: '',
      barcode: '',
      image_url: '',
      product_category_id: categories[0]?.id || '',
      vendor_id: vendors[0]?.id || '',
      unit: 'pcs',
      cost_price: '0',
      sale_price: '0',
      min_stock: '10'
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setCompressionStats(null);
    setFormData({
      product_name: product.product_name || '',
      barcode: product.barcode || '',
      image_url: product.image_url || '',
      product_category_id: product.product_category_id || '',
      vendor_id: product.vendor_id || '',
      unit: product.unit || 'pcs',
      cost_price: String(product.cost_price ?? '0'),
      sale_price: String(product.sale_price ?? '0'),
      min_stock: String(product.min_stock || '0')
    });
    setError(null);
    setShowModal(true);
  };

  // Generate barcode string lokal (bisa dipakai user sebelum simpan)
  const handleGenerateLocalBarcode = () => {
    const unitPrefix = '899';
    const randDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
    const newCode = `${unitPrefix}${randDigits}`;
    setFormData(prev => ({ ...prev, barcode: newCode }));
  };

  // Handler Upload & Kompresi Gambar Otomatis
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageCompressing(true);
    setError(null);

    try {
      const result = await compressProductImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.82
      });

      setFormData(prev => ({ ...prev, image_url: result.base64 }));
      setCompressionStats({
        originalSizeKb: (result.originalSize / 1024).toFixed(1),
        compressedSizeKb: (result.compressedSize / 1024).toFixed(1),
        reductionPct: result.reductionPct
      });
    } catch (err) {
      setError(err.message || 'Gagal memproses dan mengompres gambar');
    } finally {
      setImageCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setCompressionStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        product_category_id: formData.product_category_id ? Number(formData.product_category_id) : null,
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        cost_price: Number(formData.cost_price) || 0,
        sale_price: Number(formData.sale_price) || 0,
        min_stock: Number(formData.min_stock) || 0
      };

      if (editingProduct) {
        await api.put(`/kantin/vendor-products/${editingProduct.id}`, payload);
        setSuccessMessage(`Data produk "${formData.product_name}" berhasil diperbarui.`);
      } else {
        await api.post('/kantin/vendor-products', payload);
        setSuccessMessage(`Produk baru "${formData.product_name}" berhasil ditambahkan.`);
      }

      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan data produk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (product) => {
    setHistoryModalProduct(product);
    setLoadingHistory(true);
    setHistoryData(null);
    setActiveHistoryTab('timeline');
    setHistoryDateFilter('all');
    try {
      const res = await api.get(`/kantin/vendor-products/${product.id}/history`);
      setHistoryData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching product history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerateBarcode = async (productId = null) => {
    try {
      await api.post('/kantin/vendor-products/generate-barcode', {
        product_id: productId
      });
      setSuccessMessage('Kode barcode berhasil digenerate.');
      fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate barcode');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/vendor-products/${id}/status`, { status: nextStatus });
      setSuccessMessage(`Status produk berhasil diubah ke ${nextStatus === 'active' ? 'Aktif' : 'Non-Aktif'}.`);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal update status');
    }
  };

  const handleDownloadSingleBarcode = (prod) => {
    if (!prod.barcode) {
      alert('Produk ini belum memiliki kode barcode. Silakan generate atau input kode barcode terlebih dahulu.');
      return;
    }
    downloadBarcodeLabelJpg({
      productName: prod.product_name,
      barcode: prod.barcode,
      salePrice: prod.sale_price,
      category: prod.category,
      vendor: prod.vendor
    });
  };

  const filteredProducts = products.filter(p => {
    const matchSearch =
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());

    const matchCat = selectedCategoryFilter === 'all' || String(p.product_category_id) === String(selectedCategoryFilter);
    return matchSearch && matchCat;
  });

  const filteredHistoryTimeline = useMemo(() => {
    if (!historyData?.timeline) return [];
    if (historyDateFilter === 'all') return historyData.timeline;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (historyDateFilter === 'today') {
      return historyData.timeline.filter(t => (t.date || '').startsWith(todayStr));
    }
    const cutoff = new Date();
    if (historyDateFilter === '7days') cutoff.setDate(now.getDate() - 7);
    if (historyDateFilter === '30days') cutoff.setDate(now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return historyData.timeline.filter(t => (t.date || '') >= cutoffStr);
  }, [historyData, historyDateFilter]);

  const filteredReceipts = useMemo(() => {
    if (!historyData?.receipts) return [];
    if (historyDateFilter === 'all') return historyData.receipts;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (historyDateFilter === 'today') {
      return historyData.receipts.filter(r => (r.receipt_date || r.created_at || '').startsWith(todayStr));
    }
    const cutoff = new Date();
    if (historyDateFilter === '7days') cutoff.setDate(now.getDate() - 7);
    if (historyDateFilter === '30days') cutoff.setDate(now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return historyData.receipts.filter(r => (r.receipt_date || r.created_at || '') >= cutoffStr);
  }, [historyData, historyDateFilter]);

  const filteredSales = useMemo(() => {
    if (!historyData?.sales) return [];
    if (historyDateFilter === 'all') return historyData.sales;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (historyDateFilter === 'today') {
      return historyData.sales.filter(s => (s.transaction_at || '').startsWith(todayStr));
    }
    const cutoff = new Date();
    if (historyDateFilter === '7days') cutoff.setDate(now.getDate() - 7);
    if (historyDateFilter === '30days') cutoff.setDate(now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return historyData.sales.filter(s => (s.transaction_at || '') >= cutoffStr);
  }, [historyData, historyDateFilter]);

  const filteredReturns = useMemo(() => {
    if (!historyData?.returns) return [];
    if (historyDateFilter === 'all') return historyData.returns;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (historyDateFilter === 'today') {
      return historyData.returns.filter(ret => (ret.returned_at || ret.created_at || '').startsWith(todayStr));
    }
    const cutoff = new Date();
    if (historyDateFilter === '7days') cutoff.setDate(now.getDate() - 7);
    if (historyDateFilter === '30days') cutoff.setDate(now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return historyData.returns.filter(ret => (ret.returned_at || ret.created_at || '') >= cutoffStr);
  }, [historyData, historyDateFilter]);

  const profitMargin = (Number(formData.sale_price) || 0) - (Number(formData.cost_price) || 0);
  const profitMarginPct = (Number(formData.sale_price) || 0) > 0
    ? ((profitMargin / (Number(formData.sale_price) || 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Katalog Produk & Barcode Kantin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen produk, cetak & download barcode JPG, foto produk otomatis terkompresi, dan batas stok
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <FlatAlertBanner
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk, barcode, vendor..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredProducts.length}</span> Produk
        </div>
      </div>

      {/* Table Products */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data produk...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Produk & Foto</th>
                  <th className="px-4 py-3">Barcode (Visual)</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">HPP</th>
                  <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-center">Stok</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.product_name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{p.product_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{p.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.barcode ? (
                        <div
                          onClick={() => setBarcodePreviewProduct(p)}
                          className="cursor-pointer group flex flex-col items-start gap-1 p-1 rounded-lg hover:bg-emerald-50/60 transition"
                          title="Klik untuk pratinjau & unduh JPG"
                        >
                          <BarcodeCanvas
                            barcode={p.barcode}
                            barWidth={1.2}
                            barHeight={28}
                            fontSize={9}
                            className="bg-white"
                          />
                          <span className="text-[10px] font-mono text-slate-500 group-hover:text-emerald-700 font-semibold flex items-center gap-1">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Preview / Unduh JPG</span>
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGenerateBarcode(p.id)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <ScanBarcode className="w-3 h-3" />
                          <span>+ Barcode</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {p.category || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{p.vendor || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.unit}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {formatCurrency(p.cost_price || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(p.sale_price || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
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
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryModal(p)}
                          title="Lihat Detail & Riwayat Mutasi Harian"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tampilkan</span>
                        </button>
                        {p.barcode && (
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleBarcode(p)}
                            title="Unduh Label Barcode JPG"
                            className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg border border-slate-200 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold transition inline-flex items-center gap-1"
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
                    <td colSpan="10" className="py-12 text-center text-slate-400 italic">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pratinjau & Unduh Barcode JPG */}
      {barcodePreviewProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Cetak & Unduh Barcode Produk</h3>
              </div>
              <button
                type="button"
                onClick={() => setBarcodePreviewProduct(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              {/* Card Label Barcode Siap Unduh */}
              <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 shadow-xs flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  KANTIN YAYASAN ALDEPOS
                </span>
                <p className="font-bold text-slate-800 text-sm">{barcodePreviewProduct.product_name}</p>
                <p className="font-mono font-bold text-emerald-700 text-base">
                  {formatCurrency(barcodePreviewProduct.sale_price || 0)}
                </p>

                <div className="p-2 bg-white rounded-lg border border-slate-200 mt-1 shadow-2xs">
                  <BarcodeCanvas
                    barcode={barcodePreviewProduct.barcode}
                    barWidth={2}
                    barHeight={65}
                    fontSize={12}
                  />
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  {[barcodePreviewProduct.category, barcodePreviewProduct.vendor].filter(Boolean).join(' • ')}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBarcodePreviewProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleBarcode(barcodePreviewProduct)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File JPG (Label Cetak)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Produk (Desain Modern, Dropdown Elegan, Upload Foto & Minimizer) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden my-auto transition-all">
            {/* Modal Header (Sticky / Fixed Top) */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {editingProduct ? 'Edit Data Produk Kantin' : 'Tambah Produk Baru'}
                  </h3>
                  <p className="text-[11px] text-emerald-100/90 font-normal">
                    Lengkapi identitas, barcode visual, foto produk, kategori & vendor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Seksi 1: Foto Produk & Minimizer Otomatis */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Foto Produk (Auto-Minimizer)</span>
                  </label>
                  {compressionStats && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Tereduksi {compressionStats.reductionPct}% ({compressionStats.originalSizeKb}KB ➔ {compressionStats.compressedSizeKb}KB)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3.5">
                  {formData.image_url ? (
                    <div className="relative group shrink-0">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-700"
                        title="Hapus foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200/70 text-slate-400 flex items-center justify-center shrink-0 border border-dashed border-slate-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="product-photo-upload"
                    />
                    <label
                      htmlFor="product-photo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition"
                    >
                      {imageCompressing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>Mengompresi Gambar...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formData.image_url ? 'Ganti Foto' : 'Unggah Foto Produk'}</span>
                        </>
                      )}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Format JPG, PNG, WEBP. Otomatis dikompresi & disesuaikan ukuran resolusinya.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Nama & Barcode Generator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Contoh: Teh Pucuk Harum 350ml, Roti Cokelat..."
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kode Barcode Produk</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateLocalBarcode}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Barcode Baru</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ketik kode barcode manual atau klik tombol generate di atas"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />

                  {/* Visual Barcode Live Preview */}
                  {formData.barcode && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarcodeCanvas
                          barcode={formData.barcode}
                          barWidth={1.3}
                          barHeight={32}
                          fontSize={10}
                          className="bg-white"
                        />
                        <span className="text-[11px] font-mono text-slate-600 font-semibold">
                          Pratinjau Live Barcode
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadBarcodeLabelJpg({
                          productName: formData.product_name || 'Produk Kantin',
                          barcode: formData.barcode,
                          salePrice: formData.sale_price,
                          category: 'Kantin',
                          vendor: 'Mitra'
                        })}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>Unduh JPG</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seksi 3: Dropdown Kategori & Vendor yang Menarik */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-slate-50/90 to-slate-50/40 border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pengelompokan & Mitra Suplier</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Pilih dari database terdaftar</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Dropdown Kategori */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Kategori Produk <span className="text-rose-500">*</span></span>
                    </label>
                    <SearchableSelect
                      options={categoryOptions}
                      value={formData.product_category_id}
                      onChange={(val) => setFormData({ ...formData, product_category_id: val })}
                      placeholder="-- Pilih Kategori Produk --"
                      searchPlaceholder="Cari kategori..."
                      accentColor="emerald"
                      required
                    />
                  </div>

                  {/* Dropdown Vendor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mitra Vendor / Suplier <span className="text-rose-500">*</span></span>
                    </label>
                    <SearchableSelect
                      options={vendorOptions}
                      value={formData.vendor_id}
                      onChange={(val) => setFormData({ ...formData, vendor_id: val })}
                      placeholder="-- Pilih Mitra Vendor --"
                      searchPlaceholder="Cari vendor..."
                      accentColor="emerald"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 4: Kalkulasi Harga & Margin */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Kalkulasi Harga & Margin Keuntungan</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span className="text-slate-500">Margin:</span>
                    <span className={profitMargin >= 0 ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {profitMarginPct}% (Rp {formatNumber(profitMargin)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Harga Pokok (HPP / Beli)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-xs text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        required
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    {/* Tampilan Angka dengan Pemisah Titik per 3 Angka */}
                    <div className="mt-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-slate-200/70 flex items-center justify-between shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-medium">Nominal:</span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        Rp {formatNumber(Number(formData.cost_price) || 0)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Harga Jual Kasir (POS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-xs text-emerald-600 font-bold">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        required
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    {/* Tampilan Angka dengan Pemisah Titik per 3 Angka */}
                    <div className="mt-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-emerald-200/70 flex items-center justify-between shadow-2xs">
                      <span className="text-[10px] text-emerald-600 font-medium">Nominal:</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        Rp {formatNumber(Number(formData.sale_price) || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seksi 5: Satuan & Stok */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Satuan Produk</span>
                    <span className="text-[10px] text-slate-400">Pilih cepat atau ketik manual:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_UNITS.map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({ ...formData, unit: u })}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition ${
                          formData.unit === u
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Contoh: pcs, botol, pack, porsi..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Batas Minimum Stok (Warning)</span>
                      <span className="text-[10px] text-slate-400">Peringatan jika stok menipis</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                      placeholder="10"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {editingProduct ? 'Stok Saat Ini (Sistem)' : 'Stok Awal'}
                    </label>
                    <div className="px-3.5 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                      <span>
                        {editingProduct ? `${editingProduct.current_stock || 0} ${editingProduct.unit || 'pcs'}` : '0 Unit (Baru)'}
                      </span>
                      <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Via Penerimaan Barang
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Card: Penambahan Stok via Penerimaan Barang */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Pencatatan Stok Masuk:</strong> Stok produk tidak diinput manual di sini, melainkan dicatat secara resmi melalui menu <strong className="text-slate-800 font-semibold">Penerimaan Barang</strong> agar riwayat vendor/suplier, faktur, dan tanggal kadaluarsa (FEFO) terekam otomatis.
                  </p>
                </div>
              </div>
              </div>

              {/* Action Buttons (Sticky / Fixed Bottom) */}
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || imageCompressing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{editingProduct ? 'Simpan Perubahan' : 'Tambahkan Produk'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Detail Produk & Riwayat Mutasi Harian (Penerimaan, Penjualan, Retur) */}
      {historyModalProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden my-auto transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight text-white">
                      {historyModalProduct.product_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {historyModalProduct.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Barcode: <span className="text-slate-200">{historyModalProduct.barcode || 'Belum dibuat'}</span> • Kategori: <span className="text-slate-200">{historyModalProduct.category || '-'}</span> • Vendor: <span className="text-slate-200">{historyModalProduct.vendor || '-'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryModalProduct(null);
                  setHistoryData(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product Info & Pricing Summary */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {historyModalProduct.image_url ? (
                    <img
                      src={historyModalProduct.image_url}
                      alt={historyModalProduct.product_name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200/80 text-slate-400 flex items-center justify-center border border-slate-200">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Informasi Harga Produk</span>
                    <div className="flex items-center gap-4 mt-0.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">HPP Beli</span>
                        <span className="text-xs font-bold font-mono text-slate-700">
                          {formatCurrency(historyModalProduct.cost_price || 0)}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Harga Jual</span>
                        <span className="text-xs font-bold font-mono text-emerald-700">
                          {formatCurrency(historyModalProduct.sale_price || 0)}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Satuan</span>
                        <span className="text-xs font-semibold text-slate-700 uppercase">
                          {historyModalProduct.unit || 'pcs'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {historyModalProduct.barcode && (
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleBarcode(historyModalProduct)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unduh Barcode JPG</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryModalProduct(null);
                      openEditModal(historyModalProduct);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Produk</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* 1. Stok Saat Ini */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Stok Saat Ini</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Boxes className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-slate-800">
                      {historyData?.summary?.current_stock ?? historyModalProduct.current_stock ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{historyModalProduct.unit}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {(historyData?.summary?.current_stock ?? historyModalProduct.current_stock) <= (historyModalProduct.min_stock || 10) ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Stok Menipis (Min: {historyModalProduct.min_stock || 10})
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Stok Aman (Min: {historyModalProduct.min_stock || 10})
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Total Penerimaan */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Penerimaan Masuk</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-blue-700">
                      {historyData?.summary?.total_received_qty ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{historyModalProduct.unit}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Dari {historyData?.receipts?.length || 0} faktur penerimaan
                  </p>
                </div>

                {/* 3. Total Terjual */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Penjualan Kasir POS</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      {historyData?.summary?.total_sold_qty ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{historyModalProduct.unit}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-emerald-800">
                    Omset: {formatCurrency(historyData?.summary?.total_sales_revenue || 0)}
                  </p>
                </div>

                {/* 4. Total Retur */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Retur Produk</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Undo2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-amber-700">
                      {historyData?.summary?.total_returned_qty ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{historyModalProduct.unit}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {historyData?.returns?.length || 0} kali pengembalian
                  </p>
                </div>
              </div>

              {/* Tabs & Date Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                {/* Navigation Sub-tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab('timeline')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeHistoryTab === 'timeline'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Semua Mutasi Harian</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeHistoryTab === 'timeline' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                      {filteredHistoryTimeline.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab('receipts')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeHistoryTab === 'receipts'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Penerimaan Barang</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeHistoryTab === 'receipts' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'}`}>
                      {filteredReceipts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab('sales')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeHistoryTab === 'sales'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Penjualan Kasir (POS)</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeHistoryTab === 'sales' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'}`}>
                      {filteredSales.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab('returns')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeHistoryTab === 'returns'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Retur Produk</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeHistoryTab === 'returns' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'}`}>
                      {filteredReturns.length}
                    </span>
                  </button>
                </div>

                {/* Filter Rentang Tanggal */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  <span className="text-[10px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    <span>Filter:</span>
                  </span>
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'today', label: 'Hari Ini' },
                    { key: '7days', label: '7 Hari' },
                    { key: '30days', label: '30 Hari' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setHistoryDateFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        historyDateFilter === f.key
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Contents */}
              {loadingHistory ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-400">Mengambil data mutasi & riwayat per hari...</p>
                </div>
              ) : (
                <div>
                  {/* 1. Sub-tab: Timeline Semua Mutasi Harian */}
                  {activeHistoryTab === 'timeline' && (
                    <div className="space-y-3">
                      {filteredHistoryTimeline.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                          Belum ada catatan mutasi untuk produk ini pada rentang filter yang dipilih.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2.5">Waktu / Tanggal</th>
                                <th className="px-3.5 py-2.5">Tipe Mutasi</th>
                                <th className="px-3.5 py-2.5">No Referensi</th>
                                <th className="px-3.5 py-2.5 text-center">Jumlah (Qty)</th>
                                <th className="px-3.5 py-2.5">Keterangan / Pihak Terkait</th>
                                <th className="px-3.5 py-2.5">Batch & Expired</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredHistoryTimeline.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {item.date ? new Date(item.date).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    {item.type === 'receipt' && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1">
                                        <ArrowDownLeft className="w-3 h-3" />
                                        <span>Penerimaan</span>
                                      </span>
                                    )}
                                    {item.type === 'sale' && (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                                        <ShoppingCart className="w-3 h-3" />
                                        <span>Penjualan Kasir</span>
                                      </span>
                                    )}
                                    {item.type === 'return' && (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                                        <Undo2 className="w-3 h-3" />
                                        <span>Retur Produk</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-slate-700 font-medium">
                                    {item.ref_number || '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono font-bold">
                                    <span
                                      className={`px-2 py-0.5 rounded ${
                                        item.direction === 'in'
                                          ? 'bg-blue-100 text-blue-800'
                                          : item.type === 'sale'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {item.direction === 'in' ? `+${item.qty}` : `-${item.qty}`} {historyModalProduct.unit}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-600 text-[11px]">
                                    {item.description}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                                    {item.batch_number ? (
                                      <span className="font-mono text-slate-700 block">Batch: {item.batch_number}</span>
                                    ) : null}
                                    {item.expired_at ? (
                                      <span className="text-[10px] text-amber-700 block">
                                        Exp: {formatDate(item.expired_at)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Sub-tab: Riwayat Penerimaan Barang */}
                  {activeHistoryTab === 'receipts' && (
                    <div className="space-y-3">
                      {filteredReceipts.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                          Belum ada riwayat penerimaan barang untuk produk ini.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2.5">Tgl Penerimaan</th>
                                <th className="px-3.5 py-2.5">No Faktur / Ref</th>
                                <th className="px-3.5 py-2.5">Vendor / Suplier</th>
                                <th className="px-3.5 py-2.5">No Batch</th>
                                <th className="px-3.5 py-2.5">Kadaluarsa (FEFO)</th>
                                <th className="px-3.5 py-2.5 text-center">Qty Masuk</th>
                                <th className="px-3.5 py-2.5 text-right">HPP Beli</th>
                                <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredReceipts.map((r) => (
                                <tr key={r.item_id} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {formatDate(r.receipt_date || r.created_at)}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                                    {r.invoice_number || `#RCV-${r.goods_receipt_id}`}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-700">
                                    <div>
                                      <p className="font-semibold">{r.vendor_name || 'Suplier Mandiri'}</p>
                                      <span className="text-[10px] text-slate-400 capitalize">
                                        {r.receipt_type === 'titipan' ? 'Konsinyasi' : 'Beli Putus'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-slate-600">
                                    {r.batch_number || '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    {r.expired_at ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                        {formatDate(r.expired_at)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">Tidak diatur</span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-blue-700">
                                    +{r.qty} {historyModalProduct.unit}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                                    {formatCurrency(r.cost_price || 0)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                                    {formatCurrency((Number(r.qty) || 0) * (Number(r.cost_price) || 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Sub-tab: Riwayat Penjualan Kasir POS */}
                  {activeHistoryTab === 'sales' && (
                    <div className="space-y-3">
                      {filteredSales.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                          Belum ada transaksi penjualan kasir untuk produk ini.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2.5">Waktu Transaksi</th>
                                <th className="px-3.5 py-2.5">No Invoice / TRX</th>
                                <th className="px-3.5 py-2.5">Pembeli</th>
                                <th className="px-3.5 py-2.5">Metode Bayar</th>
                                <th className="px-3.5 py-2.5 text-center">Qty Terjual</th>
                                <th className="px-3.5 py-2.5 text-right">Harga Jual</th>
                                <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredSales.map((s) => (
                                <tr key={s.item_id} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {s.transaction_at ? new Date(s.transaction_at).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                                    #TRX-{s.sales_transaction_id}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-700">
                                    <div>
                                      <p className="font-semibold">{s.buyer_name || 'Pelanggan Umum'}</p>
                                      <span className="text-[10px] text-slate-400 capitalize">
                                        {s.buyer_type === 'student' ? 'Siswa / Santri' : (s.buyer_type === 'staff' ? 'Guru / Karyawan' : 'Umum')}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                                      {s.payment_method || 'Tunai'}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-700">
                                    {s.qty} {historyModalProduct.unit}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                                    {formatCurrency(s.sale_price || 0)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                                    {formatCurrency(s.subtotal_price || (Number(s.qty) * Number(s.sale_price)))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Sub-tab: Riwayat Retur Produk */}
                  {activeHistoryTab === 'returns' && (
                    <div className="space-y-3">
                      {filteredReturns.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                          Tidak ada catatan retur untuk produk ini.
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3.5 py-2.5">Waktu Retur</th>
                                <th className="px-3.5 py-2.5">No Referensi</th>
                                <th className="px-3.5 py-2.5">Jenis Retur</th>
                                <th className="px-3.5 py-2.5 text-center">Jumlah Diretur</th>
                                <th className="px-3.5 py-2.5">Catatan / Alasan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredReturns.map((ret) => (
                                <tr key={ret.return_id} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    {ret.returned_at ? new Date(ret.returned_at).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                                    #RET-{ret.return_id}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                      {ret.return_type === 'sisa' ? 'Sisa Titipan / Konsinyasi' : 'Barang Rusak / Kadaluarsa'}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-700">
                                    {ret.qty} {historyModalProduct.unit}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-600 text-[11px]">
                                    {ret.note || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/95 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Data terintegrasi realtime dengan modul Kasir POS, Penerimaan Barang, dan Gudang Kantin.
              </span>
              <button
                type="button"
                onClick={() => {
                  setHistoryModalProduct(null);
                  setHistoryData(null);
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs"
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
