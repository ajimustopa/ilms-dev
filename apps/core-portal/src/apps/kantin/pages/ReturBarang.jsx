import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  RotateCcw,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  X,
  AlertOctagon
} from 'lucide-react';

export default function ReturBarang() {
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendor_product_id: '',
    qty: '1',
    reason: 'sisa_tidak_laku',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRet, resProd] = await Promise.all([
        api.get('/kantin/product-returns'),
        api.get('/kantin/vendor-products?status=active')
      ]);
      setReturns(resRet.data?.data || []);
      setProducts(resProd.data?.data || []);

      if (resProd.data?.data?.length > 0) {
        setFormData(prev => ({ ...prev, vendor_product_id: resProd.data.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching product returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setFormData({
      vendor_product_id: products[0]?.id || '',
      qty: '1',
      reason: 'sisa_tidak_laku',
      note: ''
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
        vendor_product_id: Number(formData.vendor_product_id),
        qty: Number(formData.qty)
      };

      await api.post('/kantin/product-returns', payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat retur barang');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = returns.filter(r =>
    r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Retur Barang & Produk Rusak/Sisa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pengembalian barang titipan tidak laku ke vendor atau penghapusan produk rusak/kedaluwarsa
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Catat Retur Baru</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk, vendor, alasan retur..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filtered.length}</span> Catatan Retur
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data retur...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk & Barcode</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Jumlah (Qty)</th>
                  <th className="px-4 py-3">Alasan Retur</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Waktu Pencatatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{ret.product_name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{ret.barcode || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{ret.vendor || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      -{ret.qty} {ret.unit || 'pcs'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          ret.reason === 'rusak'
                            ? 'bg-rose-100 text-rose-800'
                            : ret.reason === 'expired'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ret.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{ret.note || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {ret.created_at ? new Date(ret.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                      Belum ada riwayat retur barang
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Retur */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Catat Retur Barang</h3>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Produk</label>
                <select
                  value={formData.vendor_product_id}
                  onChange={(e) => setFormData({ ...formData, vendor_product_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} (Sisa Stok: {p.current_stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Retur (Qty)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Retur</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="sisa_tidak_laku">Sisa Tidak Laku</option>
                    <option value="rusak">Barang Rusak / Cacat</option>
                    <option value="expired">Kedaluwarsa (Expired)</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Keterangan kondisi kemasan/retur..."
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
                  {submitting ? 'Memproses...' : 'Simpan Retur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
