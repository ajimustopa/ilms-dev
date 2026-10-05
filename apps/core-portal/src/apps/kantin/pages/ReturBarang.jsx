import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  RotateCcw,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Boxes,
  Calendar,
  CalendarDays,
  Tag,
  Store,
  ArrowRight,
  TrendingDown,
  Layers,
  Info,
  ShieldAlert,
  ShoppingCart,
  ReceiptText
} from 'lucide-react';

const formatNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('id-ID');
};

export default function ReturBarang() {
  const [returns, setReturns] = useState([]);
  const [eligibleProducts, setEligibleProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'sisa' | 'rusak'
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedReceiptItemId, setSelectedReceiptItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [returnType, setReturnType] = useState('sisa'); // 'sisa' | 'rusak'
  const [note, setNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRet, resEligible] = await Promise.all([
        api.get('/kantin/product-returns'),
        api.get('/kantin/product-returns/eligible-items')
      ]);
      setReturns(resRet.data?.data || []);
      setEligibleProducts(resEligible.data?.data || []);
    } catch (err) {
      console.error('Error fetching product returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Opsi dropdown Produk untuk SearchableSelect
  const productOptions = useMemo(() => {
    return eligibleProducts.map(p => {
      const isOutOfStock = p.current_stock <= 0;
      return {
        value: p.product_id,
        label: p.product_name,
        sublabel: `Vendor: ${p.vendor_name || 'Umum'} • Sisa Stok: ${p.current_stock} ${p.unit} (Terjual: ${p.total_sold})`,
        badge: isOutOfStock ? 'Stok Habis (0)' : `Sisa ${p.current_stock} ${p.unit}`,
        badgeClass: isOutOfStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
      };
    });
  }, [eligibleProducts]);

  // Detail produk yang sedang dipilih di form
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return eligibleProducts.find(p => String(p.product_id) === String(selectedProductId)) || null;
  }, [eligibleProducts, selectedProductId]);

  // Daftar batch penerimaan dari produk terpilih
  const availableBatches = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.receipt_batches || [];
  }, [selectedProduct]);

  // Batch penerimaan yang sedang dipilih (opsional spesifik batch)
  const selectedBatch = useMemo(() => {
    if (!selectedReceiptItemId) return null;
    return availableBatches.find(b => String(b.goods_receipt_item_id) === String(selectedReceiptItemId)) || null;
  }, [availableBatches, selectedReceiptItemId]);

  // Perhitungan stok dan sisa yang bisa diretur
  const maxReturnableQty = useMemo(() => {
    if (!selectedProduct) return 0;
    return Math.max(0, Number(selectedProduct.current_stock || 0));
  }, [selectedProduct]);

  const openCreateModal = () => {
    const firstWithStock = eligibleProducts.find(p => p.current_stock > 0) || eligibleProducts[0];
    const initialProdId = firstWithStock ? firstWithStock.product_id : '';
    setSelectedProductId(initialProdId);

    const batches = firstWithStock?.receipt_batches || [];
    setSelectedReceiptItemId(batches.length > 0 ? String(batches[0].goods_receipt_item_id) : '');
    setQty(firstWithStock && firstWithStock.current_stock > 0 ? String(Math.min(firstWithStock.current_stock, 1)) : '1');
    setReturnType('sisa');
    setNote('');
    setError(null);
    setShowModal(true);
  };

  const handleProductChange = (prodId) => {
    setSelectedProductId(prodId);
    const prod = eligibleProducts.find(p => String(p.product_id) === String(prodId));
    const batches = prod?.receipt_batches || [];
    setSelectedReceiptItemId(batches.length > 0 ? String(batches[0].goods_receipt_item_id) : '');
    const stock = Number(prod?.current_stock || 0);
    setQty(stock > 0 ? '1' : '0');
  };

  const handleSetMaxQty = () => {
    if (maxReturnableQty > 0) {
      setQty(String(maxReturnableQty));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const returnQtyNum = Number(qty);
    if (!selectedProductId) {
      setError('Silakan pilih produk yang akan diretur.');
      return;
    }

    if (returnQtyNum <= 0) {
      setError('Jumlah retur harus lebih besar dari 0.');
      return;
    }

    if (returnQtyNum > maxReturnableQty) {
      setError(`Jumlah retur (${returnQtyNum}) tidak boleh melebihi sisa stok yang tersedia (${maxReturnableQty} ${selectedProduct?.unit || 'pcs'}).`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        vendor_product_id: Number(selectedProductId),
        goods_receipt_id: selectedBatch?.goods_receipt_id || null,
        goods_receipt_item_id: selectedBatch?.goods_receipt_item_id || null,
        batch_number: selectedBatch?.batch_number || null,
        return_type: returnType,
        qty: returnQtyNum,
        note: note.trim() || undefined
      };

      await api.post('/kantin/product-returns', payload);
      setSuccessMessage(`Berhasil mencatat retur ${returnQtyNum} ${selectedProduct?.unit || 'pcs'} ${selectedProduct?.product_name || 'produk'}.`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat retur barang.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list data tabel
  const filtered = useMemo(() => {
    return returns.filter(r => {
      const matchType = filterType === 'all' || r.return_type === filterType;
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.product_name?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.invoice_number?.toLowerCase().includes(q) ||
        r.batch_number?.toLowerCase().includes(q) ||
        r.item_batch_number?.toLowerCase().includes(q) ||
        r.note?.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [returns, filterType, search]);

  // Statistik Ringkasan Retur
  const stats = useMemo(() => {
    const totalRecords = returns.length;
    const totalQtyReturned = returns.reduce((acc, r) => acc + Number(r.qty || 0), 0);
    const countSisa = returns.filter(r => r.return_type === 'sisa').reduce((acc, r) => acc + Number(r.qty || 0), 0);
    const countRusak = returns.filter(r => r.return_type === 'rusak').reduce((acc, r) => acc + Number(r.qty || 0), 0);
    return { totalRecords, totalQtyReturned, countSisa, countRusak };
  }, [returns]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200/60">
              <RotateCcw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Retur Barang &amp; Pengembalian Titipan</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan pengembalian sisa barang konsinyasi vendor atau penghapusan barang rusak/kadaluarsa
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Catat Retur Barang Baru</span>
        </button>
      </div>

      {/* Banner Feedback Sukses */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Total Pencatatan Retur</span>
            <ReceiptText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-800">{stats.totalRecords} <span className="text-xs font-normal text-slate-500">transaksi</span></p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Total Unit Dikembalikan</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-700 font-mono">-{formatNumber(stats.totalQtyReturned)} <span className="text-xs font-normal text-slate-500">pcs</span></p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Sisa Titipan Tak Laku</span>
            <Boxes className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">{formatNumber(stats.countSisa)} <span className="text-xs font-normal text-slate-500">pcs</span></p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Barang Rusak / Basi</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-600 font-mono">{formatNumber(stats.countRusak)} <span className="text-xs font-normal text-slate-500">pcs</span></p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk, vendor, No. Surat Jalan, No. Batch..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Filter Jenis:</span>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sisa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterType === 'sisa'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sisa Titipan
            </button>
            <button
              type="button"
              onClick={() => setFilterType('rusak')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterType === 'rusak'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rusak / Basi
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium pl-2 border-l border-slate-200">
            Total: <strong className="text-slate-700">{filtered.length}</strong> Riwayat
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Retur */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Memuat data riwayat retur barang...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Produk &amp; Batch</th>
                  <th className="px-4 py-3.5">Vendor</th>
                  <th className="px-4 py-3.5">Barang Diterima Kapan (Asal Penerimaan)</th>
                  <th className="px-4 py-3.5 text-center">Jumlah Diretur</th>
                  <th className="px-4 py-3.5">Jenis / Alasan</th>
                  <th className="px-4 py-3.5">Catatan &amp; Waktu Retur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ret) => {
                  const displayBatch = ret.batch_number || ret.item_batch_number;
                  const displayReceiptDate = ret.receipt_date ? formatDate(ret.receipt_date) : null;

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/70 transition">
                      {/* Produk */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 text-xs">{ret.product_name}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          {displayBatch && (
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] border border-slate-200">
                              Batch: {displayBatch}
                            </span>
                          )}
                          {ret.barcode && (
                            <span className="font-mono text-slate-400">Barcode: {ret.barcode}</span>
                          )}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{ret.vendor || '-'}</span>
                        </div>
                      </td>

                      {/* Diterima Kapan & Asal Penerimaan */}
                      <td className="px-4 py-3.5">
                        {displayReceiptDate ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Diterima: {displayReceiptDate}</span>
                            </div>
                            {ret.invoice_number && (
                              <p className="text-[10px] font-mono text-slate-500 pl-5">
                                No. Surat Jalan: <span className="font-semibold text-slate-700">{ret.invoice_number}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Penerimaan Umum / Langsung</span>
                        )}
                      </td>

                      {/* Jumlah Diretur */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                          -{ret.qty} {ret.unit || 'pcs'}
                        </span>
                      </td>

                      {/* Jenis / Alasan */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            ret.return_type === 'rusak'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ret.return_type === 'rusak' ? 'Barang Rusak / Basi' : 'Sisa Titipan Tak Laku'}
                        </span>
                      </td>

                      {/* Catatan & Waktu */}
                      <td className="px-4 py-3.5 text-slate-500">
                        <p className="text-xs text-slate-700">{ret.note || '-'}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {ret.returned_at ? new Date(ret.returned_at).toLocaleString('id-ID') : '-'}
                        </p>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-14 text-center text-slate-400">
                      <RotateCcw className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                      <p className="font-semibold text-slate-600">Tidak ada riwayat retur barang yang cocok</p>
                      <p className="text-xs text-slate-400 mt-0.5">Silakan sesuaikan filter pencarian atau catat retur baru.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Catat Retur Barang Lengkap & Jelas */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Formulir Retur Barang ke Vendor</h3>
                  <p className="text-[11px] text-slate-500">Pilih barang, periksa riwayat penerimaan &amp; sisa stok sebelum retur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dropdown Pilih Produk */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  1. Pilih Produk yang Akan Diretur <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onChange={handleProductChange}
                  placeholder="-- Cari & Pilih Produk --"
                  searchPlaceholder="Ketik nama produk atau vendor..."
                  accentColor="emerald"
                  required
                />
              </div>

              {/* Pilih Riwayat / Asal Penerimaan Barang */}
              {selectedProduct && availableBatches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2. Pilih Asal Penerimaan &amp; Tanggal Masuk Produk</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Riwayat Penerimaan</span>
                  </label>
                  <select
                    value={selectedReceiptItemId}
                    onChange={(e) => setSelectedReceiptItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    {availableBatches.map((batch, bIdx) => (
                      <option key={batch.goods_receipt_item_id} value={batch.goods_receipt_item_id}>
                        Diterima: {batch.receipt_date ? formatDate(batch.receipt_date) : 'Tidak Tercatat'} • {batch.invoice_number ? `SJ: ${batch.invoice_number}` : 'Tanpa SJ'} {batch.batch_number ? `• Batch: ${batch.batch_number}` : ''} (Masuk Awal: {batch.qty_received} {selectedProduct.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* KARTU TRANSPARANSI STOK & PENJUALAN (SISA YANG BISA DIRETUR) */}
              {selectedProduct && (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600" />
                      <span>Rincian Stok Produk ({selectedProduct.product_name})</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      Vendor: <strong className="text-slate-800">{selectedProduct.vendor_name || 'Umum'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Total Diterima */}
                    <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-500 block font-medium">Total Diterima:</span>
                      <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                        +{formatNumber(selectedProduct.total_received)} {selectedProduct.unit}
                      </p>
                    </div>

                    {/* Total Terjual */}
                    <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-500 block font-medium">Terjual (Kasir POS):</span>
                      <p className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                        -{formatNumber(selectedProduct.total_sold)} {selectedProduct.unit}
                      </p>
                    </div>

                    {/* Total Pernah Diretur */}
                    <div className="p-2.5 bg-white/90 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-500 block font-medium">Sudah Diretur:</span>
                      <p className="text-sm font-bold text-amber-700 font-mono mt-0.5">
                        -{formatNumber(selectedProduct.total_returned)} {selectedProduct.unit}
                      </p>
                    </div>

                    {/* SISA STOK YANG BISA DIRETUR */}
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-2xs">
                      <span className="text-[10px] text-emerald-100 block font-semibold">Sisa Bisa Diretur:</span>
                      <p className="text-sm font-extrabold font-mono mt-0.5">
                        {formatNumber(maxReturnableQty)} {selectedProduct.unit}
                      </p>
                    </div>
                  </div>

                  {maxReturnableQty <= 0 && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Sisa stok untuk produk ini adalah <strong>0 {selectedProduct.unit}</strong> (semua stok telah habis terjual / sudah diretur sebelumnya).</span>
                    </div>
                  )}
                </div>
              )}

              {/* Input Jumlah & Alasan Retur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Jumlah yang Diretur ({selectedProduct?.unit || 'pcs'}) <span className="text-rose-500">*</span>
                    </label>
                    {maxReturnableQty > 0 && (
                      <button
                        type="button"
                        onClick={handleSetMaxQty}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md hover:underline cursor-pointer"
                        title="Pilih seluruh sisa stok yang ada"
                      >
                        Semua Sisa ({maxReturnableQty})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={maxReturnableQty > 0 ? maxReturnableQty : 1}
                    required
                    disabled={maxReturnableQty <= 0}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Maksimal yang bisa diretur: {maxReturnableQty} {selectedProduct?.unit || 'pcs'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Jenis / Alasan Retur <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={returnType}
                    onChange={(e) => setReturnType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="sisa">Sisa Titipan (Konsinyasi Tidak Laku)</option>
                    <option value="rusak">Barang Rusak / Basi / Kadaluarsa</option>
                  </select>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Titipan sore tidak habis diambil kembali oleh kurir / kemasan sobek"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || maxReturnableQty <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Retur...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Proses Retur</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
