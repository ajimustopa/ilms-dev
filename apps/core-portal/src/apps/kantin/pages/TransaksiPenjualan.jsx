import React, { useState, useEffect, useRef } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatters';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  ScanBarcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Wallet,
  Coins,
  QrCode,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Search,
  Receipt,
  X
} from 'lucide-react';

export default function TransaksiPenjualan() {
  const [products, setProducts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [cart, setCart] = useState([]);

  // Buyer Info
  const [buyerType, setBuyerType] = useState('student'); // 'student' | 'non_student'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [childPin, setChildPin] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'cash' | 'qris'
  const [discountAmount, setDiscountAmount] = useState(0);

  // Status & Receipt
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const barcodeInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resStu] = await Promise.all([
        api.get('/kantin/vendor-products?status=active'),
        api.get('/kantin/canteen-students?status=active')
      ]);
      setProducts(resProd.data?.data || []);
      setStudents(resStu.data?.data || []);

      if (resStu.data?.data?.length > 0) {
        setSelectedStudent(resStu.data.data[0]);
      }
    } catch (err) {
      console.error('Error fetching POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Barcode Scan on Enter
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const trimmed = barcodeInput.trim();
    // 1. Cek apakah ini QR Santri (misal QR-CANTIN-STU-001)
    const matchedStudent = students.find(s => s.qr_code === trimmed || String(s.student_id) === trimmed);
    if (matchedStudent) {
      setSelectedStudent(matchedStudent);
      setBuyerType('student');
      setBarcodeInput('');
      return;
    }

    // 2. Cek apakah ini Barcode Produk
    const matchedProduct = products.find(p => p.barcode === trimmed || String(p.id) === trimmed);
    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
    } else {
      alert(`Barcode "${trimmed}" tidak ditemukan pada daftar produk maupun santri!`);
      setBarcodeInput('');
    }
  };

  const addToCart = (product) => {
    if (product.current_stock <= 0) {
      alert(`Stok untuk produk "${product.product_name}" habis!`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.current_stock) {
          alert(`Maksimal stok tersedia: ${product.current_stock}`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        const salePrice = product.sale_price || 5000;
        return [...prevCart, { ...product, qty: 1, price: salePrice }];
      }
    });
  };

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      const prod = products.find(p => p.id === productId);
      if (prod && newQty > prod.current_stock) {
        alert(`Maksimal stok tersedia: ${prod.current_stock}`);
        return;
      }
      setCart(prev => prev.map(item => item.id === productId ? { ...item, qty: newQty } : item));
    }
  };

  const totalGross = cart.reduce((sum, item) => sum + (item.qty * (item.price || 5000)), 0);
  const finalTotal = Math.max(0, totalGross - (parseFloat(discountAmount) || 0));

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Keranjang belanja masih kosong');
      return;
    }

    if (buyerType === 'student' && !selectedStudent) {
      setError('Pilih santri pembeli terlebih dahulu');
      return;
    }

    if (buyerType === 'student' && paymentMethod === 'wallet' && !childPin) {
      setError('Masukkan 6-digit PIN Santri untuk pembayaran via dompet');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        buyer_type: buyerType,
        student_id: buyerType === 'student' ? selectedStudent.student_id : null,
        child_pin: buyerType === 'student' && paymentMethod === 'wallet' ? childPin : null,
        buyer_name: buyerType === 'non_student' ? buyerName : null,
        payment_method: paymentMethod,
        discount_amount: parseFloat(discountAmount) || 0,
        items: cart.map(item => ({
          vendor_product_id: item.id,
          qty: item.qty
        }))
      };

      const res = await api.post('/kantin/sales-transactions', payload);
      setSuccessReceipt({
        ...res.data.data,
        items: [...cart],
        buyer_name: buyerType === 'student' ? selectedStudent.student_name : (buyerName || 'Umum'),
        transaction_at: new Date().toISOString()
      });

      // Reset Form & Refetch
      setCart([]);
      setChildPin('');
      setDiscountAmount(0);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Transaksi gagal diproses');
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

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.barcode?.includes(searchProduct) ||
    p.category?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>Kasir POS Smart Kantin</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              Cashless Active
            </span>
          </h1>
          <p className="text-xs text-slate-500">Scan barcode produk / tap kartu santri untuk transaksi kasir cepat</p>
        </div>

        {/* Scan Barcode Field Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <ScanBarcode className="w-4 h-4 text-amber-600 absolute left-3 top-2.5" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode / QR Santri [Enter]..."
              className="w-full pl-9 pr-3 py-1.5 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-600 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
          >
            Input
          </button>
        </form>
      </div>

      {/* Main POS Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Product Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Cari nama produk, kategori..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {filteredProducts.length} Produk
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-200">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              <p className="text-xs text-slate-400">Memuat katalog produk...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.current_stock <= 0}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition group relative ${
                    p.current_stock <= 0
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-md'
                  }`}
                >
                  <div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {p.category || 'Umum'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 mt-1.5 line-clamp-2 group-hover:text-amber-700">
                      {p.product_name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.barcode || '-'}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-700">
                      {formatRupiah(p.sale_price || 5000)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.current_stock <= p.min_stock
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Stok: {p.current_stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Cart & Checkout Payment Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span>Keranjang Kasir</span>
            </h2>
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Kosongkan
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Cart Item List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-slate-800 truncate">{item.product_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {formatRupiah(item.price || 5000)} &times; {item.qty} = <span className="font-bold text-emerald-700">{formatRupiah((item.price || 5000) * item.qty)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.qty - 1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3 text-slate-600" />
                  </button>
                  <span className="w-6 text-center font-bold font-mono">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, item.qty + 1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, 0)}
                    className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Keranjang masih kosong. Klik produk di sebelah kiri untuk menambah.
              </div>
            )}
          </div>

          {/* Form Data Pembeli & Pembayaran */}
          <form onSubmit={handleCheckout} className="space-y-3 pt-2 border-t border-slate-100">
            {/* Buyer Type Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setBuyerType('student');
                  setPaymentMethod('wallet');
                }}
                className={`py-1.5 rounded-lg transition ${
                  buyerType === 'student'
                    ? 'bg-white text-amber-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Santri (Cashless)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuyerType('non_student');
                  setPaymentMethod('cash');
                }}
                className={`py-1.5 rounded-lg transition ${
                  buyerType === 'non_student'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Pembeli Umum / Guru
              </button>
            </div>

            {buyerType === 'student' ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Santri</label>
                  <SearchableSelect
                    options={students.map(s => ({
                      value: String(s.student_id),
                      label: s.student_name,
                      sublabel: `${s.class_group_name || ''} • Saldo: ${formatRupiah(s.wallet_balance || 0)}`,
                    }))}
                    value={selectedStudent?.student_id ? String(selectedStudent.student_id) : ''}
                    onChange={(val) => {
                      const s = students.find(item => String(item.student_id) === val);
                      setSelectedStudent(s || null);
                    }}
                    placeholder="-- Cari & Pilih Santri --"
                    searchPlaceholder="Ketik nama atau kelas santri..."
                    emptyText="Santri tidak ditemukan"
                  />
                </div>

                {selectedStudent && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-emerald-800 font-semibold uppercase">Saldo Dompet Tersedia</p>
                      <p className="text-sm font-extrabold text-emerald-900 mt-0.5">
                        {formatRupiah(selectedStudent.wallet_balance)}
                      </p>
                    </div>
                    {selectedStudent.custom_daily_limit && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-bold">
                        Limit: {formatRupiah(selectedStudent.custom_daily_limit)}
                      </span>
                    )}
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      PIN Santri (6 Digit)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={childPin}
                      onChange={(e) => setChildPin(e.target.value)}
                      placeholder="Masukkan PIN santri (default: 123456)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest text-center"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Pembeli (Opsional)</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Contoh: Ustadz Abdullah / Tamu"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {buyerType === 'student' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'wallet'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Dompet</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                    paymentMethod === 'cash'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 ${
                    paymentMethod === 'qris'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QRIS</span>
                </button>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} item)</span>
                <span className="font-mono">{formatRupiah(totalGross)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Diskon</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-20 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-right text-xs text-white"
                />
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">TOTAL BAYAR</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {formatRupiah(finalTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-orange-950/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesaikan Pembayaran</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Modal Struk Transaksi Sukses */}
      {successReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-800">Transaksi Berhasil!</h3>
              <p className="text-xs text-slate-500">Struk #{successReceipt.sales_transaction_id}</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Pembeli:</span>
                <span className="font-bold text-slate-800">{successReceipt.buyer_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode:</span>
                <span className="uppercase font-semibold">{successReceipt.payment_method}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Bayar:</span>
                <span className="text-emerald-700">{formatRupiah(successReceipt.total_amount)}</span>
              </div>
              {successReceipt.wallet_balance_after !== null && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Sisa Saldo:</span>
                  <span>{formatRupiah(successReceipt.wallet_balance_after)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessReceipt(null)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
              >
                Selesai / Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
