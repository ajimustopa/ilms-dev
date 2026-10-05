import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import {
  PackagePlus,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  Store,
  ShoppingBag,
  Coins,
  Boxes,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  Tag,
  Copy,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';

/**
 * Helper menghitung status kelayakan tanggal kadaluarsa
 */
export function getExpiryInfo(expired_at) {
  if (!expired_at) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expired_at);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      days: diffDays,
      label: `Kadaluarsa (${Math.abs(diffDays)} hari lalu)`,
      shortLabel: `Expired ${Math.abs(diffDays)}h lalu`,
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      isWarning: true
    };
  }
  if (diffDays === 0) {
    return {
      status: 'today',
      days: 0,
      label: 'Kadaluarsa Hari Ini!',
      shortLabel: 'Exp Hari Ini',
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-extrabold animate-pulse',
      isWarning: true
    };
  }
  if (diffDays <= 7) {
    return {
      status: 'critical',
      days: diffDays,
      label: `Kritis: Sisa ${diffDays} hari lagi`,
      shortLabel: `Exp ${diffDays} hari`,
      badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200 font-bold',
      isWarning: true
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'warning',
      days: diffDays,
      label: `Mendekati: Sisa ${diffDays} hari lagi`,
      shortLabel: `Exp ${diffDays} hari`,
      badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300 font-bold',
      isWarning: false
    };
  }
  return {
    status: 'good',
    days: diffDays,
    label: `Aman / Layak (${diffDays} hari lagi)`,
    shortLabel: `Exp: ${String(expired_at).slice(0, 10)}`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium',
    isWarning: false
  };
}

