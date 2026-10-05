import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Store,
  Receipt,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownToLine,
  X,
  CreditCard,
  Wallet,
  Coins,
  Building2,
  RefreshCw,
  Phone,
  ArrowRight,
  Banknote,
  DollarSign,
  Info,
  Calendar,
  Layers,
  FileCheck2,
  TrendingUp,
  Printer,
  CheckSquare,
  Square,
  Sparkles,
  FileSpreadsheet,
  PackageCheck,
  ShoppingBag,
  Clock,
  BadgeCheck,
  Tag,
  Landmark,
  BookOpen
} from 'lucide-react';

// Helper fungsi terbilang rupiah untuk kwitansi
function terbilangRupiah(angka) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  const n = Math.floor(Math.abs(Number(angka) || 0));

  if (n === 0) return 'Nol Rupiah';

  function sebut(num) {
    if (num < 12) return bilangan[num];
    if (num < 20) return `${sebut(num - 10)} Belas`;
    if (num < 100) return `${sebut(Math.floor(num / 10))} Puluh ${sebut(num % 10)}`.trim();
    if (num < 200) return `Seratus ${sebut(num - 100)}`.trim();
    if (num < 1000) return `${sebut(Math.floor(num / 100))} Ratus ${sebut(num % 100)}`.trim();
    if (num < 2000) return `Seribu ${sebut(num - 1000)}`.trim();
    if (num < 1000000) return `${sebut(Math.floor(num / 1000))} Ribu ${sebut(num % 1000)}`.trim();
    if (num < 1000000000) return `${sebut(Math.floor(num / 1000000))} Juta ${sebut(num % 1000000)}`.trim();
    if (num < 1000000000000) return `${sebut(Math.floor(num / 1000000000))} Milyar ${sebut(num % 1000000000)}`.trim();
    return `${sebut(Math.floor(num / 1000000000000))} Triliun ${sebut(num % 1000000000000)}`.trim();
  }

  return `${sebut(n)} Rupiah`;
}

