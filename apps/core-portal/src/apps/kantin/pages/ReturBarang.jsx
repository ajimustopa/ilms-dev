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
  ReceiptText,
  Settings,
  Building2,
  CreditCard,
  BadgeCheck,
  BookOpen,
  ArrowDownRight,
  Sparkles,
  Landmark,
  Wallet,
  DollarSign,
  Check
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

  // Accounting Config State
  const [accountingConfig, setAccountingConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [bankStatements, setBankStatements] = useState([]);

  const [configForm, setConfigForm] = useState({
    auto_journal_enabled: true,
    default_fund_source_name: 'Kantin Sekolah',
    default_cash_account_id: '',
    default_bank_account_id: '',
    titipan_hutang_coa_id: '',
    titipan_persediaan_coa_id: '',
    beli_putus_persediaan_coa_id: '',
    beli_putus_hutang_dagang_coa_id: '',
    beli_putus_beban_rusak_coa_id: '',
    default_bank_statement_id: ''
  });

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedReceiptItemId, setSelectedReceiptItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [returnType, setReturnType] = useState('sisa'); // 'sisa' | 'rusak'
  const [note, setNote] = useState('');

  // Settlement & Accounting overrides for this return
  const [settlementType, setSettlementType] = useState('titipan'); // 'titipan' | 'refund_tunai' | 'refund_bank' | 'hutang_dagang' | 'write_off_rusak'
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [selectedBankStatementId, setSelectedBankStatementId] = useState('');
  const [fundSourceName, setFundSourceName] = useState('Kantin Sekolah');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRet, resEligible, resConfig, resBank] = await Promise.all([
        api.get('/kantin/product-returns'),
        api.get('/kantin/product-returns/eligible-items'),
        api.get('/kantin/product-returns/accounting-config').catch(() => ({ data: null })),
        api.get('/kantin/product-returns/bank-statements').catch(() => ({ data: { data: [] } }))
      ]);
      setReturns(resRet.data?.data || []);
      setEligibleProducts(resEligible.data?.data || []);

      if (resConfig?.data?.data) {
        const cfg = resConfig.data.data;
        setAccountingConfig(cfg);
        const s = cfg.settings || {};
        setConfigForm({
          auto_journal_enabled: s.auto_journal_enabled ?? true,
          default_fund_source_name: s.default_fund_source_name || 'Kantin Sekolah',
          default_cash_account_id: s.default_cash_account_id || '',
          default_bank_account_id: s.default_bank_account_id || '',
          titipan_hutang_coa_id: s.titipan_hutang_coa_id || '',
          titipan_persediaan_coa_id: s.titipan_persediaan_coa_id || '',
          beli_putus_persediaan_coa_id: s.beli_putus_persediaan_coa_id || '',
          beli_putus_hutang_dagang_coa_id: s.beli_putus_hutang_dagang_coa_id || '',
          beli_putus_beban_rusak_coa_id: s.beli_putus_beban_rusak_coa_id || '',
          default_bank_statement_id: s.default_bank_statement_id || ''
        });
        setFundSourceName(s.default_fund_source_name || 'Kantin Sekolah');
      }

      setBankStatements(resBank.data?.data || []);
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
      const isBeliPutus = p.vendor_type === 'beli_putus';
      return {
        value: p.product_id,
        label: p.product_name,
        sublabel: `${isBeliPutus ? 'Belanja Beli Putus' : 'Konsinyasi Titipan'} • Vendor: ${p.vendor_name || 'Umum'} • Sisa Stok: ${p.current_stock} ${p.unit} (Terjual: ${p.total_sold})`,
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

  // Total Nilai Pokok Retur yang dihitung
  const totalCostAmount = useMemo(() => {
    const q = Number(qty) || 0;
    const cost = Number(selectedBatch?.cost_price || selectedProduct?.cost_price || 0);
    return q * cost;
  }, [qty, selectedBatch, selectedProduct]);

  // Live Jurnal Akuntansi Debet/Kredit preview
  const liveJournalPreview = useMemo(() => {
    if (!selectedProduct || totalCostAmount <= 0) return null;
    const isBeliPutus = selectedProduct.vendor_type === 'beli_putus';

    if (!isBeliPutus) {
      // Titipan
      return {
        scheme: 'Retur Konsinyasi Titipan',
        debit: {
          code: '20102 / 40501',
          name: 'Hutang Konsinyasi Titipan Vendor',
          category: 'Kewajiban / Penyesuaian Hutang'
        },
        credit: {
          code: '10302',
          name: 'Persediaan Konsinyasi Titipan',
          category: 'Aset Lancar (Pengurangan Fisik)'
        },
        amount: totalCostAmount,
        note: 'Mengurangi kewajiban titipan dan persediaan konsinyasi di gudang'
      };
    }

    // Beli Putus
    if (settlementType === 'refund_tunai') {
      return {
        scheme: 'Retur Beli Putus (Refund Kas Tunai)',
        debit: {
          code: '10101',
          name: 'Kas Operasional / Kas Tunai Kantin',
          category: 'Aset Lancar (Penerimaan Kas)'
        },
        credit: {
          code: '10301',
          name: 'Persediaan Barang Dagangan Kantin',
          category: 'Aset Lancar (Pengurangan Stok)'
        },
        amount: totalCostAmount,
        note: 'Penerimaan uang kembali tunai dari vendor atas retur barang'
      };
    } else if (settlementType === 'refund_bank') {
      return {
        scheme: 'Retur Beli Putus (Refund Transfer Bank)',
        debit: {
          code: '10102',
          name: 'Kas Bank Operasional / Rekening Kantin',
          category: 'Aset Lancar (Penerimaan Transfer Bank)'
        },
        credit: {
          code: '10301',
          name: 'Persediaan Barang Dagangan Kantin',
          category: 'Aset Lancar (Pengurangan Stok)'
        },
        amount: totalCostAmount,
        note: 'Penerimaan transfer uang kembali ke rekening atas retur barang'
      };
    } else if (settlementType === 'hutang_dagang') {
      return {
        scheme: 'Retur Beli Putus (Potong Hutang Usaha Dagang)',
        debit: {
          code: '20100',
          name: 'Hutang Usaha Dagang / Vendor Beli Putus',
          category: 'Kewajiban (Pengurangan Hutang Tempo)'
        },
        credit: {
          code: '10301',
          name: 'Persediaan Barang Dagangan Kantin',
          category: 'Aset Lancar (Pengurangan Stok)'
        },
        amount: totalCostAmount,
        note: 'Mengurangi saldo hutang dagang tempo kepada vendor'
      };
    } else {
      // write_off_rusak
      return {
        scheme: 'Penghapusan / Pemusnahan Barang Rusak',
        debit: {
          code: '50102',
          name: 'Beban Kerusakan / Pemusnahan Barang Dagangan',
          category: 'Beban Operasional Kantin'
        },
        credit: {
          code: '10301',
          name: 'Persediaan Barang Dagangan Kantin',
          category: 'Aset Lancar (Pemusnahan Fisik)'
        },
        amount: totalCostAmount,
        note: 'Pencatatan kerugian/beban atas barang rusak atau kadaluarsa'
      };
    }
  }, [selectedProduct, totalCostAmount, settlementType]);

  const openCreateModal = () => {
    const firstWithStock = eligibleProducts.find(p => p.current_stock > 0) || eligibleProducts[0];
    const initialProdId = firstWithStock ? firstWithStock.product_id : '';
    setSelectedProductId(initialProdId);

    const batches = firstWithStock?.receipt_batches || [];
    setSelectedReceiptItemId(batches.length > 0 ? String(batches[0].goods_receipt_item_id) : '');
    setQty(firstWithStock && firstWithStock.current_stock > 0 ? String(Math.min(firstWithStock.current_stock, 1)) : '1');
    setReturnType('sisa');
    setNote('');

    const isBeliPutus = firstWithStock?.vendor_type === 'beli_putus';
    setSettlementType(isBeliPutus ? 'refund_tunai' : 'titipan');
    setSelectedCashAccountId(accountingConfig?.settings?.default_cash_account_id || '');
    setSelectedBankStatementId(accountingConfig?.settings?.default_bank_statement_id || '');
    setFundSourceName(accountingConfig?.settings?.default_fund_source_name || 'Kantin Sekolah');

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

    const isBeliPutus = prod?.vendor_type === 'beli_putus';
    setSettlementType(isBeliPutus ? 'refund_tunai' : 'titipan');
  };

  const handleSetMaxQty = () => {
    if (maxReturnableQty > 0) {
      setQty(String(maxReturnableQty));
    }
  };

  const handleSaveAccountingConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(null);

    try {
      const res = await api.post('/kantin/product-returns/accounting-config', configForm);
      setConfigSuccess('Konfigurasi akuntansi retur barang berhasil diperbarui!');
      if (res.data?.data) {
        setAccountingConfig(res.data.data);
      }
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccess(null);
      }, 1200);
    } catch (err) {
      setConfigError(err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi akuntansi.');
    } finally {
      setSavingConfig(false);
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
        note: note.trim() || undefined,
        settlement_type: settlementType,
        cash_account_id: settlementType === 'refund_tunai' || settlementType === 'refund_bank' ? (selectedCashAccountId || null) : null,
        bank_statement_id: settlementType === 'refund_bank' ? (selectedBankStatementId || null) : null,
        fund_source_name: fundSourceName || 'Kantin Sekolah'
      };

      const res = await api.post('/kantin/product-returns', payload);
      const jNum = res.data?.data?.journal_number;
      setSuccessMessage(`Berhasil mencatat retur ${returnQtyNum} ${selectedProduct?.unit || 'pcs'} ${selectedProduct?.product_name || 'produk'}.${jNum ? ` Terbit Jurnal Akuntansi: #${jNum}` : ''}`);
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
        r.journal_number?.toLowerCase().includes(q) ||
        r.debit_coa_name?.toLowerCase().includes(q) ||
        r.credit_coa_name?.toLowerCase().includes(q) ||
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
    const totalCostReturned = returns.reduce((acc, r) => acc + Number(r.total_cost_amount || 0), 0);
    return { totalRecords, totalQtyReturned, countSisa, countRusak, totalCostReturned };
  }, [returns]);

  const coaAccounts = accountingConfig?.coa_accounts || [];
  const cashAccounts = accountingConfig?.cash_accounts || [];
  const bankAccounts = accountingConfig?.bank_accounts || [];
  const fundSources = accountingConfig?.fund_sources || [];

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
                Pencatatan pengembalian sisa barang konsinyasi vendor / belanja beli putus dan penjurnalan akuntansi otomatis
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol Setelan Akuntansi */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            title="Konfigurasi Akun COA & Jenis Kas Otomatis untuk Retur Barang"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Setelan Akuntansi Retur</span>
            <span className={`inline-block w-2 h-2 rounded-full ${accountingConfig?.settings?.auto_journal_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Catat Retur Barang Baru</span>
          </button>
        </div>
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
            placeholder="Cari produk, vendor, No. SJ, No. Jurnal, Akun COA..."
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
                  <th className="px-4 py-3.5">Vendor &amp; Jenis</th>
                  <th className="px-4 py-3.5">Asal Penerimaan</th>
                  <th className="px-4 py-3.5 text-center">Jumlah Diretur</th>
                  <th className="px-4 py-3.5">Penyelesaian &amp; Akuntansi</th>
                  <th className="px-4 py-3.5">Catatan &amp; Waktu Retur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ret) => {
                  const displayBatch = ret.batch_number || ret.item_batch_number;
                  const displayReceiptDate = ret.receipt_date ? formatDate(ret.receipt_date) : null;
                  const hasJournal = !!ret.journal_number;

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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{ret.vendor || '-'}</span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              ret.return_type === 'rusak'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {ret.return_type === 'rusak' ? 'Rusak / Basi' : 'Sisa Titipan Tak Laku'}
                          </span>
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
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            -{ret.qty} {ret.unit || 'pcs'}
                          </span>
                          {ret.total_cost_amount > 0 && (
                            <p className="text-[10px] font-mono text-slate-500">
                              Nilai: {formatCurrency(ret.total_cost_amount)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Penyelesaian & Akuntansi */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-[11px]">
                          {hasJournal ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                                <BadgeCheck className="w-3 h-3 text-emerald-600" />
                                Jurnal #{ret.journal_number}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa Jurnal</span>
                          )}

                          {ret.debit_coa_name && (
                            <div className="text-[10px] text-slate-600">
                              <span className="font-semibold text-emerald-700">Dr:</span> {ret.debit_coa_name}
                            </div>
                          )}
                          {ret.credit_coa_name && (
                            <div className="text-[10px] text-slate-600">
                              <span className="font-semibold text-rose-700">Cr:</span> {ret.credit_coa_name}
                            </div>
                          )}
                          {ret.cash_account_name && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Wallet className="w-3 h-3 text-slate-400" />
                              <span>{ret.cash_account_name}</span>
                            </div>
                          )}
                        </div>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Formulir Retur Barang ke Vendor</h3>
                  <p className="text-[11px] text-slate-500">Pilih barang, periksa riwayat penerimaan, metode penyelesaian &amp; jurnal akuntansi</p>
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
                        Diterima: {batch.receipt_date ? formatDate(batch.receipt_date) : 'Tidak Tercatat'} • {batch.invoice_number ? `SJ: ${batch.invoice_number}` : 'Tanpa SJ'} {batch.batch_number ? `• Batch: ${batch.batch_number}` : ''} (Masuk Awal: {batch.qty_received} {selectedProduct.unit} • Pokok: {formatCurrency(batch.cost_price || selectedProduct.cost_price)})
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
                      <span>Rincian Stok ({selectedProduct.product_name})</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      Jenis: <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedProduct.vendor_type === 'beli_putus' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{selectedProduct.vendor_type === 'beli_putus' ? 'Beli Putus' : 'Titipan Konsinyasi'}</span>
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
                      <span className="text-[10px] text-slate-500 block font-medium">Terjual (Kasir):</span>
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
                    Maksimal yang bisa diretur: {maxReturnableQty} {selectedProduct?.unit || 'pcs'} • Nilai: {formatCurrency(totalCostAmount)}
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

              {/* OPSI PENYELESAIAN AKUNTANSI UNTUK BELI PUTUS */}
              {selectedProduct?.vendor_type === 'beli_putus' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Metode Penyelesaian Retur Beli Putus</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">Kompensasi Vendor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${settlementType === 'refund_tunai' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="settlementType"
                        value="refund_tunai"
                        checked={settlementType === 'refund_tunai'}
                        onChange={(e) => setSettlementType(e.target.value)}
                        className="text-emerald-600"
                      />
                      <span className="text-xs">Refund Kas Tunai</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${settlementType === 'refund_bank' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="settlementType"
                        value="refund_bank"
                        checked={settlementType === 'refund_bank'}
                        onChange={(e) => setSettlementType(e.target.value)}
                        className="text-emerald-600"
                      />
                      <span className="text-xs">Refund Transfer Bank</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${settlementType === 'hutang_dagang' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="settlementType"
                        value="hutang_dagang"
                        checked={settlementType === 'hutang_dagang'}
                        onChange={(e) => setSettlementType(e.target.value)}
                        className="text-emerald-600"
                      />
                      <span className="text-xs">Potong Hutang Usaha Dagang</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${settlementType === 'write_off_rusak' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <input
                        type="radio"
                        name="settlementType"
                        value="write_off_rusak"
                        checked={settlementType === 'write_off_rusak'}
                        onChange={(e) => setSettlementType(e.target.value)}
                        className="text-emerald-600"
                      />
                      <span className="text-xs">Pemusnahan (Beban Kerusakan)</span>
                    </label>
                  </div>

                  {/* Jika Refund Kas / Bank dipilih */}
                  {(settlementType === 'refund_tunai' || settlementType === 'refund_bank') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Akun Kas / Bank Penampung Refund
                        </label>
                        <select
                          value={selectedCashAccountId}
                          onChange={(e) => setSelectedCashAccountId(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                        >
                          <option value="">-- Gunakan Kas Default --</option>
                          {(settlementType === 'refund_tunai' ? cashAccounts : bankAccounts).map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_name} ({acc.account_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {settlementType === 'refund_bank' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Referensi Mutasi Rekening Koran (Opsional)
                          </label>
                          <select
                            value={selectedBankStatementId}
                            onChange={(e) => setSelectedBankStatementId(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                          >
                            <option value="">-- Tanpa Referensi Rekening Koran --</option>
                            {bankStatements.map(stmt => (
                              <option key={stmt.id} value={stmt.id}>
                                {stmt.transaction_date ? formatDate(stmt.transaction_date) : ''} • +{formatCurrency(stmt.credit_amount)} • {stmt.description?.slice(0, 30)}...
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* DYNAMIC LIVE JOURNAL PREVIEW CARD */}
              {liveJournalPreview && (
                <div className="p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">
                        Pratinjau Jurnal Akuntansi Otomatis
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {liveJournalPreview.scheme}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* DEBET */}
                    <div className="p-2.5 bg-white/5 rounded-xl border border-emerald-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">[DEBET]</span>
                        <span className="font-mono text-emerald-300 font-bold">{formatCurrency(liveJournalPreview.amount)}</span>
                      </div>
                      <p className="font-bold text-slate-100">{liveJournalPreview.debit.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Kode Akun: {liveJournalPreview.debit.code} ({liveJournalPreview.debit.category})</p>
                    </div>

                    {/* KREDIT */}
                    <div className="p-2.5 bg-white/5 rounded-xl border border-rose-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">[KREDIT]</span>
                        <span className="font-mono text-rose-300 font-bold">{formatCurrency(liveJournalPreview.amount)}</span>
                      </div>
                      <p className="font-bold text-slate-100">{liveJournalPreview.credit.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Kode Akun: {liveJournalPreview.credit.code} ({liveJournalPreview.credit.category})</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pos Dana: <strong className="text-slate-200">{fundSourceName}</strong></span>
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Otomatis diposting ke Jurnal &amp; Buku Besar
                    </span>
                  </div>
                </div>
              )}

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

      {/* MODAL SETELAN AKUNTANSI RETUR BARANG */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <Settings className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Konfigurasi Default Akuntansi Retur Barang</h3>
                  <p className="text-[11px] text-slate-500">Atur pemetaan akun COA, jenis kas, pos dana &amp; rekening koran default</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{configError}</span>
              </div>
            )}

            {configSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{configSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveAccountingConfig} className="space-y-4">
              {/* Toggle Auto Journal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Aktifkan Otomatis Penjurnalan Akuntansi</p>
                  <p className="text-[11px] text-slate-500">Mencatat jurnal umum debet/kredit secara otomatis setiap ada retur barang</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.auto_journal_enabled}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, auto_journal_enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Pos Dana & Rekening Default */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pos Dana Terkait (Default)
                  </label>
                  <input
                    type="text"
                    value={configForm.default_fund_source_name}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, default_fund_source_name: e.target.value }))}
                    placeholder="Contoh: Kantin Sekolah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Akun Kas Tunai Default
                  </label>
                  <select
                    value={configForm.default_cash_account_id}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, default_cash_account_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Akun Kas Tunai --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.account_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Akun Bank Default */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Akun Kas Bank Default
                  </label>
                  <select
                    value={configForm.default_bank_account_id}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, default_bank_account_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Akun Kas Bank --</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.account_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Referensi Mutasi Rekening Koran Default
                  </label>
                  <select
                    value={configForm.default_bank_statement_id}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, default_bank_statement_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- Tanpa Referensi Default --</option>
                    {bankStatements.map(stmt => (
                      <option key={stmt.id} value={stmt.id}>
                        {stmt.transaction_date ? formatDate(stmt.transaction_date) : ''} • +{formatCurrency(stmt.credit_amount)} • {stmt.description?.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mapping COA Retur Titipan Konsinyasi */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-700" />
                  <span>Pemetaan COA: Retur Barang Titipan Konsinyasi</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [DEBET] Hutang Titipan Konsinyasi
                    </label>
                    <select
                      value={configForm.titipan_hutang_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, titipan_hutang_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (20102 Hutang Konsinyasi) --</option>
                      {coaAccounts.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [KREDIT] Persediaan Barang Titipan
                    </label>
                    <select
                      value={configForm.titipan_persediaan_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, titipan_persediaan_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (10302 Persediaan Titipan) --</option>
                      {coaAccounts.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mapping COA Retur Belanja Sendiri (Beli Putus) */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-700" />
                  <span>Pemetaan COA: Retur Belanja Sendiri (Beli Putus)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [KREDIT] Persediaan Barang Dagangan
                    </label>
                    <select
                      value={configForm.beli_putus_persediaan_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, beli_putus_persediaan_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (10301 Persediaan Barang Dagangan) --</option>
                      {coaAccounts.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [DEBET] Hutang Dagang (Opsi Tempo)
                    </label>
                    <select
                      value={configForm.beli_putus_hutang_dagang_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, beli_putus_hutang_dagang_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (20100 Hutang Usaha Dagang) --</option>
                      {coaAccounts.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [DEBET] Beban Kerusakan / Pemusnahan (Opsi Write-Off Rusak)
                    </label>
                    <select
                      value={configForm.beli_putus_beban_rusak_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, beli_putus_beban_rusak_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (50102 Beban Kerusakan Barang) --</option>
                      {coaAccounts.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Setelan Akuntansi</span>
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