export default function PenerimaanBarang() {
  const [receipts, setReceipts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'titipan' | 'belanja_sendiri'
  const [expiryFilter, setExpiryFilter] = useState('all'); // 'all' | 'warning' | 'good'
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper generate No. Batch / Lot otomatis berbasis tanggal dan urutan item (misal: LOT-20261004-01)
  const generateBatchNumber = (dateStr, seq = 1) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    const month = String(isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1).padStart(2, '0');
    const day = String(isNaN(d.getTime()) ? new Date().getDate() : d.getDate()).padStart(2, '0');
    const dateFormatted = `${year}${month}${day}`;
    const seqFormatted = String(seq).padStart(2, '0');
    return `LOT-${dateFormatted}-${seqFormatted}`;
  };

  // Helper generate No. Surat Jalan / Faktur otomatis (misal: SJ-20261004-001)
  const generateInvoiceNumber = (dateStr, receiptsList = receipts) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    const month = String(isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1).padStart(2, '0');
    const day = String(isNaN(d.getTime()) ? new Date().getDate() : d.getDate()).padStart(2, '0');
    const dateCompact = `${year}${month}${day}`;

    const datePrefix = `${year}-${month}-${day}`;
    const countSameDay = (receiptsList || []).filter(r => (r.receipt_date || '').startsWith(datePrefix)).length + 1;
    const seq = String(countSameDay).padStart(3, '0');
    return `SJ-${dateCompact}-${seq}`;
  };

  // Form State
  const [receiptType, setReceiptType] = useState('titipan'); // 'titipan' | 'belanja_sendiri'
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [items, setItems] = useState([
    {
      vendor_product_id: '',
      qty: 10,
      cost_price: 0,
      sale_price: 0,
      batch_number: generateBatchNumber(new Date().toISOString().slice(0, 10), 1),
      expired_at: ''
    }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRec, resVen, resProd] = await Promise.all([
        api.get('/kantin/goods-receipts'),
        api.get('/kantin/vendors?status=active'),
        api.get('/kantin/vendor-products?status=active')
      ]);
      setReceipts(resRec.data?.data || []);
      setVendors(resVen.data?.data || []);
      setProducts(resProd.data?.data || []);

      if (resVen.data?.data?.length > 0 && !selectedVendorId) {
        setSelectedVendorId(resVen.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching goods receipts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dropdown options yang diformat untuk SearchableSelect
  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id,
      label: v.vendor_name,
      sublabel: v.contact ? `Kontak: ${v.contact}` : (v.address || undefined),
      badge: (v.vendor_type || 'konsinyasi') === 'beli_putus' 
        ? 'Beli Putus (Suplier)' 
        : (v.canteen_share_pct ? `Konsinyasi ${v.canteen_share_pct}%` : 'Konsinyasi'),
      badgeClass: (v.vendor_type || 'konsinyasi') === 'beli_putus'
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }));
  }, [vendors]);

  const productOptions = useMemo(() => {
    const filtered = selectedVendorId
      ? products.filter(p => String(p.vendor_id) === String(selectedVendorId))
      : products;

    return filtered.map(p => ({
      value: p.id,
      label: p.product_name,
      sublabel: `Stok saat ini: ${p.current_stock || 0} ${p.unit || 'pcs'} • HPP: Rp ${formatNumber(p.cost_price || 0)}`,
      badge: p.category || undefined,
      badgeClass: 'bg-slate-100 text-slate-700'
    }));
  }, [products, selectedVendorId]);

  const openCreateModal = () => {
    setReceiptType('titipan');
    const firstVendorId = vendors[0]?.id || '';
    setSelectedVendorId(firstVendorId);
    const today = new Date().toISOString().slice(0, 10);
    setReceiptDate(today);
    setInvoiceNumber(generateInvoiceNumber(today, receipts));
    setNote('');

    const vendorProds = firstVendorId
      ? products.filter(p => String(p.vendor_id) === String(firstVendorId))
      : products;
    const defaultProd = vendorProds[0];

    setItems([{
      vendor_product_id: defaultProd ? defaultProd.id : '',
      qty: 10,
      cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
      sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
      batch_number: generateBatchNumber(today, 1),
      expired_at: ''
    }]);

    setError(null);
    setShowModal(true);
  };

  const handleReceiptDateChange = (newDate) => {
    setReceiptDate(newDate);
    if (newDate) {
      // Jika invoiceNumber kosong atau masih memakai format otomatis default SJ-YYYYMMDD-XXX, update tanggalnya
      if (!invoiceNumber || /^SJ-\d{8}-\d+/.test(invoiceNumber)) {
        setInvoiceNumber(generateInvoiceNumber(newDate, receipts));
      }

      setItems(prev => prev.map((item, idx) => {
        // Jika batch kosong atau masih memakai format otomatis default LOT-YYYYMMDD-XX, update tanggalnya
        if (!item.batch_number || /^LOT-\d{8}-\d+/.test(item.batch_number)) {
          const suffix = item.batch_number?.match(/-B\d+$/)?.[0] || '';
          return {
            ...item,
            batch_number: `${generateBatchNumber(newDate, idx + 1)}${suffix}`
          };
        }
        return item;
      }));
    }
  };

  const handleVendorChange = (newVendorId) => {
    setSelectedVendorId(newVendorId);
    const vendorProds = products.filter(p => String(p.vendor_id) === String(newVendorId));
    const defaultProd = vendorProds[0];

    setItems(prev => prev.map((it, idx) => {
      const belongs = vendorProds.some(p => String(p.id) === String(it.vendor_product_id));
      if (belongs) {
        return {
          ...it,
          batch_number: it.batch_number || generateBatchNumber(receiptDate, idx + 1)
        };
      }
      return {
        ...it,
        vendor_product_id: defaultProd ? defaultProd.id : '',
        cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
        sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
        batch_number: it.batch_number || generateBatchNumber(receiptDate, idx + 1)
      };
    }));
  };

  const handleAddItemRow = () => {
    const vendorProds = selectedVendorId
      ? products.filter(p => String(p.vendor_id) === String(selectedVendorId))
      : products;
    const defaultProd = vendorProds[0];
    const nextSeq = items.length + 1;
    setItems(prev => [
      ...prev,
      {
        vendor_product_id: defaultProd ? defaultProd.id : '',
        qty: 10,
        cost_price: defaultProd ? Number(defaultProd.cost_price) || 0 : 0,
        sale_price: defaultProd ? Number(defaultProd.sale_price) || 0 : 0,
        batch_number: generateBatchNumber(receiptDate, nextSeq),
        expired_at: ''
      }
    ]);
  };

  // Duplikasi baris untuk produk yang sama dengan tanggal kadaluarsa / batch berbeda
  const handleDuplicateBatchRow = (idx) => {
    const source = items[idx];
    const nextSeq = items.length + 1;
    const duplicateBatch = source.batch_number
      ? (source.batch_number.includes('-B') 
          ? source.batch_number.replace(/-B(\d+)$/, (_, n) => `-B${Number(n) + 1}`) 
          : `${source.batch_number}-B2`)
      : generateBatchNumber(receiptDate, nextSeq);

    setItems(prev => [
      ...prev.slice(0, idx + 1),
      {
        vendor_product_id: source.vendor_product_id,
        qty: source.qty || 10,
        cost_price: source.cost_price || 0,
        sale_price: source.sale_price || 0,
        batch_number: duplicateBatch,
        expired_at: ''
      },
      ...prev.slice(idx + 1)
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'vendor_product_id') {
        const prod = products.find(p => String(p.id) === String(value));
        if (prod) {
          if (prod.cost_price !== undefined) updated.cost_price = Number(prod.cost_price) || 0;
          if (prod.sale_price !== undefined) updated.sale_price = Number(prod.sale_price) || 0;
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const validItems = items.filter(it => it.vendor_product_id && Number(it.qty) > 0);
      if (validItems.length === 0) {
        throw new Error('Pilih minimal 1 produk dengan jumlah lebih dari 0.');
      }

      const payload = {
        receipt_type: receiptType,
        vendor_id: selectedVendorId ? Number(selectedVendorId) : null,
        invoice_number: invoiceNumber || undefined,
        receipt_date: receiptDate,
        note,
        items: validItems.map(item => ({
          vendor_product_id: Number(item.vendor_product_id),
          qty: Number(item.qty),
          cost_price: parseFloat(item.cost_price) || 0,
          sale_price: parseFloat(item.sale_price) || 0,
          batch_number: item.batch_number ? String(item.batch_number).trim() : null,
          expired_at: item.expired_at || null
        }))
      };

      await api.post('/kantin/goods-receipts', payload);
      setSuccessMessage(`Penerimaan barang berhasil dicatat (${validItems.length} baris produk & batch masuk).`);
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan penerimaan barang');
    } finally {
      setSubmitting(false);
    }
  };

  // Ringkasan kalkulasi modal
  const summary = useMemo(() => {
    let totalQty = 0;
    let totalCost = 0;
    let totalSale = 0;

    items.forEach(it => {
      const q = Number(it.qty) || 0;
      const c = Number(it.cost_price) || 0;
      const s = Number(it.sale_price) || 0;
      totalQty += q;
      totalCost += q * c;
      totalSale += q * s;
    });

    return {
      itemCount: items.length,
      totalQty,
      totalCost,
      totalSale,
      potentialProfit: totalSale - totalCost
    };
  }, [items]);

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      r.vendor?.toLowerCase().includes(q) ||
      r.invoice_number?.toLowerCase().includes(q) ||
      r.receipt_number?.toLowerCase().includes(q) ||
      r.note?.toLowerCase().includes(q) ||
      r.items?.some(it => 
        it.product_name?.toLowerCase().includes(q) ||
        it.batch_number?.toLowerCase().includes(q)
      );

    const matchType = filterType === 'all' || r.receipt_type === filterType;

    let matchExpiry = true;
    if (expiryFilter === 'warning') {
      matchExpiry = r.items?.some(it => {
        const exp = getExpiryInfo(it.expired_at);
        return exp && exp.isWarning;
      });
    } else if (expiryFilter === 'good') {
      matchExpiry = r.items?.every(it => {
        const exp = getExpiryInfo(it.expired_at);
        return !exp || exp.status === 'good';
      });
    }

    return matchSearch && matchType && matchExpiry;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <span>Penerimaan Barang Masuk &amp; Kontrol Kadaluarsa</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pasokan barang konsinyasi &amp; belanja mandiri dengan pelacakan nomor batch, tanggal kadaluarsa (FEFO), dan status kelayakan produk.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Penerimaan Barang</span>
        </button>
      </div>

      {successMessage && (
        <FlatAlertBanner
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari faktur, produk, vendor, batch..."
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

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Jenis Pasokan</option>
            <option value="titipan">Titipan Konsinyasi</option>
            <option value="belanja_sendiri">Belanja Mandiri</option>
          </select>

          {/* Filter Status Kadaluarsa */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Status Kadaluarsa</option>
            <option value="warning">⚠️ Ada Item Kritis / Kadaluarsa</option>
            <option value="good">✓ Semua Item Aman / Layak</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium shrink-0">
          Total: <span className="font-bold text-slate-700">{filtered.length}</span> Dokumen Penerimaan
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data penerimaan barang...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Dokumen</th>
                  <th className="px-4 py-3">Jenis Pasokan</th>
                  <th className="px-4 py-3">Vendor / Suplier</th>
                  <th className="px-4 py-3">Tgl. Terima</th>
                  <th className="px-4 py-3 min-w-[320px]">Rincian Item, Batch &amp; Tanggal Kadaluarsa</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const isInitialStock = r.invoice_number?.startsWith('RCV-AWAL');
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[12px]">{r.invoice_number || r.receipt_number || `#RCV-${r.id}`}</span>
                          {isInitialStock && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Stok Awal
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            r.receipt_type === 'titipan'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-blue-50 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {r.receipt_type === 'titipan' ? (
                            <>
                              <Store className="w-3 h-3 text-amber-600" />
                              <span>Titipan Konsinyasi</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3 h-3 text-blue-600" />
                              <span>Belanja Mandiri</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800 align-top">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{r.vendor || 'Pengadaan Mandiri'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-mono align-top text-[11px]">
                        {r.receipt_date ? String(r.receipt_date).slice(0, 10) : '-'}
                      </td>

                      {/* Rincian Produk & Batch Expiry */}
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          {r.items?.map((it, idx) => {
                            const expInfo = getExpiryInfo(it.expired_at);
                            return (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-700 bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-slate-900 font-bold">{it.product_name}</strong>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold">
                                      {it.qty} {it.unit || 'pcs'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                                    <span>HPP: Rp {formatNumber(it.cost_price)}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">Jual: Rp {formatNumber(it.sale_price)}</span>
                                  </div>
                                </div>

                                <div className="flex items-center flex-wrap gap-2 pt-0.5 border-t border-slate-200/40 text-[10px]">
                                  {it.batch_number && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                                      Batch: <strong>{it.batch_number}</strong>
                                    </span>
                                  )}

                                  {expInfo ? (
                                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${expInfo.badgeClass}`}>
                                      <CalendarDays className="w-3 h-3" />
                                      <span>{expInfo.label}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Tanpa Tanggal Expired</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 align-top max-w-xs">
                        <p className="truncate">{r.note || '-'}</p>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                      {receipts.length === 0 ? 'Belum ada catatan penerimaan barang' : 'Tidak ada dokumen yang cocok dengan filter'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Input Penerimaan Barang */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden my-auto transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
                  <PackagePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Catat Penerimaan Barang &amp; Kontrol Kadaluarsa</h3>
                  <p className="text-[11px] text-emerald-100/90 font-normal">
                    Dukung multi-batch produk sama dengan tanggal kadaluarsa berbeda untuk kontrol kelayakan (FEFO)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
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
                {/* Seksi 1: Metadata Dokumen Pasokan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Informasi Dokumen Penerimaan</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Tentukan jenis dan asal pasokan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Segmented Radio: Jenis Pasokan */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Jenis Pasokan Barang <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReceiptType('titipan')}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer ${
                            receiptType === 'titipan'
                              ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Store className={`w-4 h-4 ${receiptType === 'titipan' ? 'text-amber-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className="leading-tight">Titipan Konsinyasi</p>
                            <span className="text-[10px] font-normal text-slate-500">Mitra titip jual bagi hasil</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReceiptType('belanja_sendiri')}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold transition cursor-pointer ${
                            receiptType === 'belanja_sendiri'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <ShoppingBag className={`w-4 h-4 ${receiptType === 'belanja_sendiri' ? 'text-blue-600' : 'text-slate-400'}`} />
                          <div className="text-left">
                            <p className="leading-tight">Belanja Mandiri / Beli Putus</p>
                            <span className="text-[10px] font-normal text-slate-500">Kantin belanja grosir lepas</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Vendor Dropdown */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pilih Mitra Vendor / Suplier Pemasok <span className="text-rose-500">*</span></span>
                      </label>
                      <SearchableSelect
                        options={vendorOptions}
                        value={selectedVendorId}
                        onChange={handleVendorChange}
                        placeholder="-- Pilih Vendor / Suplier --"
                        searchPlaceholder="Cari vendor atau suplier..."
                        accentColor="emerald"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tanggal Penerimaan <span className="text-rose-500">*</span></span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">DD/MM/YYYY</span>
                      </label>
                      <DatePickerField
                        value={receiptDate}
                        onChange={handleReceiptDateChange}
                        placeholder="DD/MM/YYYY"
                        required
                        className="w-full"
                        inputClassName="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>No. Surat Jalan / Faktur (Opsional)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setInvoiceNumber(generateInvoiceNumber(receiptDate, receipts))}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                          title="Generate ulang No. Surat Jalan otomatis"
                        >
                          Otomatis
                        </button>
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder={`Contoh: ${generateInvoiceNumber(receiptDate, receipts)}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Seksi 2: Daftar Item Produk Masuk & Multi-Batch Expiry */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>Daftar Produk &amp; Batch Kadaluarsa ({items.length} Baris)</span>
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Hanya menampilkan katalog produk yang terdaftar untuk vendor yang dipilih ({productOptions.length} produk tersedia).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris Produk</span>
                    </button>
                  </div>

                  {/* Warning jika Vendor Belum Punya Produk Terdaftar */}
                  {selectedVendorId && productOptions.length === 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Vendor ini belum memiliki katalog produk terdaftar:</strong>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Silakan daftarkan produk untuk vendor ini terlebih dahulu melalui menu <strong>Katalog Produk</strong> agar bisa dipilih pada penerimaan barang.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Info Banner Multi-Batch */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Mengakomodir Produk Sama dengan Tanggal Kadaluarsa Berbeda:</strong>
                      <p className="text-[10px] text-blue-700 mt-0.5">
                        Jika Anda menerima produk yang sama tetapi memiliki tanggal expired berbeda (misal 50 pcs exp Okt dan 30 pcs exp Nov), gunakan tombol <strong className="text-blue-900">+ Batch Baru</strong> di baris produk terkait untuk mencatat batch masing-masing.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {items.map((row, idx) => {
                      const rowTotalCost = (Number(row.qty) || 0) * (Number(row.cost_price) || 0);
                      const expInfo = getExpiryInfo(row.expired_at);

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50/90 hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs space-y-3 transition"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-700">Item / Batch #{idx + 1}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-emerald-800">
                                Subtotal HPP: Rp {formatNumber(rowTotalCost)}
                              </span>

                              {/* Tombol Duplikasi Batch untuk Produk yang Sama */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateBatchRow(idx)}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                title="Tambah batch kadaluarsa berbeda untuk produk yang sama"
                              >
                                <Copy className="w-3 h-3 text-blue-600" />
                                <span>+ Batch Baru</span>
                              </button>

                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            {/* Dropdown Produk */}
                            <div className="sm:col-span-12">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Pilih Produk <span className="text-rose-500">*</span>
                              </label>
                              <SearchableSelect
                                options={productOptions}
                                value={row.vendor_product_id}
                                onChange={(val) => handleItemChange(idx, 'vendor_product_id', val)}
                                placeholder="-- Cari & Pilih Produk --"
                                searchPlaceholder="Ketik nama produk..."
                                accentColor="emerald"
                                required
                              />
                            </div>

                            {/* Qty Masuk */}
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Jumlah (Qty) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={row.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>

                            {/* Harga Beli (HPP) */}
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Harga Beli (HPP)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-bold">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={100}
                                  required
                                  value={row.cost_price}
                                  onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Harga Jual POS */}
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                                Harga Jual Kasir
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-emerald-600 font-bold">Rp</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={100}
                                  required
                                  value={row.sale_price}
                                  onChange={(e) => handleItemChange(idx, 'sale_price', e.target.value)}
                                  className="w-full pl-8 pr-2 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-hidden focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Nomor Batch / Lot */}
                            <div className="sm:col-span-3">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  <span>No. Batch / Lot</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'batch_number', generateBatchNumber(receiptDate, idx + 1))}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline cursor-pointer"
                                  title="Generate ulang No. Batch otomatis"
                                >
                                  Otomatis
                                </button>
                              </label>
                              <input
                                type="text"
                                value={row.batch_number || ''}
                                onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                                placeholder={`Contoh: ${generateBatchNumber(receiptDate, idx + 1)}`}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>

                            {/* Tanggal Kadaluarsa */}
                            <div className="sm:col-span-3">
                              <label className="text-[11px] text-slate-700 font-semibold block mb-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-emerald-600" />
                                  <span>Tgl. Kadaluarsa</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">DD/MM/YYYY</span>
                              </label>
                              <DatePickerField
                                value={row.expired_at || ''}
                                onChange={(iso) => handleItemChange(idx, 'expired_at', iso)}
                                placeholder="DD/MM/YYYY"
                                className="w-full"
                                inputClassName="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Live Expiry Status Indicator Feedback */}
                          {expInfo && (
                            <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Status Kelayakan Produk:</span>
                              <span className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${expInfo.badgeClass}`}>
                                {expInfo.status === 'good' ? (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>{expInfo.label}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seksi 3: Ringkasan Nilai Penerimaan */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Qty Masuk</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">{summary.totalQty} Unit</span>
                    </div>
                    <div className="h-6 w-px bg-emerald-200/60" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Nilai Pembelian (HPP)</span>
                      <span className="font-bold text-emerald-800 font-mono text-sm">
                        Rp {formatNumber(summary.totalCost)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Estimasi Nilai Omzet Jual</span>
                    <span className="font-bold text-slate-700 font-mono">
                      Rp {formatNumber(summary.totalSale)}
                    </span>
                  </div>
                </div>

                {/* Seksi 4: Catatan Dokumen */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Penerimaan / Keterangan Pasokan
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Pasokan roti pagi, kondisi kemasan baik..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons (Sticky / Fixed Bottom) */}
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  {summary.itemCount} Baris Item/Batch • Total <strong className="text-emerald-700 font-mono">Rp {formatNumber(summary.totalCost)}</strong>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simpan Penerimaan Barang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

