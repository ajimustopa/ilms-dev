import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
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
  Store
} from 'lucide-react';

export default function PenerimaanBarang() {
  const [receipts, setReceipts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [receiptType, setReceiptType] = useState('titipan'); // 'titipan' | 'belanja'
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [items, setItems] = useState([
    { vendor_product_id: '', qty: 10, cost_price: 3000, sale_price: 5000, expired_at: '' }
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

      if (resVen.data?.data?.length > 0) setSelectedVendorId(resVen.data.data[0].id);
      if (resProd.data?.data?.length > 0) {
        setItems([{ vendor_product_id: resProd.data.data[0].id, qty: 10, cost_price: 3000, sale_price: 5000, expired_at: '' }]);
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

  const openCreateModal = () => {
    setReceiptType('titipan');
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setNote('');
    if (products.length > 0) {
      setItems([{ vendor_product_id: products[0].id, qty: 10, cost_price: 3000, sale_price: 5000, expired_at: '' }]);
    }
    setError(null);
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setItems(prev => [
      ...prev,
      { vendor_product_id: products[0].id, qty: 10, cost_price: 3000, sale_price: 5000, expired_at: '' }
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        receipt_type: receiptType,
        vendor_id: receiptType === 'titipan' ? Number(selectedVendorId) : null,
        receipt_date: receiptDate,
        note,
        items: items.map(item => ({
          vendor_product_id: Number(item.vendor_product_id),
          qty: Number(item.qty),
          cost_price: parseFloat(item.cost_price),
          sale_price: parseFloat(item.sale_price),
          expired_at: item.expired_at || null
        }))
      };

      await api.post('/kantin/goods-receipts', payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan penerimaan barang');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const filtered = receipts.filter(r =>
    r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.note?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Penerimaan Barang Masuk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pasokan barang titipan konsinyasi vendor & belanja operasional untuk menambah stok kantin
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Catat Barang Masuk</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor dokumen, vendor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filtered.length}</span> Dokumen Penerimaan
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data penerimaan barang...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Dokumen</th>
                  <th className="px-4 py-3">Jenis Pasokan</th>
                  <th className="px-4 py-3">Vendor / Pemasok</th>
                  <th className="px-4 py-3">Tanggal Terima</th>
                  <th className="px-4 py-3">Rincian Item</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {r.receipt_number || `#RCV-${r.id}`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.receipt_type === 'titipan'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.receipt_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.vendor || 'Belanja Sendiri'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {r.receipt_date ? r.receipt_date.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {r.items?.map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-600">
                            <span className="font-bold text-slate-800">{it.product_name}</span>: {it.qty} {it.unit} @ Beli: {formatRupiah(it.cost_price)} | Jual: {formatRupiah(it.sale_price)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.note || '-'}</td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                      Belum ada catatan penerimaan barang
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Catat Penerimaan Barang Masuk</h3>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Pasokan</label>
                  <select
                    value={receiptType}
                    onChange={(e) => setReceiptType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="titipan">Titipan Konsinyasi</option>
                    <option value="belanja">Belanja Mandiri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Mitra</label>
                  <select
                    disabled={receiptType === 'belanja'}
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-50"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Terima</label>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Items Dynamic List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Daftar Produk Masuk</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-amber-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {items.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Produk</label>
                        <select
                          value={row.vendor_product_id}
                          onChange={(e) => handleItemChange(idx, 'vendor_product_id', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Jumlah (Qty)</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={row.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Harga Beli</label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={row.cost_price}
                          onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Harga Jual</label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={row.sale_price}
                          onChange={(e) => handleItemChange(idx, 'sale_price', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-800"
                        />
                      </div>

                      <div className="col-span-2 flex items-center gap-1">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kedaluwarsa</label>
                          <input
                            type="date"
                            value={row.expired_at}
                            onChange={(e) => handleItemChange(idx, 'expired_at', e.target.value)}
                            className="w-full px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px]"
                          />
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 mt-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / No. Resi Vendor</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keterangan pasokan barang..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Simpan Penerimaan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