export default function HakVendor() {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'vendors' | 'history'

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [disbursementStatusFilter, setDisbursementStatusFilter] = useState('all'); // 'all' | 'pending' | 'disbursed' | 'non_vendor'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pilihan item transaksi dari tabel detail
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // Modal Pembayaran Hak Vendor
  const [showModal, setShowModal] = useState(false);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [undisbursedItems, setUndisbursedItems] = useState([]);
  const [modalSelectedItemIds, setModalSelectedItemIds] = useState([]);

  const [formData, setFormData] = useState({
    vendor_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    amount: '',
    cash_account_id: '',
    coa_account_id: '',
    bank_statement_id: '',
    notes: ''
  });

  // Kwitansi Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.period_start = dateFrom;
      if (dateTo) params.period_end = dateTo;
      if (vendorFilter !== 'all') params.vendor_id = vendorFilter;
      if (disbursementStatusFilter !== 'all') params.disbursement_status = disbursementStatusFilter;
      if (paymentMethodFilter !== 'all') params.payment_method = paymentMethodFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [resSummary, resDetails, resPayments, resAccounts] = await Promise.all([
        api.get('/kantin/receivables/vendor-share', { params: { period_start: dateFrom || undefined, period_end: dateTo || undefined, vendor_id: vendorFilter !== 'all' ? vendorFilter : undefined } }),
        api.get('/kantin/receivables/vendor-share/detail', { params }),
        api.get('/kantin/vendor-fee-payments', { params: { vendor_id: vendorFilter !== 'all' ? vendorFilter : undefined } }),
        api.get('/kantin/vendor-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } }))
      ]);

      setSummary(resSummary.data?.data || null);
      setDetails(resDetails.data?.data || []);
      setPayments(resPayments.data?.data || []);
      setCashAccounts(resAccounts.data?.data || []);
    } catch (err) {
      console.error('Error fetching vendor shares data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, vendorFilter, disbursementStatusFilter, paymentMethodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilter = () => {
    setDateFrom('');
    setDateTo('');
    setVendorFilter('all');
    setDisbursementStatusFilter('all');
    setPaymentMethodFilter('all');
    setSearchQuery('');
    setSelectedItemIds([]);
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  // Daftar item vendor yang belum diserahkan dari data tabel saat ini
  const pendingVendorItems = useMemo(() => {
    return details.filter(d => d.is_vendor_item && !d.is_disbursed);
  }, [details]);

  // Objek item yang saat ini dipilih di tabel utama
  const selectedMainItemsObjects = useMemo(() => {
    return pendingVendorItems.filter(t => selectedItemIds.includes(t.id));
  }, [pendingVendorItems, selectedItemIds]);

  // ID & Nama Vendor yang aktif terpilih (hanya boleh 1 vendor per transaksi)
  const activeSelectedVendorId = useMemo(() => {
    if (selectedMainItemsObjects.length === 0) return null;
    return selectedMainItemsObjects[0]?.vendor_id || null;
  }, [selectedMainItemsObjects]);

  const activeSelectedVendorName = useMemo(() => {
    if (selectedMainItemsObjects.length === 0) return null;
    return selectedMainItemsObjects[0]?.vendor_name || null;
  }, [selectedMainItemsObjects]);

  // Item pending yang kompatibel dengan vendor yang sedang dipilih
  const selectablePendingVendorItems = useMemo(() => {
    if (vendorFilter !== 'all') {
      return pendingVendorItems.filter(i => String(i.vendor_id) === String(vendorFilter));
    }
    if (activeSelectedVendorId) {
      return pendingVendorItems.filter(i => String(i.vendor_id) === String(activeSelectedVendorId));
    }
    return pendingVendorItems;
  }, [pendingVendorItems, vendorFilter, activeSelectedVendorId]);

  // Total nominal dari item yang dicentang di tabel utama
  const selectedMainTotalAmount = useMemo(() => {
    return selectedMainItemsObjects.reduce((sum, t) => sum + (t.subtotal_cost || 0), 0);
  }, [selectedMainItemsObjects]);

  const handleToggleMainItem = (item) => {
    const itemId = item.id;
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
      return;
    }

    // Validasi: 1 transaksi penyerahan hanya untuk 1 vendor
    if (activeSelectedVendorId && item.vendor_id && String(item.vendor_id) !== String(activeSelectedVendorId)) {
      setError(`1 transaksi penyerahan hak vendor hanya dapat dilakukan untuk 1 vendor saja. Batalkan pilihan transaksi vendor "${activeSelectedVendorName}" jika ingin memilih transaksi vendor "${item.vendor_name}".`);
      return;
    }

    setError(null);
    setSelectedItemIds(prev => [...prev, itemId]);
  };

  const handleToggleSelectAllMain = () => {
    if (selectedItemIds.length > 0) {
      setSelectedItemIds([]);
    } else {
      const targetItems = selectablePendingVendorItems;
      if (targetItems.length > 0) {
        const targetVendorId = targetItems[0].vendor_id;
        const singleVendorItems = targetItems.filter(i => String(i.vendor_id) === String(targetVendorId));
        setSelectedItemIds(singleVendorItems.map(t => t.id));
      }
    }
  };

  // Buka Modal Pembayaran Hak Vendor
  const handleOpenPaymentModal = async (initialVendor = null, initialItemIds = null) => {
    setError(null);
    setShowModal(true);
    setLoadingModalData(true);

    try {
      const chosenVendorId = initialVendor
        ? String(initialVendor.vendor_id || initialVendor.id)
        : (activeSelectedVendorId ? String(activeSelectedVendorId) : (vendorFilter !== 'all' ? vendorFilter : ''));

      const [resCoa, resBank, resItems, resAcc] = await Promise.all([
        api.get('/kantin/vendor-fee-payments/coa-accounts').catch(() => ({ data: { data: { accounts: [], default_coa_id: null } } })),
        api.get('/kantin/vendor-fee-payments/bank-statements').catch(() => ({ data: { data: [] } })),
        api.get('/kantin/vendor-fee-payments/undisbursed-items', { params: { vendor_id: chosenVendorId || undefined } }).catch(() => ({ data: { data: { items: [], total_amount: 0, total_count: 0 } } })),
        api.get('/kantin/vendor-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } }))
      ]);

      const coaData = resCoa.data?.data || {};
      const coaList = coaData.accounts || [];
      const defaultCoa = coaData.default_coa_id ? String(coaData.default_coa_id) : (coaList[0] ? String(coaList[0].id) : '');
      setCoaAccounts(coaList);

      const bankList = resBank.data?.data || [];
      setBankStatements(bankList);

      const undisbursedData = resItems.data?.data || {};
      const itemsList = undisbursedData.items || [];
      setUndisbursedItems(itemsList);

      const accounts = resAcc.data?.data || [];
      setCashAccounts(accounts);

      const defaultAcc = accounts.find(a => (a.name || '').toLowerCase().includes('kantin')) || accounts[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : '';

      // Tentukan item mana yang dipilih:
      let chosenIds = [];
      if (Array.isArray(initialItemIds) && initialItemIds.length > 0) {
        chosenIds = initialItemIds;
      } else if (selectedItemIds.length > 0 && activeSelectedVendorId && String(activeSelectedVendorId) === String(chosenVendorId)) {
        chosenIds = selectedItemIds;
      } else {
        chosenIds = itemsList.map(t => t.id);
      }
      setModalSelectedItemIds(chosenIds);

      // Hitung nominal yang otomatis terisi
      const chosenItems = itemsList.filter(t => chosenIds.includes(t.id));
      const calcAmount = chosenItems.length > 0
        ? chosenItems.reduce((sum, t) => sum + (parseFloat(t.subtotal_cost) || 0), 0)
        : (undisbursedData.total_amount > 0 ? undisbursedData.total_amount : (initialVendor?.vendor_payable || 0));

      const selectedVendorObj = (summary?.vendors || []).find(v => String(v.vendor_id) === String(chosenVendorId)) || initialVendor;

      setFormData({
        vendor_id: chosenVendorId,
        paid_at: new Date().toISOString().slice(0, 10),
        amount: calcAmount > 0 ? String(calcAmount) : '',
        cash_account_id: defaultAccId,
        coa_account_id: defaultCoa,
        bank_statement_id: '',
        notes: selectedVendorObj
          ? `Penyerahan Hak Bagi Hasil Vendor ${selectedVendorObj.vendor_name || ''} (${chosenIds.length} Item)`
          : `Penyerahan Hak Bagi Hasil Vendor (${chosenIds.length} Item)`
      });
    } catch (err) {
      console.error('Error loading modal data:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  // Toggle item transaksi di dalam modal
  const handleToggleModalItem = (itemId) => {
    let nextSelected = [];
    if (modalSelectedItemIds.includes(itemId)) {
      nextSelected = modalSelectedItemIds.filter(id => id !== itemId);
    } else {
      nextSelected = [...modalSelectedItemIds, itemId];
    }
    setModalSelectedItemIds(nextSelected);

    if (!formData.bank_statement_id) {
      const selectedTxs = undisbursedItems.filter(t => nextSelected.includes(t.id));
      const calcAmount = selectedTxs.reduce((sum, t) => sum + (parseFloat(t.subtotal_cost) || 0), 0);
      setFormData(prev => ({
        ...prev,
        amount: String(calcAmount),
        notes: `Penyerahan Hak Bagi Hasil Vendor (${nextSelected.length} Item)`
      }));
    }
  };

  const handleToggleSelectAllModal = () => {
    if (modalSelectedItemIds.length === undisbursedItems.length) {
      setModalSelectedItemIds([]);
      if (!formData.bank_statement_id) {
        setFormData(prev => ({ ...prev, amount: '0', notes: 'Penyerahan Hak Bagi Hasil Vendor' }));
      }
    } else {
      const allIds = undisbursedItems.map(t => t.id);
      setModalSelectedItemIds(allIds);
      if (!formData.bank_statement_id) {
        const total = undisbursedItems.reduce((sum, t) => sum + (parseFloat(t.subtotal_cost) || 0), 0);
        setFormData(prev => ({
          ...prev,
          amount: String(total),
          notes: `Penyerahan Hak Bagi Hasil Vendor (${allIds.length} Item)`
        }));
      }
    }
  };

  // Saat mutasi rekening koran dipilih, otomatis sinkron nominal, tanggal, dan rekening kas/bank
  const handleBankStatementChange = (statementId) => {
    if (!statementId) {
      const selectedTxs = undisbursedItems.filter(t => modalSelectedItemIds.includes(t.id));
      const calcAmount = selectedTxs.reduce((sum, t) => sum + (parseFloat(t.subtotal_cost) || 0), 0);
      setFormData(prev => ({
        ...prev,
        bank_statement_id: '',
        amount: calcAmount > 0 ? String(calcAmount) : prev.amount
      }));
      return;
    }

    const stmt = bankStatements.find(s => String(s.id) === String(statementId));
    if (stmt) {
      const autoAmount = stmt.unallocated_amount > 0 ? stmt.unallocated_amount : stmt.amount;
      setFormData(prev => ({
        ...prev,
        bank_statement_id: String(stmt.id),
        amount: String(autoAmount),
        paid_at: stmt.transaction_date || prev.paid_at,
        cash_account_id: stmt.cash_account_id ? String(stmt.cash_account_id) : prev.cash_account_id
      }));
    }
  };

  // Submit Penyerahan / Pembayaran Hak Vendor
  const handlePaymentSubmit = async (e, shouldPrintReceipt = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post('/kantin/vendor-fee-payments', {
        vendor_id: Number(formData.vendor_id),
        paid_at: formData.paid_at,
        amount: parseFloat(formData.amount),
        cash_account_id: formData.cash_account_id ? Number(formData.cash_account_id) : undefined,
        coa_account_id: formData.coa_account_id ? Number(formData.coa_account_id) : undefined,
        bank_statement_id: formData.bank_statement_id ? Number(formData.bank_statement_id) : undefined,
        sales_transaction_item_ids: modalSelectedItemIds,
        notes: formData.notes
      });

      const createdPayment = res.data?.data || {};
      setShowModal(false);
      setSelectedItemIds([]);
      fetchData();

      if (shouldPrintReceipt) {
        setReceiptData(createdPayment);
        setShowReceiptModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat pembayaran hak vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = (payment) => {
    setReceiptData(payment);
    setShowReceiptModal(true);
  };

  // Dynamic Totals Footer for Details Table
  const filteredTotals = useMemo(() => {
    return details.reduce((acc, d) => ({
      qty: acc.qty + (d.qty || 0),
      sales: acc.sales + (d.subtotal_price || 0),
      vendor_cost: acc.vendor_cost + (d.is_vendor_item ? d.subtotal_cost : 0),
      canteen_margin: acc.canteen_margin + (d.canteen_margin || 0),
      vendor_pending: acc.vendor_pending + (d.is_vendor_item && !d.is_disbursed ? d.subtotal_cost : 0),
      vendor_disbursed: acc.vendor_disbursed + (d.is_vendor_item && d.is_disbursed ? d.subtotal_cost : 0),
      non_vendor_sales: acc.non_vendor_sales + (!d.is_vendor_item ? d.subtotal_price : 0)
    }), { qty: 0, sales: 0, vendor_cost: 0, canteen_margin: 0, vendor_pending: 0, vendor_disbursed: 0, non_vendor_sales: 0 });
  }, [details]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-600" />
            <span>Hak Vendor Titipan &amp; Penyerahan Hasil Penjualan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan porsi bagi hasil barang konsinyasi mitra vendor, seleksi transaksi pembayaran, dan penerbitan kwitansi BKK Keuangan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenPaymentModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <CreditCard className="w-4 h-4" />
            {selectedItemIds.length > 0 ? (
              <span>Bayar {selectedItemIds.length} Item Terpilih ({formatRupiah(selectedMainTotalAmount)})</span>
            ) : (
              <span>Bayar Hak Vendor</span>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4.5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0 shadow-xs mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-xs font-bold text-slate-800">
              Ketentuan Bagi Hasil &amp; Pembayaran Hak Vendor Titipan (Konsinyasi)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 leading-relaxed">
              <div className="flex items-start gap-1.5 bg-white/70 border border-amber-100 rounded-xl p-2.5">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  <strong>Hak Vendor Berlaku untuk Semua Metode Bayar:</strong> Penjualan barang titipan vendor baik melalui <u>Dompet Santri maupun Tunai/QRIS</u> wajib diserahkan porsi modal/HPP bagi hasilnya ke vendor mitra.
                </span>
              </div>
              <div className="flex items-start gap-1.5 bg-white/70 border border-amber-100 rounded-xl p-2.5">
                <span className="text-amber-600 font-bold">•</span>
                <span>
                  <strong>Barang Non-Titipan (Kantin Mandiri):</strong> 100% hasil penjualan menjadi penerimaan operasional kantin sekolah dan tidak memiliki kewajiban bagi hasil ke vendor luar.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 KARTU UTAMA PALING ATAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KARTU 1: Total Hak Vendor Belum Diserahkan (Hutang / Pending) */}
        <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[150px] border border-amber-500/30">
          <div className="absolute right-[-8px] bottom-[-8px] opacity-10 pointer-events-none">
            <Receipt className="w-28 h-28 text-white" />
          </div>
          <div className="flex items-center justify-between z-10">
            <div>
              <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider block">
                Hak Vendor Belum Diserahkan
              </span>
              <span className="text-[10px] text-amber-200/80">
                Sisa kewajiban bagi hasil titipan konsinyasi
              </span>
            </div>
            <span className="px-2.5 py-0.5 bg-amber-500/30 text-amber-100 rounded-full text-[10px] font-semibold border border-amber-400/30 shrink-0">
              Perlu Dibayarkan
            </span>
          </div>
          <div className="my-2.5 z-10">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-white font-mono">
              {formatRupiah(summary?.total_vendor_pending)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-amber-100/90 pt-2 border-t border-amber-500/30 z-10">
            <span>Status Item:</span>
            <span className="font-bold text-amber-50">
              {summary?.pending_items_count || 0} Item Terjual Belum Diserahkan
            </span>
          </div>
        </div>

        {/* KARTU 2: Total Hak Vendor Sudah Diserahkan (Lunas) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-200 hover:shadow-sm transition min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Hak Vendor Sudah Diserahkan
              </span>
              <span className="text-[10px] text-slate-400">
                Akumulasi dana yang telah lunas diserahkan ke vendor
              </span>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <p className="text-2xl lg:text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {formatRupiah(summary?.total_vendor_disbursed)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Status Penyerahan:</span>
            <span className="font-semibold text-slate-700">
              {summary?.disbursed_items_count || 0} Item Telah Lunas Terbayar
            </span>
          </div>
        </div>

        {/* KARTU 3: Penjualan Non-Titipan (Kantin Mandiri) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Penjualan Non-Titipan
              </span>
              <span className="text-[10px] text-slate-400">
                Produk internal kantin mandiri (100% hak sekolah)
              </span>
            </div>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200/60 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <p className="text-2xl lg:text-3xl font-black text-slate-800 font-mono tracking-tight">
              {formatRupiah(summary?.total_non_vendor_sales)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Kewajiban Vendor:</span>
            <span className="font-bold text-emerald-600">Rp0 (Kantin Mandiri)</span>
          </div>
        </div>
      </div>

      {/* Ringkasan Omzet & Margin Penjualan */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/70 px-3.5 py-2 rounded-xl">
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 font-medium">Total Omzet Penjualan:</span>
            <strong className="text-slate-800 font-mono font-bold">{formatRupiah(summary?.total_sales_amount)}</strong>
          </div>
          <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/70 px-3.5 py-2 rounded-xl">
            <PackageCheck className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 font-medium">Omzet Produk Vendor:</span>
            <strong className="text-amber-900 font-mono font-bold">{formatRupiah(summary?.total_vendor_sales)}</strong>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/70 px-3.5 py-2 rounded-xl">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-800 font-medium">Laba Bagi Hasil Kantin:</span>
            <strong className="text-emerald-900 font-mono font-bold">{formatRupiah(summary?.total_canteen_share)}</strong>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          * Pembayaran hak vendor dapat dilakukan fleksibel per transaksi terpilih atau per vendor mitra.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Periode Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Periode Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-medium"
            >
              <option value="all">Semua Vendor &amp; Mandiri</option>
              <option value="non_vendor">🏢 Kantin Mandiri (Bukan Titipan)</option>
              {(summary?.vendors || []).map(v => (
                <option key={v.vendor_id} value={v.vendor_id}>🏪 {v.vendor_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Penyerahan</label>
            <select
              value={disbursementStatusFilter}
              onChange={(e) => setDisbursementStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="pending">⏳ Belum Diserahkan (Hutang)</option>
              <option value="disbursed">✅ Sudah Diserahkan (Lunas)</option>
              <option value="non_vendor">🏢 Bukan Titipan (Kantin Mandiri)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari Transaksi / Produk</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID Trx, produk, kwitansi..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Terapkan
            </button>
            {(dateFrom || dateTo || vendorFilter !== 'all' || disbursementStatusFilter !== 'all' || paymentMethodFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition"
                title="Reset Filter"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('detail')}
              className={`pb-3 text-xs font-bold transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === 'detail'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Rincian Transaksi Penjualan &amp; Hak Vendor ({details.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vendors')}
              className={`pb-3 text-xs font-bold transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === 'vendors'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Rekapitulasi per Vendor Mitra ({(summary?.vendors || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-bold transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Riwayat Penyerahan &amp; Kwitansi Vendor ({payments.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 pb-2">
            {details.length} item transaksi dimuat
          </div>
        </div>

        {/* TAB 1: Rincian Transaksi Penjualan & Hak Vendor */}
        {activeTab === 'detail' && (
          <div className="p-5 space-y-4">
            {/* Floating Selection Banner jika ada transaksi dicentang */}
            {selectedItemIds.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-xl font-bold text-xs">
                    {selectedItemIds.length} Item
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-amber-700" />
                      <span>{selectedItemIds.length} Transaksi Penjualan Vendor {activeSelectedVendorName ? `"${activeSelectedVendorName}"` : ''} Dipilih</span>
                    </h5>
                    <p className="text-[11px] text-amber-800">
                      Total Hak Vendor yang Akan Diserahkan: <strong className="font-mono text-xs font-black">{formatRupiah(selectedMainTotalAmount)}</strong>
                      <span className="ml-2 text-slate-500 font-medium">(1 Transaksi Khusus 1 Vendor)</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItemIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-amber-100/60 rounded-xl transition cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPaymentModal({ vendor_id: activeSelectedVendorId, vendor_name: activeSelectedVendorName }, selectedItemIds)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Bayar ke Vendor {activeSelectedVendorName || ''}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="table-container overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.length === selectablePendingVendorItems.length && selectablePendingVendorItems.length > 0}
                        onChange={handleToggleSelectAllMain}
                        disabled={selectablePendingVendorItems.length === 0}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-30"
                        title="Pilih / Batal Pilih Semua Item Vendor Terkait"
                      />
                    </th>
                    <th className="px-3.5 py-3">ID Trx</th>
                    <th className="px-3.5 py-3">Waktu &amp; Pembeli</th>
                    <th className="px-3.5 py-3">Metode Bayar</th>
                    <th className="px-3.5 py-3">Produk &amp; Vendor Mitra</th>
                    <th className="px-3.5 py-3 text-right">Qty</th>
                    <th className="px-3.5 py-3 text-right">Harga Jual</th>
                    <th className="px-3.5 py-3 text-right font-bold text-amber-900">Hak Vendor (HPP)</th>
                    <th className="px-3.5 py-3 text-right text-emerald-700">Margin Kantin</th>
                    <th className="px-3.5 py-3">Status Penyerahan Hak Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.map((d) => {
                    const isChecked = selectedItemIds.includes(d.id);
                    const isPendingVendor = d.is_vendor_item && !d.is_disbursed;
                    const isLockedDifferentVendor = activeSelectedVendorId && isPendingVendor && String(d.vendor_id) !== String(activeSelectedVendorId);
                    return (
                      <tr
                        key={d.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isChecked ? 'bg-amber-50/50' : (isPendingVendor ? 'bg-amber-50/20' : '')
                        }`}
                      >
                        {/* Checkbox Kolom */}
                        <td className="px-3 py-3 text-center">
                          {isLockedDifferentVendor ? (
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={true}
                              className="w-4 h-4 rounded text-slate-300 opacity-40 cursor-not-allowed"
                              title={`Terkunci untuk vendor "${activeSelectedVendorName}". 1 transaksi pembayaran hanya untuk 1 vendor saja.`}
                            />
                          ) : isPendingVendor ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMainItem(d)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              title="Pilih item ini untuk dibayarkan hak vendornya"
                            />
                          ) : d.is_vendor_item && d.is_disbursed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" title="Sudah Diserahkan" />
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </td>

                        {/* ID Trx */}
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                          #{d.sales_transaction_id}
                        </td>

                        {/* Waktu & Pembeli */}
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{d.buyer_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {d.transaction_at ? new Date(d.transaction_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </div>
                        </td>

                        {/* Metode Bayar */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {d.payment_method === 'wallet' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                              <Wallet className="w-3 h-3 text-indigo-600" />
                              <span>Dompet Siswa</span>
                            </span>
                          ) : d.payment_method === 'cash' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              <Banknote className="w-3 h-3 text-emerald-600" />
                              <span>Tunai Kasir</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 border border-sky-200 text-sky-700">
                              <span>{d.payment_method?.toUpperCase()}</span>
                            </span>
                          )}
                        </td>

                        {/* Produk & Vendor Mitra */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-800">{d.product_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            {d.is_vendor_item ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>{d.vendor_name}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>Kantin Mandiri (Non-Titipan)</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-700">
                          {d.qty}
                        </td>

                        {/* Harga Jual */}
                        <td className="px-3.5 py-3 text-right font-mono">
                          <div className="font-bold text-slate-800">{formatRupiah(d.subtotal_price)}</div>
                          <div className="text-[10px] text-slate-400">@{formatRupiah(d.sale_price)}</div>
                        </td>

                        {/* Hak Vendor (HPP) */}
                        <td className="px-3.5 py-3 text-right font-mono">
                          {d.is_vendor_item ? (
                            <>
                              <div className="font-bold text-amber-900">{formatRupiah(d.subtotal_cost)}</div>
                              <div className="text-[10px] text-amber-600">@{formatRupiah(d.cost_price)}</div>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Non-Vendor</span>
                          )}
                        </td>

                        {/* Margin Kantin */}
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(d.canteen_margin)}
                        </td>

                        {/* Status Penyerahan Hak Vendor */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {d.is_vendor_item ? (
                            d.is_disbursed ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Sudah Diserahkan</span>
                                </span>
                                <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 font-mono pl-1">
                                  <span>{d.receipt_number || d.finance_receipt_number || 'Lunas Terbayar'}</span>
                                  {d.receipt_number && (
                                    <button
                                      type="button"
                                      onClick={() => handlePrintReceipt(d)}
                                      className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 font-sans font-bold"
                                      title="Cetak Kwitansi"
                                    >
                                      <Printer className="w-2.5 h-2.5" />
                                      <span>Kwitansi</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Belum Diserahkan</span>
                                </span>
                                <div className="flex items-center gap-1.5 pl-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentModal(null, [d.id])}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md transition shadow-2xs"
                                    title="Bayar hanya item transaksi ini"
                                  >
                                    <CreditCard className="w-3 h-3 text-amber-700" />
                                    <span>Bayar Item Ini</span>
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                                <span>Bukan Titipan Vendor</span>
                              </span>
                              <span className="text-[9.5px] text-slate-400 pl-1">
                                100% Hak Kas Kantin Mandiri
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {details.length === 0 && (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400 italic">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                            <span>Memuat data transaksi hak vendor...</span>
                          </div>
                        ) : (
                          'Belum ada transaksi penjualan yang sesuai filter'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Totals Footer */}
                {details.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                    <tr>
                      <td colSpan="5" className="px-3.5 py-3 text-right uppercase tracking-wider text-[11px] text-slate-600">
                        Total ({details.length} Baris):
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black">{filteredTotals.qty}</td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900">
                        {formatRupiah(filteredTotals.sales)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-amber-900">
                        {formatRupiah(filteredTotals.vendor_cost)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-800">
                        {formatRupiah(filteredTotals.canteen_margin)}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        {filteredTotals.vendor_pending > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-900 font-bold font-mono bg-amber-100/90 px-2 py-0.5 rounded">
                            Hutang: {formatRupiah(filteredTotals.vendor_pending)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Rekapitulasi per Vendor Mitra */}
        {activeTab === 'vendors' && (
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Vendor Mitra</th>
                  <th className="px-4 py-3">Jenis Kerjasama</th>
                  <th className="px-4 py-3">Kontak / Telepon</th>
                  <th className="px-4 py-3 text-right">Item Terjual</th>
                  <th className="px-4 py-3 text-right">Total Omzet Penjualan</th>
                  <th className="px-4 py-3 text-right text-emerald-700">Bagi Hasil Kantin</th>
                  <th className="px-4 py-3 text-right font-bold text-amber-900">Total Hak Vendor</th>
                  <th className="px-4 py-3 text-right text-emerald-700">Sudah Diserahkan</th>
                  <th className="px-4 py-3 text-right font-black text-amber-900">Sisa Belum Diserahkan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(summary?.vendors || []).map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-amber-600" />
                        <span>{v.vendor_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
                        {v.vendor_type || 'Konsinyasi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {v.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                      {v.total_items_sold}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(v.total_sales_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                      {formatRupiah(v.canteen_cut)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(v.vendor_gross_share)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                      {formatRupiah(v.vendor_paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-amber-900">
                      {formatRupiah(v.vendor_payable)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.vendor_payable > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(v)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Bayar Hak</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Lunas</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {(summary?.vendors || []).length === 0 && (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400 italic">
                      Belum ada data vendor mitra yang terdaftar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Riwayat Penyerahan & Kwitansi Vendor */}
        {activeTab === 'history' && (
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Kwitansi</th>
                  <th className="px-4 py-3">Vendor Mitra</th>
                  <th className="px-4 py-3">Tanggal Penyerahan</th>
                  <th className="px-4 py-3 font-bold text-emerald-700">Nominal Diserahkan</th>
                  <th className="px-4 py-3">No. BKK (Modul Keuangan)</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">
                      {p.receipt_number || `#VFP-${p.id}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {p.vendor || 'Vendor Mitra'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {p.paid_at ? formatDate(p.paid_at) : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-emerald-700">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {p.finance_receipt_number ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-[11px]">
                          <FileCheck2 className="w-3 h-3 text-emerald-600" />
                          <span>{p.finance_receipt_number}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Tercatat Kas Internal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {p.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cetak Kwitansi</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {payments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      Belum ada riwayat pembayaran hak vendor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PEMBAYARAN HAK VENDOR */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shadow-xs">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Penyerahan &amp; Pembayaran Hak Vendor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mencatat pembayaran bagi hasil konsinyasi vendor &amp; sinkronisasi otomatis BKK ke Modul Keuangan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {loadingModalData ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="text-xs font-semibold">Memuat data vendor, COA, dan item transaksi terkait...</span>
              </div>
            ) : (
              <form onSubmit={(e) => handlePaymentSubmit(e, false)} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* KOLOM KIRI: Form Input (6 cols) */}
                  <div className="lg:col-span-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <Landmark className="w-3.5 h-3.5 text-amber-600" />
                      <span>Data Pembayaran &amp; Akuntansi</span>
                    </h4>

                    {/* 1. Pilih Vendor */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-500" />
                        <span>Vendor Mitra Penerima *</span>
                      </label>
                      <select
                        required
                        value={formData.vendor_id}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setFormData({ ...formData, vendor_id: vId });
                          // Muat ulang item undisbursed untuk vendor terpilih
                          api.get('/kantin/vendor-fee-payments/undisbursed-items', { params: { vendor_id: vId || undefined } })
                            .then(res => {
                              const itemsList = res.data?.data?.items || [];
                              setUndisbursedItems(itemsList);
                              setModalSelectedItemIds(itemsList.map(t => t.id));
                              const total = itemsList.reduce((sum, t) => sum + (parseFloat(t.subtotal_cost) || 0), 0);
                              setFormData(prev => ({
                                ...prev,
                                vendor_id: vId,
                                amount: String(total),
                                notes: `Penyerahan Hak Bagi Hasil Vendor (${itemsList.length} Item)`
                              }));
                            });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      >
                        <option value="">-- Pilih Vendor Mitra --</option>
                        {(summary?.vendors || []).map(v => (
                          <option key={v.vendor_id} value={v.vendor_id}>
                            {v.vendor_name} (Hutang: {formatRupiah(v.vendor_payable)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Tanggal Pembayaran */}
                    <div>
                      <DatePickerField
                        label="Tanggal Pembayaran *"
                        value={formData.paid_at}
                        onChange={(isoStr) => setFormData({ ...formData, paid_at: isoStr })}
                        placeholder="DD/MM/YYYY"
                        helperText="Format tanggal dd/mm/yyyy. Otomatis tercatat pada Bukti Kas Keluar (BKK)."
                        required
                      />
                    </div>

                    {/* 3. Referensi Rekening Koran (Mutasi Bank Keluar) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Referensi Rekening Koran (Opsional)</span>
                        </span>
                        {formData.bank_statement_id && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                            Otomatis Terhubung
                          </span>
                        )}
                      </label>
                      <SearchableSelect
                        options={[
                          {
                            value: '',
                            label: '-- Tanpa Rekening Koran (Bayar Tunai Fisik) --',
                            sublabel: 'Pembayaran tunai kasir atau di luar rekening koran bank'
                          },
                          ...bankStatements.map(stmt => ({
                            value: String(stmt.id),
                            label: `[${formatDate(stmt.transaction_date)}] ${formatRupiah(stmt.unallocated_amount || stmt.amount)} - ${stmt.description}`,
                            sublabel: `${stmt.bank_name || 'Bank'} ${stmt.bank_account_number || ''} • Sisa Alokasi: ${formatRupiah(stmt.unallocated_amount)}`,
                            badge: 'DB (Keluar)',
                            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
                          }))
                        ]}
                        value={formData.bank_statement_id}
                        onChange={handleBankStatementChange}
                        placeholder="-- Pilih Mutasi Rekening Koran Bank Keluar --"
                        searchPlaceholder="Cari tanggal / deskripsi / nominal rekening koran..."
                      />
                      {formData.bank_statement_id && (
                        <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Nominal dan tanggal pembayaran otomatis disinkronkan dari mutasi bank rekening koran.</span>
                        </p>
                      )}
                    </div>

                    {/* 4. Rekening Kas/Bank Pembayar (Akun Kredit) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-slate-500" />
                          <span>Rekening Kas/Bank Pembayar (Akun Kredit) *</span>
                        </span>
                        <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded">Posisi: Kredit (Kas Keluar)</span>
                      </label>
                      <SearchableSelect
                        options={cashAccounts.map(acc => ({
                          value: String(acc.id),
                          label: acc.display_label || acc.name,
                          sublabel: acc.account_kind === 'bank' ? `${acc.bank_name || 'Bank'} - No. Rek ${acc.bank_account_number || '-'}` : 'Penyimpanan Kas Tunai Fisik',
                          badge: acc.account_kind === 'bank' ? 'Bank' : 'Kas Tunai',
                          badgeClass: acc.account_kind === 'bank' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }))}
                        value={formData.cash_account_id}
                        onChange={(val) => setFormData({ ...formData, cash_account_id: val })}
                        placeholder="Pilih Rekening Kas / Bank Pembayar (Kredit)"
                        searchPlaceholder="Cari rekening kas atau bank..."
                      />
                    </div>

                    {/* 5. Akun Akuntansi Terkait (COA Debet) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span>Akun Akuntansi Terkait (Akun Debet) *</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Posisi: Debet / Beban HPP</span>
                      </label>
                      <SearchableSelect
                        options={coaAccounts.map(c => ({
                          value: String(c.id),
                          label: c.display_label || `[${c.account_code}] ${c.account_name}`,
                          sublabel: `Kelompok: ${(c.account_group || '').toUpperCase()} • Saldo Normal: ${(c.normal_balance || 'debit').toUpperCase()}`,
                          badge: String(c.id) === String(formData.coa_account_id) ? 'Akun Default' : undefined,
                          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
                        }))}
                        value={formData.coa_account_id}
                        onChange={(val) => setFormData({ ...formData, coa_account_id: val })}
                        placeholder="Pilih Akun Bagan Perkiraan (COA Debet)"
                        searchPlaceholder="Cari kode akun atau nama COA..."
                      />
                    </div>

                    {/* Pratinjau Jurnal Akuntansi Otomatis */}
                    {(() => {
                      const selectedCash = cashAccounts.find(c => String(c.id) === String(formData.cash_account_id));
                      const selectedCoa = coaAccounts.find(c => String(c.id) === String(formData.coa_account_id));
                      const nominal = parseFloat(formData.amount) || 0;
                      return (
                        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl space-y-1.5 font-mono text-[11px] border border-slate-800">
                          <div className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pratinjau Jurnal Kas Keluar (BKK):</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-300">
                            <span>[Debet] {selectedCoa?.display_label || selectedCoa?.account_name || 'Beban HPP / Bagi Hasil Vendor'}</span>
                            <span className="font-bold">{formatRupiah(nominal)}</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-400 pl-4">
                            <span>[Kredit] {selectedCash?.name || selectedCash?.display_label || 'Kas/Bank Pembayar'}</span>
                            <span className="font-bold">{formatRupiah(nominal)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Nominal Penyerahan (Rp) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nominal Pembayaran (Rp) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Contoh: 50000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-amber-950 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>

                    {/* 7. Catatan */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Contoh: Pelunasan bagi hasil konsinyasi snack periode Oktober"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  {/* KOLOM KANAN: Transaksi Penjualan Vendor Terkait (6 cols) */}
                  <div className="lg:col-span-6 flex flex-col h-full bg-slate-50/60 rounded-2xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-amber-700" />
                          <span>Transaksi Penjualan Terkait</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Centang item transaksi yang haknya akan diserahkan
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllModal}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition shadow-2xs flex items-center gap-1"
                      >
                        {modalSelectedItemIds.length === undisbursedItems.length && undisbursedItems.length > 0 ? (
                          <>
                            <Square className="w-3 h-3 text-slate-500" />
                            <span>Batal Semua</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3 h-3 text-amber-700" />
                            <span>Pilih Semua ({undisbursedItems.length})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Summary Terpilih */}
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] flex items-center justify-between text-amber-950 mb-2.5">
                      <span>Terpilih: <strong>{modalSelectedItemIds.length}</strong> dari {undisbursedItems.length} item</span>
                      <strong className="font-mono font-bold text-amber-900">
                        {formatRupiah(undisbursedItems.filter(t => modalSelectedItemIds.includes(t.id)).reduce((s, t) => s + (parseFloat(t.subtotal_cost) || 0), 0))}
                      </strong>
                    </div>

                    {/* Scrollable Table Item Transaksi */}
                    <div className="flex-1 overflow-y-auto max-h-[320px] rounded-xl border border-slate-200 bg-white custom-scrollbar">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-2 text-center w-8">#</th>
                            <th className="p-2">Produk &amp; Vendor</th>
                            <th className="p-2">Waktu &amp; Trx</th>
                            <th className="p-2 text-right">Hak Vendor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {undisbursedItems.map((item) => {
                            const isChecked = modalSelectedItemIds.includes(item.id);
                            return (
                              <tr
                                key={item.id}
                                onClick={() => handleToggleModalItem(item.id)}
                                className={`cursor-pointer transition ${
                                  isChecked ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2">
                                  <div className="font-semibold text-slate-800">
                                    {item.product_name} ({item.qty}x)
                                  </div>
                                  <div className="text-[10px] text-amber-700 font-medium">
                                    {item.vendor_name}
                                  </div>
                                </td>
                                <td className="p-2 text-slate-500 text-[10px] font-mono">
                                  <div>#{item.sales_transaction_id} &bull; {item.payment_method?.toUpperCase()}</div>
                                  <div>{formatDate(item.transaction_at)}</div>
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-amber-900">
                                  {formatRupiah(item.subtotal_cost)}
                                </td>
                              </tr>
                            );
                          })}

                          {undisbursedItems.length === 0 && (
                            <tr>
                              <td colSpan="4" className="py-12 text-center text-slate-400 italic">
                                Tidak ada item transaksi penjualan vendor yang belum diserahkan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    * Menerbitkan Bukti Kas Keluar (BKK) Keuangan in-process dan kwitansi penyerahan hak vendor.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handlePaymentSubmit(e, false)}
                      disabled={submitting || !formData.vendor_id || !formData.amount || parseFloat(formData.amount) <= 0}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Simpan Saja</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handlePaymentSubmit(e, true)}
                      disabled={submitting || !formData.vendor_id || !formData.amount || parseFloat(formData.amount) <= 0}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>Simpan &amp; Cetak Kwitansi</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL CETAK KWITANSI PEMBAYARAN VENDOR */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 my-8 print:border-none print:shadow-none print:my-0 print:p-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Kwitansi */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-xs print:hidden">
                  <Store className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Yayasan Aldepos &bull; Kantin Sekolah
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Kwitansi Penyerahan &amp; Pembayaran Bagi Hasil Konsinyasi Vendor Mitra
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg block">
                  {receiptData.receipt_number || receiptData.vendor_receipt_number || `#KWV-${receiptData.id}`}
                </span>
                {receiptData.finance_receipt_number && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    No. BKK: {receiptData.finance_receipt_number}
                  </span>
                )}
              </div>
            </div>

            {/* Isi Rincian Kwitansi */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                <span className="col-span-4 font-bold text-slate-600">Telah Diterima Dari:</span>
                <span className="col-span-8 font-semibold text-slate-800">Bendahara / Pengelola Kantin Yayasan Aldepos</span>
              </div>

              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                <span className="col-span-4 font-bold text-slate-600">Diberikan Kepada (Vendor):</span>
                <span className="col-span-8 font-black text-slate-900 text-sm">
                  {receiptData.vendor || receiptData.vendor_name || 'Mitra Vendor Konsinyasi'}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                <span className="col-span-4 font-bold text-slate-600">Tanggal Penyerahan:</span>
                <span className="col-span-8 font-mono text-slate-800">
                  {formatDate(receiptData.paid_at || receiptData.fee_paid_at || new Date())}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                <span className="col-span-4 font-bold text-slate-600">Uang Sejumlah (Terbilang):</span>
                <span className="col-span-8 italic font-serif text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-200/80 font-medium">
                  "{terbilangRupiah(receiptData.amount || receiptData.subtotal_cost || 0)}"
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100">
                <span className="col-span-4 font-bold text-slate-600">Untuk Pembayaran:</span>
                <span className="col-span-8 text-slate-700">
                  {receiptData.notes || `Pelunasan bagi hasil barang titipan konsinyasi vendor ${receiptData.vendor || receiptData.vendor_name || ''}`}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 py-3 bg-amber-50/70 border border-amber-200 rounded-2xl p-3 items-center">
                <span className="col-span-4 font-bold text-amber-950 text-sm uppercase">Total Pembayaran:</span>
                <span className="col-span-8 font-mono font-black text-amber-900 text-xl text-right">
                  {formatRupiah(receiptData.amount || receiptData.subtotal_cost || 0)}
                </span>
              </div>
            </div>

            {/* Kolom Tanda Tangan */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
              <div className="space-y-16">
                <p className="font-semibold text-slate-600">Yang Menerima (Vendor Mitra),</p>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    ( {receiptData.vendor || receiptData.vendor_name || '................................'} )
                  </p>
                  <p className="text-[10px] text-slate-400">Tanda Tangan &amp; Nama Terang</p>
                </div>
              </div>
              <div className="space-y-16">
                <p className="font-semibold text-slate-600">Yang Menyerahkan (Kantin),</p>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    ( Pengelola / Bendahara Kantin )
                  </p>
                  <p className="text-[10px] text-slate-400">Tanda Tangan &amp; Cap Kantin</p>
                </div>
              </div>
            </div>

            {/* Tombol Cetak / Tutup */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 print:hidden">
              <span className="text-[10px] text-slate-400 italic">
                * Kwitansi sah digital diterbitkan secara terintegrasi oleh Sistem Core Aldepos.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kwitansi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
